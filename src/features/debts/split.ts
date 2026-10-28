// ============================================================
// Smart bill splitting — pure, framework-free logic.
//
// Every amount is an integer number of cents. Remainders are always
// distributed with the largest-remainder method and a deterministic
// tie-break (input order), so the per-person amounts add up to the
// total to the cent, every time.
// ============================================================

export type SplitMode = 'equal' | 'shares' | 'exact' | 'items'
export type WeightUnit = 'percent' | 'parts'

export interface SplitItem {
    id: string
    name: string
    priceCents: number
    consumerIds: string[]
}

export interface PaymentEntry {
    personId: string
    /** Amount this person paid. `null` = "the rest", shared equally among the blank entries. */
    cents: number | null
}

export interface SplitInput {
    /** Amount on the bill, before tip. */
    billCents: number
    /** Tip as a percentage of the bill (10 = 10 %). */
    tipPercent?: number
    /** Round every share to a multiple of this many cents (100 = whole euros). 0/undefined = off. */
    roundStepCents?: number
    payments: PaymentEntry[]
    /** People who share the bill, in display order (the order also breaks ties). */
    participantIds: string[]
    mode: SplitMode
    /** `shares` mode: weight per person (percentages or parts). */
    weights?: Record<string, number | null | undefined>
    weightUnit?: WeightUnit
    /** `exact` mode: amount per person. Blank (`null`/missing) entries share what is left. */
    exactCents?: Record<string, number | null | undefined>
    /** `items` mode: dishes/drinks. Whatever the items don't cover is split among everyone as "común". */
    items?: SplitItem[]
}

export type SplitIssue =
    | { code: 'bill_missing' }
    | { code: 'no_payers' }
    | { code: 'no_participants' }
    | { code: 'paid_mismatch'; diffCents: number }
    | { code: 'percent_sum'; sumPercent: number }
    | { code: 'weights_empty' }
    | { code: 'exact_mismatch'; diffCents: number }
    | { code: 'items_over_bill'; diffCents: number }
    | { code: 'item_without_price'; itemId: string }
    | { code: 'item_without_people'; itemId: string }

export interface PersonResult {
    personId: string
    /** Share of the bill (before tip/rounding). */
    baseCents: number
    /** Share of tip + rounding. */
    extraCents: number
    /** What this person should pay in total (base + extra). */
    shareCents: number
    paidCents: number
    /** paid - share. Positive: should get money back. Negative: owes money. */
    balanceCents: number
}

export interface Transfer {
    fromId: string
    toId: string
    cents: number
}

export interface SplitResult {
    ok: boolean
    issues: SplitIssue[]
    billCents: number
    tipCents: number
    roundingCents: number
    totalCents: number
    paidCents: number
    /** Items mode: part of the bill not covered by any item, shared by everyone. */
    commonCents: number
    people: PersonResult[]
    transfers: Transfer[]
}

export const MAX_CENTS = 99_999_999 // 999.999,99

// ------------------------------------------------------------
// Parsing & formatting helpers
// ------------------------------------------------------------

/**
 * Parses money typed by a Spanish user into cents: "12,50", "12.5", "1.234,56", "1,234.56", "€ 7".
 * Returns null when empty or invalid (negative, more than 2 decimals, too large).
 */
