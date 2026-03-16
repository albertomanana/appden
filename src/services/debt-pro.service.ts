import { supabase } from '@lib/supabase/client'
import { buildWhatsAppUrl } from '@lib/utils'
import type {
    Debt,
    DebtCurrency,
    DebtInstallment,
    DebtReminder,
    DebtReminderFrequency,
    DebtSplitMode,
    GroupFinancialHealth,
    GroupGoal,
    GroupGoalStatus,
    GroupGoalType,
    GroupMember,
    GroupMemberPermission,
    GroupSettlementTransfer,
    MonthlyDebtSummary,
    UserBadge,
} from '@/types'

const STORAGE_KEYS = {
    reminders: 'appden:debt-reminders:v1',
    installments: 'appden:debt-installments:v1',
    goals: 'appden:debt-goals:v1',
    badges: 'appden:debt-badges:v1',
    permissions: 'appden:group-permissions:v1',
} as const

type SplitParticipantInput = {
    debtorId: string
    percentage?: number
    exactAmount?: number
}

type CreateSplitDebtsInput = {
    groupId: string
    creditorId: string
    concept: string
    totalAmount: number
    currency: DebtCurrency
    mode: DebtSplitMode
    participants: SplitParticipantInput[]
}

type ReminderChannels = {
    push: boolean
    email: boolean
    whatsapp: boolean
}

type ReminderConfigInput = {
    debtId: string
    groupId: string
    debtorId: string
    createdBy: string
    frequency: DebtReminderFrequency
    channels: ReminderChannels
    active: boolean
}

type CreatePlanInput = {
    debtId: string
    totalAmount: number
    amountPaid: number
    installments: number
    firstDueDate: string
}

type GoalInput = {
    groupId: string
    createdBy: string
    title: string
    targetType: GroupGoalType
    targetValue: number
    deadline?: string | null
}

type PermissionInput = {
    groupId: string
    userId: string
    updatedBy: string
    canManageDebts: boolean
    canManageMusic: boolean
    canManageFiles: boolean
    canManageMembers: boolean
}

