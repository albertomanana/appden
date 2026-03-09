import { create } from 'zustand'
import type { AppNotification } from '@/types'

interface NotificationState {
    notifications: AppNotification[]
    unreadCount: number
    addNotification: (notification: AppNotification) => void
    markAsRead: (id: string) => void
    markAllAsRead: () => void
    removeNotification: (id: string) => void
    clearAll: () => void
}

/**
 * In-app notification store.
 * Notifications are session-only (not persisted to avoid stale data).
 * Push notifications infrastructure is left for future integration.
 */
export const useNotificationStore = create<NotificationState>()((set) => ({
    notifications: [],
    unreadCount: 0,

    addNotification: (notification) =>
        set((state) => ({
            notifications: [notification, ...state.notifications].slice(0, 50),
            unreadCount: state.unreadCount + (notification.read ? 0 : 1),
        })),

    markAsRead: (id) =>
        set((state) => {
            const updated = state.notifications.map((n) =>
                n.id === id ? { ...n, read: true } : n
            )
            return {
                notifications: updated,
                unreadCount: updated.filter((n) => !n.read).length,
            }
        }),

    markAllAsRead: () =>
        set((state) => ({
            notifications: state.notifications.map((n) => ({ ...n, read: true })),
            unreadCount: 0,
        })),

    removeNotification: (id) =>
        set((state) => {
            const updated = state.notifications.filter((n) => n.id !== id)
            return {
                notifications: updated,
                unreadCount: updated.filter((n) => !n.read).length,
            }
        }),

    clearAll: () => set({ notifications: [], unreadCount: 0 }),
}))
