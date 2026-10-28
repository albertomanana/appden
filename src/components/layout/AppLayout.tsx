import React, { useEffect, useRef, useState } from 'react'
import { Link, Outlet, useLocation, useNavigate, useNavigationType } from 'react-router-dom'
import { MotionConfig, motion } from 'framer-motion'
import { Bell, ChevronLeft, ChevronRight } from 'lucide-react'
import { BottomNav } from '@components/layout/Navigation'
import { GroupSwitcher } from '@components/layout/GroupSwitcher'
import { PageSkeleton } from '@components/layout/RouteFallback'
import { Sidebar } from '@components/layout/Sidebar'
import { useShellStore } from '@components/layout/shell.store'
import { Avatar } from '@components/common/Avatar'
import { useToast } from '@components/ui/Toast'
import { useAuth } from '@hooks/useAuth'
import { useMediaQuery } from '@hooks/useMediaQuery'
import { useUnreadNotificationsCount } from '@hooks/useNotifications'
import { usePlayer } from '@features/player/hooks/usePlayer'
import { useAdvancedPlayerStore } from '@features/player/player.store'
import { MiniPlayer } from '@features/player/components/MiniPlayer'
import { FullPlayer } from '@features/player/components/FullPlayer'
import { ROUTES } from '@lib/constants'
import { cn } from '@lib/utils'

const pageTransition = { duration: 0.24, ease: [0.32, 0.72, 0, 1] } as const