export const debtProService = {
    calculateSplitShares(
        totalAmount: number,
        mode: DebtSplitMode,
        participants: SplitParticipantInput[]
    ): Array<{ debtorId: string; amount: number }> {
        const validParticipants = participants.filter((item) => !!item.debtorId)
        if (totalAmount <= 0 || validParticipants.length === 0) return []

        if (mode === 'equal') return splitEqual(totalAmount, validParticipants)
        if (mode === 'percentage') return splitByPercentage(totalAmount, validParticipants)
        return splitByExact(totalAmount, validParticipants)
    },

    async createSplitDebts(input: CreateSplitDebtsInput): Promise<Debt[]> {
        const shares = this.calculateSplitShares(input.totalAmount, input.mode, input.participants)
        if (shares.length === 0) return []

        const payload = shares
            .filter((share) => share.amount > 0)
            .map((share) => ({
                group_id: input.groupId,
                creditor_id: input.creditorId,
                debtor_id: share.debtorId,
                amount: roundMoney(share.amount),
                currency: input.currency,
                concept: `${input.concept} (${splitLabel(input.mode)})`,
                status: 'pending',
                amount_paid: 0,
            }))

        const { data, error } = await supabase.from('debts').insert(payload).select('*')
        if (error) throw error
        return (data ?? []) as Debt[]
    },

    async getReminderConfig(debtId: string): Promise<DebtReminder | null> {
        const { data, error } = await supabase
            .from('debt_reminders')
            .select('*')
            .eq('debt_id', debtId)
            .maybeSingle()

        if (error) {
            if (isMissingRelationError(error)) return readReminderFallback(debtId)
            throw error
        }

        return (data as DebtReminder | null) ?? null
    },

    async upsertReminderConfig(input: ReminderConfigInput): Promise<DebtReminder> {
        const payload = {
            debt_id: input.debtId,
            group_id: input.groupId,
            debtor_id: input.debtorId,
            created_by: input.createdBy,
            frequency: input.frequency,
            channels: input.channels,
            active: input.active,
            next_run_at: nextReminderDate(input.frequency),
            updated_at: new Date().toISOString(),
        }

        const { data, error } = await supabase
            .from('debt_reminders')
            .upsert(payload, { onConflict: 'debt_id' })
            .select('*')
            .single()

        if (error) {
            if (isMissingRelationError(error)) return upsertReminderFallback(payload)
            throw error
        }

        return data as DebtReminder
    },
    async sendReminderNow(
        debt: Pick<Debt, 'id' | 'concept' | 'amount' | 'amount_paid' | 'currency'>,
        debtorName: string,
        reminder: DebtReminder
    ): Promise<{ whatsappUrl: string | null }> {
        const remaining = Math.max(0, debt.amount - debt.amount_paid)
        const text = `Recordatorio: ${debtorName}, tienes pendiente ${remaining.toFixed(2)} ${debt.currency} por "${debt.concept}".`

        if (reminder.channels.push && typeof window !== 'undefined' && 'Notification' in window) {
            if (Notification.permission === 'granted') {
                new Notification('The Appden - Recordatorio de deuda', { body: text })
            }
        }

        const whatsappUrl = reminder.channels.whatsapp ? buildWhatsAppUrl(text) : null

        const payload = {
            last_sent_at: new Date().toISOString(),
            next_run_at: nextReminderDate(reminder.frequency),
            updated_at: new Date().toISOString(),
        }

        const { error } = await supabase
            .from('debt_reminders')
            .update(payload)
            .eq('debt_id', debt.id)

        if (error && isMissingRelationError(error)) touchReminderFallback(debt.id, payload)
        else if (error) throw error

        return { whatsappUrl }
    },

    async requestPushPermission(): Promise<NotificationPermission | 'unsupported'> {
        if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported'
        if (Notification.permission === 'granted') return 'granted'
        return Notification.requestPermission()
    },

    async createPaymentPlan(input: CreatePlanInput): Promise<DebtInstallment[]> {
        const safeCount = Math.max(1, Math.floor(input.installments))
        const remaining = Math.max(0, input.totalAmount - input.amountPaid)
        if (remaining <= 0) return []

        const base = roundMoney(remaining / safeCount)
        const items: DebtInstallment[] = []
        let assigned = 0

        for (let index = 0; index < safeCount; index += 1) {
            const amount = index === safeCount - 1 ? roundMoney(remaining - assigned) : base
            assigned += amount
            items.push({
                id: crypto.randomUUID(),
                debt_id: input.debtId,
                installment_number: index + 1,
                amount,
                due_date: addMonths(input.firstDueDate, index),
                status: 'pending',
                paid_at: null,
                created_at: new Date().toISOString(),
            })
        }

        const payload = items.map((item) => ({
            debt_id: item.debt_id,
            installment_number: item.installment_number,
            amount: item.amount,
            due_date: item.due_date,
            status: item.status,
            paid_at: null,
        }))

        const { data, error } = await supabase
            .from('debt_installments')
            .upsert(payload, { onConflict: 'debt_id,installment_number' })
            .select('*')
            .order('installment_number', { ascending: true })

        if (error) {
            if (isMissingRelationError(error)) {
                writeInstallmentFallback(input.debtId, items)
                return items
            }
            throw error
        }

        return (data ?? []) as DebtInstallment[]
    },

    async getPaymentPlan(debtId: string, amountPaid: number): Promise<DebtInstallment[]> {
        const { data, error } = await supabase
            .from('debt_installments')
            .select('*')
            .eq('debt_id', debtId)
            .order('installment_number', { ascending: true })

        if (error) {
            if (isMissingRelationError(error)) {
                return applyInstallmentPayments(readInstallmentFallback(debtId), amountPaid)
            }
            throw error
        }

        return applyInstallmentPayments((data ?? []) as DebtInstallment[], amountPaid)
    },
    async getSettlementPlan(groupId: string): Promise<GroupSettlementTransfer[]> {
        const { data, error } = await supabase
            .from('debts')
            .select('creditor_id, debtor_id, amount, amount_paid, status, currency')
            .eq('group_id', groupId)
            .neq('status', 'paid')

        if (error) throw error

        const byCurrency = new Map<DebtCurrency, Array<{ creditorId: string; debtorId: string; remaining: number }>>()
        for (const row of data ?? []) {
            const remaining = Math.max(0, Number(row.amount) - Number(row.amount_paid))
            if (remaining <= 0) continue
            const currency = row.currency as DebtCurrency
            const list = byCurrency.get(currency) ?? []
            list.push({ creditorId: String(row.creditor_id), debtorId: String(row.debtor_id), remaining })
            byCurrency.set(currency, list)
        }

        const transfers: GroupSettlementTransfer[] = []

        for (const [currency, rows] of byCurrency.entries()) {
            const net = new Map<string, number>()
            for (const row of rows) {
                net.set(row.creditorId, (net.get(row.creditorId) ?? 0) + row.remaining)
                net.set(row.debtorId, (net.get(row.debtorId) ?? 0) - row.remaining)
            }

            const creditors = Array.from(net.entries())
                .filter(([, amount]) => amount > 0.009)
                .map(([userId, amount]) => ({ userId, amount }))
                .sort((a, b) => b.amount - a.amount)

            const debtors = Array.from(net.entries())
                .filter(([, amount]) => amount < -0.009)
                .map(([userId, amount]) => ({ userId, amount: Math.abs(amount) }))
                .sort((a, b) => b.amount - a.amount)

            let creditorIndex = 0
            let debtorIndex = 0

            while (creditorIndex < creditors.length && debtorIndex < debtors.length) {
                const creditor = creditors[creditorIndex]
                const debtor = debtors[debtorIndex]
                const amount = roundMoney(Math.min(creditor.amount, debtor.amount))

                if (amount > 0) {
                    transfers.push({
                        from_user_id: debtor.userId,
                        to_user_id: creditor.userId,
                        amount,
                        currency,
                    })
                }

                creditor.amount = roundMoney(creditor.amount - amount)
                debtor.amount = roundMoney(debtor.amount - amount)

                if (creditor.amount <= 0.009) creditorIndex += 1
                if (debtor.amount <= 0.009) debtorIndex += 1
            }
        }

        return transfers
    },

    async getMonthlySummary(groupId: string, month?: string): Promise<MonthlyDebtSummary> {
        const target = month ?? currentMonthKey()
        const [year, monthNum] = target.split('-').map(Number)
        const start = new Date(Date.UTC(year, monthNum - 1, 1, 0, 0, 0)).toISOString()
        const end = new Date(Date.UTC(year, monthNum, 1, 0, 0, 0)).toISOString()

        const { data: debts, error: debtsError } = await supabase
            .from('debts')
            .select('id, amount, amount_paid, status, created_at')
            .eq('group_id', groupId)

        if (debtsError) throw debtsError

        const createdThisMonth = (debts ?? []).filter((item) => item.created_at >= start && item.created_at < end)
        const totalCreated = createdThisMonth.reduce((sum, item) => sum + Number(item.amount), 0)

        const pendingAmount = (debts ?? [])
            .filter((item) => item.status !== 'paid')
            .reduce((sum, item) => sum + Math.max(0, Number(item.amount) - Number(item.amount_paid)), 0)

        const debtIds = (debts ?? []).map((item) => item.id)
        let totalPaid = 0

        if (debtIds.length > 0) {
            const { data: payments, error: paymentsError } = await supabase
                .from('debt_payments')
                .select('amount, created_at')
                .in('debt_id', debtIds)
                .gte('created_at', start)
                .lt('created_at', end)

            if (!paymentsError) {
                totalPaid = (payments ?? []).reduce((sum, item) => sum + Number(item.amount), 0)
            }
        }

        const overdueAmount = await this.getOverdueAmount(groupId)

        return {
            month: target,
            total_created: roundMoney(totalCreated),
            total_paid: roundMoney(totalPaid),
            pending_amount: roundMoney(pendingAmount),
            overdue_amount: roundMoney(overdueAmount),
            active_debts: (debts ?? []).filter((item) => item.status !== 'paid').length,
        }
    },

    async getFinancialHealth(groupId: string): Promise<GroupFinancialHealth> {
        const { data: debts, error } = await supabase
            .from('debts')
            .select('creditor_id, debtor_id, amount, amount_paid, status')
            .eq('group_id', groupId)

        if (error) throw error

        const totalAmount = (debts ?? []).reduce((sum, item) => sum + Number(item.amount), 0)
        const totalPaid = (debts ?? []).reduce((sum, item) => sum + Number(item.amount_paid), 0)
        const pending = (debts ?? []).reduce((sum, item) => {
            if (item.status === 'paid') return sum
            return sum + Math.max(0, Number(item.amount) - Number(item.amount_paid))
        }, 0)

        const overdue = await this.getOverdueAmount(groupId)
        const overdueRatio = pending > 0 ? clamp01(overdue / pending) : 0
        const repaymentRatio = totalAmount > 0 ? clamp01(totalPaid / totalAmount) : 1

        const debtByDebtor = new Map<string, number>()
        for (const debt of debts ?? []) {
            const remaining = Math.max(0, Number(debt.amount) - Number(debt.amount_paid))
            if (remaining <= 0) continue
            debtByDebtor.set(String(debt.debtor_id), (debtByDebtor.get(String(debt.debtor_id)) ?? 0) + remaining)
        }

        const maxConcentration = Math.max(0, ...Array.from(debtByDebtor.values()))
        const concentrationRatio = pending > 0 ? clamp01(maxConcentration / pending) : 0

        const score = Math.round(Math.max(0, Math.min(100, 100 - overdueRatio * 40 - (1 - repaymentRatio) * 35 - concentrationRatio * 25)))

        const status = score >= 85 ? 'excellent' : score >= 70 ? 'healthy' : score >= 45 ? 'warning' : 'critical'

        return {
            score,
            status,
            indicators: { overdueRatio, repaymentRatio, concentrationRatio },
        }
    },
    async listGoals(groupId: string): Promise<GroupGoal[]> {
        const { data, error } = await supabase
            .from('group_goals')
            .select('*')
            .eq('group_id', groupId)
            .order('created_at', { ascending: false })

        if (error) {
            if (isMissingRelationError(error)) return readGoalFallback(groupId)
            throw error
        }

        return (data ?? []) as GroupGoal[]
    },

    async createGoal(input: GoalInput): Promise<GroupGoal> {
        const payload = {
            group_id: input.groupId,
            created_by: input.createdBy,
            title: input.title.trim(),
            target_type: input.targetType,
            target_value: input.targetValue,
            current_value: 0,
            deadline: input.deadline ?? null,
            status: 'active' as GroupGoalStatus,
        }

        const { data, error } = await supabase.from('group_goals').insert(payload).select('*').single()

        if (error) {
            if (isMissingRelationError(error)) return createGoalFallback(payload)
            throw error
        }

        return data as GroupGoal
    },

    async updateGoalProgress(goalId: string, currentValue: number): Promise<void> {
        const goal = await this.getGoalById(goalId)
        if (!goal) return

        const normalized = Math.max(0, currentValue)
        const completed = normalized >= goal.target_value
        const payload = {
            current_value: normalized,
            status: completed ? 'completed' : goal.status,
            updated_at: new Date().toISOString(),
        }

        const { error } = await supabase.from('group_goals').update(payload).eq('id', goalId)

        if (error) {
            if (isMissingRelationError(error)) {
                updateGoalFallback(goalId, payload.current_value, payload.status as GroupGoalStatus)
                return
            }
            throw error
        }
    },

    async listBadges(groupId: string, userId?: string): Promise<UserBadge[]> {
        let query = supabase.from('user_badges').select('*').eq('group_id', groupId).order('awarded_at', { ascending: false })
        if (userId) query = query.eq('user_id', userId)

        const { data, error } = await query
        if (error) {
            if (isMissingRelationError(error)) {
                return readBadgeFallback(groupId).filter((item) => (userId ? item.user_id === userId : true))
            }
            throw error
        }

        return (data ?? []) as UserBadge[]
    },

    async recomputeBadges(groupId: string): Promise<UserBadge[]> {
        const [debtsResult, membersResult] = await Promise.all([
            supabase.from('debts').select('creditor_id, debtor_id, amount, amount_paid, status').eq('group_id', groupId),
            supabase.from('group_members').select('user_id').eq('group_id', groupId),
        ])

        if (debtsResult.error) throw debtsResult.error
        if (membersResult.error) throw membersResult.error

        const debts = debtsResult.data ?? []
        const members = (membersResult.data ?? []) as Array<Pick<GroupMember, 'user_id'>>

        const outstandingByDebtor = new Map<string, number>()
        const lentByCreditor = new Map<string, number>()

        for (const debt of debts) {
            const remaining = Math.max(0, Number(debt.amount) - Number(debt.amount_paid))
            if (remaining > 0) {
                outstandingByDebtor.set(String(debt.debtor_id), (outstandingByDebtor.get(String(debt.debtor_id)) ?? 0) + remaining)
            }
            lentByCreditor.set(String(debt.creditor_id), (lentByCreditor.get(String(debt.creditor_id)) ?? 0) + Number(debt.amount))
        }

        let topContributor: string | null = null
        let topAmount = 0
        for (const [userId, amount] of lentByCreditor.entries()) {
            if (amount > topAmount) {
                topAmount = amount
                topContributor = userId
            }
        }

        const badges: UserBadge[] = []
        for (const member of members) {
            const userId = String(member.user_id)
            const outstanding = outstandingByDebtor.get(userId) ?? 0

            if (outstanding <= 0.009) badges.push(buildBadge(groupId, userId, 'sin_deuda', 'Sin deuda'))
            if (topContributor && userId === topContributor) badges.push(buildBadge(groupId, userId, 'top_contributor', 'Top contributor'))

            const debtsAsDebtor = debts.filter((item) => String(item.debtor_id) === userId)
            const fullyPaid = debtsAsDebtor.length > 0 && debtsAsDebtor.every((item) => item.status === 'paid')
            if (fullyPaid) badges.push(buildBadge(groupId, userId, 'pagador_constante', 'Pagador constante'))
        }

        const uniqueBadges = dedupeBadges(badges)
        const payload = uniqueBadges.map((badge) => ({
            group_id: badge.group_id,
            user_id: badge.user_id,
            badge_key: badge.badge_key,
            badge_label: badge.badge_label,
            payload: badge.payload,
        }))

        const { error } = await supabase.from('user_badges').upsert(payload, { onConflict: 'group_id,user_id,badge_key' })

        if (error) {
            if (isMissingRelationError(error)) {
                writeBadgeFallback(groupId, uniqueBadges)
                return uniqueBadges
            }
            throw error
        }

        return uniqueBadges
    },
    async exportGroupData(groupId: string, format: 'csv' | 'json'): Promise<{ filename: string; mime: string; content: string }> {
        const { data: debts, error } = await supabase
            .from('debts')
            .select('id, creditor_id, debtor_id, amount, amount_paid, currency, concept, status, created_at, updated_at')
            .eq('group_id', groupId)
            .order('created_at', { ascending: false })

        if (error) throw error

        if (format === 'json') {
            return {
                filename: `the-appden-debts-${groupId}.json`,
                mime: 'application/json',
                content: JSON.stringify({ exportedAt: new Date().toISOString(), debts: debts ?? [] }, null, 2),
            }
        }

        const header = ['id', 'creditor_id', 'debtor_id', 'amount', 'amount_paid', 'currency', 'concept', 'status', 'created_at', 'updated_at']
        const rows = (debts ?? []).map((row) => [
            row.id,
            row.creditor_id,
            row.debtor_id,
            Number(row.amount).toFixed(2),
            Number(row.amount_paid).toFixed(2),
            row.currency,
            sanitizeCsv(String(row.concept ?? '')),
            row.status,
            row.created_at,
            row.updated_at,
        ])

        return {
            filename: `the-appden-debts-${groupId}.csv`,
            mime: 'text/csv;charset=utf-8',
            content: [header.join(','), ...rows.map((r) => r.map(csvCell).join(','))].join('\n'),
        }
    },

    async listGroupPermissions(groupId: string): Promise<GroupMemberPermission[]> {
        const { data, error } = await supabase.from('group_member_permissions').select('*').eq('group_id', groupId)

        if (error) {
            if (isMissingRelationError(error)) return readPermissionFallback(groupId)
            throw error
        }

        return (data ?? []) as GroupMemberPermission[]
    },

    async upsertGroupPermission(input: PermissionInput): Promise<GroupMemberPermission> {
        const payload = {
            group_id: input.groupId,
            user_id: input.userId,
            can_manage_debts: input.canManageDebts,
            can_manage_music: input.canManageMusic,
            can_manage_files: input.canManageFiles,
            can_manage_members: input.canManageMembers,
            updated_by: input.updatedBy,
            updated_at: new Date().toISOString(),
        }

        const { data, error } = await supabase
            .from('group_member_permissions')
            .upsert(payload, { onConflict: 'group_id,user_id' })
            .select('*')
            .single()

        if (error) {
            if (isMissingRelationError(error)) return upsertPermissionFallback(payload)
            throw error
        }

        return data as GroupMemberPermission
    },

    async getOverdueAmount(groupId: string): Promise<number> {
        const today = new Date().toISOString().slice(0, 10)
        const { data: installments, error } = await supabase
            .from('debt_installments')
            .select('amount, status, due_date, debt:debts!inner(group_id)')
            .eq('debt.group_id', groupId)

        if (error) {
            if (isMissingRelationError(error)) return 0
            throw error
        }

        return roundMoney(
            (installments ?? []).reduce((sum, row) => {
                const dueDate = String((row as { due_date: string }).due_date)
                const status = String((row as { status: string }).status)
                if (status === 'paid' || dueDate >= today) return sum
                return sum + Number((row as { amount: number }).amount)
            }, 0)
        )
    },

    async getGoalById(goalId: string): Promise<GroupGoal | null> {
        const { data, error } = await supabase.from('group_goals').select('*').eq('id', goalId).maybeSingle()

        if (error) {
            if (isMissingRelationError(error)) {
                const all = readJson<GroupGoal[]>(STORAGE_KEYS.goals, [])
                return all.find((item) => item.id === goalId) ?? null
            }
            throw error
        }

        return (data as GroupGoal | null) ?? null
    },
}
function splitLabel(mode: DebtSplitMode): string {
    if (mode === 'equal') return 'igual'
    if (mode === 'percentage') return 'porcentaje'
    return 'exacto'
}

