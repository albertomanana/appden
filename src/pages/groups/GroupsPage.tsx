import React from 'react'
import { useNavigate } from 'react-router-dom'
import { AlertCircle, Check, Plus, Users, X } from 'lucide-react'
import { useAuth } from '@hooks/useAuth'
import { groupsService } from '@services/groups.service'
import { groupInvitationsService } from '@features/social/services/group-invitations.service'
import { GroupForm, type GroupFormData } from '@components/groups/GroupForm'
import { GroupCard } from '@components/groups/GroupCard'
import { EmptyState } from '@components/ui/EmptyState'
import { LoadingSkeleton } from '@components/ui/LoadingSkeleton'
import { PageHeader } from '@components/ui/PageHeader'
import { Tabs } from '@components/ui/Tabs'
import { useNotifications } from '@hooks/useNotifications'
import { useGroupStore } from '@app/store/group.store'
import { ROUTES } from '@lib/constants'
import type { Group, GroupInvitation } from '@/types'

export default function GroupsPage() {
    const { user } = useAuth()
    const navigate = useNavigate()
    const { addNotification } = useNotifications()
    const setActiveGroup = useGroupStore((state) => state.setActiveGroup)

    const [groups, setGroups] = React.useState<Group[]>([])
    const [incomingInvites, setIncomingInvites] = React.useState<GroupInvitation[]>([])
    const [groupCounts, setGroupCounts] = React.useState<Record<string, number>>({})
    const [loading, setLoading] = React.useState(true)
    const [error, setError] = React.useState<string | null>(null)
    const [showForm, setShowForm] = React.useState(false)
    const [isSubmitting, setIsSubmitting] = React.useState(false)

    React.useEffect(() => {
        void loadGroups()
        void loadIncomingInvites()
    }, [user?.id])

    async function loadGroups() {
        try {
            setLoading(true)
            setError(null)
            if (!user?.id) {
                setGroups([])
                setGroupCounts({})
                return
            }

            const data = await groupsService.getGroups(user.id)
            setGroups(data)

            const counts = Object.fromEntries(
                await Promise.all(
                    data.map(async (group) => {
                        try {
                            const members = await groupsService.getGroupMembers(group.id)
                            return [group.id, members.length] as const
                        } catch {
                            return [group.id, 0] as const
                        }
                    })
                )
            )

            setGroupCounts(counts)
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load groups')
        } finally {
            setLoading(false)
        }
    }

    async function loadIncomingInvites() {
        try {
            if (!user?.id) {
                setIncomingInvites([])
                return
            }
            const data = await groupInvitationsService.listIncoming(user.id)
            setIncomingInvites(data)
        } catch {
            setIncomingInvites([])
        }
    }

    async function handleCreateGroup(data: GroupFormData) {
        try {
            setIsSubmitting(true)
            if (!user?.id) throw new Error('Not authenticated')

            const newGroup = await groupsService.createGroup({
                name: data.name,
                description: data.description || null,
                created_by: user.id,
            })

            setGroups((current) => [newGroup, ...current.filter((group) => group.id !== newGroup.id)])
            setGroupCounts((current) => ({ ...current, [newGroup.id]: 1 }))
            setShowForm(false)
            setActiveGroup(newGroup)
            navigate(`/groups/${newGroup.id}`)

            addNotification({
                type: 'info',
                title: 'Group Created',
                message: `${newGroup.name} has been created successfully`,
            })
        } catch (err) {
            addNotification({
                type: 'error',
                title: 'Error',
                message: err instanceof Error ? err.message : 'Failed to create group',
            })
        } finally {
            setIsSubmitting(false)
        }
    }

    async function handleRespondInvitation(invitationId: string, accept: boolean) {
        try {
            await groupInvitationsService.respond(invitationId, accept)
            await Promise.all([loadGroups(), loadIncomingInvites()])
            addNotification({
                type: 'success',
                title: accept ? 'Invitacion aceptada' : 'Invitacion rechazada',
                message: accept ? 'Ya tienes acceso al grupo.' : 'La invitacion fue rechazada.',
            })
        } catch (err) {
            addNotification({
                type: 'error',
                title: 'Error',
                message: err instanceof Error ? err.message : 'No se pudo responder a la invitacion',
            })
        }
    }

    if (loading) {
        return (
            <div className="page-shell">
                <LoadingSkeleton />
                <LoadingSkeleton />
                <LoadingSkeleton />
            </div>
        )
    }

    return (
        <div className="page-shell animate-fade-in">
            <PageHeader
                kicker="Social Graph"
                title="Groups"
                description="Crea espacios privados, gestiona miembros y mantén el contexto social de la app bajo un mismo sistema visual."
                meta={
                    <>
                        <span className="hero-meta-pill">{groups.length} grupos</span>
                        <span className="hero-meta-pill">{incomingInvites.length} invitaciones</span>
                    </>
                }
                actions={
                    <button onClick={() => setShowForm((value) => !value)} className="btn-primary">
                        <Plus className="w-4 h-4" />
                        {showForm ? 'Cerrar' : 'Nuevo grupo'}
                    </button>
                }
            />

            <Tabs
                active="groups"
                items={[
                    { label: 'Groups', value: 'groups', href: ROUTES.GROUPS },
                    { label: 'Connections', value: 'connections', href: ROUTES.CONNECTIONS },
                ]}
            />

            {showForm ? (
                <section className="card p-5 md:p-6">
                    <div className="mb-5">
                        <p className="page-kicker">Create Space</p>
                        <h2 className="mt-2 text-2xl font-headline font-extrabold text-white">Nuevo grupo privado</h2>
                        <p className="mt-2 text-sm text-gray-400">La logica de creacion sigue conectada a Supabase y al flujo real del owner.</p>
                    </div>
                    <GroupForm onSubmit={handleCreateGroup} isLoading={isSubmitting} />
                </section>
            ) : null}

            {error ? (
                <section className="card border border-red-400/20 bg-red-400/8 p-4">
                    <div className="flex items-start gap-3">
                        <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-300" />
                        <div>
                            <p className="text-sm font-semibold text-red-200">No pudimos cargar los grupos</p>
                            <p className="mt-1 text-sm text-red-100/80">{error}</p>
                        </div>
                    </div>
                </section>
            ) : null}

            {incomingInvites.length > 0 ? (
                <section className="card p-5">
                    <div className="flex items-center justify-between gap-3">
                        <div>
                            <p className="page-kicker">Pending Access</p>
                            <h2 className="mt-2 text-2xl font-headline font-extrabold text-white">Invitaciones pendientes</h2>
                        </div>
                        <span className="hero-meta-pill">Responde sin salir de aqui</span>
                    </div>

                    <div className="mt-5 space-y-3">
                        {incomingInvites.map((invite) => (
                            <div
                                key={invite.id}
                                className="rounded-[1.6rem] border border-white/8 bg-black/15 p-4 md:flex md:items-center md:justify-between"
                            >
                                <div className="min-w-0">
                                    <p className="text-sm font-semibold text-white truncate">{invite.group?.name ?? 'Grupo privado'}</p>
                                    <p className="mt-1 text-xs uppercase tracking-[0.18em] text-gray-500 truncate">
                                        Invited by {invite.inviter?.display_name ?? 'usuario'}
                                    </p>
                                </div>
                                <div className="mt-3 flex items-center gap-2 md:mt-0">
                                    <button
                                        onClick={() => void handleRespondInvitation(invite.id, true)}
                                        className="btn-secondary !min-h-[2.5rem] bg-emerald-400/12 text-emerald-200"
                                    >
                                        <Check className="w-4 h-4" />
                                        Aceptar
                                    </button>
                                    <button
                                        onClick={() => void handleRespondInvitation(invite.id, false)}
                                        className="btn-secondary !min-h-[2.5rem] bg-red-400/12 text-red-200"
                                    >
                                        <X className="w-4 h-4" />
                                        Rechazar
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>
            ) : null}

            {groups.length === 0 ? (
                <EmptyState
                    icon={<Users className="w-7 h-7" />}
                    title="Aun no tienes grupos"
                    description="Crea tu primer espacio para compartir musica, actividad y finanzas con tu gente."
                    action={
                        <button onClick={() => setShowForm(true)} className="btn-primary">
                            <Plus className="w-4 h-4" />
                            Crear grupo
                        </button>
                    }
                />
            ) : (
                <section className="space-y-3">
                    <div className="flex items-center justify-between gap-3">
                        <div>
                            <p className="page-kicker">Private Rooms</p>
                            <h2 className="mt-2 text-2xl font-headline font-extrabold text-white">Tus grupos</h2>
                        </div>
                        <span className="hero-meta-pill">Selecciona un espacio para seguir</span>
                    </div>

                    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                        {groups.map((group) => (
                            <GroupCard key={group.id} group={group} memberCount={groupCounts[group.id] || 0} />
                        ))}
                    </div>
                </section>
            )}
        </div>
    )
}
