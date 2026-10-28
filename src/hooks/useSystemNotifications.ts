import { useEffect, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@hooks/useAuth'
import { notificationsService } from '@services/notifications.service'

export type DevicePushState = NotificationPermission | 'unsupported'

export function getDevicePushState(): DevicePushState {
    if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported'
    return Notification.permission
}

/** iOS only allows notifications for web apps added to the home screen. */
export function needsHomeScreenInstall(): boolean {
    if (typeof window === 'undefined') return false
    const isIos = /iphone|ipad|ipod/i.test(window.navigator.userAgent)
    const standalone =
        window.matchMedia?.('(display-mode: standalone)').matches || (window.navigator as Navigator & { standalone?: boolean }).standalone === true
    return isIos && !standalone
}

/**
 * Shows an OS notification. Android Chrome only allows them through the service worker,
 * so that path is tried first; desktop browsers fall back to `new Notification`.
 */
export async function showSystemNotification(title: string, body: string, tag?: string): Promise<boolean> {
    if (getDevicePushState() !== 'granted') return false
    const options: NotificationOptions = { body, tag, icon: '/icons/icon-192x192.png', badge: '/icons/icon-192x192.png' }
    try {
        const registration = await navigator.serviceWorker?.getRegistration()
        if (registration) {
            await registration.showNotification(title, options)
            return true
        }
    } catch {
        // Fall through to the page-level API.
    }
    try {
        new Notification(title, options)
        return true
    } catch {
        return false
    }
}

/**
 * Bridges new in-app notifications to OS notifications while the app is open in the
 * background (another tab or app). Mount once, inside the authenticated layout.
 * Shares the ['notifications', userId] cache with `useNotifications`.
 */
export function useSystemNotificationsBridge(): void {
    const { userId } = useAuth()
    const seen = useRef<Set<string> | null>(null)

    const { data } = useQuery({
        queryKey: ['notifications', userId],
        queryFn: () => notificationsService.listForUser(userId!),
        enabled: !!userId,
        staleTime: 30_000,
        refetchInterval: 60_000,
        refetchIntervalInBackground: true,
        refetchOnWindowFocus: true,
    })

    useEffect(() => {
        seen.current = null
    }, [userId])

    useEffect(() => {
        if (!data) return
        if (seen.current === null) {
            // First load: everything already there counts as seen.
            seen.current = new Set(data.map((item) => item.id))
            return
        }
        const known = seen.current
        const fresh = data.filter((item) => !item.read && !known.has(item.id))
        for (const item of data) known.add(item.id)
        if (fresh.length === 0 || document.visibilityState === 'visible') return

        if (fresh.length > 2) {
            void showSystemNotification('The Appden', `Tienes ${fresh.length} novedades nuevas`, 'appden-batch')
            return
        }
        for (const item of fresh) void showSystemNotification(item.title, item.body, item.id)
    }, [data])
}
