import { getStorageUrl, STORAGE_BUCKETS, supabase } from '@lib/supabase/client'
import { generateStoragePath } from '@lib/utils'
import { amountToCents, centsToAmount } from '@features/debts/split'
import type { Debt, DebtCurrency, DebtPayment } from '@/types'

/** File the user must apply in Supabase for debts between other members, payments by both sides, due dates. */
export const DEBTS_MIGRATION_FILE = 'supabase/migrations/017_debts_group_members.sql'

const DEBT_WITH_PEOPLE = `
    *,
    creditor:profiles!debts_creditor_id_fkey(id, display_name, avatar_url),
    debtor:profiles!debts_debtor_id_fkey(id, display_name, avatar_url)
`

export type DebtErrorKind = 'permission' | 'migration' | 'invalid' | 'network' | 'unknown'

/** Error with a message that can be shown to the user as-is (Spanish). */
export class DebtError extends Error {
    kind: DebtErrorKind

    constructor(kind: DebtErrorKind, message: string) {
        super(message)
        this.name = 'DebtError'
        this.kind = kind
    }
}

export interface CreateDebtInput {
    creditorId: string
    debtorId: string
    /** Amount in currency units with up to 2 decimals (12.5 = 12,50 €). */
    amount: number
    currency: DebtCurrency
    concept: string
    dueDate?: string | null
}

export interface UpdateDebtInput {
    amount: number
    currency: DebtCurrency
    concept: string
    dueDate?: string | null
}

export interface DebtBalance {
    owed: number
    lent: number
}

/**
 * Per-user balance. `owed`/`lent` are in `currency` (the group's main currency) and never mix currencies;
 * `byCurrency` has every currency with open debts.
 */
export interface DebtUserBalance extends DebtBalance {
    currency: DebtCurrency
    byCurrency: Partial<Record<DebtCurrency, DebtBalance>>
}

export interface CreateDebtsResult {
    created: Debt[]
    failed: Array<{ input: CreateDebtInput; message: string }>
}

export interface RegisterPaymentResult {
    payment: DebtPayment | null
    /** The payment updated the balance but could not be stored in the history (migration 017 missing). */
    historySkipped: boolean
    receiptFailed: boolean
    settled: boolean
}

type PostgrestLikeError = { code?: string; message?: string; details?: string; hint?: string }

function rawError(error: unknown): string {
    if (!error || typeof error !== 'object') return String(error ?? '')
    const e = error as PostgrestLikeError
    return `${e.code ?? ''} ${e.message ?? ''} ${e.details ?? ''} ${e.hint ?? ''}`.toLowerCase()
}

export function isMissingColumnError(error: unknown): boolean {
    const raw = rawError(error)
    return raw.includes('42703') || raw.includes('pgrst204') || (raw.includes('column') && (raw.includes('does not exist') || raw.includes('could not find')))
}

function isPermissionError(error: unknown): boolean {
    const raw = rawError(error)
    return raw.includes('42501') || raw.includes('row-level security') || raw.includes('permission denied')
}

/** Turns any Supabase/network error into a DebtError with a clear Spanish message. */
export function toDebtError(error: unknown, fallback = 'No se pudo guardar. Inténtalo de nuevo.'): DebtError {
    if (error instanceof DebtError) return error
    const raw = rawError(error)
    if (isMissingColumnError(error)) {
        return new DebtError('migration', `Falta aplicar la migración 017 en Supabase (${DEBTS_MIGRATION_FILE}).`)
    }
    if (isPermissionError(error)) {
        return new DebtError(
            'permission',
            `No tienes permiso para hacer esto con esta deuda. Si la base de datos no tiene la migración 017 (${DEBTS_MIGRATION_FILE}), solo quien prestó puede modificarla.`
        )
    }
    if (raw.includes('23514') || raw.includes('check constraint')) {
        return new DebtError('invalid', 'El importe no es válido: revisa que no sea menor que lo ya pagado y que deudor y acreedor sean personas distintas.')
    }
    if (raw.includes('failed to fetch') || raw.includes('network') || raw.includes('load failed')) {
        return new DebtError('network', 'Sin conexión. Revisa tu internet e inténtalo de nuevo.')
    }
    const message = error instanceof Error ? error.message : (error as PostgrestLikeError | null)?.message
    return new DebtError('unknown', message || fallback)
}

