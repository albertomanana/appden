import React from 'react'
import { Plus, AlertCircle } from 'lucide-react'
import { useAuth } from '@hooks/useAuth'
import { groupsService } from '@services/groups.service'
import { GroupForm, type GroupFormData } from '@components/groups/GroupForm'
import { GroupCard } from '@components/groups/GroupCard'
import { EmptyState } from '@components/ui/EmptyState'
import { useNotifications } from '@hooks/useNotifications'
import type { Group } from '@/types'

export default function GroupsPage() {
    const { user } = useAuth()
    const { addNotification } = useNotifications()

    const [groups, setGroups] = React.useState<Group[]>([])
    const [groupCounts, setGroupCounts] = React.useState<Record<string, number>>({})
    const [loading, setLoading] = React.useState(true)
    const [error, setError] = React.useState<string | null>(null)
    const [showForm, setShowForm] = React.useState(false)
    const [isSubmitting, setIsSubmitting] = React.useState(false)

    React.useEffect(() => {
        loadGroups()
    }, [user?.id])

    async function loadGroups() {
        try {
            setLoading(true)
            setError(null)
            if (!user?.id) return

            const data = await groupsService.getGroups(user.id)
            setGroups(data)

            // Load member count for each group
            const counts: Record<string, number> = {}
            for (const group of data) {
                try {
                    const members = await groupsService.getGroupMembers(group.id)
                    counts[group.id] = members.length
                } catch {
                    counts[group.id] = 0
                }
            }
            setGroupCounts(counts)
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load groups')
        } finally {
            setLoading(false)
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

            // Add current user as owner
            await groupsService.addGroupMember(newGroup.id, user.id, 'owner')

            setGroups([newGroup, ...groups])
            setGroupCounts({ ...groupCounts, [newGroup.id]: 1 })
            setShowForm(false)

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

    if (loading) {
        return (
            <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
                <LoadingSkeleton />
                <LoadingSkeleton />
                <LoadingSkeleton />
            </div>
        )
    }

    return (
        <div className="max-w-2xl mx-auto px-4 py-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-1">Groups</h1>
                    <p className="text-neutral-400">Manage your friend groups</p>
                </div>
                <button
                    onClick={() => setShowForm(!showForm)}
                    className="flex items-center gap-2 px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white font-medium rounded-lg transition-colors"
                >
                    <Plus size={20} />
                    New Group
                </button>
            </div>

            {/* Create Form */}
            {showForm && (
                <div className="mb-6 p-4 bg-neutral-800 rounded-lg border border-neutral-700">
                    <h2 className="text-lg font-semibold text-white mb-4">Create New Group</h2>
                    <GroupForm onSubmit={handleCreateGroup} isLoading={isSubmitting} />
                </div>
            )}

            {/* Error */}
            {error && (
                <div className="mb-6 p-4 bg-red-500/10 border border-red-500 rounded-lg flex items-start gap-3">
                    <AlertCircle className="text-red-400 flex-shrink-0 mt-0.5" />
                    <div>
                        <p className="font-medium text-red-400">Error loading groups</p>
                        <p className="text-sm text-red-300">{error}</p>
                    </div>
                </div>
            )}

            {/* Groups List */}
            {groups.length === 0 ? (
                <EmptyState
                    icon="Users"
                    title="No groups yet"
                    description="Create a group to start sharing music and managing debts with your friends"
                    action={{
                        label: 'Create Group',
                        onClick: () => setShowForm(true),
                    }}
                />
            ) : (
                <div className="grid gap-3">
                    {groups.map((group) => (
                        <GroupCard
                            key={group.id}
                            group={group}
                            memberCount={groupCounts[group.id] || 0}
                        />
                    ))}
                </div>
            )}
        </div>
    )
}
