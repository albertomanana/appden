import { supabase } from '@lib/supabase/client'
import { profileService } from '@services/profile.service'
import type { FriendRequest, Friendship, Profile } from '@/types'

type RawFriendRequest = FriendRequest & {
    from_profile?: Pick<Profile, 'id' | 'display_name' | 'username' | 'avatar_url'>
    to_profile?: Pick<Profile, 'id' | 'display_name' | 'username' | 'avatar_url'>
}

type RawFriendship = Friendship & {
    profile_a?: Pick<Profile, 'id' | 'display_name' | 'username' | 'avatar_url'>
    profile_b?: Pick<Profile, 'id' | 'display_name' | 'username' | 'avatar_url'>
}

function normalizeFriendRequest(raw: RawFriendRequest): FriendRequest {
    return {
        ...raw,
        from_profile: raw.from_profile,
        to_profile: raw.to_profile,
    }
}

export const connectionsService = {
    async listIncoming(userId: string): Promise<FriendRequest[]> {
        const { data, error } = await supabase
            .from('friend_requests')
            .select('*, from_profile:profiles!friend_requests_from_user_id_fkey(id, display_name, username, avatar_url)')
            .eq('to_user_id', userId)
            .eq('status', 'pending')
            .order('created_at', { ascending: false })

        if (error) throw error
        return ((data ?? []) as RawFriendRequest[]).map(normalizeFriendRequest)
    },

    async listOutgoing(userId: string): Promise<FriendRequest[]> {
        const { data, error } = await supabase
            .from('friend_requests')
            .select('*, to_profile:profiles!friend_requests_to_user_id_fkey(id, display_name, username, avatar_url)')
            .eq('from_user_id', userId)
            .eq('status', 'pending')
            .order('created_at', { ascending: false })

        if (error) throw error
        return ((data ?? []) as RawFriendRequest[]).map(normalizeFriendRequest)
    },

    async listFriends(userId: string): Promise<Friendship[]> {
        const { data, error } = await supabase
            .from('friendships')
            .select('*, profile_a:profiles!friendships_user_a_fkey(id, display_name, username, avatar_url), profile_b:profiles!friendships_user_b_fkey(id, display_name, username, avatar_url)')
            .or(`user_a.eq.${userId},user_b.eq.${userId}`)
            .order('created_at', { ascending: false })

        if (error) throw error

        const rows = (data ?? []) as RawFriendship[]
        return rows.map((row) => ({
            ...row,
            friend_profile: row.user_a === userId ? row.profile_b : row.profile_a,
        }))
    },

    async listFriendIds(userId: string): Promise<Set<string>> {
        const friends = await this.listFriends(userId)
        return new Set(
            friends
                .map((row) => row.friend_profile?.id)
                .filter((id): id is string => !!id)
        )
    },

    async searchPeople(query: string, currentUserId: string): Promise<Profile[]> {
        const profiles = await profileService.searchProfiles(query, [currentUserId])
        return profiles
    },

    async getRelationship(
        viewerUserId: string,
        otherUserId: string
    ): Promise<
        | { kind: 'friend'; friendship: Friendship }
        | { kind: 'incoming'; request: FriendRequest }
        | { kind: 'outgoing'; request: FriendRequest }
        | { kind: 'none' }
    > {
        const [friends, requests] = await Promise.all([
            this.listFriends(viewerUserId),
            this.getRequestsBetween(viewerUserId, otherUserId),
        ])

        const friendship = friends.find((row) => row.friend_profile?.id === otherUserId)
        if (friendship) return { kind: 'friend', friendship }

        const latest = requests[0]
        if (!latest) return { kind: 'none' }

        if (latest.status === 'pending' && latest.to_user_id === viewerUserId) {
            return { kind: 'incoming', request: latest }
        }
        if (latest.status === 'pending' && latest.from_user_id === viewerUserId) {
            return { kind: 'outgoing', request: latest }
        }

        return { kind: 'none' }
    },

    async sendRequest(fromUserId: string, toUserId: string, message?: string): Promise<FriendRequest> {
        if (!fromUserId || !toUserId) throw new Error('Usuarios invalidos')
        if (fromUserId === toUserId) throw new Error('No puedes enviarte solicitud a ti mismo')

        const pair = {
            min: fromUserId < toUserId ? fromUserId : toUserId,
            max: fromUserId < toUserId ? toUserId : fromUserId,
        }

        const { data: existingFriendship, error: friendshipError } = await supabase
            .from('friendships')
            .select('id')
            .eq('user_a', pair.min)
            .eq('user_b', pair.max)
            .maybeSingle()

        if (friendshipError) throw friendshipError
        if (existingFriendship) throw new Error('Ya sois amigos')

        const between = await this.getRequestsBetween(fromUserId, toUserId)
        const latest = between[0]

        if (latest && latest.status === 'pending' && latest.to_user_id === fromUserId) {
            // Friendly UX: incoming pending request is auto-accepted.
            return this.respond(latest.id, true)
        }

        if (latest && latest.status === 'pending' && latest.from_user_id === fromUserId) {
            return latest
        }

        if (
            latest &&
            latest.from_user_id === fromUserId &&
            (latest.status === 'cancelled' || latest.status === 'rejected')
        ) {
            const { error: deletePreviousError } = await supabase
                .from('friend_requests')
                .delete()
                .eq('id', latest.id)

            if (deletePreviousError) throw deletePreviousError
        }

        const payload = {
            from_user_id: fromUserId,
            to_user_id: toUserId,
            status: 'pending' as const,
            message: message?.trim() ? message.trim().slice(0, 280) : null,
            responded_at: null,
        }

        const { data, error } = await supabase
            .from('friend_requests')
            .insert(payload)
            .select('*, from_profile:profiles!friend_requests_from_user_id_fkey(id, display_name, username, avatar_url), to_profile:profiles!friend_requests_to_user_id_fkey(id, display_name, username, avatar_url)')
            .single()

        if (error) {
            if (isDuplicateError(error)) {
                const refreshed = await this.getRequestsBetween(fromUserId, toUserId)
                const current = refreshed[0]
                if (current) {
                    if (current.status === 'pending' && current.to_user_id === fromUserId) {
                        return this.respond(current.id, true)
                    }
                    return current
                }
            }
            throw error
        }
        return normalizeFriendRequest(data as RawFriendRequest)
    },

    async respond(requestId: string, accept: boolean): Promise<FriendRequest> {
        const { data, error } = await supabase
            .from('friend_requests')
            .update({
                status: accept ? 'accepted' : 'rejected',
                responded_at: new Date().toISOString(),
            })
            .eq('id', requestId)
            .select('*, from_profile:profiles!friend_requests_from_user_id_fkey(id, display_name, username, avatar_url), to_profile:profiles!friend_requests_to_user_id_fkey(id, display_name, username, avatar_url)')
            .single()

        if (error) throw error
        return normalizeFriendRequest(data as RawFriendRequest)
    },

    async cancel(requestId: string): Promise<FriendRequest> {
        const { data, error } = await supabase
            .from('friend_requests')
            .update({
                status: 'cancelled',
                responded_at: new Date().toISOString(),
            })
            .eq('id', requestId)
            .select('*, from_profile:profiles!friend_requests_from_user_id_fkey(id, display_name, username, avatar_url), to_profile:profiles!friend_requests_to_user_id_fkey(id, display_name, username, avatar_url)')
            .single()

        if (error) throw error
        return normalizeFriendRequest(data as RawFriendRequest)
    },

    async removeFriend(userId: string, friendUserId: string): Promise<void> {
        const userA = userId < friendUserId ? userId : friendUserId
        const userB = userId < friendUserId ? friendUserId : userId

        const { error } = await supabase
            .from('friendships')
            .delete()
            .eq('user_a', userA)
            .eq('user_b', userB)

        if (error) throw error
    },

    async getRequestsBetween(userA: string, userB: string): Promise<FriendRequest[]> {
        const { data, error } = await supabase
            .from('friend_requests')
            .select('*, from_profile:profiles!friend_requests_from_user_id_fkey(id, display_name, username, avatar_url), to_profile:profiles!friend_requests_to_user_id_fkey(id, display_name, username, avatar_url)')
            .or(
                `and(from_user_id.eq.${userA},to_user_id.eq.${userB}),and(from_user_id.eq.${userB},to_user_id.eq.${userA})`
            )
            .order('created_at', { ascending: false })

        if (error) throw error
        return ((data ?? []) as RawFriendRequest[]).map(normalizeFriendRequest)
    },
}

function isDuplicateError(error: unknown): boolean {
    if (!error || typeof error !== 'object') return false
    const anyError = error as { code?: string; message?: string; details?: string }
    const raw = `${anyError.code ?? ''} ${anyError.message ?? ''} ${anyError.details ?? ''}`.toLowerCase()
    return raw.includes('23505') || raw.includes('duplicate key') || raw.includes('already exists')
}
