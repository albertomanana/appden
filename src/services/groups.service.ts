import { supabase } from '@lib/supabase/client'
import type { Group, GroupMember } from '@/types'

export const groupsService = {
    /**
     * Fetch all groups the current user belongs to.
     */
    async getGroups(userId: string): Promise<Group[]> {
        const { data, error } = await supabase
            .from('groups')
            .select('*')
            .order('created_at', { ascending: false })

        if (!error) {
            return (data ?? []) as Group[]
        }

        // Compatibility fallback for partially migrated environments:
        // at minimum keep owned groups readable while the RLS hotfix is pending.
        const { data: ownedData, error: ownedError } = await supabase
            .from('groups')
            .select('*')
            .eq('created_by', userId)
            .order('created_at', { ascending: false })

        if (ownedError) throw error
        return (ownedData ?? []) as Group[]
    },

    /**
     * Alias for getGroups for backward compatibility.
     */
    async getMyGroups(userId: string): Promise<Group[]> {
        return this.getGroups(userId)
    },

    /**
     * Fetch a single group by ID.
     */
    async getGroup(groupId: string): Promise<Group> {
        const { data, error } = await supabase
            .from('groups')
            .select('*')
            .eq('id', groupId)
            .single()

        if (error) throw error
        return data as Group
    },

    /**
     * Fetch members of a group with their profiles.
     */
    async getGroupMembers(groupId: string): Promise<GroupMember[]> {
        const { data, error } = await supabase
            .from('group_members')
            .select('*, profile:profiles(*)')
            .eq('group_id', groupId)

        if (error) throw error
        return data as GroupMember[]
    },

    /**
     * Create a new group.
     */
    async createGroup(groupData: {
        name: string
        description: string | null
        created_by: string
    }): Promise<Group> {
        const name = groupData.name.trim()
        const description = groupData.description?.trim() ? groupData.description.trim() : null

        const rpcResult = await supabase.rpc('create_group_with_owner', {
            p_name: name,
            p_description: description,
        })

        if (!rpcResult.error) {
            const group = extractRpcGroup(rpcResult.data)
            if (group) return group
        } else if (!isMissingFunctionError(rpcResult.error)) {
            throw rpcResult.error
        }

        // Legacy fallback while migration 010 is not yet applied.
        const { data, error } = await supabase
            .from('groups')
            .insert({
                name,
                description,
                created_by: groupData.created_by,
            })
            .select()
            .single()

        if (error) throw error

        const group = data as Group

        // Prefer plain insert to avoid requiring UPDATE RLS when the owner row
        // was already created by a DB trigger in newer schemas.
        const { error: ownerMembershipError } = await supabase
            .from('group_members')
            .insert(
                {
                    group_id: group.id,
                    user_id: groupData.created_by,
                    role: 'owner',
                }
            )

        if (ownerMembershipError) {
            if (isDuplicateError(ownerMembershipError)) {
                return group
            }

            const { data: existingMembership } = await supabase
                .from('group_members')
                .select('id')
                .eq('group_id', group.id)
                .eq('user_id', groupData.created_by)
                .maybeSingle()

            if (existingMembership) {
                return group
            }

            throw ownerMembershipError
        }

        return group
    },

    /**
     * Add a member to a group.
     */
    async addGroupMember(
        groupId: string,
        userId: string,
        role: 'owner' | 'admin' | 'member' = 'member'
    ): Promise<GroupMember> {
        const { data, error } = await supabase
            .from('group_members')
            .insert({ group_id: groupId, user_id: userId, role })
            .select()
            .single()

        if (error) throw error
        return data as GroupMember
    },

    async updateGroupMemberRole(
        groupId: string,
        userId: string,
        role: 'owner' | 'admin' | 'member'
    ): Promise<GroupMember> {
        const { data, error } = await supabase
            .from('group_members')
            .update({ role })
            .eq('group_id', groupId)
            .eq('user_id', userId)
            .select('*, profile:profiles(*)')
            .single()

        if (error) throw error
        return data as GroupMember
    },

    /**
     * Remove a member from a group.
     */
    async removeGroupMember(groupId: string, userId: string): Promise<void> {
        const { error } = await supabase
            .from('group_members')
            .delete()
            .eq('group_id', groupId)
            .eq('user_id', userId)

        if (error) throw error
    },

    /**
     * Delete a group.
     */
    async deleteGroup(groupId: string): Promise<void> {
        const { error } = await supabase
            .from('groups')
            .delete()
            .eq('id', groupId)

        if (error) throw error
    },

    /**
     * Check if a user is a member of a group.
     */
    async isMember(groupId: string, userId: string): Promise<boolean> {
        const { count, error } = await supabase
            .from('group_members')
            .select('*', { count: 'exact', head: true })
            .eq('group_id', groupId)
            .eq('user_id', userId)

        if (error) throw error
        return (count ?? 0) > 0
    },

    /**
     * Request to join a private group. Creates a group_friend_requests row with status 'pending'.
     */
    async requestJoin(groupId: string, userId: string, toUserId?: string): Promise<void> {
        const payload: any = {
            group_id: groupId,
            from_user_id: userId,
            to_user_id: toUserId ?? null,
            status: 'pending',
        }

        // If to_user_id is null we will insert a request without the recipient (owners/admins read it)
        const { error } = await supabase.from('group_friend_requests').insert(payload)
        if (error) {
            // If recipient is null and DB complained about NOT NULL, try a simpler insert (some schemas may differ)
            if ((error as any)?.message?.includes('null value in column') && !toUserId) {
                const { error: fallbackError } = await supabase.from('group_friend_requests').insert({ group_id: groupId, from_user_id: userId, to_user_id: userId, status: 'pending' })
                if (fallbackError) throw fallbackError
                return
            }

            // If duplicate request, ignore
            const raw = `${(error as any).code ?? ''} ${(error as any).message ?? ''}`.toLowerCase()
            if (raw.includes('23505') || raw.includes('duplicate')) return

            throw error
        }
    },

    /**
     * Generate a time-limited invite token for a group (returns token string).
     */
    async createInviteToken(groupId: string, createdBy: string, expiresAt?: string): Promise<string> {
        // create a random token
        const token = `${Math.random().toString(36).slice(2, 10)}-${Date.now().toString(36)}`
        const { data, error } = await supabase.from('group_invite_tokens').insert({ group_id: groupId, token, created_by: createdBy, expires_at: expiresAt ?? null }).select().single()
        if (error) throw error
        return (data as any).token
    },

    /**
     * Join a group using an invite token. Validates token and creates membership.
     */
    async joinWithToken(token: string, userId: string): Promise<void> {
        // Validate token
        const { data: tokenRow, error } = await supabase.from('group_invite_tokens').select('*').eq('token', token).maybeSingle()
        if (error) throw error
        if (!tokenRow) throw new Error('Invalid invite token')

        if (tokenRow.expires_at && new Date(tokenRow.expires_at) < new Date()) {
            throw new Error('Invite token expired')
        }

        // Add membership
        const { error: insertErr } = await supabase.from('group_members').insert({ group_id: tokenRow.group_id, user_id: userId, role: 'member' })
        if (insertErr) {
            // Ignore if already member
            const raw = `${(insertErr as any)?.message ?? ''}`.toLowerCase()
            if (!raw.includes('duplicate')) {
                throw insertErr
            }
        }

        // Mark token used
        const { error: markErr } = await supabase.from('group_invite_tokens').update({ used_by: userId }).eq('id', tokenRow.id)
        if (markErr) throw markErr
    },

    /**
     * List pending join requests for a group
     */
    async getPendingJoinRequests(groupId: string): Promise<any[]> {
        const { data, error } = await supabase
            .from('group_friend_requests')
            .select('*, requester:profiles!group_friend_requests_from_user_id_fkey(id, display_name, username, avatar_url)')
            .eq('group_id', groupId)
            .eq('status', 'pending')
            .order('created_at', { ascending: false })

        if (error) throw error
        return data ?? []
    },

    /**
     * Approve or reject a join request
     */
    async respondToJoinRequest(requestId: string, status: 'accepted' | 'rejected', groupId: string, fromUserId: string): Promise<void> {
        // Update request status
        const { error: updateErr } = await supabase
            .from('group_friend_requests')
            .update({ status, responded_at: new Date().toISOString() })
            .eq('id', requestId)
        
        if (updateErr) throw updateErr

        // If accepted, add user to group
        if (status === 'accepted') {
            const { error: insertErr } = await supabase
                .from('group_members')
                .insert({ group_id: groupId, user_id: fromUserId, role: 'member' })
            
            // Ignore errors if already a member
            if (insertErr) {
                const raw = `${(insertErr as any)?.message ?? ''}`.toLowerCase()
                if (!raw.includes('duplicate')) {
                    throw insertErr
                }
            }
        }
    },

    async getMyRole(groupId: string, userId: string): Promise<'owner' | 'admin' | 'member' | null> {
        const { data, error } = await supabase
            .from('group_members')
            .select('role')
            .eq('group_id', groupId)
            .eq('user_id', userId)
            .maybeSingle()

        if (error) throw error
        return (data?.role as 'owner' | 'admin' | 'member' | undefined) ?? null
    },
}

function isDuplicateError(error: unknown): boolean {
    if (!error || typeof error !== 'object') return false
    const anyError = error as { code?: string; message?: string; details?: string }
    const raw = `${anyError.code ?? ''} ${anyError.message ?? ''} ${anyError.details ?? ''}`.toLowerCase()
    return raw.includes('23505') || raw.includes('duplicate key') || raw.includes('already exists')
}

function isMissingFunctionError(error: unknown): boolean {
    if (!error || typeof error !== 'object') return false
    const anyError = error as { code?: string; message?: string; details?: string; hint?: string }
    const raw = `${anyError.code ?? ''} ${anyError.message ?? ''} ${anyError.details ?? ''} ${anyError.hint ?? ''}`.toLowerCase()
    return raw.includes('42883') || raw.includes('pgrst202') || raw.includes('function') && raw.includes('does not exist')
}

function extractRpcGroup(data: unknown): Group | null {
    if (Array.isArray(data)) {
        return (data[0] ?? null) as Group | null
    }
    if (data && typeof data === 'object') {
        return data as Group
    }
    return null
}
