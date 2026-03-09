import { supabase } from '@lib/supabase/client'
import type { Group, GroupMember } from '@/types'

export const groupsService = {
    /**
     * Fetch all groups the current user belongs to.
     */
    async getGroups(userId: string): Promise<Group[]> {
        const { data, error } = await supabase
            .from('group_members')
            .select('group:groups(*)')
            .eq('user_id', userId)

        if (error) throw error
        return (data?.map((d: { group: Group }) => d.group).filter(Boolean) ?? []) as Group[]
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
        return data as Group
    },

    /**
     * Add a member to a group.
     */
    async addGroupMember(
        groupId: string,
        userId: string,
        role: 'owner' | 'member' = 'member'
    ): Promise<GroupMember> {
        const { data, error } = await supabase
            .from('group_members')
            .insert({ group_id: groupId, user_id: userId, role })
            .select()
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
}
