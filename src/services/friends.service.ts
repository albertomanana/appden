import { supabase } from '@lib/supabase/client'
import { connectionsService } from '@features/social/services/connections.service'

export type GroupFriendRequestStatus = 'pending' | 'accepted' | 'rejected' | 'cancelled'

export interface GroupFriendRequest {
    id: string
    group_id: string | null
    from_user_id: string
    to_user_id: string
    status: GroupFriendRequestStatus
    created_at: string
    responded_at: string | null
}

async function requireCurrentUserId(): Promise<string> {
    const { data, error } = await supabase.auth.getUser()
    if (error) throw error
    const userId = data.user?.id
    if (!userId) throw new Error('Not authenticated')
    return userId
}

export const friendsService = {
    async sendRequest(_groupId: string, toUserId: string): Promise<GroupFriendRequest> {
        const fromUserId = await requireCurrentUserId()
        const request = await connectionsService.sendRequest(fromUserId, toUserId)
        return {
            ...request,
            group_id: null,
        }
    },

    async cancelRequest(requestId: string): Promise<GroupFriendRequest> {
        const request = await connectionsService.cancel(requestId)
        return {
            ...request,
            group_id: null,
        }
    },

    async acceptRequest(requestId: string): Promise<GroupFriendRequest> {
        const request = await connectionsService.respond(requestId, true)
        return {
            ...request,
            group_id: null,
        }
    },

    async rejectRequest(requestId: string): Promise<GroupFriendRequest> {
        const request = await connectionsService.respond(requestId, false)
        return {
            ...request,
            group_id: null,
        }
    },

    async getRequestsForGroup(_groupId: string): Promise<GroupFriendRequest[]> {
        const userId = await requireCurrentUserId()
        const { data, error } = await supabase
            .from('friend_requests')
            .select('*')
            .or(`from_user_id.eq.${userId},to_user_id.eq.${userId}`)
            .order('created_at', { ascending: false })

        if (error) throw error

        return ((data ?? []) as GroupFriendRequest[]).map((row) => ({
            ...row,
            group_id: null,
        }))
    },

    /**
     * Returns the most relevant relationship between viewer and other user.
     * groupId is kept for backwards compatibility and currently ignored.
     */
    async getFriendStatus(
        _groupId: string,
        viewerUserId: string,
        otherUserId: string
    ): Promise<
        | { kind: 'accepted'; request: GroupFriendRequest }
        | { kind: 'pending_incoming'; request: GroupFriendRequest }
        | { kind: 'pending_outgoing'; request: GroupFriendRequest }
        | { kind: 'none' }
    > {
        const relation = await connectionsService.getRelationship(viewerUserId, otherUserId)

        if (relation.kind === 'friend') {
            return {
                kind: 'accepted',
                request: {
                    id: relation.friendship.created_from_request ?? relation.friendship.id,
                    group_id: null,
                    from_user_id: relation.friendship.user_a,
                    to_user_id: relation.friendship.user_b,
                    status: 'accepted',
                    created_at: relation.friendship.created_at,
                    responded_at: relation.friendship.created_at,
                },
            }
        }

        if (relation.kind === 'incoming') {
            return {
                kind: 'pending_incoming',
                request: {
                    ...relation.request,
                    group_id: null,
                },
            }
        }

        if (relation.kind === 'outgoing') {
            return {
                kind: 'pending_outgoing',
                request: {
                    ...relation.request,
                    group_id: null,
                },
            }
        }

        return { kind: 'none' }
    },
}