export const AppLayout: React.FC = () => {
    const location = useLocation()
    const { userId, profile } = useAuth()
    usePlayer({ userId: userId ?? 'local-user' })
    const scrollContainerRef = useRef<HTMLDivElement | null>(null)
    const [scrolled, setScrolled] = useState(false)
    const unread = useUnreadNotificationsCount()
    const { error: toastError } = useToast()
    const isTablet = useMediaQuery('(min-width: 768px)')
    const isDesktop = useMediaQuery('(min-width: 1024px)')
    const sidebarCollapsed = useShellStore((state) => state.sidebarCollapsed)
    const history = useHistoryNav()

    const hasPlayer = useAdvancedPlayerStore((state) => !!state.currentSong)
    const lastError = useAdvancedPlayerStore((state) => state.lastError)

    // The group switcher lives in the expanded desktop sidebar; everywhere else it stays in the header.
    const groupInHeader = !(isDesktop && !sidebarCollapsed)

    useEffect(() => {
        scrollContainerRef.current?.scrollTo({ top: 0, left: 0 })
        setScrolled(false)
    }, [location.pathname])

    // Expose the player height to fixed elements (toasts, sheets) through a CSS variable.
    useEffect(() => {
        document.documentElement.dataset.player = hasPlayer ? 'on' : 'off'
        return () => {
            delete document.documentElement.dataset.player
        }
    }, [hasPlayer])

    useEffect(() => {
        if (lastError) toastError(lastError.message)
    }, [lastError, toastError])

    return (
        <MotionConfig reducedMotion="user">
            <div className="relative h-dvh overflow-hidden bg-background text-on-background">
                <div className="pointer-events-none absolute inset-x-0 top-0 h-80 bg-[radial-gradient(ellipse_at_top,rgba(110,159,255,0.14),transparent_70%)] md:left-[var(--sidebar-w)]" />

                <Sidebar />

                <header
                    className={cn(
                        'fixed left-0 right-0 top-0 z-50 pt-[env(safe-area-inset-top)] safe-left safe-right md:left-[var(--sidebar-w)] md:pl-0',
                        'transition-[left,background-color,border-color] duration-300 ease-[var(--shell-ease)]',
                        scrolled ? 'border-b border-white/[0.06] bg-[#0b0b0d]/85 backdrop-blur-2xl' : 'border-b border-transparent bg-transparent'
                    )}
                >
                    <div
                        className={cn(
                            'flex w-full items-center justify-between gap-2 px-3 transition-[height] duration-200 md:h-16 md:px-5 lg:px-8',
                            scrolled ? 'h-12' : 'h-14'
                        )}
                    >
                        <div className="flex min-w-0 items-center gap-2 lg:gap-3">
                            {isDesktop ? (
                                <div className="flex shrink-0 items-center gap-1">
                                    <button
                                        type="button"
                                        onClick={history.back}
                                        disabled={!history.canBack}
                                        className="icon-btn h-9 w-9 bg-black/30 text-gray-200 disabled:opacity-35"
                                        aria-label="Atrás"
                                        title="Atrás"
                                    >
                                        <ChevronLeft className="h-5 w-5" />
                                    </button>
                                    <button
                                        type="button"
                                        onClick={history.forward}
                                        disabled={!history.canForward}
                                        className="icon-btn h-9 w-9 bg-black/30 text-gray-200 disabled:opacity-35"
                                        aria-label="Adelante"
                                        title="Adelante"
                                    >
                                        <ChevronRight className="h-5 w-5" />
                                    </button>
                                </div>
                            ) : null}
                            {groupInHeader ? <GroupSwitcher compact={scrolled && !isTablet} /> : null}
                        </div>

                        <div className="flex shrink-0 items-center gap-1 md:gap-2">
                            <Link
                                to={ROUTES.NOTIFICATIONS}
                                className={cn(
                                    'icon-btn relative text-gray-200',
                                    location.pathname.startsWith(ROUTES.NOTIFICATIONS) && 'bg-white/[0.08] text-white'
                                )}
                                aria-label={unread > 0 ? `Notificaciones (${unread} sin leer)` : 'Notificaciones'}
                            >
                                <Bell className="h-[22px] w-[22px]" />
                                {unread > 0 ? (
                                    <span className="absolute right-1.5 top-1.5 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-brand-400 px-1 text-[10px] font-bold leading-none text-black ring-2 ring-[#0b0b0d]">
                                        {unread > 9 ? '9+' : unread}
                                    </span>
                                ) : null}
                            </Link>
                            <Link
                                to={ROUTES.PROFILE}
                                className="flex h-11 min-w-[2.75rem] items-center gap-2.5 rounded-full outline-none transition-colors focus-visible:ring-2 focus-visible:ring-brand-400/60 lg:pl-1 lg:pr-3 lg:hover:bg-white/[0.06]"
                                aria-label="Perfil"
                            >
                                <span className="grid h-11 w-11 place-items-center lg:h-9 lg:w-9">
                                    <Avatar src={profile?.avatar_url} name={profile?.display_name} size="sm" />
                                </span>
                                {profile?.display_name ? (
                                    <span className="hidden max-w-[10rem] truncate text-sm font-semibold text-gray-100 lg:block">
                                        {profile.display_name.split(' ')[0]}
                                    </span>
                                ) : null}
                            </Link>
                        </div>
                    </div>
                </header>

                <div
                    ref={scrollContainerRef}
                    data-scroll-root
                    onScroll={(event) => {
                        const next = event.currentTarget.scrollTop > 8
                        if (next !== scrolled) setScrolled(next)
                    }}
                    className="relative h-full overflow-y-auto overflow-x-hidden overscroll-y-contain transition-[margin-left] duration-300 ease-[var(--shell-ease)] md:ml-[var(--sidebar-w)]"
                >
                    <main className="relative min-h-full overflow-x-clip pb-[calc(var(--dock-h)+var(--mini-h)+1.5rem)] pt-header">
                        <React.Suspense fallback={<PageSkeleton />}>
                            <motion.div
                                key={location.pathname}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={pageTransition}
                            >
                                <Outlet />
                            </motion.div>
                        </React.Suspense>
                    </main>
                </div>

                <MiniPlayer />
                <BottomNav />
                <FullPlayer />
            </div>
        </MotionConfig>
    )
}

/**
 * Back/forward state for the desktop header. React Router stores the history index in
 * `history.state.idx`; forward is possible while we are below the highest index reached
 * since the last push.
 */
function useHistoryNav() {
    const navigate = useNavigate()
    const location = useLocation()
    const navigationType = useNavigationType()
    const maxIndex = useRef(0)
    const lastKey = useRef<string | null>(null)
    const index = typeof window === 'undefined' ? 0 : ((window.history.state as { idx?: number } | null)?.idx ?? 0)

    if (lastKey.current !== location.key) {
        lastKey.current = location.key
        maxIndex.current = navigationType === 'PUSH' ? index : Math.max(maxIndex.current, index)
    }

    return {
        canBack: index > 0,
        canForward: index < maxIndex.current,
        back: () => navigate(-1),
        forward: () => navigate(1),
    }
}
