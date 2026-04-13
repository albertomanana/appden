import { supabase } from '@lib/supabase/client'

export const accountRequestsService = {
    async listPending(): Promise<any[]> {
        const { data, error } = await supabase
            .from('account_requests')
            .select('*, profile:profiles(id, display_name, username, avatar_url)')
            .eq('status', 'pending')
            .order('created_at', { ascending: false })

        if (error) throw error
        return data ?? []
    },

    async approveRequest(requestId: string, adminId: string) {
        // Approve request: set profile.is_approved = true and update request status
        const { data, error } = await supabase.rpc('approve_account_request', { p_request_id: requestId, p_admin_user_id: adminId })
        if (error) throw error
        return data
    },

    async rejectRequest(requestId: string, message?: string) {
        const { error } = await supabase.from('account_requests').update({ status: 'rejected', message }).eq('id', requestId)
        if (error) throw error
    },
}

export default accountRequestsService
