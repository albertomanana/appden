import React from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { Home, Music, ListMusic, Heart, CreditCard, FolderOpen, User, Users, Bell } from 'lucide-react'
import { cn } from '@lib/utils'
import { ROUTES } from '@lib/constants'

const navItems = [
    { icon: Home, label: 'Inicio', to: ROUTES.DASHBOARD },
    { icon: Music, label: 'Música', to: ROUTES.MUSIC },
    { icon: ListMusic, label: 'Playlists', to: ROUTES.PLAYLISTS },
    { icon: CreditCard, label: 'Deudas', to: ROUTES.DEBTS },
    { icon: FolderOpen, label: 'Archivos', to: ROUTES.FILES },
]

/**
 * Bottom navigation bar for mobile. Highlights active route.
 */
export const BottomNav: React.FC = () => {
    return (
        <nav className="fixed bottom-0 left-0 right-0 z-40 md:hidden safe-bottom">
            {/* Blur backdrop */}
            <div className="bg-surface-800/90 backdrop-blur-xl border-t border-surface-500">
                <div className="flex items-center justify-around px-2 py-2">
                    {navItems.map(({ icon: Icon, label, to }) => (
                        <NavLink
                            key={to}
                            to={to}
                            className={({ isActive }) =>
                                cn(
                                    'flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-all duration-200',
                                    isActive
                                        ? 'text-brand-400'
                                        : 'text-gray-500 hover:text-gray-300'
                                )
                            }
                            aria-label={label}
                        >
                            {({ isActive }) => (
                                <>
                                    <div
                                        className={cn(
                                            'p-1.5 rounded-xl transition-colors',
                                            isActive && 'bg-brand-500/15'
                                        )}
                                    >
                                        <Icon
                                            className={cn(
                                                'w-5 h-5 transition-transform duration-200',
                                                isActive && 'scale-110'
                                            )}
                                            strokeWidth={isActive ? 2.5 : 1.8}
                                        />
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

/**
 * Sidebar navigation for desktop (md+).
 */
export const Sidebar: React.FC = () => {
    const sidebarItems = [
        ...navItems,
        { icon: Heart, label: 'Favoritos', to: ROUTES.FAVORITES },
        { icon: Users, label: 'Grupos', to: ROUTES.GROUPS },
        { icon: Bell, label: 'Notificaciones', to: ROUTES.NOTIFICATIONS },
        { icon: User, label: 'Perfil', to: ROUTES.PROFILE },
    ]

    return (
        <aside className="hidden md:flex flex-col w-56 bg-surface-900 border-r border-surface-500 min-h-screen sticky top-0">
            {/* Logo */}
            <div className="px-6 py-6 border-b border-surface-500">
                <h1 className="text-xl font-extrabold text-gradient">The Appden</h1>
                <p className="text-xs text-gray-500 mt-0.5">Tu espacio privado</p>
            </div>

            <nav className="flex-1 p-4 space-y-1">
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
                        {label}
                    </NavLink>
                ))}
            </nav>
        </aside>
    )
}