export function parseCents(raw: string | null | undefined): number | null {
    if (raw == null) return null
    let value = String(raw).trim().replace(/[\s €$£]|EUR|USD|GBP|MXN/gi, '')
    if (value.startsWith('+')) value = value.slice(1)
    if (!value || /[^\d.,]/.test(value)) return null

    const lastComma = value.lastIndexOf(',')
    const lastDot = value.lastIndexOf('.')
    let normalized: string

    if (lastComma >= 0 && lastDot >= 0) {
        const decimalSep = lastComma > lastDot ? ',' : '.'
        const thousandsSep = decimalSep === ',' ? '.' : ','
        normalized = value.split(thousandsSep).join('').replace(decimalSep, '.')
    } else if (lastComma >= 0 || lastDot >= 0) {
        const sep = lastComma >= 0 ? ',' : '.'
        const parts = value.split(sep)
        const tail = parts[parts.length - 1]
        // "1.250" or "1.234.567" are thousands for a Spanish user; "12,5" / "12.50" are decimals.
        const looksLikeThousands = parts.length > 2 || (sep === '.' && tail.length === 3 && parts[0].length > 0)
        if (looksLikeThousands && parts.slice(1).every((part) => part.length === 3)) {
            normalized = parts.join('')
        } else if (parts.length === 2) {
            normalized = `${parts[0]}.${parts[1]}`
        } else {
            return null
        }
    } else {
        normalized = value
    }

    const match = normalized.match(/^(\d*)(?:\.(\d{0,2}))?$/)
    if (!match) return null
    const [, intPart, fracPart = ''] = match
    if (!intPart && !fracPart) return null
    const cents = Number(intPart || '0') * 100 + Number(fracPart.padEnd(2, '0') || '0')
    if (!Number.isFinite(cents) || cents > MAX_CENTS) return null
    return cents
}

/** Parses a plain decimal ("12,5", "33.3") used for percentages, parts and tips. */
export function parseDecimal(raw: string | null | undefined): number | null {
    if (raw == null) return null
    const value = String(raw).trim().replace(/[\s%]/g, '').replace(',', '.')
    if (!value || !/^\d*(\.\d*)?$/.test(value) || value === '.') return null
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : null
}

/** Cents → editable string with a decimal comma ("12,50"). */
export function centsToInput(cents: number): string {
    const sign = cents < 0 ? '-' : ''
    const abs = Math.abs(Math.round(cents))
    return `${sign}${Math.floor(abs / 100)},${String(abs % 100).padStart(2, '0')}`
}

export function centsToAmount(cents: number): number {
    return Math.round(cents) / 100
}

export function amountToCents(amount: number): number {
    // toFixed avoids 1.005 * 100 = 100.49999 style errors.
    return Math.round(Number((Number(amount) * 100).toFixed(4)))
}

// ------------------------------------------------------------
// Allocation primitives
// ------------------------------------------------------------

/**
 * Splits `total` integer units proportionally to `weights` (largest-remainder method).
 * Ties go to the earliest index. The result always sums to `total`.
 * If every weight is 0 (or there are none), the total is split equally.
 */
export function allocate(total: number, weights: number[]): number[] {
    const n = weights.length
    if (n === 0) return []
    const safeTotal = Math.max(0, Math.round(total))
    // Scale weights to integers (4 decimals of precision) and do the math in BigInt
    // so that cents × cents products can never lose precision.
    let scaled = weights.map((w) => BigInt(Math.max(0, Math.round((Number.isFinite(w) ? w : 0) * 10_000))))
    let sum = scaled.reduce((acc, w) => acc + w, 0n)
    if (sum === 0n) {
        scaled = weights.map(() => 1n)
        sum = BigInt(n)
    }

    const totalBig = BigInt(safeTotal)
    const base: bigint[] = []
    const remainders: Array<{ index: number; rem: bigint }> = []
    let assigned = 0n
    scaled.forEach((w, index) => {
        const product = totalBig * w
        const share = product / sum
        base.push(share)
        assigned += share
        remainders.push({ index, rem: product % sum })
    })

    let left = Number(totalBig - assigned)
    remainders.sort((a, b) => (a.rem === b.rem ? a.index - b.index : a.rem > b.rem ? -1 : 1))
    for (let i = 0; left > 0 && i < remainders.length; i += 1, left -= 1) {
        base[remainders[i].index] += 1n
    }
    return base.map((value) => Number(value))
}

/** Equal split of `total` among `n` people (first ones get the leftover cents). */
export function splitEqually(total: number, n: number): number[] {
    return allocate(total, Array.from({ length: n }, () => 1))
}

/**
 * Fixed amounts plus "the rest": entries with `null` share whatever the fixed ones leave.
 * Returns the resolved amounts (same order) and the difference left unassigned
 * (positive = missing, negative = too much).
 */
