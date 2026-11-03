import { useCallback, useEffect } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNotificationStore } from '@app/store/notifications.store'
import { useAuth } from '@hooks/useAuth'
import { useToast } from '@components/ui/Toast'
import { notificationsService } from '@services/notifications.service'
import type { AppNotification } from '@/types'

type UseNotificationsOptions = {
    /** Kept for backwards compatibility: persisted notifications are always loaded now. */
    loadPersisted?: boolean
}

const notificationsKey = (userId: string | null) => ['notifications', userId] as const
const unreadKey = (userId: string | null) => ['notifications-unread', userId] as const

/**
 * Persisted notifications (Supabase `notifications` table) plus a toast shim.
 *
 * `addNotification` used to push transient feedback into a list nobody saw;
 * it now shows a toast so every caller gives visible feedback.
 */
export function useNotifications(_options: UseNotificationsOptions = {}) {
    const { userId } = useAuth()
    const queryClient = useQueryClient()
    const toast = useToast()
    const setNotifications = useNotificationStore((state) => state.setNotifications)

    const query = useQuery({
        queryKey: notificationsKey(userId),
        queryFn: () => notificationsService.listForUser(userId!),
        enabled: !!userId,
        staleTime: 30_000,
        refetchOnWindowFocus: true,
    })

    const notifications = query.data ?? []

    // Keep the header badge in sync with what this page shows.
    useEffect(() => {
        if (query.data) queryClient.setQueryData(unreadKey(userId), query.data.filter((item) => !item.read).length)
    }, [query.data, queryClient, userId])

    useEffect(() => {
        if (query.data) setNotifications(query.data)
    }, [query.data, setNotifications])

    const patchCache = useCallback(
        (updater: (items: AppNotification[]) => AppNotification[]) => {
            queryClient.setQueryData<AppNotification[]>(notificationsKey(userId), (current) => updater(current ?? []))
        },
        [queryClient, userId]
    )

    const markRead = useMutation({
        mutationFn: (id: string) => notificationsService.markAsRead(id),
        onMutate: (id) => patchCache((items) => items.map((item) => (item.id === id ? { ...item, read: true } : item))),
        onError: () => void query.refetch(),
    })

    const markAll = useMutation({
        mutationFn: () => notificationsService.markAllAsRead(userId!),
        onMutate: () => patchCache((items) => items.map((item) => ({ ...item, read: true }))),
        onError: () => {
            toast.error('No se pudieron marcar como leídas')
            void query.refetch()
        },
    })

    const remove = useMutation({
        mutationFn: (id: string) => notificationsService.remove(id),
        onMutate: (id) => patchCache((items) => items.filter((item) => item.id !== id)),
        onError: () => {
            toast.error('No se pudo eliminar la notificación')
            void query.refetch()
        },
    })

    return {
        notifications,
        unreadCount: notifications.filter((item) => !item.read).length,
        isLoading: query.isLoading,
        loadError: query.error ? 'No se pudieron cargar las notificaciones.' : null,
        refetch: query.refetch,

        addNotification: (options: {
            type?: 'success' | 'error' | 'info' | 'warning'
            title: string
            message: string
            duration?: number
        }) => {
            toast.toast({ type: options.type ?? 'info', title: options.title, description: options.message, duration: options.duration })
        },

        markAsRead: (id: string) => markRead.mutate(id),
        markAllAsRead: () => {
            if (userId) markAll.mutate()
        },
        removeNotification: (id: string) => remove.mutate(id),
    }
}

/**
 * Unread counter for the header bell. Polls a HEAD count (no rows transferred) every
 * 3 minutes while the app is visible, so it barely touches the Supabase egress quota.
 */
export function useUnreadNotificationsCount(): number {
    const { userId } = useAuth()
    const { data } = useQuery({
        queryKey: unreadKey(userId),
        queryFn: () => notificationsService.countUnread(userId!),
        enabled: !!userId,
        staleTime: 60_000,
        refetchInterval: 180_000,
        refetchOnWindowFocus: true,
    })
    return data ?? 0
}
