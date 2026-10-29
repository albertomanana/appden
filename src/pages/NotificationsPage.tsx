import React, { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion, type PanInfo } from 'framer-motion'
import { Bell, BellRing, CheckCheck, FileText, ListMusic, Music, Trash2, Wallet, WalletCards } from 'lucide-react'
import { EmptyState } from '@components/ui/EmptyState'
import { ErrorNotice } from '@components/ui/ErrorNotice'
import { ListSkeleton } from '@components/ui/LoadingSkeleton'
import { PageHeader } from '@components/ui/PageHeader'
import { useToast } from '@components/ui/Toast'
import { useNotifications } from '@hooks/useNotifications'
import { debtProService } from '@services/debt-pro.service'
import { ROUTES } from '@lib/constants'
import { cn, formatRelativeShort } from '@lib/utils'
import type { AppNotification } from '@/types'

const typeStyle: Record<string, { icon: React.ComponentType<{ className?: string }>; tone: string }> = {
    song_added: { icon: Music, tone: 'bg-brand-400/15 text-brand-200' },
    playlist_created: { icon: ListMusic, tone: 'bg-violet-400/15 text-violet-200' },
    debt_created: { icon: Wallet, tone: 'bg-amber-400/15 text-amber-200' },
    debt_paid: { icon: WalletCards, tone: 'bg-emerald-400/15 text-emerald-200' },
    file_uploaded: { icon: FileText, tone: 'bg-cyan-400/15 text-cyan-200' },
}

function resourceRoute(notification: AppNotification): string | null {
    if (!notification.resource_id && notification.resource_type !== 'file') return null
    switch (notification.resource_type) {
        case 'song':
            return ROUTES.SONG(notification.resource_id!)
        case 'debt':
            return ROUTES.DEBT(notification.resource_id!)
        case 'playlist':
            return ROUTES.PLAYLIST(notification.resource_id!)
        case 'file':
            return ROUTES.FILES
        default:
            return null
    }
}

function dayLabel(date: Date): string {
    const today = new Date()
    const startOf = (value: Date) => new Date(value.getFullYear(), value.getMonth(), value.getDate()).getTime()
    const diffDays = Math.round((startOf(today) - startOf(date)) / 86_400_000)
    if (diffDays === 0) return 'Hoy'
    if (diffDays === 1) return 'Ayer'
    if (diffDays < 7) return date.toLocaleDateString('es-ES', { weekday: 'long' }).replace(/^./, (c) => c.toUpperCase())
    return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'long' })
}

type PushState = NotificationPermission | 'unsupported'

function readPushState(): PushState {
    if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported'
    return Notification.permission
}

