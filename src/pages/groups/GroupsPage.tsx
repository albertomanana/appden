import React from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Check, Mail, Plus, Users, X } from 'lucide-react'
import { useAuth } from '@hooks/useAuth'
import { useActiveGroup, useRefreshMyGroups } from '@hooks/useActiveGroup'
import { groupsService } from '@services/groups.service'
import { groupInvitationsService } from '@features/social/services/group-invitations.service'
import { GroupForm, type GroupFormData } from '@components/groups/GroupForm'
import { GroupCard } from '@components/groups/GroupCard'
import { SocialTabs } from '@components/social/SocialTabs'
import { EmptyState } from '@components/ui/EmptyState'
import { ErrorNotice } from '@components/ui/ErrorNotice'
import { ListSkeleton } from '@components/ui/LoadingSkeleton'
import { Modal } from '@components/ui/Modal'
import { PageHeader, SectionHeader } from '@components/ui/PageHeader'
import { useToast } from '@components/ui/Toast'
import { ROUTES } from '@lib/constants'

export default function GroupsPage() {
    const { userId } = useAuth()
    const navigate = useNavigate()
    const toast = useToast()
    const queryClient = useQueryClient()
    const refreshMyGroups = useRefreshMyGroups()
    const { activeGroup } = useActiveGroup()
    const [searchParams, setSearchParams] = useSearchParams()
    const [showForm, setShowForm] = React.useState(searchParams.get('nuevo') === '1')

    const groupsQuery = useQuery({
        queryKey: ['my-groups', userId],
        queryFn: () => groupsService.getGroups(userId!),
        enabled: !!userId,
    })
    const groups = groupsQuery.data ?? []

    const { data: counts = {} } = useQuery({
        queryKey: ['group-member-counts', groups.map((group) => group.id).join(',')],
        queryFn: () => groupsService.getMemberCounts(groups.map((group) => group.id)),
        enabled: groups.length > 0,
    })

    const invitesQuery = useQuery({
        queryKey: ['group-invitations', 'incoming', userId],
        queryFn: () => groupInvitationsService.listIncoming(userId!),
        enabled: !!userId,
    })
    const incomingInvites = invitesQuery.data ?? []

    const closeForm = () => {
        setShowForm(false)
        if (searchParams.has('nuevo')) {
            searchParams.delete('nuevo')
            setSearchParams(searchParams, { replace: true })
        }
    }

    const createGroup = useMutation({
        mutationFn: (data: GroupFormData) =>
            groupsService.createGroup({ name: data.name, description: data.description || null, created_by: userId! }),
        onSuccess: async (newGroup) => {
            await refreshMyGroups(newGroup.id)
            void queryClient.invalidateQueries({ queryKey: ['my-groups'] })
            closeForm()
            toast.success('Grupo creado', `Ahora estás en ${newGroup.name}. Invita a tu gente.`)
            navigate(`${ROUTES.GROUP(newGroup.id)}?invitar=1`)
        },
    })

    const respond = useMutation({
        mutationFn: ({ id, accept }: { id: string; accept: boolean; groupId: string }) => groupInvitationsService.respond(id, accept),
        onSuccess: async (_data, { accept, groupId }) => {
            await refreshMyGroups(accept ? groupId : null)
            void queryClient.invalidateQueries({ queryKey: ['my-groups'] })
            void queryClient.invalidateQueries({ queryKey: ['group-invitations'] })
            toast.success(accept ? 'Te has unido al grupo' : 'Invitación rechazada')
        },
        onError: (err) => toast.error('No se pudo responder a la invitación', err instanceof Error ? err.message : undefined),
    })

    return (
        <div className="page-shell animate-fade-in">
            <PageHeader
                title="Social"
                actions={
                    <button onClick={() => setShowForm(true)} className="btn-primary !px-4">
                        <Plus className="h-4 w-4" />
                        Nuevo
                    </button>
                }
            />
            <SocialTabs active="groups" />

            {incomingInvites.length > 0 ? (
                <section>
                    <SectionHeader title="Invitaciones" description="Te han invitado a estos grupos." />
                    <div className="list-group">
                        {incomingInvites.map((invite) => (
                            <div key={invite.id} className="list-row">
                                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-brand-400/15 text-brand-200">
                                    <Mail className="h-5 w-5" />
                                </span>
                                <span className="min-w-0 flex-1">
                                    <span className="block truncate text-[15px] font-semibold text-white">{invite.group?.name ?? 'Grupo privado'}</span>
                                    <span className="block truncate text-[13px] text-gray-400">De {invite.inviter?.display_name ?? 'un miembro'}</span>
                                </span>
                                <button
                                    onClick={() => respond.mutate({ id: invite.id, accept: false, groupId: invite.group_id })}
                                    disabled={respond.isPending}
                                    className="icon-btn bg-white/[0.06] text-gray-300"
                                    aria-label="Rechazar invitación"
                                >
                                    <X className="h-5 w-5" />
                                </button>
                                <button
                                    onClick={() => respond.mutate({ id: invite.id, accept: true, groupId: invite.group_id })}
                                    disabled={respond.isPending}
                                    className="icon-btn bg-emerald-400/15 text-emerald-200"
                                    aria-label="Aceptar invitación"
                                >
                                    <Check className="h-5 w-5" />
                                </button>
                            </div>
                        ))}
                    </div>
                </section>
            ) : null}

            {groupsQuery.isLoading ? (
                <ListSkeleton count={3} />
            ) : groupsQuery.error ? (
                <ErrorNotice title="No pudimos cargar tus grupos" error={groupsQuery.error} onRetry={() => void groupsQuery.refetch()} />
            ) : groups.length === 0 ? (
                <EmptyState
                    icon={<Users className="h-6 w-6" />}
                    title="Aún no tienes grupos"
                    description="Crea un espacio para compartir música, planes y cuentas con tu gente, o abre el enlace de invitación que te hayan pasado."
                    action={
                        <button onClick={() => setShowForm(true)} className="btn-primary">
                            <Plus className="h-4 w-4" />
                            Crear grupo
                        </button>
                    }
                />
            ) : (
                <section>
                    <SectionHeader title="Tus grupos" />
                    <div className="list-group">
                        {groups.map((group) => (
                            <GroupCard key={group.id} group={group} memberCount={counts[group.id]} isActive={group.id === activeGroup?.id} />
                        ))}
                    </div>
                </section>
            )}

            <Modal open={showForm} onClose={closeForm} title="Nuevo grupo" description="Serás el propietario y podrás invitar a quien quieras." size="sm">
                <GroupForm onSubmit={async (data) => void (await createGroup.mutateAsync(data))} isLoading={createGroup.isPending} />
            </Modal>
        </div>
    )
}
