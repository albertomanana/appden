import { supabase } from '@lib/supabase/client'
import type { Profile } from '@/types'

export type AccountRequest = {
    id: string
    profile_id: string
    email: string
    status: 'pending' | 'approved' | 'rejected' | 'cancelled'
    message: string | null
    created_at: string
    responded_at: string | null
    profile?: Pick<Profile, 'id' | 'display_name' | 'username' | 'avatar_url'> | null
}

export const accountRequestsService = {
    async listPending(): Promise<AccountRequest[]> {
        const { data, error } = await supabase
            .from('account_requests')
            .select('*, profile:profiles(id, display_name, username, avatar_url)')
            .eq('status', 'pending')
            .order('created_at', { ascending: false })

        if (error) throw error
        return (data ?? []) as AccountRequest[]
    },

    /** Approves the account (server-side check: caller must be an app admin). */
    async approveRequest(requestId: string, adminId: string): Promise<void> {
        const { error } = await supabase.rpc('approve_account_request', { p_request_id: requestId, p_admin_user_id: adminId })
        if (error) throw error
    },

    async rejectRequest(requestId: string, message?: string): Promise<void> {
        const { error } = await supabase.rpc('reject_account_request', { p_request_id: requestId, p_message: message ?? null })
        if (!error) return
        // Fallback for environments without migration 015.
        const { error: updateError } = await supabase
            .from('account_requests')
            .update({ status: 'rejected', message: message ?? null, responded_at: new Date().toISOString() })
            .eq('id', requestId)
        if (updateError) throw updateError
    },
}

export default accountRequestsService
