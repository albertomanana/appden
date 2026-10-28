import { supabase } from '@lib/supabase/client'
import type { FriendRequest, Friendship, Profile } from '@/types'

/**
 * Global friendships (migration 009: `friend_requests` + `friendships`).
 * Friends are people you know across groups: the fast path to invite someone to a group.
 *
 * This is the single friends service of the app (it replaces the old
 * `connectionsService` and the per-group `friendsService` shim).
 */

type MiniProfile = Pick<Profile, 'id' | 'display_name' | 'username' | 'avatar_url'>

const MINI_PROFILE = 'id, display_name, username, avatar_url'
const REQUEST_SELECT = `*, from_profile:profiles!friend_requests_from_user_id_fkey(${MINI_PROFILE}), to_profile:profiles!friend_requests_to_user_id_fkey(${MINI_PROFILE})`
const FRIENDSHIP_SELECT = `*, profile_a:profiles!friendships_user_a_fkey(${MINI_PROFILE}), profile_b:profiles!friendships_user_b_fkey(${MINI_PROFILE})`

type RawFriendship = Friendship & { profile_a?: MiniProfile; profile_b?: MiniProfile }

/** Relationship between the viewer and another person. */
export type FriendRelation =
    | { kind: 'self' }
    | { kind: 'friend'; friendship: Friendship }
    | { kind: 'incoming'; request: FriendRequest }
    | { kind: 'outgoing'; request: FriendRequest }
    | { kind: 'none' }

const orderedPair = (a: string, b: string) => (a < b ? { userA: a, userB: b } : { userA: b, userB: a })

