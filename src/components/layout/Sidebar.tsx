import React, { useEffect, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { ChevronDown, PanelLeftClose, PanelLeftOpen, Pause, Play } from 'lucide-react'
import { Cover, EqualizerBars } from '@components/music/Cover'
import { GroupSwitcher } from '@components/layout/GroupSwitcher'
import { NAV_SECTIONS, resolveActiveNav, type NavLinkItem, type NavSection } from '@components/layout/navItems'
import { useShellStore } from '@components/layout/shell.store'
import { useAdvancedPlayerStore } from '@features/player/player.store'
import { useDominantColor } from '@features/player/hooks/useDominantColor'
import { useIsAppAdmin } from '@hooks/useIsAppAdmin'
import { useMediaQuery } from '@hooks/useMediaQuery'
import { useUnreadNotificationsCount } from '@hooks/useNotifications'
import { ROUTES } from '@lib/constants'
import { cn } from '@lib/utils'

const indicatorSpring = { type: 'spring', stiffness: 520, damping: 40, mass: 0.9 } as const

const formatCount = (count: number) => (count > 99 ? '99+' : String(count))

/**
 * Left navigation for tablets (icon rail) and desktop (full sidebar, foldable into the rail).
 * Hidden on phones, where the bottom tab bar takes over.
 */
export const Sidebar: React.FC = () => {
    const isDesktop = useMediaQuery('(min-width: 1024px)')
    const collapsed = useShellStore((state) => state.sidebarCollapsed)
    const rail = !isDesktop || collapsed

    return (
        <aside
            aria-label="Navegación principal"
            className="shell-sidebar fixed inset-y-0 left-0 z-[65] hidden w-[var(--sidebar-w)] overflow-hidden pb-[env(safe-area-inset-bottom)] pt-[env(safe-area-inset-top)] transition-[width] duration-300 ease-[var(--shell-ease)] md:block"
        >
            <AnimatePresence initial={false} mode="popLayout">
                <motion.div
                    key={rail ? 'rail' : 'full'}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1, transition: { duration: 0.2, delay: 0.08 } }}
                    exit={{ opacity: 0, transition: { duration: 0.08 } }}
                    className={cn('flex h-full flex-col', rail ? 'w-[var(--rail-w)]' : 'w-[var(--sidebar-full-w)]')}
                >
                    {rail ? <RailContent canExpand={isDesktop} /> : <FullContent />}
                </motion.div>
            </AnimatePresence>
        </aside>
    )
}

/* ------------------------------------------------------------------ */
/* Expanded sidebar                                                    */
/* ------------------------------------------------------------------ */

const FullContent: React.FC = () => {
    const location = useLocation()
    const toggleSidebar = useShellStore((state) => state.toggleSidebar)
    const unread = useUnreadNotificationsCount()
    const { isAdmin } = useIsAppAdmin()
    const active = resolveActiveNav(location.pathname)
    const activeKey = active.section?.key ?? null

    // Manual expand/collapse overrides; reset whenever the active section changes.
    const [manual, setManual] = useState<Record<string, boolean>>({})
    useEffect(() => setManual({}), [activeKey])

    return (
        <>
            <div className="flex h-16 shrink-0 items-center justify-between gap-2 pl-5 pr-2.5">
                <Link to={ROUTES.DASHBOARD} className="rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-brand-400/60" aria-label="The Appden, inicio">
                    <Wordmark />
                </Link>
                <button type="button" onClick={toggleSidebar} className="icon-btn h-9 w-9 text-gray-500" aria-label="Plegar menú lateral" title="Plegar menú">
                    <PanelLeftClose className="h-[18px] w-[18px]" />
                </button>
            </div>

            <div className="shrink-0 px-3 pb-3">
                <GroupSwitcher variant="card" />
            </div>

            <motion.nav layoutScroll aria-label="Secciones" className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 pb-4 no-scrollbar">
                <p className="px-3 pb-1.5 pt-2 text-[10.5px] font-semibold uppercase tracking-[0.18em] text-gray-600">Menú</p>
                <ul className="space-y-0.5">
                    {NAV_SECTIONS.map((section) => {
                        const isActiveSection = activeKey === section.key
                        const open = section.children ? manual[section.key] ?? isActiveSection : false
                        return (
                            <li key={section.key}>
                                <SectionRow
                                    section={section}
                                    isActiveSection={isActiveSection}
                                    selfActive={isActiveSection && !active.child}
                                    open={open}
                                    onToggle={() => setManual((prev) => ({ ...prev, [section.key]: !open }))}
                                    unread={unread}
                                />
                                {section.children ? (
                                    <AnimatePresence initial={false}>
                                        {open ? (
                                            <motion.div
                                                key="children"
                                                initial={{ height: 0, opacity: 0 }}
                                                animate={{ height: 'auto', opacity: 1 }}
                                                exit={{ height: 0, opacity: 0 }}
                                                transition={{ duration: 0.22, ease: [0.32, 0.72, 0, 1] }}
                                                className="overflow-hidden"
                                            >
                                                <ul className="relative mb-1 ml-[1.45rem] mt-0.5 space-y-0.5 border-l border-white/[0.07] pl-2">
                                                    {section.children
                                                        .filter((item) => !item.adminOnly || isAdmin)
                                                        .map((item) => (
                                                            <li key={item.key}>
                                                                <ChildRow
                                                                    item={item}
                                                                    accent={section.accent}
                                                                    active={active.child?.key === item.key}
                                                                    unread={unread}
                                                                />
                                                            </li>
                                                        ))}
                                                </ul>
                                            </motion.div>
                                        ) : null}
                                    </AnimatePresence>
                                ) : null}
                            </li>
                        )
                    })}
                </ul>
            </motion.nav>

            <NowPlayingCard />
        </>
    )
}