function splitEqual(totalAmount: number, participants: SplitParticipantInput[]): Array<{ debtorId: string; amount: number }> {
    const base = roundMoney(totalAmount / participants.length)
    let assigned = 0
    return participants.map((item, index) => {
        const amount = index === participants.length - 1 ? roundMoney(totalAmount - assigned) : base
        assigned += amount
        return { debtorId: item.debtorId, amount }
    })
}

function splitByPercentage(totalAmount: number, participants: SplitParticipantInput[]): Array<{ debtorId: string; amount: number }> {
    const percentageSum = participants.reduce((sum, item) => sum + (item.percentage ?? 0), 0)
    const safeSum = percentageSum > 0 ? percentageSum : 100

    let assigned = 0
    return participants.map((item, index) => {
        const weight = (item.percentage ?? 0) / safeSum
        const amount = index === participants.length - 1 ? roundMoney(totalAmount - assigned) : roundMoney(totalAmount * weight)
        assigned += amount
        return { debtorId: item.debtorId, amount }
    })
}

function splitByExact(totalAmount: number, participants: SplitParticipantInput[]): Array<{ debtorId: string; amount: number }> {
    let assigned = 0
    return participants.map((item, index) => {
        const amount = index === participants.length - 1 ? roundMoney(totalAmount - assigned) : roundMoney(item.exactAmount ?? 0)
        assigned += amount
        return { debtorId: item.debtorId, amount }
    })
}

