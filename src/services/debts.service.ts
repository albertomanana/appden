import { supabase } from '@lib/supabase/client'
import type { Debt, DebtPayment, DebtUserSummary } from '@/types'
import type { DebtFormData, PaymentFormData } from '@lib/validators'

export const debtsService = {
    /**
     * Get all debts for a group (with creditor/debtor profiles).
     */
    async getDebts(groupId: string): Promise<Debt[]> {
        const { data, error } = await supabase
            .from('debts')
            .select(`
        *,
        creditor:profiles!debts_creditor_id_fkey(id, display_name, avatar_url),
        debtor:profiles!debts_debtor_id_fkey(id, display_name, avatar_url)
      `)
            .eq('group_id', groupId)
            .order('created_at', { ascending: false })

        if (error) throw error
        return data as Debt[]
    },

    /**
     * Get a single debt with its payment history.
     */
    async getDebt(debtId: string): Promise<Debt> {
        const { data, error } = await supabase
            .from('debts')
            .select(`
        *,
        creditor:profiles!debts_creditor_id_fkey(id, display_name, avatar_url),
        debtor:profiles!debts_debtor_id_fkey(id, display_name, avatar_url),
        payments:debt_payments(
          *,
          payer:profiles!debt_payments_paid_by_fkey(id, display_name, avatar_url)
        )
      `)
            .eq('id', debtId)
            .order('created_at', { referencedTable: 'debt_payments', ascending: true })
            .single()

        if (error) throw error
        return data as Debt
    },

    /**
     * Create a new debt.
     */
    async createDebt(
        groupId: string,
        creditorId: string,
        form: DebtFormData
    ): Promise<Debt> {
        const { data, error } = await supabase
            .from('debts')
            .insert({
                group_id: groupId,
                creditor_id: creditorId,
                debtor_id: form.debtor_id,
                amount: form.amount,
                currency: form.currency,
                concept: form.concept,
                status: 'pending',
                amount_paid: 0,
            })
            .select()
            .single()

        if (error) throw error
        return data as Debt
    },

    /**
     * Register a partial or full payment on a debt.
     * Updates debt status automatically based on amount_paid vs amount.
     */
    async registerPayment(
        debtId: string,
        userId: string,
        form: PaymentFormData,
        totalOwed: number,
        currentPaid: number
    ): Promise<DebtPayment> {
        const newPaid = Math.min(currentPaid + form.amount, totalOwed)
        const newStatus = newPaid >= totalOwed ? 'paid' : newPaid > 0 ? 'partial' : 'pending'

        // Insert payment record
        const { data: payment, error: paymentError } = await supabase
            .from('debt_payments')
            .insert({
                debt_id: debtId,
                amount: form.amount,
                note: form.note || null,
                paid_by: userId,
            })
            .select()
            .single()

        if (paymentError) throw paymentError

        // Update debt status + amount_paid
        const { error: updateError } = await supabase
            .from('debts')
            .update({
                amount_paid: newPaid,
                status: newStatus,
                updated_at: new Date().toISOString(),
            })
            .eq('id', debtId)

        if (updateError) throw updateError

        return payment as DebtPayment
    },

    /**
     * Mark a debt as fully paid.
     */
    async markAsPaid(debtId: string, totalAmount: number): Promise<void> {
        const { error } = await supabase
            .from('debts')
            .update({
                status: 'paid',
                amount_paid: totalAmount,
                updated_at: new Date().toISOString(),
            })
            .eq('id', debtId)

        if (error) throw error
    },

    /**
     * Compute per-user debt summary for a group.
     */
    async getGroupSummary(groupId: string): Promise<Record<string, { owed: number; lent: number }>> {
        const { data, error } = await supabase
            .from('debts')
            .select('creditor_id, debtor_id, amount, amount_paid, status, currency')
            .eq('group_id', groupId)
            .neq('status', 'paid')

        if (error) throw error

        const summary: Record<string, { owed: number; lent: number }> = {}

        for (const debt of data ?? []) {
            const remaining = debt.amount - debt.amount_paid

            if (!summary[debt.creditor_id]) summary[debt.creditor_id] = { owed: 0, lent: 0 }
            if (!summary[debt.debtor_id]) summary[debt.debtor_id] = { owed: 0, lent: 0 }

            summary[debt.creditor_id].lent += remaining
            summary[debt.debtor_id].owed += remaining
        }

        return summary
    },
}
