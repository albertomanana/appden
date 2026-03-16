import { supabase } from '@lib/supabase/client'

export type GroupFriendRequestStatus = 'pending' | 'accepted' | 'rejected' | 'cancelled'

export interface GroupFriendRequest {
    id: string
    group_id: string
    from_user_id: string
    to_user_id: string
    status: GroupFriendRequestStatus
    created_at: string
    responded_at: string | null
}

export const friendsService = {
    async sendRequest(groupId: string, toUserId: string): Promise<GroupFriendRequest> {
        const { data, error } = await supabase
            .from('group_friend_requests')
            .insert({ group_id: groupId, to_user_id: toUserId })
            .select()
            .single()

        if (error) throw error
        return data as GroupFriendRequest
    },

    async cancelRequest(requestId: string): Promise<GroupFriendRequest> {
        const { data, error } = await supabase
            .from('group_friend_requests')
            .update({ status: 'cancelled', responded_at: new Date().toISOString() })
            .eq('id', requestId)
            .select()
            .single()

        if (error) throw error
        return data as GroupFriendRequest
    },

    async acceptRequest(requestId: string): Promise<GroupFriendRequest> {
        const { data, error } = await supabase
            .from('group_friend_requests')
            .update({ status: 'accepted', responded_at: new Date().toISOString() })
            .eq('id', requestId)
            .select()
            .single()

        if (error) throw error
        return data as GroupFriendRequest
    },

    async rejectRequest(requestId: string): Promise<GroupFriendRequest> {
        const { data, error } = await supabase
            .from('group_friend_requests')
            .update({ status: 'rejected', responded_at: new Date().toISOString() })
            .eq('id', requestId)
            .select()
            .single()

        if (error) throw error
        return data as GroupFriendRequest
    },

    async getRequestsForGroup(groupId: string): Promise<GroupFriendRequest[]> {
        const { data, error } = await supabase
            .from('group_friend_requests')
            .select('*')
            .eq('group_id', groupId)
            .order('created_at', { ascending: false })

        if (error) throw error
        return (data ?? []) as GroupFriendRequest[]
    },

    /**
     * Returns the most relevant relationship between viewer and other user in a group.
     * - `accepted`: they are friends in that group
     * - `pending_incoming`: other user must accept
     * - `pending_outgoing`: waiting for other user
     * - `none`: no request found
     */
    async getFriendStatus(
        groupId: string,
        viewerUserId: string,
        otherUserId: string
    ): Promise<
        | { kind: 'accepted'; request: GroupFriendRequest }
        | { kind: 'pending_incoming'; request: GroupFriendRequest }
        | { kind: 'pending_outgoing'; request: GroupFriendRequest }
        | { kind: 'none' }
    > {
        const { data, error } = await supabase
            .from('group_friend_requests')
            .select('*')
            .eq('group_id', groupId)
            .or(
                `and(from_user_id.eq.${viewerUserId},to_user_id.eq.${otherUserId}),and(from_user_id.eq.${otherUserId},to_user_id.eq.${viewerUserId})`
            )
            .order('created_at', { ascending: false })
            .limit(1)

        if (error) throw error
        const row = (data ?? [])[0] as GroupFriendRequest | undefined
        if (!row) return { kind: 'none' }

        if (row.status === 'accepted') return { kind: 'accepted', request: row }
        if (row.status === 'pending' && row.to_user_id === viewerUserId) return { kind: 'pending_incoming', request: row }
        if (row.status === 'pending' && row.from_user_id === viewerUserId) return { kind: 'pending_outgoing', request: row }
        return { kind: 'none' }
    },
}