function nextReminderDate(frequency: DebtReminderFrequency): string {
    const days = frequency === 'suave' ? 7 : frequency === 'normal' ? 3 : 1
    return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString()
}

function addMonths(dateIso: string, months: number): string {
    const base = new Date(dateIso)
    const date = new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth() + months, base.getUTCDate()))
    return date.toISOString().slice(0, 10)
}

function applyInstallmentPayments(items: DebtInstallment[], amountPaid: number): DebtInstallment[] {
    let remainingPaid = Math.max(0, amountPaid)
    const today = new Date().toISOString().slice(0, 10)

    return items.map((item) => {
        const amount = Number(item.amount)
        const covered = Math.max(0, Math.min(amount, remainingPaid))
        remainingPaid = Math.max(0, remainingPaid - covered)

        const status = covered >= amount ? 'paid' : item.due_date < today ? 'overdue' : 'pending'

        return {
            ...item,
            status,
            paid_at: covered >= amount ? item.paid_at ?? new Date().toISOString() : null,
        }
    })
}

function buildBadge(groupId: string, userId: string, badgeKey: string, badgeLabel: string): UserBadge {
    return {
        id: crypto.randomUUID(),
        group_id: groupId,
        user_id: userId,
        badge_key: badgeKey,
        badge_label: badgeLabel,
        awarded_at: new Date().toISOString(),
        payload: {},
    }
}

