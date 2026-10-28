import React from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Check, Plus, Send, Users } from 'lucide-react'
import { EmptyState } from '@components/ui/EmptyState'
import { ErrorNotice } from '@components/ui/ErrorNotice'
import { ListSkeleton } from '@components/ui/LoadingSkeleton'
import { Modal } from '@components/ui/Modal'
import { useToast } from '@components/ui/Toast'
import { useAuth } from '@hooks/useAuth'
import { useActiveGroup } from '@hooks/useActiveGroup'
import { groupInvitationsService, type InviteTarget } from '@features/social/services/group-invitations.service'
import { ROUTES } from '@lib/constants'
import { getInitials } from '@lib/utils'
import type { PersonSummary } from '@components/social/PersonRow'

const firstName = (name?: string | null) => (name ?? '').trim().split(/\s+/)[0] || 'esta persona'
const order: Record<InviteTarget['state'], number> = { available: 0, invited: 1, member: 2 }

/** Bottom sheet: invite one person to any of the groups I manage. */
export const InviteToGroupSheet: React.FC<{ person: PersonSummary | null; onClose: () => void }> = ({ person, onClose }) => {
    const { userId } = useAuth()
    const { myGroups } = useActiveGroup()
    const queryClient = useQueryClient()
    const toast = useToast()
    const groupKey = myGroups.map((group) => group.id).join(',')
    const targetsKey = ['invite-targets', userId, person?.id, groupKey] as const

    const targets = useQuery({
        queryKey: targetsKey,
        queryFn: () => groupInvitationsService.listInviteTargets(userId!, person!.id, myGroups),
        enabled: !!userId && !!person,
    })

    const invite = useMutation({
        mutationFn: (groupId: string) => groupInvitationsService.invite({ groupId, invitedBy: userId!, invitedUserId: person!.id }),
        onSuccess: (_data, groupId) => {
            queryClient.setQueryData<InviteTarget[]>(targetsKey, (items) =>
                items?.map((item) => (item.group.id === groupId ? { ...item, state: 'invited' } : item))
            )
            void queryClient.invalidateQueries({ queryKey: ['group-invitations'] })
            const groupName = myGroups.find((group) => group.id === groupId)?.name
            toast.success('Invitación enviada', `${firstName(person?.display_name)} la verá en Social · Grupos${groupName ? ` para unirse a ${groupName}` : ''}.`)
        },
        onError: (error) => toast.error('No se pudo invitar', error instanceof Error ? error.message : undefined),
    })

    const items = [...(targets.data ?? [])].sort((a, b) => order[a.state] - order[b.state] || a.group.name.localeCompare(b.group.name, 'es'))

    return (
        <Modal
            open={!!person}
            onClose={onClose}
            size="sm"
            title={person ? `Invitar a ${firstName(person.display_name)}` : 'Invitar'}
            description="Elige el grupo. Recibirá la invitación en la app."
        >
            {targets.isLoading ? (
                <ListSkeleton count={2} />
            ) : targets.error ? (
                <ErrorNotice title="No pudimos cargar tus grupos" error={targets.error} onRetry={() => void targets.refetch()} />
            ) : items.length === 0 ? (
                <EmptyState
                    compact
                    icon={<Users className="h-6 w-6" />}
                    title="No gestionas ningún grupo"
                    description="Solo el propietario o un admin pueden invitar. Crea tu propio grupo y podrás invitar a quien quieras."
                    action={
                        <Link to={`${ROUTES.GROUPS}?nuevo=1`} onClick={onClose} className="btn-primary">
                            <Plus className="h-4 w-4" />
                            Crear grupo
                        </Link>
                    }
                />
            ) : (
                <div className="list-group">
                    {items.map(({ group, state }) => (
                        <div key={group.id} className="list-row">
                            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-brand-400/80 to-violet-500/80 text-sm font-bold text-white">
                                {getInitials(group.name)}
                            </span>
                            <span className="min-w-0 flex-1">
                                <span className="block truncate text-[15px] font-semibold text-white">{group.name}</span>
                                <span className="block truncate text-[13px] text-gray-400">
                                    {state === 'member' ? 'Ya está en el grupo' : state === 'invited' ? 'Invitación enviada' : group.description || 'Aún no está'}
                                </span>
                            </span>
                            {state === 'available' ? (
                                <button
                                    type="button"
                                    onClick={() => invite.mutate(group.id)}
                                    disabled={invite.isPending}
                                    className="btn-primary !px-4"
                                >
                                    <Send className="h-4 w-4" />
                                    {invite.isPending && invite.variables === group.id ? 'Enviando…' : 'Invitar'}
                                </button>
                            ) : (
                                <Check className="mr-2 h-5 w-5 shrink-0 text-gray-500" aria-hidden="true" />
                            )}
                        </div>
                    ))}
                </div>
            )}
        </Modal>
    )
}