export default function NotificationsPage() {
    const navigate = useNavigate()
    const toast = useToast()
    const { notifications, unreadCount, isLoading, loadError, refetch, markAsRead, markAllAsRead, removeNotification } = useNotifications()
    const [push, setPush] = useState<PushState>(readPushState)

    const groups = useMemo(() => {
        const map = new Map<string, AppNotification[]>()
        for (const notification of notifications) {
            const label = dayLabel(new Date(notification.created_at))
            map.set(label, [...(map.get(label) ?? []), notification])
        }
        return Array.from(map.entries())
    }, [notifications])

    const open = (notification: AppNotification) => {
        if (!notification.read) markAsRead(notification.id)
        const route = resourceRoute(notification)
        if (route) navigate(route)
    }

    const enablePush = async () => {
        const result = await debtProService.requestPushPermission()
        setPush(result as PushState)
        if (result === 'granted') toast.success('Avisos activados', 'Te avisaremos en este dispositivo.')
        else if (result === 'denied') toast.warning('Avisos bloqueados', 'Actívalos desde los ajustes del navegador.')
    }

    return (
        <div className="page-shell animate-fade-in">
            <PageHeader
                back={ROUTES.PROFILE}
                title="Notificaciones"
                description={unreadCount > 0 ? `${unreadCount} sin leer` : notifications.length > 0 ? 'Estás al día' : undefined}
                actions={
                    unreadCount > 0 ? (
                        <button type="button" onClick={markAllAsRead} className="icon-btn bg-white/[0.06] text-gray-200" aria-label="Marcar todo como leído" title="Marcar todo como leído">
                            <CheckCheck className="h-5 w-5" />
                        </button>
                    ) : undefined
                }
            />

            {push === 'default' ? (
                <button type="button" onClick={() => void enablePush()} className="card-interactive flex w-full items-center gap-3 p-4 text-left">
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-400/15 text-brand-200">
                        <BellRing className="h-5 w-5" />
                    </span>
                    <span className="min-w-0 flex-1">
                        <span className="block text-[15px] font-semibold text-white">Activar avisos en este dispositivo</span>
                        <span className="block text-[13px] text-gray-400">Para enterarte de canciones nuevas y deudas al momento.</span>
                    </span>
                </button>
            ) : push === 'denied' ? (
                <p className="notice-warning">Los avisos están bloqueados en este navegador. Puedes activarlos desde sus ajustes.</p>
            ) : null}

            {isLoading ? (
                <ListSkeleton count={4} />
            ) : loadError ? (
                <ErrorNotice title={loadError} onRetry={() => void refetch()} />
            ) : notifications.length === 0 ? (
                <EmptyState
                    icon={<Bell className="h-6 w-6" />}
                    title="No tienes notificaciones"
                    description="Aquí verás cuando alguien suba una canción, cree una playlist o te apunte una deuda."
                />
            ) : (
                groups.map(([label, items]) => (
                    <section key={label}>
                        <h2 className="mb-2 px-1 text-xs font-semibold uppercase tracking-[0.14em] text-gray-500">{label}</h2>
                        <ul className="list-group">
                            <AnimatePresence initial={false}>
                                {items.map((notification) => (
                                    <NotificationRow
                                        key={notification.id}
                                        notification={notification}
                                        onOpen={() => open(notification)}
                                        onDelete={() => removeNotification(notification.id)}
                                    />
                                ))}
                            </AnimatePresence>
                        </ul>
                    </section>
                ))
            )}

            {notifications.length > 0 ? <p className="text-center text-xs text-gray-600">Desliza a la izquierda para borrar</p> : null}
        </div>
    )
}

const NotificationRow: React.FC<{ notification: AppNotification; onOpen: () => void; onDelete: () => void }> = ({ notification, onOpen, onDelete }) => {
    const style = typeStyle[notification.type] ?? { icon: Bell, tone: 'bg-white/[0.08] text-gray-300' }
    const Icon = style.icon

    const handleDragEnd = (_event: unknown, info: PanInfo) => {
        if (info.offset.x < -110 || info.velocity.x < -700) onDelete()
    }

    return (
        <motion.li
            layout
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="relative overflow-hidden"
        >
            <div className="absolute inset-y-0 right-0 flex w-full items-center justify-end bg-red-500/80 pr-6 text-white" aria-hidden="true">
                <Trash2 className="h-5 w-5" />
            </div>
            <motion.div
                drag="x"
                dragDirectionLock
                dragConstraints={{ left: 0, right: 0 }}
                dragElastic={{ left: 0.9, right: 0 }}
                onDragEnd={handleDragEnd}
                className={cn('group relative flex touch-pan-y items-start gap-3 bg-[#141416] px-4 py-3.5', !notification.read && 'bg-[#171a22]')}
            >
                <button type="button" onClick={onOpen} className="flex min-w-0 flex-1 items-start gap-3 text-left">
                    <span className={cn('mt-0.5 grid h-10 w-10 shrink-0 place-items-center rounded-xl', style.tone)}>
                        <Icon className="h-5 w-5" />
                    </span>
                    <span className="min-w-0 flex-1">
                        <span className="flex items-baseline gap-2">
                            <span className={cn('min-w-0 flex-1 truncate text-[15px]', notification.read ? 'font-medium text-gray-200' : 'font-semibold text-white')}>
                                {notification.title}
                            </span>
                            <span className="shrink-0 text-xs text-gray-500">{formatRelativeShort(notification.created_at)}</span>
                        </span>
                        <span className={cn('mt-0.5 block text-sm leading-snug', notification.read ? 'text-gray-500' : 'text-gray-300')}>{notification.body}</span>
                    </span>
                </button>
                {!notification.read ? <span className="mt-2 h-2.5 w-2.5 shrink-0 rounded-full bg-brand-400" aria-label="Sin leer" /> : null}
                <button
                    type="button"
                    onClick={onDelete}
                    className="icon-btn -my-1 -mr-2 hidden text-gray-500 opacity-0 transition-opacity group-hover:opacity-100 md:inline-grid"
                    aria-label="Eliminar notificación"
                >
                    <Trash2 className="h-4 w-4" />
                </button>
            </motion.div>
        </motion.li>
    )
}