function dedupeBadges(items: UserBadge[]): UserBadge[] {
    const map = new Map<string, UserBadge>()
    for (const item of items) map.set(`${item.group_id}:${item.user_id}:${item.badge_key}`, item)
    return Array.from(map.values())
}

function currentMonthKey(): string {
    const now = new Date()
    return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`
}

function sanitizeCsv(value: string): string {
    return value.replace(/\n/g, ' ').replace(/\r/g, ' ').trim()
}

function csvCell(value: string): string {
    if (/[,"\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`
    return value
}

function roundMoney(value: number): number {
    return Math.round(value * 100) / 100
}

function clamp01(value: number): number {
    return Math.max(0, Math.min(1, value))
}

function readJson<T>(key: string, fallback: T): T {
    if (typeof window === 'undefined') return fallback
    try {
        const raw = window.localStorage.getItem(key)
        if (!raw) return fallback
        return JSON.parse(raw) as T
    } catch {
        return fallback
    }
}

function writeJson<T>(key: string, value: T): void {
    if (typeof window === 'undefined') return
    try {
        window.localStorage.setItem(key, JSON.stringify(value))
    } catch {
        // Ignore storage errors.
    }
}

function isMissingRelationError(error: unknown): boolean {
    if (!error || typeof error !== 'object') return false
    const e = error as { code?: string; message?: string; details?: string }
    const raw = `${e.code ?? ''} ${e.message ?? ''} ${e.details ?? ''}`.toLowerCase()
    return raw.includes('42p01') || raw.includes('pgrst205') || raw.includes('does not exist')
}

