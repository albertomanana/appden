import { useNotificationStore } from '@app/store/notifications.store'
import type { AppNotification } from '@/types'

/**
 * Custom hook to easily work with in-app notifications.
 * Provides a simpler interface than the raw Zustand store.
 */
export function useNotifications() {
    const store = useNotificationStore()

    return {
        notifications: store.notifications,
        unreadCount: store.unreadCount,

        /**
         * Add a notification with sensible defaults.
         * Type can be 'success', 'error', 'info', 'warning'.
         */
        addNotification: (options: {
            type?: 'success' | 'error' | 'info' | 'warning'
            title: string
            message: string
            duration?: number // ms (handled at Toast component level)
        }) => {
            const notification: AppNotification = {
                id: `notif-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
                user_id: '', // Will be set from context if needed
                group_id: '', // Will be set from context if needed
                type: 'song_added', // Default, can be overridden by context
                title: options.title,
                body: options.message,
                read: false,
                resource_type: null,
                resource_id: null,
                created_at: new Date().toISOString(),
            }
            store.addNotification(notification)
        },

        markAsRead: store.markAsRead,
        markAllAsRead: store.markAllAsRead,
        removeNotification: store.removeNotification,
        clearAll: store.clearAll,
    }
}
