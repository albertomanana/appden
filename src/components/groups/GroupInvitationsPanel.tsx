import React from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Search, Send, UserPlus, X } from 'lucide-react'
import { Avatar } from '@components/common/Avatar'
import { LoadingSkeleton } from '@components/ui/LoadingSkeleton'
import { useNotifications } from '@hooks/useNotifications'
import { useAuth } from '@hooks/useAuth'
import { connectionsService } from '@features/social/services/connections.service'
import { groupInvitationsService } from '@features/social/services/group-invitations.service'
import { profileService } from '@services/profile.service'
import type { GroupMember, Profile } from '@/types'

interface GroupInvitationsPanelProps {
    groupId: string
    members: GroupMember[]
    canInvite: boolean
}

export const GroupInvitationsPanel: React.FC<GroupInvitationsPanelProps> = ({ groupId, members, canInvite }) => {
    const { userId } = useAuth()
    const { addNotification } = useNotifications()
    const queryClient = useQueryClient()

    const [query, setQuery] = React.useState('')
    const [message, setMessage] = React.useState('')
    const [onlyConnections, setOnlyConnections] = React.useState(true)

    const memberIds = React.useMemo(() => new Set(members.map((member) => member.user_id)), [members])
    const memberKey = React.useMemo(() => members.map((member) => member.user_id).sort().join(','), [members])

    const { data: invitations = [], isLoading } = useQuery({
        queryKey: ['group-invitations', groupId],
        queryFn: () => groupInvitationsService.listGroupInvitations(groupId),
        enabled: canInvite,
        staleTime: 10_000,
    })

    const { data: friendIds = new Set<string>() } = useQuery({
        queryKey: ['connection-friend-ids', userId],
        queryFn: async () => {
            if (!userId) return new Set<string>()
            return connectionsService.listFriendIds(userId)
        },
        enabled: canInvite && !!userId,
    })
    const friendKey = React.useMemo(() => Array.from(friendIds).sort().join(','), [friendIds])

    const { data: candidates = [], isLoading: searching } = useQuery({
        queryKey: ['group-invite-candidates', groupId, query, memberKey, onlyConnections, friendKey],
        queryFn: async () => {
            const trimmed = query.trim()
            if (trimmed.length < 2) return []

            const profiles = await profileService.searchProfiles(trimmed)
            const filtered = profiles
                .filter((profile) => profile.id !== userId)
                .filter((profile) => !memberIds.has(profile.id))

            const byConnection = onlyConnections ? filtered.filter((profile) => friendIds.has(profile.id)) : filtered

            return byConnection
                .sort((a, b) => {
                    const aFriend = friendIds.has(a.id) ? 1 : 0
                    const bFriend = friendIds.has(b.id) ? 1 : 0
                    return bFriend - aFriend
                })
                .slice(0, 8)
        },
        enabled: canInvite && query.trim().length >= 2,
    })

    const inviteMutation = useMutation({
        mutationFn: (profile: Profile) =>
            groupInvitationsService.invite({
                groupId,
                invitedBy: userId!,
                invitedUserId: profile.id,
                message,
            }),
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: ['group-invitations', groupId] })
            setMessage('')
            addNotification({
                type: 'success',
                title: 'Invitacion enviada',
                message: 'La persona recibira la invitacion en su lista de grupos.',
            })
        },
        onError: (error) => {
            addNotification({
                type: 'error',
                title: 'No se pudo invitar',
                message: error instanceof Error ? error.message : 'Error inesperado',
            })
        },
    })

    const cancelMutation = useMutation({
        mutationFn: (invitationId: string) => groupInvitationsService.cancel(invitationId),
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: ['group-invitations', groupId] })
        },
    })

    const pendingInvitations = invitations.filter((item) => item.status === 'pending')

    if (!canInvite) {
        return (
            <div className="card p-5">
                <h3 className="text-base font-semibold text-white">Invitaciones</h3>
                <p className="mt-1 text-sm text-gray-400">Solo owner o admin pueden invitar nuevos miembros al grupo.</p>
            </div>
        )
    }

    return (
        <div className="space-y-5">
            <div className="grid gap-3 md:grid-cols-[1fr,0.8fr]">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                    <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar usuario..." className="input pl-10" />
                </div>
                <textarea
                    value={message}
                    onChange={(event) => setMessage(event.target.value)}
                    rows={2}
                    maxLength={280}
                    className="input resize-none"
                    placeholder="Mensaje opcional de invitacion"
                />
            </div>

            <label className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-gray-300">
                <input type="checkbox" checked={onlyConnections} onChange={(event) => setOnlyConnections(event.target.checked)} />
                Solo mis conexiones
            </label>

            {searching ? (
                <LoadingSkeleton count={2} />
            ) : candidates.length > 0 ? (
                <div className="space-y-2">
                    {candidates.map((profile) => (
                        <div key={profile.id} className="flex items-center justify-between rounded-[1.35rem] bg-[#201f1f] p-3">
                            <div className="flex items-center gap-2">
                                <Avatar src={profile.avatar_url} name={profile.display_name} size="sm" />
                                <div>
                                    <p className="text-sm font-medium text-white">{profile.display_name}</p>
                                    <p className="text-xs uppercase tracking-[0.18em] text-gray-500">
                                        @{profile.username ?? 'sin-username'}
                                        {friendIds.has(profile.id) ? ' · conexion' : ''}
                                    </p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => inviteMutation.mutate(profile)}
                                disabled={inviteMutation.isPending}
                                className="btn-primary px-3 py-2 text-xs"
                            >
                                <UserPlus className="w-3.5 h-3.5" />
                                Invitar
                            </button>
                        </div>
                    ))}
                </div>
            ) : query.trim().length >= 2 ? (
                <p className="text-sm text-gray-400">Sin resultados para tu busqueda.</p>
            ) : null}

            <div className="space-y-2">
                <h4 className="text-sm font-semibold text-gray-200">Invitaciones pendientes ({pendingInvitations.length})</h4>
                {isLoading ? (
                    <LoadingSkeleton count={2} />
                ) : pendingInvitations.length === 0 ? (
                    <p className="text-xs text-gray-500">No hay invitaciones pendientes.</p>
                ) : (
                    pendingInvitations.map((invitation) => (
                        <div key={invitation.id} className="flex items-center justify-between rounded-[1.35rem] bg-[#201f1f] p-3">
                            <div>
                                <p className="text-sm text-white">{invitation.invited?.display_name ?? invitation.invited_user_id}</p>
                                <p className="text-xs uppercase tracking-[0.18em] text-gray-500">
                                    Enviada {new Date(invitation.created_at).toLocaleDateString('es-ES')}
                                </p>
                            </div>
                            <button type="button" onClick={() => cancelMutation.mutate(invitation.id)} className="btn-ghost px-2.5 py-1.5 text-xs" title="Cancelar invitacion">
                                <X className="w-3.5 h-3.5" />
                                Cancelar
                            </button>
                        </div>
                    ))
                )}
            </div>

            <p className="inline-flex items-center gap-1 text-xs text-gray-500">
                <Send className="w-3.5 h-3.5" />
                Cuando acepten, entraran automaticamente al grupo.
            </p>
        </div>
    )
}