function readReminderFallback(debtId: string): DebtReminder | null {
    const all = readJson<DebtReminder[]>(STORAGE_KEYS.reminders, [])
    return all.find((item) => item.debt_id === debtId) ?? null
}

function upsertReminderFallback(payload: {
    debt_id: string
    group_id: string
    debtor_id: string
    created_by: string
    frequency: DebtReminderFrequency
    channels: ReminderChannels
    active: boolean
    next_run_at: string
    updated_at: string
}): DebtReminder {
    const all = readJson<DebtReminder[]>(STORAGE_KEYS.reminders, [])
    const now = new Date().toISOString()
    const existing = all.find((item) => item.debt_id === payload.debt_id)

    const nextItem: DebtReminder = {
        id: existing?.id ?? crypto.randomUUID(),
        debt_id: payload.debt_id,
        group_id: payload.group_id,
        debtor_id: payload.debtor_id,
        created_by: payload.created_by,
        frequency: payload.frequency,
        channels: payload.channels,
        next_run_at: payload.next_run_at,
        last_sent_at: existing?.last_sent_at ?? null,
        active: payload.active,
        created_at: existing?.created_at ?? now,
        updated_at: payload.updated_at,
    }

    const next = [nextItem, ...all.filter((item) => item.debt_id !== payload.debt_id)]
    writeJson(STORAGE_KEYS.reminders, next)
    return nextItem
}

