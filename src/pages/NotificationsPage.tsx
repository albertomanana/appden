import React from 'react'
import { Trash2, Bell } from 'lucide-react'
import { EmptyState } from '@components/ui/EmptyState'
import type { AppNotification } from '@/types'

const mockNotifications: AppNotification[] = [
    {
        id: '1',
        user_id: 'user1',
        group_id: 'group1',
        type: 'song_added',
        title: 'Nueva cancion',
        body: 'Alice anadio "Song Name" al grupo',
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
        title: 'Nueva deuda',
        body: 'Bob creo una deuda: "Cena" 50 EUR',
        read: false,
        resource_type: 'debt',
        resource_id: 'debt1',
        created_at: new Date(Date.now() - 3600000).toISOString(),
    },
]

export default function NotificationsPage() {
    const [notifications, setNotifications] = React.useState<AppNotification[]>(mockNotifications)

    function handleDeleteNotification(id: string) {
        setNotifications((prev) => prev.filter((n) => n.id !== id))
    }

    function handleMarkAsRead(id: string) {
        setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)))
    }

    function handleClearAll() {
        if (confirm('Clear all notifications?')) {
            setNotifications([])
        }
    }

    const unreadCount = notifications.filter((n) => !n.read).length

    return (
        <div className="max-w-2xl mx-auto px-4 py-6">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-1">Notifications</h1>
                    <p className="text-neutral-400">
                        {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}
                    </p>
                </div>
                {notifications.length > 0 ? (
                    <button
                        onClick={handleClearAll}
                        className="px-4 py-2 text-sm text-neutral-400 hover:text-neutral-300 hover:bg-neutral-800 rounded-lg transition-colors"
                    >
                        Clear All
                    </button>
                ) : null}
            </div>

            {notifications.length === 0 ? (
                <EmptyState
                    icon={<Bell className="w-7 h-7" />}
                    title="No notifications"
                    description="You are all caught up."
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
                                        {!notification.read ? (
                                            <div className="w-2 h-2 bg-brand-500 rounded-full flex-shrink-0" />
                                        ) : null}
                                        <h3 className="font-semibold text-white">{notification.title}</h3>
                                    </div>
                                    <p className="text-sm text-neutral-300 mb-2">{notification.body}</p>
                                    <p className="text-xs text-neutral-500">{new Date(notification.created_at).toLocaleString()}</p>
                                </div>

                                <div className="flex items-center gap-1">
                                    {!notification.read ? (
                                        <button
                                            onClick={() => handleMarkAsRead(notification.id)}
                                            className="px-3 py-1 text-xs bg-brand-500/20 hover:bg-brand-500/30 text-brand-300 rounded transition-colors"
                                        >
                                            Mark read
                                        </button>
                                    ) : null}
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
