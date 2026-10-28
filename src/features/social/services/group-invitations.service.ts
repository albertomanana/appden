import { supabase } from '@lib/supabase/client'
import type { Group, GroupInvitation, GroupRole } from '@/types'

type InviteInput = {
    groupId: string
    invitedBy: string
    invitedUserId: string
    message?: string
}

/** A group the viewer manages, seen from the point of view of one person to invite. */
export type InviteTarget = {
    group: Group
    state: 'available' | 'invited' | 'member'
}

const INVITATION_PROFILES =
    'inviter:profiles!group_invitations_invited_by_fkey(id, display_name, username, avatar_url), invited:profiles!group_invitations_invited_user_id_fkey(id, display_name, username, avatar_url)'

function isDuplicateError(error: unknown): boolean {
    if (!error || typeof error !== 'object') return false
    const anyError = error as { code?: string; message?: string; details?: string }
    const raw = `${anyError.code ?? ''} ${anyError.message ?? ''} ${anyError.details ?? ''}`.toLowerCase()
    return raw.includes('23505') || raw.includes('duplicate key') || raw.includes('already exists')
}

function isMissingFunctionError(error: unknown): boolean {
    if (!error || typeof error !== 'object') return false
    const anyError = error as { code?: string; message?: string }
    const raw = `${anyError.code ?? ''} ${anyError.message ?? ''}`.toLowerCase()
    return raw.includes('pgrst202') || raw.includes('42883') || raw.includes('could not find the function')
}

export const groupInvitationsService = {
    /** Pending invitations addressed to the user (shown in Social · Grupos). */
    async listIncoming(userId: string): Promise<GroupInvitation[]> {
        const { data, error } = await supabase
            .from('group_invitations')
            .select(`*, group:groups(id, name, description, avatar_url), ${INVITATION_PROFILES}`)
            .eq('invited_user_id', userId)
            .eq('status', 'pending')
            .order('created_at', { ascending: false })

        if (error) throw error
        return (data ?? []) as GroupInvitation[]
    },

    /** Invitations of a group (visible to owner/admins and to whoever sent them). */
    async listGroupInvitations(groupId: string, status: GroupInvitation['status'] | null = 'pending'): Promise<GroupInvitation[]> {
        let query = supabase
            .from('group_invitations')
            .select(`*, ${INVITATION_PROFILES}`)
            .eq('group_id', groupId)
            .order('created_at', { ascending: false })
        if (status) query = query.eq('status', status)

        const { data, error } = await query
        if (error) throw error
        return (data ?? []) as GroupInvitation[]
    },

    /** The user's role in each of their groups: groupId -> role. */
    async listMyRoles(userId: string): Promise<Record<string, GroupRole>> {
        const { data, error } = await supabase.from('group_members').select('group_id, role').eq('user_id', userId)
        if (error) throw error
        const roles: Record<string, GroupRole> = {}
        for (const row of (data ?? []) as Array<{ group_id: string; role: GroupRole }>) roles[row.group_id] = row.role
        return roles
    },

    /**
     * Groups the viewer can invite `personId` to (owner/admin), with the person's state in each one.
     * `myGroups` comes from the group store so no extra round-trip is needed for names.
     */
    async listInviteTargets(viewerId: string, personId: string, myGroups: Group[]): Promise<InviteTarget[]> {
        if (myGroups.length === 0) return []
        const roles = await this.listMyRoles(viewerId)
        const managed = myGroups.filter((group) => group.created_by === viewerId || roles[group.id] === 'owner' || roles[group.id] === 'admin')
        if (managed.length === 0) return []
        const ids = managed.map((group) => group.id)

        const [membership, invitations] = await Promise.all([
            supabase.from('group_members').select('group_id').eq('user_id', personId).in('group_id', ids),
            supabase.from('group_invitations').select('group_id').eq('invited_user_id', personId).eq('status', 'pending').in('group_id', ids),
        ])
        if (membership.error) throw membership.error
        if (invitations.error) throw invitations.error

        const memberOf = new Set(((membership.data ?? []) as Array<{ group_id: string }>).map((row) => row.group_id))
        const invitedTo = new Set(((invitations.data ?? []) as Array<{ group_id: string }>).map((row) => row.group_id))

        return managed.map((group) => ({
            group,
            state: memberOf.has(group.id) ? 'member' : invitedTo.has(group.id) ? 'invited' : 'available',
        }))
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

        // Re-inviting someone who left, rejected or was cancelled reuses the UNIQUE(group_id, invited_user_id) row.
        const { data, error } = await supabase
            .from('group_invitations')
            .upsert(payload, { onConflict: 'group_id,invited_user_id' })
            .select('*')
            .single()

        if (error) {
            const raw = `${error.message ?? ''}`.toLowerCase()
            if (raw.includes('row-level security')) throw new Error('Esa persona ya está en el grupo o no tienes permiso para invitar.')
            throw error
        }
        return data as GroupInvitation
    },

    async cancel(invitationId: string): Promise<GroupInvitation> {
        const { data, error } = await supabase
            .from('group_invitations')
            .update({ status: 'cancelled', responded_at: new Date().toISOString() })
            .eq('id', invitationId)
            .select('*')
            .single()

        if (error) throw error
        return data as GroupInvitation
    },

    /**
     * Accept or reject an invitation addressed to the current user.
     * Uses the atomic RPC from migration 018; falls back to the two-step flow
     * (invitee update + self-insert policy from migration 007) if it is missing.
     */
    async respond(invitationId: string, accept: boolean): Promise<void> {
        const { error: rpcError } = await supabase.rpc('respond_group_invitation', { p_invitation_id: invitationId, p_accept: accept })
        if (!rpcError) return
        if (!isMissingFunctionError(rpcError)) {
            const raw = `${rpcError.message ?? ''}`.toLowerCase()
            if (raw.includes('not found') || raw.includes('no longer')) throw new Error('Esta invitación ya no está disponible.')
            throw rpcError
        }

        const { data, error } = await supabase
            .from('group_invitations')
            .update({ status: accept ? 'accepted' : 'rejected', responded_at: new Date().toISOString() })
            .eq('id', invitationId)
            .select('*')
            .single()

        if (error) throw error
        if (!accept) return

        const invitation = data as GroupInvitation
        const { error: addMemberError } = await supabase
            .from('group_members')
            .insert({ group_id: invitation.group_id, user_id: invitation.invited_user_id, role: 'member' })

        if (addMemberError && !isDuplicateError(addMemberError)) throw addMemberError
    },
}