function touchReminderFallback(debtId: string, payload: { last_sent_at: string; next_run_at: string; updated_at: string }): void {
    const all = readJson<DebtReminder[]>(STORAGE_KEYS.reminders, [])
    const next = all.map((item) => {
        if (item.debt_id !== debtId) return item
        return { ...item, last_sent_at: payload.last_sent_at, next_run_at: payload.next_run_at, updated_at: payload.updated_at }
    })
    writeJson(STORAGE_KEYS.reminders, next)
}

function readInstallmentFallback(debtId: string): DebtInstallment[] {
    const store = readJson<Record<string, DebtInstallment[]>>(STORAGE_KEYS.installments, {})
    return store[debtId] ?? []
}

function writeInstallmentFallback(debtId: string, installments: DebtInstallment[]): void {
    const store = readJson<Record<string, DebtInstallment[]>>(STORAGE_KEYS.installments, {})
    store[debtId] = installments
    writeJson(STORAGE_KEYS.installments, store)
}

function readGoalFallback(groupId: string): GroupGoal[] {
    return readJson<GroupGoal[]>(STORAGE_KEYS.goals, []).filter((item) => item.group_id === groupId)
}

function createGoalFallback(payload: {
    group_id: string
    created_by: string
    title: string
    target_type: GroupGoalType
    target_value: number
    current_value: number
    deadline: string | null
    status: GroupGoalStatus
}): GroupGoal {
    const all = readJson<GroupGoal[]>(STORAGE_KEYS.goals, [])
    const now = new Date().toISOString()
    const nextGoal: GroupGoal = {
        id: crypto.randomUUID(),
        group_id: payload.group_id,
        created_by: payload.created_by,
        title: payload.title,
        target_type: payload.target_type,
        target_value: payload.target_value,
        current_value: payload.current_value,
        deadline: payload.deadline,
        status: payload.status,
        created_at: now,
        updated_at: now,
    }
    writeJson(STORAGE_KEYS.goals, [nextGoal, ...all])
    return nextGoal
}