export function fillRemainder(total: number, entries: Array<number | null>): { values: number[]; diffCents: number } {
    const fixedSum = entries.reduce<number>((sum, value) => sum + (value ?? 0), 0)
    const blanks = entries.map((value, index) => (value == null ? index : -1)).filter((index) => index >= 0)
    const rest = total - fixedSum
    const values = entries.map((value) => value ?? 0)

    if (blanks.length > 0 && rest > 0) {
        const parts = splitEqually(rest, blanks.length)
        blanks.forEach((index, i) => {
            values[index] = parts[i]
        })
        return { values, diffCents: 0 }
    }
    return { values, diffCents: rest }
}

// ------------------------------------------------------------
// Settle up
// ------------------------------------------------------------

/**
 * Turns net balances (positive = must receive, negative = must pay) into a short list of transfers.
 * 1) Pairs people whose amounts match exactly (one transfer settles both).
 * 2) Greedy: repeatedly the biggest debtor pays the biggest creditor.
 * Produces at most n-1 transfers; ties are resolved by input order, so the output is deterministic.
 */
export function settle(balances: Array<{ id: string; cents: number }>): Transfer[] {
    const order = new Map(balances.map((entry, index) => [entry.id, index]))
    const creditors = balances.filter((entry) => entry.cents > 0).map((entry) => ({ id: entry.id, left: entry.cents }))
    const debtors = balances.filter((entry) => entry.cents < 0).map((entry) => ({ id: entry.id, left: -entry.cents }))
    const byAmount = (a: { id: string; left: number }, b: { id: string; left: number }) =>
        b.left - a.left || (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0)

    const transfers: Transfer[] = []

    debtors.sort(byAmount)
    creditors.sort(byAmount)
    for (const debtor of debtors) {
        const match = creditors.find((creditor) => creditor.left > 0 && creditor.left === debtor.left)
        if (match) {
            transfers.push({ fromId: debtor.id, toId: match.id, cents: debtor.left })
            match.left = 0
            debtor.left = 0
        }
    }

    for (;;) {
        const openDebtors = debtors.filter((entry) => entry.left > 0).sort(byAmount)
        const openCreditors = creditors.filter((entry) => entry.left > 0).sort(byAmount)
        if (openDebtors.length === 0 || openCreditors.length === 0) break
        const debtor = openDebtors[0]
        const creditor = openCreditors[0]
        const cents = Math.min(debtor.left, creditor.left)
        transfers.push({ fromId: debtor.id, toId: creditor.id, cents })
        debtor.left -= cents
        creditor.left -= cents
    }

    return transfers
}

// ------------------------------------------------------------
// Full calculation
// ------------------------------------------------------------

export function tipFor(billCents: number, tipPercent: number | undefined): number {
    if (!tipPercent || tipPercent <= 0 || billCents <= 0) return 0
    const basisPoints = Math.round(tipPercent * 100)
    return Math.round((billCents * basisPoints) / 10_000)
}

export function totalFor(billCents: number, tipPercent?: number, roundStepCents?: number): { tipCents: number; roundingCents: number; totalCents: number } {
    const tipCents = tipFor(billCents, tipPercent)
    const beforeRounding = billCents + tipCents
    const step = roundStepCents && roundStepCents > 0 ? Math.round(roundStepCents) : 0
    const totalCents = step > 0 && beforeRounding > 0 ? Math.ceil(beforeRounding / step) * step : beforeRounding
    return { tipCents, roundingCents: totalCents - beforeRounding, totalCents }
}

