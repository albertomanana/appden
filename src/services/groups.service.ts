import { supabase } from '@lib/supabase/client'
import type { Group, GroupMember } from '@/types'

export const groupsService = {
    /**
     * Fetch all groups the current user belongs to.
     */
    async getGroups(_userId: string): Promise<Group[]> {
        const [memberResult, ownerResult] = await Promise.all([
            supabase
                .from('group_members')
                .select('group:groups(*)')
                .eq('user_id', _userId),
            supabase
                .from('groups')
                .select('*')
                .eq('created_by', _userId),
        ])

        if (memberResult.error) throw memberResult.error
        if (ownerResult.error) throw ownerResult.error

        const fromMembership = ((memberResult.data ?? []) as Array<{ group: Group | Group[] | null }>)
            .map((row) => (Array.isArray(row.group) ? row.group[0] : row.group))
            .filter((group): group is Group => !!group)

        const fromOwnership = (ownerResult.data ?? []) as Group[]
        const mergedById = new Map<string, Group>()
        for (const group of [...fromMembership, ...fromOwnership]) {
            mergedById.set(group.id, group)
        }

        return Array.from(mergedById.values()).sort(
            (a, b) => +new Date(b.created_at) - +new Date(a.created_at)
        )
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
        const { data, error } = await supabase
            .from('groups')
            .insert(groupData)
            .select()
            .single()

        if (error) throw error

        const group = data as Group

        // Defensive upsert: trigger should create owner membership, but this
        // keeps compatibility with databases where the trigger is not applied yet.
        const { error: ownerMembershipError } = await supabase
            .from('group_members')
            .upsert(
                {
                    group_id: group.id,
                    user_id: groupData.created_by,
                    role: 'owner',
                },
                { onConflict: 'group_id,user_id' }
            )

        if (ownerMembershipError) throw ownerMembershipError

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
