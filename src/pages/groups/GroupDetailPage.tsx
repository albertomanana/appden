import React from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, AlertCircle, CopyIcon } from 'lucide-react'
import { useAuth } from '@hooks/useAuth'
import { groupsService } from '@services/groups.service'
import { GroupMemberList } from '@components/groups/GroupMemberList'
import { LoadingSkeleton } from '@components/ui/LoadingSkeleton'
import { ConfirmDialog } from '@components/ui/ConfirmDialog'
import { useNotifications } from '@hooks/useNotifications'
import type { Group, GroupMember } from '@/types'

export default function GroupDetailPage() {
    const { groupId } = useParams<{ groupId: string }>()
    const navigate = useNavigate()
    const { user } = useAuth()
    const { addNotification } = useNotifications()

    const [group, setGroup] = React.useState<Group | null>(null)
    const [members, setMembers] = React.useState<GroupMember[]>([])
    const [loading, setLoading] = React.useState(true)
    const [error, setError] = React.useState<string | null>(null)
    const [isDeleting, setIsDeleting] = React.useState(false)
    const [showDeleteDialog, setShowDeleteDialog] = React.useState(false)

    React.useEffect(() => {
        if (groupId) {
            loadGroupDetails()
        }
    }, [groupId])

    async function loadGroupDetails() {
        try {
            setLoading(true)
            setError(null)
            if (!groupId) return

            const groupData = await groupsService.getGroup(groupId)
            setGroup(groupData)

            const membersData = await groupsService.getGroupMembers(groupId)
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
            setMembers(members.filter((m) => m.user_id !== userId))
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

    const isOwner = group && user && group.created_by === user.id

    if (loading) {
        return (
            <div className="max-w-2xl mx-auto px-4 py-6">
                <LoadingSkeleton />
                <LoadingSkeleton />
            </div>
        )
    }

    if (!group) {
        return (
            <div className="max-w-2xl mx-auto px-4 py-6">
                <button
                    onClick={() => navigate(-1)}
                    className="flex items-center gap-2 text-brand-400 hover:text-brand-300 mb-6"
                >
                    <ArrowLeft size={20} />
                    Back
                </button>
                <div className="text-center py-12">
                    <p className="text-neutral-400">Group not found</p>
                </div>
            </div>
        )
    }

    return (
        <div className="max-w-2xl mx-auto px-4 py-6">
            {/* Header */}
            <button
                onClick={() => navigate(-1)}
                className="flex items-center gap-2 text-brand-400 hover:text-brand-300 mb-6"
            >
                <ArrowLeft size={20} />
                Back
            </button>

            {/* Error */}
            {error && (
                <div className="mb-6 p-4 bg-red-500/10 border border-red-500 rounded-lg flex items-start gap-3">
                    <AlertCircle className="text-red-400 flex-shrink-0 mt-0.5" />
                    <div>
                        <p className="font-medium text-red-400">Error</p>
                        <p className="text-sm text-red-300">{error}</p>
                    </div>
                </div>
            )}

            {/* Group Info */}
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-white mb-2">{group.name}</h1>
                {group.description && (
                    <p className="text-neutral-400">{group.description}</p>
                )}
            </div>

            {/* Invite Link */}
            <div className="mb-8 p-4 bg-neutral-800 rounded-lg border border-neutral-700">
                <h2 className="text-sm font-semibold text-neutral-300 mb-3 uppercase tracking-wider">
                    Invite Members
                </h2>
                <p className="text-sm text-neutral-400 mb-3">
                    Share this link with friends to allow them to join the group
                </p>
                <button
                    onClick={copyInviteCode}
                    className="flex items-center gap-2 px-4 py-2.5 w-full bg-neutral-700 hover:bg-neutral-600 text-white rounded-lg transition-colors mb-2"
                >
                    <CopyIcon size={18} />
                    Copy Invite Link
                </button>
            </div>

            {/* Members Section */}
            <div className="mb-8">
                <h2 className="text-lg font-semibold text-white mb-4">
                    Members ({members.length})
                </h2>
                <GroupMemberList
                    members={members}
                    currentUserId={user?.id || ''}
                    isOwner={isOwner || false}
                    onRemoveMember={isOwner ? handleRemoveMember : undefined}
                />
            </div>

            {/* Danger Zone */}
            {isOwner && (
                <div className="pt-8 border-t border-neutral-700">
                    <h3 className="text-sm font-semibold text-red-400 mb-4 uppercase tracking-wider">
                        Danger Zone
                    </h3>
                    <button
                        onClick={() => setShowDeleteDialog(true)}
                        className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 hover:text-red-300 border border-red-500/50 rounded-lg font-medium transition-colors"
                    >
                        Delete Group
                    </button>
                </div>
            )}

            {/* Delete Dialog */}
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
