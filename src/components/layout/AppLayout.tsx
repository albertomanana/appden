import React from 'react'
import { Outlet } from 'react-router-dom'
import { Sidebar } from '@components/layout/Navigation'
import { BottomNav } from '@components/layout/Navigation'
import { MusicPlayer } from '@components/music/MusicPlayer'
import { usePlayerStore } from '@app/store/player.store'

/**
 * Main authenticated app layout.
 * - Desktop: sidebar on left, content on right
 * - Mobile: full-width content, bottom nav, mini player above bottom nav
 */
export const AppLayout: React.FC = () => {
    const currentSong = usePlayerStore((s) => s.currentSong)
    const hasPlayer = !!currentSong

    return (
        <div className="flex min-h-screen bg-surface-800">
            {/* Desktop sidebar */}
            <Sidebar />

            {/* Main content area */}
            <main
                className={`flex-1 flex flex-col min-h-screen overflow-y-auto
          pb-safe
          ${hasPlayer ? 'pb-36 md:pb-24' : 'pb-20 md:pb-0'}
        `}
            >
                <Outlet />
            </main>

            {/* Mobile bottom navigation */}
            <BottomNav />

            {/* Global music player - floats above bottom nav */}
            <MusicPlayer />
        </div>
    )
}