/** Resolves what each payer put in. Blank amounts share whatever is missing to reach the total. */
export function resolvePayments(totalCents: number, payments: PaymentEntry[]): { paid: Map<string, number>; diffCents: number } {
    const merged = new Map<string, number | null>()
    for (const entry of payments) {
        if (!entry.personId) continue
        const previous = merged.get(entry.personId)
        merged.set(entry.personId, entry.cents == null ? (previous ?? null) : (previous ?? 0) + Math.max(0, entry.cents))
    }
    const ids = Array.from(merged.keys())
    if (ids.length === 1 && merged.get(ids[0]) == null) {
        return { paid: new Map([[ids[0], totalCents]]), diffCents: 0 }
    }
    const { values, diffCents } = fillRemainder(totalCents, ids.map((id) => merged.get(id) ?? null))
    return { paid: new Map(ids.map((id, index) => [id, values[index]])), diffCents }
}

function baseShares(input: SplitInput, participants: string[], issues: SplitIssue[]): { shares: number[]; commonCents: number } {
    const bill = input.billCents
    const n = participants.length

    switch (input.mode) {
        case 'shares': {
            const raw = participants.map((id) => {
                const weight = input.weights?.[id]
                return weight != null && Number.isFinite(weight) && weight > 0 ? weight : 0
            })
            const sum = raw.reduce((acc, w) => acc + w, 0)
            if (sum <= 0) {
                issues.push({ code: 'weights_empty' })
                return { shares: splitEqually(bill, n), commonCents: 0 }
            }
            if (input.weightUnit === 'percent' && Math.abs(sum - 100) > 0.001) {
                issues.push({ code: 'percent_sum', sumPercent: Math.round(sum * 100) / 100 })
            }
            return { shares: allocate(bill, raw), commonCents: 0 }
        }
        case 'exact': {
            const entries = participants.map((id) => {
                const value = input.exactCents?.[id]
                return value == null ? null : Math.max(0, Math.round(value))
            })
            const { values, diffCents } = fillRemainder(bill, entries)
            if (diffCents !== 0) issues.push({ code: 'exact_mismatch', diffCents })
            return { shares: values, commonCents: 0 }
        }
        case 'items': {
            const index = new Map(participants.map((id, i) => [id, i]))
            const shares = participants.map(() => 0)
            let itemsTotal = 0
            for (const item of input.items ?? []) {
                const price = Math.max(0, Math.round(item.priceCents || 0))
                const consumers = Array.from(new Set(item.consumerIds)).filter((id) => index.has(id))
                // Keep the participant order so remainder cents are deterministic.
                consumers.sort((a, b) => (index.get(a) ?? 0) - (index.get(b) ?? 0))
                if (price <= 0) {
                    if (item.name.trim() || consumers.length > 0) issues.push({ code: 'item_without_price', itemId: item.id })
                    continue
                }
                if (consumers.length === 0) {
                    issues.push({ code: 'item_without_people', itemId: item.id })
                    continue
                }
                itemsTotal += price
                splitEqually(price, consumers.length).forEach((part, i) => {
                    shares[index.get(consumers[i]) ?? 0] += part
                })
            }
            const commonCents = bill - itemsTotal
            if (commonCents < 0) {
                issues.push({ code: 'items_over_bill', diffCents: -commonCents })
                return { shares, commonCents: 0 }
            }
            splitEqually(commonCents, n).forEach((part, i) => {
                shares[i] += part
            })
            return { shares, commonCents }
        }
        default:
            return { shares: splitEqually(bill, n), commonCents: 0 }
    }
}

