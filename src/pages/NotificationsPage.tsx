import React from 'react'
import { Trash2, AlertCircle, Bell } from 'lucide-react'
import { useAuth } from '@hooks/useAuth'
import { useNotifications } from '@hooks/useNotifications'
import { EmptyState } from '@components/ui/EmptyState'
import type { AppNotification } from '@/types'

// Mock notifications for now - in production, fetch from Supabase
const mockNotifications: AppNotification[] = [
    {
        id: '1',
        user_id: 'user1',
        group_id: 'group1',
        type: 'song_added',
        title: 'New Song Added',
        body: 'Alice added "Song Name" to the group',
        read: false,
        resource_type: 'song',
        resource_id: 'song1',
        created_at: new Date().toISOString(),
    },
    {
        id: '2',
        user_id: 'user1',
        group_id: 'group1',
        type: 'debt_created',
        title: 'New Debt',
        body: 'Bob created a debt: "Dinner" €50',
        read: false,
        resource_type: 'debt',
        resource_id: 'debt1',
        created_at: new Date(Date.now() - 3600000).toISOString(),
    },
]

export default function NotificationsPage() {
    const { user } = useAuth()
    const { addNotification } = useNotifications()

    const [notifications, setNotifications] = React.useState<AppNotification[]>(mockNotifications)
    const [loading, setLoading] = React.useState(false)
    const [error, setError] = React.useState<string | null>(null)

    async function handleDeleteNotification(id: string) {
        setNotifications(notifications.filter((n) => n.id !== id))
    }

    async function handleMarkAsRead(id: string) {
        setNotifications(
            notifications.map((n) =>
                n.id === id ? { ...n, read: true } : n
            )
        )
    }

    async function handleClearAll() {
        if (confirm('Clear all notifications?')) {
            setNotifications([])
        }
    }

    const unreadCount = notifications.filter((n) => !n.read).length

    if (error) {
        return (
            <div className="max-w-2xl mx-auto px-4 py-6">
                <div className="p-4 bg-red-500/10 border border-red-500 rounded-lg flex items-start gap-3">
                    <AlertCircle className="text-red-400 flex-shrink-0 mt-0.5" />
                    <div>
                        <p className="font-medium text-red-400">Error loading notifications</p>
                        <p className="text-sm text-red-300">{error}</p>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="max-w-2xl mx-auto px-4 py-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-1">Notifications</h1>
                    <p className="text-neutral-400">
                        {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}
                    </p>
                </div>
                {notifications.length > 0 && (
                    <button
                        onClick={handleClearAll}
                        className="px-4 py-2 text-sm text-neutral-400 hover:text-neutral-300 hover:bg-neutral-800 rounded-lg transition-colors"
                    >
                        Clear All
                    </button>
                )}
            </div>

            {/* Notifications List */}
            {notifications.length === 0 ? (
                <EmptyState
                    icon="Bell"
                    title="No notifications"
                    description="You're all caught up! We'll notify you when something new happens"
                />
            ) : (
                <div className="space-y-2">
                    {notifications.map((notification) => (
                        <div
                            key={notification.id}
                            className={`p-4 rounded-lg border transition-all ${
                                notification.read
                                    ? 'bg-neutral-900 border-neutral-800'
                                    : 'bg-neutral-800 border-brand-500/30'
                            }`}
                        >
                            <div className="flex items-start justify-between gap-4">
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                        {!notification.read && (
                                            <div className="w-2 h-2 bg-brand-500 rounded-full flex-shrink-0" />
                                        )}
                                        <h3 className="font-semibold text-white">
                                            {notification.title}
                                        </h3>
                                    </div>
                                    <p className="text-sm text-neutral-300 mb-2">
                                        {notification.body}
                                    </p>
                                    <p className="text-xs text-neutral-500">
                                        {new Date(notification.created_at).toLocaleString()}
                                    </p>
                                </div>

                                <div className="flex items-center gap-1">
                                    {!notification.read && (
                                        <button
                                            onClick={() => handleMarkAsRead(notification.id)}
                                            className="px-3 py-1 text-xs bg-brand-500/20 hover:bg-brand-500/30 text-brand-300 rounded transition-colors"
                                        >
                                            Mark read
                                        </button>
                                    )}
                                    <button
                                        onClick={() => handleDeleteNotification(notification.id)}
                                        className="p-1.5 hover:bg-red-500/20 text-neutral-400 hover:text-red-400 rounded transition-colors"
                                        title="Delete"
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