const SectionRow: React.FC<{
    section: NavSection
    isActiveSection: boolean
    selfActive: boolean
    open: boolean
    onToggle: () => void
    unread: number
}> = ({ section, isActiveSection, selfActive, open, onToggle, unread }) => {
    const Icon = section.icon
    const hasBadgeChild = section.children?.some((item) => item.badge === 'notifications') ?? false
    const showCollapsedBadge = hasBadgeChild && !open && unread > 0

    return (
        <div className="group/row relative">
            <Link
                to={section.to}
                aria-current={selfActive ? 'page' : undefined}
                className={cn('nav-row', section.children && 'pr-11', isActiveSection && 'text-white')}
            >
                {selfActive ? <ActivePill accent={section.accent} /> : null}
                <span
                    className={cn(
                        'relative grid h-8 w-8 shrink-0 place-items-center rounded-[0.6rem] transition-[background-color,color] duration-200',
                        isActiveSection ? '' : 'text-gray-500 group-hover/row:text-gray-200'
                    )}
                    style={
                        isActiveSection
                            ? { color: section.accent, background: `color-mix(in srgb, ${section.accent} 15%, transparent)` }
                            : undefined
                    }
                >
                    <Icon className="h-[18px] w-[18px]" strokeWidth={isActiveSection ? 2.2 : 1.9} />
                </span>
                <span className={cn('relative min-w-0 flex-1 truncate', isActiveSection && 'font-semibold')}>{section.label}</span>
                {showCollapsedBadge ? <span className="nav-count relative">{formatCount(unread)}</span> : null}
            </Link>
            {section.children ? (
                <button
                    type="button"
                    onClick={onToggle}
                    aria-expanded={open}
                    aria-label={open ? `Ocultar apartados de ${section.label}` : `Mostrar apartados de ${section.label}`}
                    className="absolute right-1 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-lg text-gray-600 transition-colors hover:bg-white/[0.06] hover:text-gray-200"
                >
                    <ChevronDown className={cn('h-4 w-4 transition-transform duration-200', open && 'rotate-180')} />
                </button>
            ) : null}
        </div>
    )
}

const ChildRow: React.FC<{ item: NavLinkItem; accent: string; active: boolean; unread: number }> = ({ item, accent, active, unread }) => {
    const Icon = item.icon
    const count = item.badge === 'notifications' ? unread : 0
    return (
        <Link to={item.to} aria-current={active ? 'page' : undefined} className={cn('nav-sub group/sub', active && 'text-white')}>
            {active ? (
                <>
                    <motion.span layoutId="sidebar-pill" transition={indicatorSpring} className="absolute inset-0 rounded-lg bg-white/[0.065]" />
                    <motion.span
                        layoutId="sidebar-bar"
                        transition={indicatorSpring}
                        className="absolute -left-[9.5px] top-1/2 h-4 w-[3px] -translate-y-1/2 rounded-full"
                        style={{ background: accent, boxShadow: `0 0 12px ${accent}` }}
                    />
                </>
            ) : null}
            <span
                className={cn('relative shrink-0 transition-colors', !active && 'text-gray-600 group-hover/sub:text-gray-400')}
                style={active ? { color: accent } : undefined}
            >
                <Icon className="h-4 w-4" strokeWidth={active ? 2.2 : 1.9} />
            </span>
            <span className={cn('relative min-w-0 flex-1 truncate', active && 'font-semibold')}>{item.label}</span>
            {count > 0 ? <span className="nav-count relative">{formatCount(count)}</span> : null}
        </Link>
    )
}

