import React from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { CreditCard, Home, Library, MessageSquare, User } from 'lucide-react'
import { motion } from 'framer-motion'
import { cn } from '@lib/utils'
import { ROUTES } from '@lib/constants'

type DockItem = {
    icon: React.ComponentType<{ className?: string; strokeWidth?: number | string }>
    label: string
    to: string
    isActive: (pathname: string) => boolean
}

const dockItems: DockItem[] = [
    {
        icon: Home,
        label: 'Home',
        to: ROUTES.DASHBOARD,
        isActive: (pathname) => pathname === ROUTES.DASHBOARD,
    },
    {
        icon: Library,
        label: 'Music',
        to: ROUTES.MUSIC,
        isActive: (pathname) => pathname.startsWith('/music') || pathname.startsWith('/playlists') || pathname.startsWith('/favorites'),
    },
    {
        icon: MessageSquare,
        label: 'Social',
        to: ROUTES.SOCIAL,
        isActive: (pathname) => pathname.startsWith('/social') || pathname.startsWith('/groups') || pathname.startsWith('/connections'),
    },
    {
        icon: CreditCard,
        label: 'Debt',
        to: ROUTES.DEBTS,
        isActive: (pathname) => pathname.startsWith('/debts'),
    },
    {
        icon: User,
        label: 'Profile',
        to: ROUTES.PROFILE,
        isActive: (pathname) => pathname.startsWith('/profile') || pathname.startsWith('/reports') || pathname.startsWith('/changelog') || pathname.startsWith('/files'),
    },
]

export const BottomNav: React.FC = () => {
    const location = useLocation()

    return (
        <motion.nav
            initial={{ opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.32, ease: 'easeOut' }}
            className="pointer-events-none fixed inset-x-0 bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-40 px-3 safe-left safe-right sm:px-4"
        >
            <div className="pointer-events-auto mx-auto w-full max-w-md rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(24,24,24,0.88)_0%,rgba(10,10,10,0.92)_100%)] p-1.5 shadow-[0_24px_80px_rgba(0,0,0,0.52)] backdrop-blur-2xl">
                <div className="grid grid-cols-5 gap-1">
                {dockItems.map(({ icon: Icon, label, to, isActive }) => {
                    const active = isActive(location.pathname)

                    return (
                        <NavLink
                            key={to}
                            to={to}
                            className={cn(
                                'relative flex min-w-0 flex-col items-center justify-center gap-1 overflow-hidden rounded-[20px] px-1 py-2.5 transition-all duration-200',
                                active
                                    ? 'text-blue-300'
                                    : 'text-neutral-500 hover:bg-white/5 hover:text-neutral-300'
                            )}
                        >
                            {active ? (
                                <motion.span
                                    layoutId="bottom-nav-active-pill"
                                    className="absolute inset-0 rounded-[20px] bg-[linear-gradient(180deg,rgba(55,115,255,0.18)_0%,rgba(55,115,255,0.08)_100%)] shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_0_24px_rgba(55,115,255,0.18)]"
                                    transition={{ type: 'spring', stiffness: 340, damping: 28 }}
                                />
                            ) : null}
                            <Icon className="relative z-[1] h-5 w-5" strokeWidth={active ? 2.4 : 2} />
                            <span className="relative z-[1] truncate text-center font-body text-[9px] font-semibold uppercase tracking-[0.18em]">
                                {label}
                            </span>
                        </NavLink>
                    )
                })}
                </div>
            </div>
        </motion.nav>
    )
}
