import React from 'react'
import { Bell, BellRing, Trash2 } from 'lucide-react'
import { EmptyState } from '@components/ui/EmptyState'
import { PageHeader } from '@components/ui/PageHeader'
import { Tabs } from '@components/ui/Tabs'
import { useNotifications } from '@hooks/useNotifications'
import { debtProService } from '@services/debt-pro.service'
import { ROUTES } from '@lib/constants'

export default function NotificationsPage() {
    const {
        notifications,
        markAsRead,
        markAllAsRead,
        removeNotification,
        addNotification,
    } = useNotifications()

    const [permission, setPermission] = React.useState<NotificationPermission | 'unsupported'>(() => {
        if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported'
        return Notification.permission
    })

    const unreadCount = notifications.filter((notification) => !notification.read).length

    async function enablePush() {
        const result = await debtProService.requestPushPermission()
        setPermission(result)

        if (result === 'granted') {
            addNotification({ title: 'Push activado', message: 'Recibiras recordatorios de deudas.', type: 'success' })
            return
        }

        if (result === 'denied') {
            addNotification({ title: 'Push bloqueado', message: 'Activalo desde ajustes del navegador.', type: 'warning' })
            return
        }

        addNotification({ title: 'Push no disponible', message: 'Este dispositivo no soporta notificaciones push.', type: 'info' })
    }

    function sendTestNotification() {
        if (typeof window === 'undefined' || !('Notification' in window)) return
        if (Notification.permission !== 'granted') return

        new Notification('The Appden', { body: 'Notificacion de prueba enviada correctamente.' })
        addNotification({ title: 'Prueba enviada', message: 'Revisa la notificacion del sistema.', type: 'info' })
    }

    return (
        <div className="page-shell animate-fade-in">
            <PageHeader
                kicker="System Alerts"
                title="Notificaciones"
                description={unreadCount > 0 ? `${unreadCount} sin leer` : 'Todo al dia'}
                actions={
                    <div className="flex flex-wrap items-center gap-2">
                        <button onClick={enablePush} className="btn-secondary text-xs">
                            <BellRing className="w-3.5 h-3.5" />
                            Push: {permission}
                        </button>
                        <button onClick={sendTestNotification} className="btn-secondary text-xs" disabled={permission !== 'granted'}>
                            Prueba push
                        </button>
                        {notifications.length > 0 ? (
                            <button onClick={markAllAsRead} className="btn-ghost text-xs">
                                Marcar todo
                            </button>
                        ) : null}
                    </div>
                }
            />

            <Tabs
                active="notifications"
                items={[
                    { label: 'Profile', value: 'profile', href: ROUTES.PROFILE },
                    { label: 'Files', value: 'files', href: ROUTES.FILES },
                    { label: 'Alerts', value: 'notifications', href: ROUTES.NOTIFICATIONS },
                ]}
            />

            {notifications.length === 0 ? (
                <EmptyState
                    icon={<Bell className="w-7 h-7" />}
                    title="Sin notificaciones"
                    description="Cuando haya actividad en deudas y musica aparecera aqui."
                />
            ) : (
                <div className="space-y-3">
                    {notifications.map((notification) => (
                        <div
                            key={notification.id}
                            className={`card p-4 transition-all ${notification.read ? '' : 'bg-brand-500/8'}`}
                        >
                            <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0 flex-1">
                                    <h3 className="text-sm font-semibold text-white">{notification.title}</h3>
                                    <p className="mt-2 text-sm leading-relaxed text-gray-300">{notification.body}</p>
                                    <p className="mt-2 text-[11px] uppercase tracking-[0.18em] text-gray-500">{new Date(notification.created_at).toLocaleString()}</p>
                                </div>

                                <div className="flex items-center gap-1.5">
                                    {!notification.read ? (
                                        <button onClick={() => markAsRead(notification.id)} className="btn-secondary text-xs">
                                            Leer
                                        </button>
                                    ) : null}
                                    <button onClick={() => removeNotification(notification.id)} className="btn-ghost p-2" aria-label="Eliminar">
                                        <Trash2 className="w-4 h-4" />
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
