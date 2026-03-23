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
    User,
    UserRoundPlus,
    Users,
} from 'lucide-react'
import { motion } from 'framer-motion'
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
    { icon: Home, label: 'Home', to: ROUTES.DASHBOARD },
    { icon: Music, label: 'Music', to: ROUTES.MUSIC },
    { icon: Users, label: 'Groups', to: ROUTES.GROUPS },
    { icon: UserRoundPlus, label: 'Social', to: ROUTES.CONNECTIONS },
    { icon: CreditCard, label: 'Debt', to: ROUTES.DEBTS },
    { icon: Flag, label: 'Reports', to: ROUTES.REPORTS },
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
        <motion.nav
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
            className="fixed bottom-[calc(env(safe-area-inset-bottom)+1rem)] left-1/2 z-30 w-[calc(100%-1.25rem)] max-w-lg -translate-x-1/2 md:hidden"
        >
            <div className="glass-dock rounded-[1.75rem] px-2 py-2">
                <div className="grid grid-cols-6 gap-1">
                    {mobileNavItems.map(({ icon: Icon, label, to }) => (
                        <NavLink
                            key={to}
                            to={to}
                            className={({ isActive }) =>
                                cn(
                                    'relative flex min-h-[68px] flex-col items-center justify-center gap-1 rounded-2xl px-2 py-2 transition-all duration-200 active:scale-95',
                                    isActive ? 'text-brand-300' : 'text-gray-500'
                                )
                            }
                            aria-label={label}
                        >
                            {({ isActive }) => (
                                <>
                                    <motion.div
                                        whileTap={{ scale: 0.94 }}
                                        className={cn(
                                            'relative flex h-10 w-10 items-center justify-center rounded-2xl transition-all duration-200',
                                            isActive ? 'bg-white/8 shadow-glow-brand' : 'bg-transparent'
                                        )}
                                    >
                                        <Icon className="w-4.5 h-4.5" strokeWidth={isActive ? 2.4 : 1.9} />
                                        {to === ROUTES.REPORTS && unreadAdminReports > 0 ? (
                                            <span className="absolute -top-0.5 -right-0.5 inline-flex min-w-[16px] h-[16px] items-center justify-center rounded-full bg-brand-500 px-1 text-[9px] font-bold text-black">
                                                {Math.min(unreadAdminReports, 9)}
                                            </span>
                                        ) : null}
                                    </motion.div>
                                    <span className={cn('font-label text-[9px] uppercase tracking-[0.24em]', isActive ? 'text-brand-300' : 'text-gray-500')}>
                                        {label}
                                    </span>
                                </>
                            )}
                        </NavLink>
                    ))}
                </div>
            </div>
        </motion.nav>
    )
}

export const Sidebar: React.FC = () => {
    const { userId } = useAuth()
    const { data: access } = useReportsViewerAccess(userId)
    const isAdmin = !!access?.isAdmin
    const { data: unreadAdminReports = 0 } = useUnreadAdminReportsCount(userId, isAdmin)

    return (
        <aside className="hidden md:flex md:w-[286px] md:flex-col md:px-4 md:py-5">
            <div className="glass-dock sticky top-5 flex min-h-[calc(100vh-2.5rem)] flex-col rounded-[2rem] px-4 py-5">
                <div className="px-3 pb-5">
                    <p className="font-display text-[1.85rem] font-black italic tracking-[-0.05em] text-gradient">
                        The Appden
                    </p>
                    <p className="mt-2 max-w-[14rem] text-xs uppercase tracking-[0.24em] text-gray-500">
                        Private sonic system
                    </p>
                </div>

                <nav className="flex-1 space-y-1 overflow-y-auto px-1">
                    {sidebarItems.map(({ icon: Icon, label, to }) => (
                        <NavLink
                            key={to}
                            to={to}
                            className={({ isActive }) =>
                                cn(
                                    'group flex items-center gap-3 rounded-[1.35rem] px-3 py-3 text-sm transition-all duration-200',
                                    isActive
                                        ? 'bg-white/8 text-brand-300 shadow-glow-brand'
                                        : 'text-gray-400 hover:bg-white/4 hover:text-white'
                                )
                            }
                        >
                            {({ isActive }) => (
                                <>
                                    <div className={cn(
                                        'flex h-10 w-10 items-center justify-center rounded-2xl transition-all duration-200',
                                        isActive ? 'bg-brand-500/14' : 'bg-surface-700/70'
                                    )}>
                                        <Icon className="w-4.5 h-4.5" strokeWidth={isActive ? 2.25 : 1.85} />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="truncate font-medium">{label}</p>
                                        <p className="text-[10px] uppercase tracking-[0.22em] text-gray-500 group-hover:text-gray-400">
                                            {to.replace('/', '') || 'home'}
                                        </p>
                                    </div>
                                    {to === ROUTES.REPORTS && unreadAdminReports > 0 ? (
                                        <span className="inline-flex min-w-6 h-6 items-center justify-center rounded-full bg-brand-500 px-1.5 text-[10px] font-black text-black">
                                            {unreadAdminReports > 99 ? '99+' : unreadAdminReports}
                                        </span>
                                    ) : null}
                                </>
                            )}
                        </NavLink>
                    ))}
                </nav>
            </div>
        </aside>
    )
}