function updateGoalFallback(goalId: string, currentValue: number, status: GroupGoalStatus): void {
    const all = readJson<GroupGoal[]>(STORAGE_KEYS.goals, [])
    const next = all.map((item) => {
        if (item.id !== goalId) return item
        return { ...item, current_value: currentValue, status, updated_at: new Date().toISOString() }
    })
    writeJson(STORAGE_KEYS.goals, next)
}

function readBadgeFallback(groupId: string): UserBadge[] {
    return readJson<UserBadge[]>(STORAGE_KEYS.badges, []).filter((item) => item.group_id === groupId)
}

function writeBadgeFallback(groupId: string, badges: UserBadge[]): void {
    const all = readJson<UserBadge[]>(STORAGE_KEYS.badges, [])
    const keep = all.filter((item) => item.group_id !== groupId)
    writeJson(STORAGE_KEYS.badges, [...badges, ...keep])
}

function readPermissionFallback(groupId: string): GroupMemberPermission[] {
    return readJson<GroupMemberPermission[]>(STORAGE_KEYS.permissions, []).filter((item) => item.group_id === groupId)
}

function upsertPermissionFallback(payload: {
    group_id: string
    user_id: string
    can_manage_debts: boolean
    can_manage_music: boolean
    can_manage_files: boolean
    can_manage_members: boolean
    updated_by: string
    updated_at: string
}): GroupMemberPermission {
    const all = readJson<GroupMemberPermission[]>(STORAGE_KEYS.permissions, [])
    const existing = all.find((item) => item.group_id === payload.group_id && item.user_id === payload.user_id)

    const nextItem: GroupMemberPermission = {
        id: existing?.id ?? crypto.randomUUID(),
        group_id: payload.group_id,
        user_id: payload.user_id,
        can_manage_debts: payload.can_manage_debts,
        can_manage_music: payload.can_manage_music,
        can_manage_files: payload.can_manage_files,
        can_manage_members: payload.can_manage_members,
        updated_by: payload.updated_by,
        updated_at: payload.updated_at,
    }

    const next = [nextItem, ...all.filter((item) => !(item.group_id === payload.group_id && item.user_id === payload.user_id))]
    writeJson(STORAGE_KEYS.permissions, next)
    return nextItem
}