/** Characters that would break a PostgREST `or=(...)` filter. */
function sanitizeSearch(query: string): string {
    return query
        .trim()
        .replace(/^@+/, '')
        .replace(/[,()*%\\:"']/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 40)
}

function isDuplicateError(error: unknown): boolean {
    if (!error || typeof error !== 'object') return false
    const anyError = error as { code?: string; message?: string; details?: string }
    const raw = `${anyError.code ?? ''} ${anyError.message ?? ''} ${anyError.details ?? ''}`.toLowerCase()
    return raw.includes('23505') || raw.includes('duplicate key') || raw.includes('already exists')
}

export const friendsService = {
    async listIncoming(userId: string): Promise<FriendRequest[]> {
        const { data, error } = await supabase
            .from('friend_requests')
            .select(REQUEST_SELECT)
            .eq('to_user_id', userId)
            .eq('status', 'pending')
            .order('created_at', { ascending: false })

        if (error) throw error
        return (data ?? []) as FriendRequest[]
    },

    async listOutgoing(userId: string): Promise<FriendRequest[]> {
        const { data, error } = await supabase
            .from('friend_requests')
            .select(REQUEST_SELECT)
            .eq('from_user_id', userId)
            .eq('status', 'pending')
            .order('created_at', { ascending: false })

        if (error) throw error
        return (data ?? []) as FriendRequest[]
    },

    async listFriends(userId: string): Promise<Friendship[]> {
        const { data, error } = await supabase
            .from('friendships')
            .select(FRIENDSHIP_SELECT)
            .or(`user_a.eq.${userId},user_b.eq.${userId}`)
            .order('created_at', { ascending: false })

        if (error) throw error

        return ((data ?? []) as RawFriendship[])
            .map(({ profile_a, profile_b, ...row }) => ({
                ...row,
                friend_profile: row.user_a === userId ? profile_b : profile_a,
            }))
            .sort((a, b) => (a.friend_profile?.display_name ?? '').localeCompare(b.friend_profile?.display_name ?? '', 'es'))
    },

    /**
     * Groups shared with each friend, among the groups the viewer belongs to
     * (RLS only exposes members of the viewer's own groups). Returns friendId -> groupIds.
     */
    async listMutualGroups(myGroupIds: string[], friendIds: string[]): Promise<Record<string, string[]>> {
        if (myGroupIds.length === 0 || friendIds.length === 0) return {}
        const { data, error } = await supabase
            .from('group_members')
            .select('group_id, user_id')
            .in('group_id', myGroupIds)
            .in('user_id', friendIds)

        if (error) throw error
        const result: Record<string, string[]> = {}
        for (const row of (data ?? []) as Array<{ group_id: string; user_id: string }>) {
            result[row.user_id] = [...(result[row.user_id] ?? []), row.group_id]
        }
        return result
    },

    /** People search by name or @username. Excludes the viewer and accounts pending approval. */
    async searchPeople(query: string, currentUserId: string): Promise<Profile[]> {
        const term = sanitizeSearch(query)
        if (term.length < 2) return []

        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .or(`display_name.ilike.%${term}%,username.ilike.%${term}%`)
            .neq('id', currentUserId)
            .order('display_name', { ascending: true })
            .limit(20)

        if (error) throw error
        return ((data ?? []) as Profile[]).filter((profile) => profile.id !== currentUserId && profile.is_approved !== false)
    },

    async getRequestsBetween(userA: string, userB: string): Promise<FriendRequest[]> {
        const { data, error } = await supabase
            .from('friend_requests')
            .select(REQUEST_SELECT)
            .or(`and(from_user_id.eq.${userA},to_user_id.eq.${userB}),and(from_user_id.eq.${userB},to_user_id.eq.${userA})`)
            .order('created_at', { ascending: false })

        if (error) throw error
        return (data ?? []) as FriendRequest[]
    },

    async getRelationship(viewerUserId: string, otherUserId: string): Promise<FriendRelation> {
        if (viewerUserId === otherUserId) return { kind: 'self' }
        const { userA, userB } = orderedPair(viewerUserId, otherUserId)

        const [{ data: friendship, error: friendshipError }, requests] = await Promise.all([
            supabase.from('friendships').select('*').eq('user_a', userA).eq('user_b', userB).maybeSingle(),
            this.getRequestsBetween(viewerUserId, otherUserId),
        ])

        if (friendshipError) throw friendshipError
        if (friendship) return { kind: 'friend', friendship: friendship as Friendship }

        const pending = requests.find((request) => request.status === 'pending')
        if (pending?.to_user_id === viewerUserId) return { kind: 'incoming', request: pending }
        if (pending?.from_user_id === viewerUserId) return { kind: 'outgoing', request: pending }
        return { kind: 'none' }
    },

    /**
     * Sends a friend request. If the other person already asked you, their request is accepted instead.
     * Old answered requests in the same direction are removed first (UNIQUE from/to pair).
     */
    async sendRequest(fromUserId: string, toUserId: string, message?: string): Promise<FriendRequest> {
        if (!fromUserId || !toUserId) throw new Error('No se pudo identificar a la otra persona.')
        if (fromUserId === toUserId) throw new Error('No puedes enviarte una solicitud a ti mismo.')

        const { userA, userB } = orderedPair(fromUserId, toUserId)
        const { data: existingFriendship, error: friendshipError } = await supabase
            .from('friendships')
            .select('id')
            .eq('user_a', userA)
            .eq('user_b', userB)
            .maybeSingle()

        if (friendshipError) throw friendshipError
        if (existingFriendship) throw new Error('Ya sois amigos.')

        const between = await this.getRequestsBetween(fromUserId, toUserId)
        const pending = between.find((request) => request.status === 'pending')
        if (pending && pending.to_user_id === fromUserId) return this.respond(pending.id, true)
        if (pending) return pending

        const stale = between.find((request) => request.from_user_id === fromUserId && request.to_user_id === toUserId)
        if (stale) {
            const { error: deleteError } = await supabase.from('friend_requests').delete().eq('id', stale.id)
            if (deleteError) throw deleteError
        }

        const { data, error } = await supabase
            .from('friend_requests')
            .insert({
                from_user_id: fromUserId,
                to_user_id: toUserId,
                status: 'pending' as const,
                message: message?.trim() ? message.trim().slice(0, 280) : null,
                responded_at: null,
            })
            .select(REQUEST_SELECT)
            .single()

        if (error) {
            if (isDuplicateError(error)) {
                const current = (await this.getRequestsBetween(fromUserId, toUserId)).find((request) => request.status === 'pending')
                if (current?.to_user_id === fromUserId) return this.respond(current.id, true)
                if (current) return current
            }
            throw error
        }
        return data as FriendRequest
    },

    /** Accept or reject an incoming request (a trigger creates the friendship on accept). */
    async respond(requestId: string, accept: boolean): Promise<FriendRequest> {
        const { data, error } = await supabase
            .from('friend_requests')
            .update({ status: accept ? 'accepted' : 'rejected', responded_at: new Date().toISOString() })
            .eq('id', requestId)
            .select(REQUEST_SELECT)
            .single()

        if (error) throw error
        return data as FriendRequest
    },

    /** Cancel a request you sent. */
    async cancel(requestId: string): Promise<FriendRequest> {
        const { data, error } = await supabase
            .from('friend_requests')
            .update({ status: 'cancelled', responded_at: new Date().toISOString() })
            .eq('id', requestId)
            .select(REQUEST_SELECT)
            .single()

        if (error) throw error
        return data as FriendRequest
    },

    async removeFriend(userId: string, friendUserId: string): Promise<void> {
        const { userA, userB } = orderedPair(userId, friendUserId)
        const { error } = await supabase.from('friendships').delete().eq('user_a', userA).eq('user_b', userB)
        if (error) throw error
    },
}