const ActivePill: React.FC<{ accent: string }> = ({ accent }) => (
    <>
        <motion.span layoutId="sidebar-pill" transition={indicatorSpring} className="absolute inset-0 rounded-xl bg-white/[0.065]" />
        <motion.span
            layoutId="sidebar-bar"
            transition={indicatorSpring}
            className="absolute -left-3 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full"
            style={{ background: accent, boxShadow: `0 0 12px ${accent}` }}
        />
    </>
)

const Wordmark: React.FC = () => (
    <span className="font-display bg-gradient-to-r from-blue-200 via-brand-300 to-brand-500 bg-clip-text text-[1.6rem] font-black italic tracking-[-0.05em] text-transparent">
        The Appden
    </span>
)

/* ------------------------------------------------------------------ */
/* Icon rail (tablet, or folded desktop sidebar)                        */
/* ------------------------------------------------------------------ */

type Flyout = { section: NavSection; top: number } | null

const RailContent: React.FC<{ canExpand: boolean }> = ({ canExpand }) => {
    const location = useLocation()
    const toggleSidebar = useShellStore((state) => state.toggleSidebar)
    const unread = useUnreadNotificationsCount()
    const { isAdmin } = useIsAppAdmin()
    const finePointer = useMediaQuery('(hover: hover) and (pointer: fine)')
    const active = resolveActiveNav(location.pathname)
    const [flyout, setFlyout] = useState<Flyout>(null)
    const closeTimer = useRef<number | null>(null)

    const cancelClose = () => {
        if (closeTimer.current) window.clearTimeout(closeTimer.current)
        closeTimer.current = null
    }
    const scheduleClose = () => {
        cancelClose()
        closeTimer.current = window.setTimeout(() => setFlyout(null), 140)
    }

    useEffect(() => {
        setFlyout(null)
    }, [location.pathname])

    useEffect(() => cancelClose, [])

    const openFlyout = (section: NavSection, element: HTMLElement) => {
        if (!finePointer || !section.children) return
        cancelClose()
        const rect = element.getBoundingClientRect()
        const estimatedHeight = 56 + section.children.length * 40
        const top = Math.max(12, Math.min(rect.top - 6, window.innerHeight - estimatedHeight - 12))
        setFlyout({ section, top })
    }

    return (
        <>
            <div className="flex h-16 shrink-0 items-center justify-center">
                <Link
                    to={ROUTES.DASHBOARD}
                    aria-label="The Appden, inicio"
                    className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-[#9cc2ff] to-[#5d7bff] font-display text-xl font-black italic text-[#06142e] shadow-[0_10px_28px_rgba(110,159,255,0.3)] transition-transform duration-150 hover:scale-105 active:scale-95"
                >
                    A
                </Link>
            </div>

            <div className="flex shrink-0 justify-center pb-2">
                <GroupSwitcher variant="icon" />
            </div>

            <div className="mx-auto mb-2 h-px w-8 shrink-0 bg-white/[0.07]" />

            <motion.nav layoutScroll aria-label="Secciones" className="min-h-0 flex-1 space-y-1 overflow-y-auto overscroll-contain px-2 pb-3 no-scrollbar">
                {NAV_SECTIONS.map((section) => {
                    const Icon = section.icon
                    const isActive = active.section?.key === section.key
                    const hasBadge = section.children?.some((item) => item.badge === 'notifications') && unread > 0
                    return (
                        <Link
                            key={section.key}
                            to={section.to}
                            aria-current={isActive ? 'page' : undefined}
                            onMouseEnter={(event) => openFlyout(section, event.currentTarget)}
                            onMouseLeave={scheduleClose}
                            className={cn('rail-item', isActive && 'text-white')}
                        >
                            <span
                                className="rail-icon relative grid h-9 w-12 place-items-center rounded-full transition-colors duration-150"
                                style={isActive ? { color: section.accent } : undefined}
                            >
                                {isActive ? (
                                    <motion.span
                                        layoutId="rail-pill"
                                        transition={indicatorSpring}
                                        className="absolute inset-0 rounded-full"
                                        style={{ background: `color-mix(in srgb, ${section.accent} 20%, transparent)` }}
                                    />
                                ) : null}
                                <Icon className="relative h-[21px] w-[21px]" strokeWidth={isActive ? 2.25 : 1.9} />
                                {hasBadge ? (
                                    <span className="absolute -right-0.5 -top-1 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-brand-400 px-1 text-[10px] font-bold leading-none text-black ring-2 ring-[#0d0d10]">
                                        {unread > 9 ? '9+' : unread}
                                    </span>
                                ) : null}
                            </span>
                            <span className={cn(isActive && 'text-white')}>{section.label}</span>
                        </Link>
                    )
                })}
            </motion.nav>

            <div className="flex shrink-0 flex-col items-center gap-2 pb-3 pt-2">
                <NowPlayingThumb />
                {canExpand ? (
                    <button type="button" onClick={toggleSidebar} className="icon-btn h-10 w-10 text-gray-500" aria-label="Desplegar menú lateral" title="Desplegar menú">
                        <PanelLeftOpen className="h-[18px] w-[18px]" />
                    </button>
                ) : null}
            </div>

            <AnimatePresence>
                {flyout ? (
                    <motion.div
                        key={flyout.section.key}
                        initial={{ opacity: 0, x: -6, scale: 0.98 }}
                        animate={{ opacity: 1, x: 0, scale: 1 }}
                        exit={{ opacity: 0, x: -4, transition: { duration: 0.1 } }}
                        transition={{ duration: 0.16, ease: 'easeOut' }}
                        onMouseEnter={cancelClose}
                        onMouseLeave={scheduleClose}
                        className="fixed z-[130] w-56 rounded-2xl border border-white/10 bg-[#18181c]/95 p-1.5 shadow-[0_24px_60px_rgba(0,0,0,0.55)] backdrop-blur-xl"
                        style={{ top: flyout.top, left: 'calc(var(--sidebar-w) + 0.5rem)' }}
                    >
                        <p className="px-2.5 pb-1 pt-1.5 text-[10.5px] font-semibold uppercase tracking-[0.18em]" style={{ color: flyout.section.accent }}>
                            {flyout.section.label}
                        </p>
                        {flyout.section.children
                            ?.filter((item) => !item.adminOnly || isAdmin)
                            .map((item) => {
                                const ItemIcon = item.icon
                                const isActive = active.child?.key === item.key
                                return (
                                    <Link
                                        key={item.key}
                                        to={item.to}
                                        aria-current={isActive ? 'page' : undefined}
                                        className={cn(
                                            'flex min-h-[2.5rem] items-center gap-2.5 rounded-xl px-2.5 text-sm font-medium transition-colors',
                                            isActive ? 'bg-white/[0.07] text-white' : 'text-gray-300 hover:bg-white/[0.05] hover:text-white'
                                        )}
                                    >
                                        <span className="shrink-0" style={isActive ? { color: flyout.section.accent } : undefined}>
                                            <ItemIcon className="h-4 w-4" />
                                        </span>
                                        <span className="flex-1 truncate">{item.label}</span>
                                        {item.badge === 'notifications' && unread > 0 ? <span className="nav-count">{formatCount(unread)}</span> : null}
                                    </Link>
                                )
                            })}
                    </motion.div>
                ) : null}
            </AnimatePresence>
        </>
    )
}

/* ------------------------------------------------------------------ */
/* Now playing                                                          */
/* ------------------------------------------------------------------ */

const NowPlayingCard: React.FC = () => {
    const currentSong = useAdvancedPlayerStore((state) => state.currentSong)
    const isPlaying = useAdvancedPlayerStore((state) => state.isPlaying)
    const queue = useAdvancedPlayerStore((state) => state.queue)
    const queueIndex = useAdvancedPlayerStore((state) => state.queueIndex)
    const currentTime = useAdvancedPlayerStore((state) => state.metrics.currentTime)
    const duration = useAdvancedPlayerStore((state) => state.metrics.duration)
    const togglePlayPause = useAdvancedPlayerStore((state) => state.togglePlayPause)
    const toggleFullPlayer = useAdvancedPlayerStore((state) => state.toggleFullPlayer)
    const tint = useDominantColor(currentSong?.cover_url)

    return (
        <AnimatePresence initial={false}>
            {currentSong ? (
                <motion.div
                    key="now-playing"
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 12 }}
                    transition={{ duration: 0.25, ease: 'easeOut' }}
                    className="relative mx-3 mb-3 shrink-0 overflow-hidden rounded-2xl border border-white/[0.08] shadow-[0_18px_40px_rgba(0,0,0,0.35)]"
                    style={{
                        background: tint
                            ? `linear-gradient(150deg, color-mix(in srgb, ${tint} 40%, #141417) 0%, #121215 85%)`
                            : 'linear-gradient(150deg, #1b2340 0%, #121215 85%)',
                    }}
                >
                    <button
                        type="button"
                        onClick={() => toggleFullPlayer(true)}
                        className="flex w-full items-center gap-3 p-3 pr-14 text-left transition-colors hover:bg-white/[0.03]"
                        aria-label={`Abrir reproductor: ${currentSong.title}`}
                    >
                        <Cover src={currentSong.cover_url} alt="" seed={currentSong.id} className="h-12 w-12 rounded-xl shadow-[0_8px_20px_rgba(0,0,0,0.4)]" iconClassName="h-4 w-4" />
                        <span className="min-w-0 flex-1">
                            <span className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/55">
                                <EqualizerBars playing={isPlaying} className="h-2.5 text-brand-300" />
                                {isPlaying ? 'Sonando' : 'En pausa'}
                            </span>
                            <span className="mt-0.5 block truncate text-[13.5px] font-semibold text-white">{currentSong.title}</span>
                            <span className="block truncate text-xs text-white/60">{currentSong.artist_name}</span>
                        </span>
                    </button>
                    <button
                        type="button"
                        onClick={() => void togglePlayPause()}
                        className="absolute right-3 top-[1.375rem] grid h-9 w-9 place-items-center rounded-full bg-white text-black shadow-[0_6px_16px_rgba(0,0,0,0.35)] transition-transform duration-150 hover:scale-105 active:scale-95"
                        aria-label={isPlaying ? 'Pausar' : 'Reproducir'}
                    >
                        {isPlaying ? <Pause className="h-4 w-4 fill-current" /> : <Play className="ml-0.5 h-4 w-4 fill-current" />}
                    </button>
                    {queue[queueIndex + 1] ? (
                        <p className="truncate border-t border-white/[0.06] px-3 py-2 text-[11.5px] text-white/45">
                            A continuación · <span className="text-white/75">{queue[queueIndex + 1].title}</span>
                        </p>
                    ) : null}
                    <div className="absolute inset-x-0 bottom-0 h-[2px] bg-white/[0.06]">
                        <div
                            className="h-full bg-white/70 transition-[width] duration-300 ease-linear"
                            style={{ width: `${duration > 0 ? Math.min((currentTime / duration) * 100, 100) : 0}%` }}
                        />
                    </div>
                </motion.div>
            ) : null}
        </AnimatePresence>
    )
}

const NowPlayingThumb: React.FC = () => {
    const currentSong = useAdvancedPlayerStore((state) => state.currentSong)
    const isPlaying = useAdvancedPlayerStore((state) => state.isPlaying)
    const toggleFullPlayer = useAdvancedPlayerStore((state) => state.toggleFullPlayer)
    if (!currentSong) return null

    return (
        <button
            type="button"
            onClick={() => toggleFullPlayer(true)}
            className="group relative h-11 w-11 overflow-hidden rounded-xl shadow-[0_8px_20px_rgba(0,0,0,0.4)] ring-1 ring-white/10 transition-transform duration-150 hover:scale-105 active:scale-95"
            aria-label={`Abrir reproductor: ${currentSong.title}`}
            title={currentSong.title}
        >
            <Cover src={currentSong.cover_url} alt="" seed={currentSong.id} className="h-full w-full" iconClassName="h-4 w-4" />
            <span className="absolute inset-0 grid place-items-center bg-black/35 text-white">
                <EqualizerBars playing={isPlaying} className="h-3" />
            </span>
        </button>
    )
}
