import React from 'react'
import { NavLink } from 'react-router-dom'
import {
    Bell,
    CreditCard,
    FileClock,
    Flag,
    FolderOpen,
    Heart,
    Home,
    ListMusic,
    Music,
    UserRoundPlus,
    User,
    Users,
} from 'lucide-react'
import { cn } from '@lib/utils'
import { ROUTES } from '@lib/constants'
import { useAuth } from '@hooks/useAuth'
import { useReportsViewerAccess, useUnreadAdminReportsCount } from '@features/reports/hooks/useReports'

type NavItem = {
    icon: React.ComponentType<{ className?: string; strokeWidth?: number | string }>
    label: string
    to: string
}

const mobileNavItems: NavItem[] = [
    { icon: Home, label: 'Inicio', to: ROUTES.DASHBOARD },
    { icon: Music, label: 'Musica', to: ROUTES.MUSIC },
    { icon: Users, label: 'Grupos', to: ROUTES.GROUPS },
    { icon: UserRoundPlus, label: 'Conexiones', to: ROUTES.CONNECTIONS },
    { icon: CreditCard, label: 'Deudas', to: ROUTES.DEBTS },
    { icon: Flag, label: 'Reportes', to: ROUTES.REPORTS },
]

const sidebarItems: NavItem[] = [
    { icon: Home, label: 'Inicio', to: ROUTES.DASHBOARD },
    { icon: Music, label: 'Musica', to: ROUTES.MUSIC },
    { icon: ListMusic, label: 'Playlists', to: ROUTES.PLAYLISTS },
    { icon: Heart, label: 'Favoritos', to: ROUTES.FAVORITES },
    { icon: Users, label: 'Grupos', to: ROUTES.GROUPS },
    { icon: UserRoundPlus, label: 'Conexiones', to: ROUTES.CONNECTIONS },
    { icon: CreditCard, label: 'Deudas', to: ROUTES.DEBTS },
    { icon: FolderOpen, label: 'Archivos', to: ROUTES.FILES },
    { icon: FileClock, label: 'Changelog', to: ROUTES.CHANGELOG },
    { icon: Flag, label: 'Reportes', to: ROUTES.REPORTS },
    { icon: Bell, label: 'Notificaciones', to: ROUTES.NOTIFICATIONS },
    { icon: User, label: 'Perfil', to: ROUTES.PROFILE },
]

export const BottomNav: React.FC = () => {
    const { userId } = useAuth()
    const { data: access } = useReportsViewerAccess(userId)
    const isAdmin = !!access?.isAdmin
    const { data: unreadAdminReports = 0 } = useUnreadAdminReportsCount(userId, isAdmin)

    return (
        <nav className="fixed bottom-0 left-0 right-0 z-30 md:hidden safe-bottom">
            <div className="bg-surface-800/95 backdrop-blur-xl border-t border-surface-500 shadow-[0_-12px_40px_rgba(0,0,0,0.35)]">
                <div className="grid grid-cols-6 gap-1 px-2 py-2">
                    {mobileNavItems.map(({ icon: Icon, label, to }) => (
                        <NavLink
                            key={to}
                            to={to}
                            className={({ isActive }) =>
                                cn(
                                    'flex flex-col items-center justify-center gap-1 px-2 py-1.5 rounded-xl transition-all duration-200 active:scale-95',
                                    isActive
                                        ? 'text-brand-300 bg-brand-500/15'
                                        : 'text-gray-500 hover:text-gray-300'
                                )
                            }
                            aria-label={label}
                        >
                            {({ isActive }) => (
                                <>
                                    <div className="relative">
                                        <Icon
                                            className={cn('w-5 h-5 transition-transform duration-200', isActive && 'scale-110')}
                                            strokeWidth={isActive ? 2.4 : 1.8}
                                        />
                                        {to === ROUTES.REPORTS && unreadAdminReports > 0 ? (
                                            <span className="absolute -top-1.5 -right-1.5 min-w-[14px] h-[14px] px-1 rounded-full bg-red-500 text-[9px] leading-[14px] text-white text-center">
                                                {Math.min(unreadAdminReports, 9)}
                                            </span>
                                        ) : null}
                                    </div>
                                    <span className="text-[10px] font-medium leading-none">{label}</span>
                                </>
                            )}
                        </NavLink>
                    ))}
                </div>
            </div>
        </nav>
    )
}

export const Sidebar: React.FC = () => {
    const { userId } = useAuth()
    const { data: access } = useReportsViewerAccess(userId)
    const isAdmin = !!access?.isAdmin
    const { data: unreadAdminReports = 0 } = useUnreadAdminReportsCount(userId, isAdmin)

    return (
        <aside className="hidden md:flex flex-col w-64 bg-surface-900 border-r border-surface-500 min-h-screen sticky top-0">
            <div className="px-6 py-6 border-b border-surface-500">
                <h1 className="text-xl font-extrabold text-gradient">The Appden</h1>
                <p className="text-xs text-gray-500 mt-0.5">Espacio social privado</p>
            </div>

            <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
                {sidebarItems.map(({ icon: Icon, label, to }) => (
                    <NavLink
                        key={to}
                        to={to}
                        className={({ isActive }) =>
                            cn(
                                'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200',
                                isActive
                                    ? 'bg-brand-600/20 text-brand-400 border border-brand-500/30'
                                    : 'text-gray-400 hover:text-white hover:bg-surface-700'
                            )
                        }
                    >
                        <Icon className="w-4.5 h-4.5 flex-shrink-0" />
                        <span className="flex-1">{label}</span>
                        {to === ROUTES.REPORTS && unreadAdminReports > 0 ? (
                            <span className="inline-flex min-w-5 h-5 px-1.5 items-center justify-center rounded-full bg-red-500 text-[11px] text-white">
                                {unreadAdminReports > 99 ? '99+' : unreadAdminReports}
                            </span>
                        ) : null}
                    </NavLink>
                ))}
            </nav>
        </aside>
    )
}

