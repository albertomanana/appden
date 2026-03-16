import React from 'react'
import { Bell, BellRing, Trash2 } from 'lucide-react'
import { EmptyState } from '@components/ui/EmptyState'
import { useNotifications } from '@hooks/useNotifications'
import { debtProService } from '@services/debt-pro.service'

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

    const unreadCount = notifications.filter((n) => !n.read).length

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
        <div className="max-w-3xl mx-auto px-4 py-6 space-y-4">
            <section className="card p-4">
                <div className="flex items-start justify-between gap-3">
                    <div>
                        <h1 className="text-2xl font-bold text-white mb-1">Notificaciones</h1>
                        <p className="text-sm text-gray-400">
                            {unreadCount > 0 ? `${unreadCount} sin leer` : 'Todo al dia'}
                        </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        <button onClick={enablePush} className="btn-secondary px-3 py-2 text-xs">
                            <BellRing className="w-3.5 h-3.5" />
                            Push: {permission}
                        </button>
                        <button
                            onClick={sendTestNotification}
                            className="btn-secondary px-3 py-2 text-xs"
                            disabled={permission !== 'granted'}
                        >
                            Prueba push
                        </button>
                        {notifications.length > 0 ? (
                            <button onClick={markAllAsRead} className="btn-ghost px-3 py-2 text-xs">
                                Marcar todo
                            </button>
                        ) : null}
                    </div>
                </div>
            </section>

            {notifications.length === 0 ? (
                <EmptyState
                    icon={<Bell className="w-7 h-7" />}
                    title="Sin notificaciones"
                    description="Cuando haya actividad en deudas y musica aparecera aqui."
                />
            ) : (
                <div className="space-y-2">
                    {notifications.map((notification) => (
                        <div
                            key={notification.id}
                            className={`rounded-xl border p-3 transition-all ${
                                notification.read
                                    ? 'bg-surface-700/60 border-surface-500'
                                    : 'bg-brand-500/10 border-brand-400/40'
                            }`}
                        >
                            <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0 flex-1">
                                    <h3 className="font-semibold text-white text-sm">{notification.title}</h3>
                                    <p className="text-sm text-gray-300 mt-1">{notification.body}</p>
                                    <p className="text-[11px] text-gray-500 mt-1">{new Date(notification.created_at).toLocaleString()}</p>
                                </div>

                                <div className="flex items-center gap-1.5">
                                    {!notification.read ? (
                                        <button
                                            onClick={() => markAsRead(notification.id)}
                                            className="btn-secondary px-2.5 py-1.5 text-xs"
                                        >
                                            Leer
                                        </button>
                                    ) : null}
                                    <button
                                        onClick={() => removeNotification(notification.id)}
                                        className="btn-ghost p-2"
                                        aria-label="Eliminar"
                                    >
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
