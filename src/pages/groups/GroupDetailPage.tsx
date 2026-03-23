import React from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { AlertCircle, ArrowLeft, CopyIcon, Shield } from 'lucide-react'
import { useAuth } from '@hooks/useAuth'
import { groupsService } from '@services/groups.service'
import { GroupMemberList } from '@components/groups/GroupMemberList'
import { GroupPermissionsPanel } from '@components/groups/GroupPermissionsPanel'
import { GroupInvitationsPanel } from '@components/groups/GroupInvitationsPanel'
import { LoadingSkeleton } from '@components/ui/LoadingSkeleton'
import { ConfirmDialog } from '@components/ui/ConfirmDialog'
import { PageHeader } from '@components/ui/PageHeader'
import { useNotifications } from '@hooks/useNotifications'
import { useGroupStore } from '@app/store/group.store'
import type { Group, GroupMember } from '@/types'

export default function GroupDetailPage() {
    const { groupId } = useParams<{ groupId: string }>()
    const navigate = useNavigate()
    const { user } = useAuth()
    const { addNotification } = useNotifications()
    const setActiveGroup = useGroupStore((state) => state.setActiveGroup)

    const [group, setGroup] = React.useState<Group | null>(null)
    const [members, setMembers] = React.useState<GroupMember[]>([])
    const [loading, setLoading] = React.useState(true)
    const [error, setError] = React.useState<string | null>(null)
    const [isDeleting, setIsDeleting] = React.useState(false)
    const [showDeleteDialog, setShowDeleteDialog] = React.useState(false)

    React.useEffect(() => {
        if (groupId) {
            void loadGroupDetails()
        }
    }, [groupId])

    async function loadGroupDetails() {
        try {
            setLoading(true)
            setError(null)
            if (!groupId) return

            const [groupData, membersData] = await Promise.all([
                groupsService.getGroup(groupId),
                groupsService.getGroupMembers(groupId),
            ])
            setGroup(groupData)
            setActiveGroup(groupData)
            setMembers(membersData)
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load group')
        } finally {
            setLoading(false)
        }
    }

    async function handleRemoveMember(userId: string) {
        try {
            if (!groupId) return
            await groupsService.removeGroupMember(groupId, userId)
            setMembers((current) => current.filter((member) => member.user_id !== userId))
            addNotification({
                type: 'success',
                title: 'Member Removed',
                message: 'Member has been removed from the group',
            })
        } catch (err) {
            addNotification({
                type: 'error',
                title: 'Error',
                message: err instanceof Error ? err.message : 'Failed to remove member',
            })
        }
    }

    async function handleUpdateRole(userId: string, role: 'owner' | 'admin' | 'member') {
        try {
            if (!groupId) return
            await groupsService.updateGroupMemberRole(groupId, userId, role)
            await loadGroupDetails()
            addNotification({
                type: 'success',
                title: 'Rol actualizado',
                message: 'Los permisos del miembro se actualizaron correctamente.',
            })
        } catch (err) {
            addNotification({
                type: 'error',
                title: 'Error',
                message: err instanceof Error ? err.message : 'No se pudo cambiar el rol',
            })
        }
    }

    async function handleDeleteGroup() {
        try {
            setIsDeleting(true)
            if (!groupId) return
            await groupsService.deleteGroup(groupId)
            navigate('/groups')
            addNotification({
                type: 'success',
                title: 'Group Deleted',
                message: 'The group has been deleted',
            })
        } catch (err) {
            addNotification({
                type: 'error',
                title: 'Error',
                message: err instanceof Error ? err.message : 'Failed to delete group',
            })
        } finally {
            setIsDeleting(false)
        }
    }

    function copyInviteCode() {
        if (!groupId) return
        const inviteLink = `${window.location.origin}/groups/${groupId}`
        navigator.clipboard.writeText(inviteLink)
        addNotification({
            type: 'success',
            title: 'Copied',
            message: 'Invite link copied to clipboard',
        })
    }

    const isOwner = !!(group && user && group.created_by === user.id)
    const myMembership = user ? members.find((member) => member.user_id === user.id) : null
    const isManager = isOwner || myMembership?.role === 'admin'

    if (loading) {
        return (
            <div className="page-shell">
                <LoadingSkeleton />
                <LoadingSkeleton />
            </div>
        )
    }

    if (!group) {
        return (
            <div className="page-shell">
                <button onClick={() => navigate(-1)} className="btn-ghost -ml-2 w-fit gap-2">
                    <ArrowLeft className="w-4 h-4" />
                    Volver
                </button>
                <section className="card p-6 text-center">
                    <p className="text-gray-300">No encontramos este grupo.</p>
                </section>
            </div>
        )
    }

    return (
        <div className="page-shell animate-fade-in">
            <button onClick={() => navigate(-1)} className="btn-ghost -ml-2 w-fit gap-2">
                <ArrowLeft className="w-4 h-4" />
                Volver
            </button>

            <PageHeader
                kicker="Group Detail"
                title={group.name}
                description={group.description ?? 'Espacio privado para musica, actividad y colaboracion social dentro de The Appden.'}
                meta={
                    <>
                        <span className="hero-meta-pill">{members.length} members</span>
                        <span className="hero-meta-pill">{isOwner ? 'Owner' : isManager ? 'Admin' : 'Member'}</span>
                    </>
                }
            />

            {error ? (
                <section className="card border border-red-400/20 bg-red-400/8 p-4">
                    <div className="flex items-start gap-3">
                        <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-300" />
                        <div>
                            <p className="text-sm font-semibold text-red-200">Error cargando el grupo</p>
                            <p className="mt-1 text-sm text-red-100/80">{error}</p>
                        </div>
                    </div>
                </section>
            ) : null}

            <div className="grid gap-4 xl:grid-cols-[1.15fr,0.85fr]">
                <section className="card p-5">
                    <div className="flex items-center justify-between gap-3">
                        <div>
                            <p className="page-kicker">Invite Access</p>
                            <h2 className="mt-2 text-2xl font-headline font-extrabold text-white">Link compartido</h2>
                            <p className="mt-2 text-sm text-gray-400">Copia este enlace y usa el panel de invitaciones para dar acceso formal.</p>
                        </div>
                        <button onClick={copyInviteCode} className="btn-secondary">
                            <CopyIcon className="w-4 h-4" />
                            Copiar link
                        </button>
                    </div>
                </section>

                <section className="card p-5">
                    <div className="flex items-center gap-2 text-sm text-gray-300">
                        <Shield className="w-4 h-4 text-brand-300" />
                        Owner y admins pueden invitar, gestionar miembros y ajustar permisos.
                    </div>
                </section>
            </div>

            <section className="card p-5">
                <div className="mb-5">
                    <p className="page-kicker">Invitations</p>
                    <h2 className="mt-2 text-2xl font-headline font-extrabold text-white">Gestion de invitaciones</h2>
                </div>
                <GroupInvitationsPanel groupId={groupId!} members={members} canInvite={isManager} />
            </section>

            <section className="card p-5">
                <div className="mb-5 flex items-center justify-between gap-3">
                    <div>
                        <p className="page-kicker">Member Roster</p>
                        <h2 className="mt-2 text-2xl font-headline font-extrabold text-white">Miembros</h2>
                    </div>
                    <span className="hero-meta-pill">{members.length} activos</span>
                </div>
                <GroupMemberList
                    groupId={groupId!}
                    members={members}
                    currentUserId={user?.id || ''}
                    isManager={isManager}
                    canAssignRoles={isOwner}
                    onUpdateRole={isOwner ? handleUpdateRole : undefined}
                    onRemoveMember={isManager ? handleRemoveMember : undefined}
                />
            </section>

            {groupId && user ? (
                <section className="card p-5">
                    <div className="mb-5">
                        <p className="page-kicker">Permissions Matrix</p>
                        <h2 className="mt-2 text-2xl font-headline font-extrabold text-white">Permisos del grupo</h2>
                    </div>
                    <GroupPermissionsPanel
                        groupId={groupId}
                        members={members}
                        currentUserId={user.id}
                        isOwner={isOwner || false}
                    />
                </section>
            ) : null}

            {isOwner ? (
                <section className="card border border-red-400/20 bg-red-400/8 p-5">
                    <p className="page-kicker !text-red-300">Danger Zone</p>
                    <h3 className="mt-2 text-2xl font-headline font-extrabold text-white">Eliminar grupo</h3>
                    <p className="mt-2 max-w-2xl text-sm text-red-100/80">
                        Esta accion es destructiva y borra el contexto privado del grupo para todos sus miembros.
                    </p>
                    <div className="mt-4">
                        <button onClick={() => setShowDeleteDialog(true)} className="btn-danger">
                            Delete group
                        </button>
                    </div>
                </section>
            ) : null}

            <ConfirmDialog
                isOpen={showDeleteDialog}
                title="Delete Group"
                description={`Are you sure you want to delete "${group.name}"? This action cannot be undone.`}
                variant="danger"
                isLoading={isDeleting}
                onConfirm={handleDeleteGroup}
                onCancel={() => setShowDeleteDialog(false)}
            />
        </div>
    )
}
