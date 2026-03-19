import React from 'react'
import { Outlet } from 'react-router-dom'
import { BottomNav, Sidebar } from '@components/layout/Navigation'
import { usePlayerStore } from '@app/store/player.store'
import { useAuth } from '@hooks/useAuth'
import { usePlayer } from '@features/player/hooks/usePlayer'
import { MiniPlayer } from '@features/player/components/MiniPlayer'
import { FullPlayer } from '@features/player/components/FullPlayer'

/**
 * Main authenticated app layout.
 * - Desktop: sidebar on left, content on right
 * - Mobile: full-width content, bottom nav, mini player above bottom nav
 */
export const AppLayout: React.FC = () => {
    const { userId } = useAuth()
    usePlayer({ userId: userId ?? 'local-user' })

    const currentSong = usePlayerStore((s) => s.currentSong)
    const hasPlayer = !!currentSong

    return (
        <div className="flex min-h-screen bg-appden-orbit">
            {/* Desktop sidebar */}
            <Sidebar />

            {/* Main content area */}
            <main
                className={`flex-1 flex flex-col min-h-screen overflow-y-auto safe-bottom
          ${hasPlayer ? 'pb-44 md:pb-28' : 'pb-24 md:pb-6'}
        `}
            >
                <Outlet />
            </main>

            {/* Mobile bottom navigation */}
            <BottomNav />

            {/* Advanced player */}
            <MiniPlayer />
            <FullPlayer />
        </div>
    )
}

