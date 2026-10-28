import React from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Check, ChevronDown, Link2, LogOut, Shield, Trash2, UserPlus, Users } from 'lucide-react'
import { useAuth } from '@hooks/useAuth'
import { useActiveGroup, useRefreshMyGroups } from '@hooks/useActiveGroup'
import { groupsService } from '@services/groups.service'
import { GroupMemberList } from '@components/groups/GroupMemberList'
import { GroupPermissionsPanel } from '@components/groups/GroupPermissionsPanel'
import { GroupInvitationsPanel } from '@components/groups/GroupInvitationsPanel'
import { ListSkeleton } from '@components/ui/LoadingSkeleton'
import { ConfirmDialog } from '@components/ui/ConfirmDialog'
import { EmptyState } from '@components/ui/EmptyState'
import { Modal } from '@components/ui/Modal'
import { PageHeader, SectionHeader } from '@components/ui/PageHeader'
import { useToast } from '@components/ui/Toast'
import { ROUTES } from '@lib/constants'
import { cn } from '@lib/utils'

const roleLabels = { owner: 'Propietario', admin: 'Admin', member: 'Miembro' } as const

export default function GroupDetailPage() {
    const { groupId } = useParams<{ groupId: string }>()
    const navigate = useNavigate()
    const [searchParams, setSearchParams] = useSearchParams()
    const { user } = useAuth()
    const { activeGroup, setActiveGroup } = useActiveGroup()
    const refreshMyGroups = useRefreshMyGroups()
    const queryClient = useQueryClient()
    const toast = useToast()

    const inviteToken = searchParams.get('invite')
    const [joining, setJoining] = React.useState(!!inviteToken)
    const [showInvite, setShowInvite] = React.useState(searchParams.get('invitar') === '1')
    const [showPermissions, setShowPermissions] = React.useState(false)
    const [confirm, setConfirm] = React.useState<'delete' | 'leave' | null>(null)

    // Invite links must be redeemed before reading the group: non-members cannot see it yet.
    React.useEffect(() => {
        if (!inviteToken || !user) return
        let cancelled = false
        void (async () => {
            try {
                const joinedGroupId = await groupsService.joinWithToken(inviteToken)
                if (cancelled) return
                await refreshMyGroups(joinedGroupId)
                toast.success('¡Bienvenido al grupo!', 'Ya puedes ver su música y sus cuentas.')
                if (joinedGroupId && joinedGroupId !== groupId) navigate(ROUTES.GROUP(joinedGroupId), { replace: true })
            } catch (err) {
                if (!cancelled) toast.error('No se pudo usar la invitación', err instanceof Error ? err.message : undefined)
            } finally {
                if (!cancelled) {
                    searchParams.delete('invite')
                    setSearchParams(searchParams, { replace: true })
                    setJoining(false)
                    void queryClient.invalidateQueries({ queryKey: ['group', groupId] })
                }
            }
        })()
        return () => {
            cancelled = true
        }
    }, [inviteToken, user?.id])

    const groupQuery = useQuery({
        queryKey: ['group', groupId],
        queryFn: async () => {
            const [group, members] = await Promise.all([groupsService.getGroup(groupId!), groupsService.getGroupMembers(groupId!)])
            return { group, members }
        },
        enabled: !!groupId && !joining,
        retry: false,
    })

    const group = groupQuery.data?.group ?? null
    const members = groupQuery.data?.members ?? []
    const myMembership = user ? members.find((member) => member.user_id === user.id) : null
    const isOwner = !!(group && user && group.created_by === user.id)
    const isManager = isOwner || myMembership?.role === 'admin'
    const isActive = activeGroup?.id === group?.id
    const myRole = isOwner ? 'owner' : myMembership?.role ?? null

    const reload = () => void queryClient.invalidateQueries({ queryKey: ['group', groupId] })

    const createLink = useMutation({
        mutationFn: () => groupsService.createInviteToken(groupId!, user!.id),
        onSuccess: async (token) => {
            const link = `${window.location.origin}${ROUTES.GROUP(groupId!)}?invite=${token}`
            const text = `Únete a "${group?.name}" en The Appden`
            try {
                if (navigator.share) {
                    await navigator.share({ title: 'The Appden', text, url: link })
                    return
                }
                await navigator.clipboard.writeText(link)
                toast.success('Enlace copiado', 'Caduca en 7 días. Pégalo en WhatsApp o donde quieras.')
            } catch {
                // Share sheet dismissed.
            }
        },
        onError: (err) => toast.error('No se pudo generar el enlace', err instanceof Error ? err.message : undefined),
    })

    const removeMember = async (memberUserId: string) => {
        try {
            await groupsService.removeGroupMember(groupId!, memberUserId)
            reload()
            toast.success('Miembro expulsado')
        } catch (err) {
            toast.error('No se pudo expulsar al miembro', err instanceof Error ? err.message : undefined)
        }
    }

    const updateRole = async (memberUserId: string, role: 'owner' | 'admin' | 'member') => {
        try {
            await groupsService.updateGroupMemberRole(groupId!, memberUserId, role)
            reload()
            toast.success('Rol actualizado')
        } catch (err) {
            toast.error('No se pudo cambiar el rol', err instanceof Error ? err.message : undefined)
        }
    }

    const destructive = useMutation({
        mutationFn: async (kind: 'delete' | 'leave') => {
            if (kind === 'delete') await groupsService.deleteGroup(groupId!)
            else await groupsService.leaveGroup(groupId!)
        },
        onSuccess: async (_data, kind) => {
            setConfirm(null)
            await refreshMyGroups()
            void queryClient.invalidateQueries({ queryKey: ['my-groups'] })
            toast.success(kind === 'delete' ? 'Grupo eliminado' : 'Has salido del grupo')
            navigate(ROUTES.GROUPS, { replace: true })
        },
        onError: (err) => toast.error('No se pudo completar la acción', err instanceof Error ? err.message : undefined),
    })

    if (joining || groupQuery.isLoading) {
        return (
            <div className="page-shell">
                <PageHeader back={ROUTES.GROUPS} title={joining ? 'Uniéndote al grupo…' : 'Cargando…'} />
                <ListSkeleton count={4} />
            </div>
        )
    }

    if (!group || (!myMembership && !isOwner)) {
        return (
            <div className="page-shell">
                <PageHeader back={ROUTES.GROUPS} title="Grupo" />
                <EmptyState
                    icon={<Users className="h-6 w-6" />}
                    title="No tienes acceso a este grupo"
                    description="Pide a un miembro que te envíe un enlace de invitación o que te invite desde la app."
                />
            </div>
        )
    }

    return (
        <div className="page-shell animate-fade-in">
            <PageHeader
                back={ROUTES.GROUPS}
                title={group.name}
                description={group.description ?? undefined}
                meta={
                    <>
                        <span className="hero-meta-pill">
                            <Users className="h-3.5 w-3.5" />
                            {members.length} {members.length === 1 ? 'miembro' : 'miembros'}
                        </span>
                        {myRole ? (
                            <span className="hero-meta-pill">
                                <Shield className="h-3.5 w-3.5" />
                                {roleLabels[myRole]}
                            </span>
                        ) : null}
                    </>
                }
            />

            <div className="grid grid-cols-2 gap-2">
                {isActive ? (
                    <div className="btn-secondary pointer-events-none border-brand-400/30 text-brand-200">
                        <Check className="h-4 w-4" />
                        Grupo activo
                    </div>
                ) : (
                    <button
                        type="button"
                        className="btn-secondary"
                        onClick={() => {
                            setActiveGroup(group)
                            toast.success(`Ahora estás en ${group.name}`)
                        }}
                    >
                        <Check className="h-4 w-4" />
                        Usar este grupo
                    </button>
                )}
                {isManager ? (
                    <button type="button" className="btn-primary" onClick={() => setShowInvite(true)}>
                        <UserPlus className="h-4 w-4" />
                        Invitar
                    </button>
                ) : (
                    <button type="button" className="btn-secondary" onClick={() => setConfirm('leave')}>
                        <LogOut className="h-4 w-4" />
                        Salir
                    </button>
                )}
            </div>

            <section>
                <SectionHeader title="Miembros" />
                <GroupMemberList
                    groupId={groupId!}
                    members={members}
                    currentUserId={user?.id || ''}
                    isManager={isManager}
                    canAssignRoles={isOwner}
                    onUpdateRole={isOwner ? updateRole : undefined}
                    onRemoveMember={isManager ? removeMember : undefined}
                />
            </section>

            {user ? (
                <section className="card overflow-hidden">
                    <button type="button" className="list-row" onClick={() => setShowPermissions((value) => !value)} aria-expanded={showPermissions}>
                        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white/[0.06] text-gray-300">
                            <Shield className="h-5 w-5" />
                        </span>
                        <span className="min-w-0 flex-1">
                            <span className="block text-[15px] font-semibold text-white">Permisos</span>
                            <span className="block text-xs text-gray-400">Qué puede hacer cada miembro en el grupo</span>
                        </span>
                        <ChevronDown className={cn('h-5 w-5 text-gray-500 transition-transform', showPermissions && 'rotate-180')} />
                    </button>
                    {showPermissions ? (
                        <div className="border-t border-white/[0.06] p-3">
                            <GroupPermissionsPanel groupId={groupId!} members={members} currentUserId={user.id} isOwner={isOwner} />
                        </div>
                    ) : null}
                </section>
            ) : null}

            <section className="list-group">
                {!isOwner && isManager ? (
                    <button type="button" className="list-row text-red-300" onClick={() => setConfirm('leave')}>
                        <LogOut className="h-5 w-5" />
                        <span className="text-[15px] font-medium">Salir del grupo</span>
                    </button>
                ) : null}
                {isOwner ? (
                    <button type="button" className="list-row text-red-300" onClick={() => setConfirm('delete')}>
                        <Trash2 className="h-5 w-5" />
                        <span className="text-[15px] font-medium">Eliminar grupo</span>
                    </button>
                ) : null}
            </section>

            <Modal open={showInvite} onClose={() => setShowInvite(false)} title="Invitar al grupo" size="md">
                <button
                    type="button"
                    onClick={() => createLink.mutate()}
                    disabled={createLink.isPending}
                    className="card-interactive mb-5 flex w-full items-center gap-3 p-4 text-left"
                >
                    <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-brand-400/15 text-brand-200">
                        <Link2 className="h-5 w-5" />
                    </span>
                    <span className="min-w-0 flex-1">
                        <span className="block font-semibold text-white">{createLink.isPending ? 'Generando enlace…' : 'Compartir enlace de invitación'}</span>
                        <span className="block text-sm text-gray-400">Quien lo abra entrará al grupo. Caduca en 7 días.</span>
                    </span>
                </button>
                <GroupInvitationsPanel groupId={groupId!} members={members} canInvite={isManager} />
            </Modal>

            <ConfirmDialog
                isOpen={confirm !== null}
                title={confirm === 'delete' ? `¿Eliminar "${group.name}"?` : `¿Salir de "${group.name}"?`}
                description={
                    confirm === 'delete'
                        ? 'Se borrarán para todos sus canciones, playlists, cuentas y archivos. No se puede deshacer.'
                        : 'Dejarás de ver su música y sus cuentas. Necesitarás una nueva invitación para volver.'
                }
                confirmLabel={confirm === 'delete' ? 'Eliminar grupo' : 'Salir'}
                isLoading={destructive.isPending}
                onConfirm={() => confirm && destructive.mutate(confirm)}
                onCancel={() => setConfirm(null)}
            />
        </div>
    )
}
