import { supabase } from '@lib/supabase/client'
import type { GroupInvitation } from '@/types'

type InviteInput = {
    groupId: string
    invitedBy: string
    invitedUserId: string
    message?: string
}

export const groupInvitationsService = {
    async listIncoming(userId: string): Promise<GroupInvitation[]> {
        const { data, error } = await supabase
            .from('group_invitations')
            .select(
                '*, group:groups(id, name, description, avatar_url), inviter:profiles!group_invitations_invited_by_fkey(id, display_name, avatar_url)'
            )
            .eq('invited_user_id', userId)
            .eq('status', 'pending')
            .order('created_at', { ascending: false })

        if (error) throw error
        return (data ?? []) as GroupInvitation[]
    },

    async listGroupInvitations(groupId: string): Promise<GroupInvitation[]> {
        const { data, error } = await supabase
            .from('group_invitations')
            .select(
                '*, inviter:profiles!group_invitations_invited_by_fkey(id, display_name, avatar_url), invited:profiles!group_invitations_invited_user_id_fkey(id, display_name, avatar_url)'
            )
            .eq('group_id', groupId)
            .order('created_at', { ascending: false })

        if (error) throw error
        return (data ?? []) as GroupInvitation[]
    },

    async invite(input: InviteInput): Promise<GroupInvitation> {
        const payload = {
            group_id: input.groupId,
            invited_by: input.invitedBy,
            invited_user_id: input.invitedUserId,
            message: input.message?.trim() ? input.message.trim().slice(0, 280) : null,
            status: 'pending' as const,
            responded_at: null,
        }

        const { data, error } = await supabase
            .from('group_invitations')
            .upsert(payload, { onConflict: 'group_id,invited_user_id' })
            .select('*')
            .single()

        if (error) throw error
        return data as GroupInvitation
    },

    async cancel(invitationId: string): Promise<GroupInvitation> {
        const { data, error } = await supabase
            .from('group_invitations')
            .update({
                status: 'cancelled',
                responded_at: new Date().toISOString(),
            })
            .eq('id', invitationId)
            .select('*')
            .single()

        if (error) throw error
        return data as GroupInvitation
    },

    async respond(invitationId: string, accept: boolean): Promise<GroupInvitation> {
        const status = accept ? 'accepted' : 'rejected'

        const { data, error } = await supabase
            .from('group_invitations')
            .update({
                status,
                responded_at: new Date().toISOString(),
            })
            .eq('id', invitationId)
            .select('*')
            .single()

        if (error) throw error

        const invitation = data as GroupInvitation

        if (accept) {
            const { error: addMemberError } = await supabase
                .from('group_members')
                .upsert(
                    {
                        group_id: invitation.group_id,
                        user_id: invitation.invited_user_id,
                        role: 'member',
                    },
                    { onConflict: 'group_id,user_id' }
                )

            if (addMemberError) throw addMemberError
        }

        return invitation
    },
}