export function computeSplit(input: SplitInput): SplitResult {
    const issues: SplitIssue[] = []
    const billCents = Math.max(0, Math.round(input.billCents || 0))
    const participants = Array.from(new Set(input.participantIds.filter(Boolean)))
    const { tipCents, roundingCents, totalCents } = totalFor(billCents, input.tipPercent, input.roundStepCents)

    if (billCents <= 0) issues.push({ code: 'bill_missing' })
    if (participants.length === 0) issues.push({ code: 'no_participants' })
    const payers = input.payments.filter((entry) => !!entry.personId)
    if (payers.length === 0) issues.push({ code: 'no_payers' })

    const { shares: base, commonCents } =
        billCents > 0 && participants.length > 0
            ? baseShares({ ...input, billCents }, participants, issues)
            : { shares: participants.map(() => 0), commonCents: 0 }

    // Tip + rounding: proportional to what each person consumed.
    const step = input.roundStepCents && input.roundStepCents > 0 ? Math.round(input.roundStepCents) : 0
    let finalShares: number[]
    if (step > 0 && totalCents > 0 && participants.length > 0) {
        finalShares = allocate(totalCents / step, base).map((units) => units * step)
    } else {
        const extra = allocate(totalCents - billCents, base)
        finalShares = base.map((value, i) => value + (extra[i] ?? 0))
    }

    const { paid, diffCents: paidDiff } = resolvePayments(totalCents, payers)
    if (payers.length > 0 && totalCents > 0 && paidDiff !== 0) issues.push({ code: 'paid_mismatch', diffCents: paidDiff })

    // Everyone involved: participants first (their order), then payers who did not consume.
    const ids = [...participants, ...Array.from(paid.keys()).filter((id) => !participants.includes(id))]
    const people: PersonResult[] = ids.map((personId) => {
        const i = participants.indexOf(personId)
        const baseCents = i >= 0 ? base[i] : 0
        const shareCents = i >= 0 ? finalShares[i] : 0
        const paidCents = paid.get(personId) ?? 0
        return {
            personId,
            baseCents,
            extraCents: shareCents - baseCents,
            shareCents,
            paidCents,
            balanceCents: paidCents - shareCents,
        }
    })

    const ok = issues.length === 0
    return {
        ok,
        issues,
        billCents,
        tipCents,
        roundingCents,
        totalCents,
        paidCents: Array.from(paid.values()).reduce((sum, value) => sum + value, 0),
        commonCents,
        people,
        transfers: ok ? settle(people.map((person) => ({ id: person.personId, cents: person.balanceCents }))) : [],
    }
}

// ------------------------------------------------------------
// Group settlement (open debts → minimal transfers)
// ------------------------------------------------------------

export interface OpenDebtLike {
    creditor_id: string
    debtor_id: string
    amount: number
    amount_paid: number
    status: string
    currency: string
}

export interface CurrencySettlement {
    currency: string
    /** Net per member: positive = the group owes them, negative = they owe the group. */
    balances: Array<{ id: string; cents: number }>
    transfers: Transfer[]
    /** Sum of every open debt (what is pending without simplifying). */
    openCents: number
    openDebts: number
}

/** Net balances + minimal transfers for every currency that has open debts. EUR first. */
export function settleOpenDebts(debts: OpenDebtLike[], memberOrder: string[] = []): CurrencySettlement[] {
    const byCurrency = new Map<string, { net: Map<string, number>; openCents: number; openDebts: number }>()
    for (const debt of debts) {
        if (debt.status === 'paid') continue
        const remaining = amountToCents(debt.amount) - amountToCents(debt.amount_paid)
        if (remaining <= 0) continue
        const bucket = byCurrency.get(debt.currency) ?? { net: new Map<string, number>(), openCents: 0, openDebts: 0 }
        bucket.net.set(debt.creditor_id, (bucket.net.get(debt.creditor_id) ?? 0) + remaining)
        bucket.net.set(debt.debtor_id, (bucket.net.get(debt.debtor_id) ?? 0) - remaining)
        bucket.openCents += remaining
        bucket.openDebts += 1
        byCurrency.set(debt.currency, bucket)
    }

    const rank = (id: string) => {
        const index = memberOrder.indexOf(id)
        return index >= 0 ? index : memberOrder.length
    }

    return Array.from(byCurrency.entries())
        .sort(([a], [b]) => (a === 'EUR' ? -1 : b === 'EUR' ? 1 : a.localeCompare(b)))
        .map(([currency, bucket]) => {
            const balances = Array.from(bucket.net.entries())
                .map(([id, cents]) => ({ id, cents }))
                .sort((a, b) => rank(a.id) - rank(b.id) || a.id.localeCompare(b.id))
            return {
                currency,
                balances,
                transfers: settle(balances),
                openCents: bucket.openCents,
                openDebts: bucket.openDebts,
            }
        })
}
