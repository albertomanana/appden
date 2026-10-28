import { supabase } from '@lib/supabase/client'
import type { Group, GroupMember } from '@/types'

export const groupsService = {
    /**
     * Fetch all groups the current user belongs to.
     */
    async getGroups(userId: string): Promise<Group[]> {
        // Inner join on the caller's membership: RLS also lets invitees read a group
        // (to render the invitation), but those groups must not show up as "mine".
        const { data, error } = await supabase
            .from('groups')
            .select('*, my_membership:group_members!inner(user_id, role)')
            .eq('my_membership.user_id', userId)
            .order('created_at', { ascending: false })

        if (!error) {
            return ((data ?? []) as Array<Group & { my_membership?: unknown }>).map(({ my_membership: _membership, ...group }) => group as Group)
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
     * Member counts for several groups in a single round-trip.
     */
    async getMemberCounts(groupIds: string[]): Promise<Record<string, number>> {
        if (groupIds.length === 0) return {}
        const { data, error } = await supabase.from('group_members').select('group_id').in('group_id', groupIds)
        if (error) throw error
        const counts: Record<string, number> = {}
        for (const row of (data ?? []) as Array<{ group_id: string }>) {
            counts[row.group_id] = (counts[row.group_id] ?? 0) + 1
        }
        return counts
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
     * Generate an invite link token for a group (owner/admin only, enforced by RLS).
     * Tokens are random UUID-based strings and expire after `expiresInDays`.
     */
    async createInviteToken(groupId: string, createdBy: string, expiresInDays = 7): Promise<string> {
        const random = typeof crypto !== 'undefined' && 'randomUUID' in crypto
            ? crypto.randomUUID().replace(/-/g, '')
            : `${Date.now().toString(36)}${Math.random().toString(36).slice(2)}${Math.random().toString(36).slice(2)}`
        const expiresAt = new Date(Date.now() + expiresInDays * 86_400_000).toISOString()
        const { data, error } = await supabase
            .from('group_invite_tokens')
            .insert({ group_id: groupId, token: random, created_by: createdBy, expires_at: expiresAt })
            .select('token')
            .single()
        if (error) throw error
        return (data as { token: string }).token
    },

    /**
     * Join a group with an invite token. Validation and the membership insert happen
     * server-side in `join_group_with_invite` (migration 015) because invitees cannot
     * insert into group_members themselves. Returns the joined group id.
     */
    async joinWithToken(token: string): Promise<string> {
        const { data, error } = await supabase.rpc('join_group_with_invite', { p_token: token })
        if (error) {
            const raw = `${error.code ?? ''} ${error.message ?? ''}`.toLowerCase()
            if (raw.includes('expired')) throw new Error('La invitación ha caducado. Pide un enlace nuevo.')
            if (raw.includes('invalid')) throw new Error('El enlace de invitación no es válido.')
            if (isMissingFunctionError(error)) {
                throw new Error('El servidor aún no admite enlaces de invitación (falta la migración 015).')
            }
            throw error
        }
        return data as string
    },

    /**
     * Leave a group. Owners cannot leave (they must delete the group or transfer ownership).
     */
    async leaveGroup(groupId: string): Promise<void> {
        const { error } = await supabase.rpc('leave_group', { p_group_id: groupId })
        if (!error) return
        if (!isMissingFunctionError(error)) {
            const raw = `${error.message ?? ''}`.toLowerCase()
            if (raw.includes('owner')) throw new Error('El propietario no puede salir del grupo. Elimínalo o cede la propiedad.')
            throw error
        }
        // Fallback for environments without migration 015 (works for admins only).
        const { data: session } = await supabase.auth.getSession()
        const userId = session.session?.user.id
        if (!userId) throw new Error('Sesión no válida')
        await this.removeGroupMember(groupId, userId)
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