function toRow(groupId: string, input: CreateDebtInput) {
    const row: Record<string, unknown> = {
        group_id: groupId,
        creditor_id: input.creditorId,
        debtor_id: input.debtorId,
        amount: centsToAmount(amountToCents(input.amount)),
        currency: input.currency,
        concept: input.concept.trim().slice(0, 200),
        status: 'pending',
        amount_paid: 0,
    }
    // created_by is filled by the column default (auth.uid()) when migration 017 exists.
    if (input.dueDate) row.due_date = input.dueDate
    return row
}

function validateInput(input: CreateDebtInput): void {
    if (!input.creditorId || !input.debtorId) throw new DebtError('invalid', 'Elige quién presta y quién debe.')
    if (input.creditorId === input.debtorId) throw new DebtError('invalid', 'Una persona no puede deberse dinero a sí misma.')
    if (!(input.amount > 0)) throw new DebtError('invalid', 'El importe debe ser mayor que cero.')
    if (!input.concept.trim()) throw new DebtError('invalid', 'Escribe un concepto.')
}

export const debtsService = {
    /**
     * Get all debts for a group (with creditor/debtor profiles).
     */
    async getDebts(groupId: string): Promise<Debt[]> {
        const { data, error } = await supabase
            .from('debts')
            .select(DEBT_WITH_PEOPLE)
            .eq('group_id', groupId)
            .order('created_at', { ascending: false })

        if (error) throw error
        return normalizeDebts(data as Debt[])
    },

    /**
     * Get a single debt with its payment history (oldest payment first).
     */
    async getDebt(debtId: string): Promise<Debt> {
        const { data, error } = await supabase
            .from('debts')
            .select(`
        ${DEBT_WITH_PEOPLE},
        payments:debt_payments(
          *,
          payer:profiles!debt_payments_paid_by_fkey(id, display_name, avatar_url)
        )
      `)
            .eq('id', debtId)
            .single()

        if (error) throw error

        const [debt] = normalizeDebts([data as Debt])
        const payments = [...(debt.payments ?? [])]
            .map((payment) => ({ ...payment, amount: Number(payment.amount) }))
            .sort((a, b) => a.created_at.localeCompare(b.created_at))

        debt.payments = await Promise.all(
            payments.map(async (payment) => {
                if (!payment.receipt_url || /^https?:\/\//.test(payment.receipt_url)) return payment
                const signed = await getStorageUrl(STORAGE_BUCKETS.FILES, payment.receipt_url).catch(() => null)
                return { ...payment, receipt_url: signed ?? payment.receipt_url }
            })
        )

        return debt
    },

    /**
     * Whether migration 017 is applied (debts.created_by / due_date exist).
     * Without it the app still works, but only the creditor can update a debt.
     */
    async getCapabilities(): Promise<{ groupDebts: boolean }> {
        const { error } = await supabase.from('debts').select('id, created_by, due_date').limit(1)
        if (error && isMissingColumnError(error)) return { groupDebts: false }
        return { groupDebts: true }
    },

    /**
     * Create one debt. Any member can write down a debt between two members of the group
     * (e.g. "Marcos owes Ana"); the database checks membership.
     */
    async createDebt(groupId: string, input: CreateDebtInput): Promise<Debt> {
        validateInput(input)
        const { data, error } = await supabase.from('debts').insert(toRow(groupId, input)).select(DEBT_WITH_PEOPLE).single()
        if (error) throw toDebtError(error, 'No se pudo apuntar la deuda.')
        return normalizeDebts([data as Debt])[0]
    },

    /**
     * Create several debts at once (bill splitter). Tries a single atomic insert first;
     * if that fails, inserts one by one so the caller can report exactly which ones failed.
     */
    async createDebts(groupId: string, inputs: CreateDebtInput[]): Promise<CreateDebtsResult> {
        if (inputs.length === 0) return { created: [], failed: [] }
        inputs.forEach(validateInput)

        const { data, error } = await supabase.from('debts').insert(inputs.map((input) => toRow(groupId, input))).select(DEBT_WITH_PEOPLE)
        if (!error) return { created: normalizeDebts((data ?? []) as Debt[]), failed: [] }

        // A missing column or a network error would fail every row in the same way.
        const batchError = toDebtError(error)
        if (batchError.kind === 'migration' || batchError.kind === 'network') {
            return { created: [], failed: inputs.map((input) => ({ input, message: batchError.message })) }
        }

        const result: CreateDebtsResult = { created: [], failed: [] }
        for (const input of inputs) {
            try {
                result.created.push(await this.createDebt(groupId, input))
            } catch (err) {
                result.failed.push({ input, message: toDebtError(err).message })
            }
        }
        return result
    },

    /**
     * Edit concept, amount, currency or due date. The amount can't go below what has been paid.
     */
    async updateDebt(debt: Debt, input: UpdateDebtInput): Promise<void> {
        const amountCents = amountToCents(input.amount)
        const paidCents = amountToCents(debt.amount_paid)
        if (amountCents <= 0) throw new DebtError('invalid', 'El importe debe ser mayor que cero.')
        if (amountCents < paidCents) throw new DebtError('invalid', 'El importe no puede ser menor que lo que ya se ha pagado.')
        if (!input.concept.trim()) throw new DebtError('invalid', 'Escribe un concepto.')

        const patch: Record<string, unknown> = {
            amount: centsToAmount(amountCents),
            currency: input.currency,
            concept: input.concept.trim().slice(0, 200),
            status: paidCents >= amountCents ? 'paid' : paidCents > 0 ? 'partial' : 'pending',
        }
        if (input.dueDate !== undefined && (input.dueDate || debt.due_date)) patch.due_date = input.dueDate || null

        const { data, error } = await supabase.from('debts').update(patch).eq('id', debt.id).select('id')
        if (error) throw toDebtError(error)
        if (!data || data.length === 0) throw toDebtError({ code: '42501' })
    },

    async deleteDebt(debtId: string): Promise<void> {
        const { data, error } = await supabase.from('debts').delete().eq('id', debtId).select('id')
        if (error) throw toDebtError(error, 'No se pudo eliminar la deuda.')
        if (!data || data.length === 0) {
            throw new DebtError('permission', 'Solo quien prestó el dinero o quien apuntó la deuda puede eliminarla.')
        }
    },

    /**
     * Register a partial or full payment. Either party can do it with migration 017;
     * without it, the creditor can still update the balance (the history row is skipped).
     */
    async registerPayment(
        debt: Debt,
        recordedBy: string,
        input: { amount: number; note?: string | null; receiptFile?: File | null }
    ): Promise<RegisterPaymentResult> {
        const totalCents = amountToCents(debt.amount)
        const paidCents = amountToCents(debt.amount_paid)
        const payCents = Math.min(amountToCents(input.amount), totalCents - paidCents)
        if (payCents <= 0) throw new DebtError('invalid', 'El importe del pago debe ser mayor que cero.')

        const newPaidCents = paidCents + payCents
        const newStatus = newPaidCents >= totalCents ? 'paid' : 'partial'

        let receiptPath: string | null = null
        let receiptMimeType: string | null = null
        let receiptFailed = false
        if (input.receiptFile) {
            const path = generateStoragePath('debt-receipts', recordedBy, input.receiptFile.name)
            const { error: uploadError } = await supabase.storage
                .from(STORAGE_BUCKETS.FILES)
                .upload(path, input.receiptFile, { upsert: false, cacheControl: '3600' })
            if (uploadError) {
                receiptFailed = true
            } else {
                receiptPath = path
                receiptMimeType = input.receiptFile.type || null
            }
        }

        let payment: DebtPayment | null = null
        let historySkipped = false
        const { data: inserted, error: paymentError } = await supabase
            .from('debt_payments')
            .insert({
                debt_id: debt.id,
                amount: centsToAmount(payCents),
                note: input.note?.trim() ? input.note.trim().slice(0, 200) : null,
                // paid_by is who paid (the debtor), even when the creditor writes it down.
                paid_by: debt.debtor_id,
                receipt_url: receiptPath,
                receipt_mime_type: receiptMimeType,
            })
            .select()
            .single()

        if (paymentError) {
            // Without migration 017 only the debtor can insert payments; the creditor can still update the debt.
            if (isPermissionError(paymentError) && debt.creditor_id === recordedBy) {
                historySkipped = true
            } else {
                throw toDebtError(paymentError, 'No se pudo registrar el pago.')
            }
        } else {
            payment = inserted as DebtPayment
        }

        const { data: updated, error: updateError } = await supabase
            .from('debts')
            .update({ amount_paid: centsToAmount(newPaidCents), status: newStatus })
            .eq('id', debt.id)
            .select('id')

        if (updateError) throw toDebtError(updateError, 'No se pudo actualizar la deuda.')
        if (!updated || updated.length === 0) {
            throw new DebtError(
                'permission',
                payment
                    ? `El pago quedó en el historial, pero el saldo no se pudo actualizar: falta la migración 017 (${DEBTS_MIGRATION_FILE}).`
                    : `No tienes permiso para actualizar esta deuda. Aplica la migración 017 (${DEBTS_MIGRATION_FILE}).`
            )
        }

        return { payment, historySkipped, receiptFailed, settled: newStatus === 'paid' }
    },

    /**
     * Mark a debt as fully paid: registers the pending amount as a final payment so the history adds up.
     */
    async markAsPaid(debt: Debt, recordedBy: string): Promise<RegisterPaymentResult> {
        const remaining = centsToAmount(amountToCents(debt.amount) - amountToCents(debt.amount_paid))
        if (remaining <= 0) {
            const { error } = await supabase.from('debts').update({ status: 'paid' }).eq('id', debt.id)
            if (error) throw toDebtError(error)
            return { payment: null, historySkipped: false, receiptFailed: false, settled: true }
        }
        return this.registerPayment(debt, recordedBy, { amount: remaining, note: 'Saldada' })
    },

    /**
     * Per-user open balances for a group, without mixing currencies.
     */
    async getGroupSummary(groupId: string): Promise<Record<string, DebtUserBalance>> {
        const { data, error } = await supabase
            .from('debts')
            .select('creditor_id, debtor_id, amount, amount_paid, status, currency')
            .eq('group_id', groupId)
            .neq('status', 'paid')

        if (error) throw error
        return summarizeBalances((data ?? []) as Array<Pick<Debt, 'creditor_id' | 'debtor_id' | 'amount' | 'amount_paid' | 'status' | 'currency'>>)
    },
}

function normalizeDebts(debts: Debt[]): Debt[] {
    return debts.map((debt) => ({
        ...debt,
        amount: Number(debt.amount),
        amount_paid: Number(debt.amount_paid),
    }))
}

/** Main currency of a set of debts: EUR if present, otherwise the most used one. */
export function mainCurrency(debts: Array<Pick<Debt, 'currency'>>): DebtCurrency {
    if (debts.length === 0 || debts.some((debt) => debt.currency === 'EUR')) return 'EUR'
    const counts = new Map<DebtCurrency, number>()
    for (const debt of debts) counts.set(debt.currency, (counts.get(debt.currency) ?? 0) + 1)
    return Array.from(counts.entries()).sort((a, b) => b[1] - a[1])[0][0]
}

export function summarizeBalances(
    debts: Array<Pick<Debt, 'creditor_id' | 'debtor_id' | 'amount' | 'amount_paid' | 'status' | 'currency'>>
): Record<string, DebtUserBalance> {
    const open = debts.filter((debt) => debt.status !== 'paid')
    const currency = mainCurrency(open)
    const cents: Record<string, Partial<Record<DebtCurrency, { owed: number; lent: number }>>> = {}
    const bucket = (userId: string, code: DebtCurrency) => {
        const perUser = cents[userId] ?? (cents[userId] = {})
        return perUser[code] ?? (perUser[code] = { owed: 0, lent: 0 })
    }

    for (const debt of open) {
        const remaining = amountToCents(Number(debt.amount)) - amountToCents(Number(debt.amount_paid))
        if (remaining <= 0) continue
        bucket(debt.creditor_id, debt.currency).lent += remaining
        bucket(debt.debtor_id, debt.currency).owed += remaining
    }

    const summary: Record<string, DebtUserBalance> = {}
    for (const [userId, perCurrency] of Object.entries(cents)) {
        const byCurrency: Partial<Record<DebtCurrency, DebtBalance>> = {}
        for (const [code, value] of Object.entries(perCurrency) as Array<[DebtCurrency, { owed: number; lent: number }]>) {
            byCurrency[code] = { owed: centsToAmount(value.owed), lent: centsToAmount(value.lent) }
        }
        const main = byCurrency[currency] ?? { owed: 0, lent: 0 }
        summary[userId] = { owed: main.owed, lent: main.lent, currency, byCurrency }
    }
    return summary
}
