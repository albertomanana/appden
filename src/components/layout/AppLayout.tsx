import React from 'react'
import { Link, Outlet } from 'react-router-dom'
import { Bell, ChevronDown, Sparkles, Users } from 'lucide-react'
import { motion } from 'framer-motion'
import { BottomNav, Sidebar } from '@components/layout/Navigation'
import { Avatar } from '@components/common/Avatar'
import { usePlayerStore } from '@app/store/player.store'
import { useAuth } from '@hooks/useAuth'
import { useActiveGroup } from '@hooks/useActiveGroup'
import { usePlayer } from '@features/player/hooks/usePlayer'
import { MiniPlayer } from '@features/player/components/MiniPlayer'
import { FullPlayer } from '@features/player/components/FullPlayer'
import { ROUTES } from '@lib/constants'

/**
 * Main authenticated app layout.
 * Keeps the existing routing/player logic intact while upgrading the shell.
 */
export const AppLayout: React.FC = () => {
    const { userId, profile } = useAuth()
    const { activeGroup } = useActiveGroup()
    usePlayer({ userId: userId ?? 'local-user' })

    const currentSong = usePlayerStore((state) => state.currentSong)
    const hasPlayer = !!currentSong

    return (
        <div className="flex min-h-screen bg-appden-orbit text-white">
            <Sidebar />

            <main className={`flex-1 flex flex-col min-h-screen min-w-0 overflow-y-auto safe-bottom ${hasPlayer ? 'pb-44 md:pb-28' : 'pb-24 md:pb-8'}`}>
                <motion.header
                    initial={{ opacity: 0, y: -12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, ease: 'easeOut' }}
                    className="sticky top-0 z-40 px-4 pt-[calc(env(safe-area-inset-top)+0.75rem)] pb-3 md:px-6 md:pt-5"
                >
                    <div className="glass-dock rounded-[1.75rem] px-4 py-3 md:px-5">
                        <div className="flex items-center justify-between gap-3">
                            <div className="min-w-0">
                                <div className="flex items-center gap-3">
                                    <Link to={ROUTES.DASHBOARD} className="min-w-0">
                                        <p className="font-display text-2xl font-black italic tracking-[-0.05em] text-gradient">
                                            The Appden
                                        </p>
                                    </Link>
                                    <span className="hidden sm:inline-flex hero-meta-pill">
                                        <Sparkles className="w-3.5 h-3.5 text-brand-400" />
                                        Sonic System
                                    </span>
                                </div>

                                <div className="mt-2 flex flex-wrap items-center gap-2">
                                    <span className="hero-meta-pill max-w-full">
                                        <Users className="w-3.5 h-3.5 text-brand-400" />
                                        <span className="truncate">{activeGroup?.name ?? 'Sin grupo activo'}</span>
                                        <ChevronDown className="w-3.5 h-3.5 text-gray-500" />
                                    </span>
                                </div>
                            </div>

                            <div className="flex items-center gap-2">
                                <Link
                                    to={ROUTES.NOTIFICATIONS}
                                    className="btn-icon !w-11 !h-11 !rounded-full"
                                    aria-label="Notificaciones"
                                >
                                    <Bell className="w-4.5 h-4.5" />
                                </Link>
                                <Link to={ROUTES.PROFILE} aria-label="Perfil">
                                    <Avatar
                                        src={profile?.avatar_url}
                                        name={profile?.display_name}
                                        size="md"
                                    />
                                </Link>
                            </div>
                        </div>
                    </div>
                </motion.header>

                <Outlet />
            </main>

            <BottomNav />
            <MiniPlayer />
            <FullPlayer />
        </div>
    )
}
