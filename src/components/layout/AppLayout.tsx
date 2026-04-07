import React, { useEffect, useRef } from 'react'
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { Search } from 'lucide-react'
import { BottomNav } from '@components/layout/Navigation'
import { Avatar } from '@components/common/Avatar'
import { Button } from '@components/ui/Button'
import { usePlayerStore } from '@app/store/player.store'
import { useAuth } from '@hooks/useAuth'
import { usePlayer } from '@features/player/hooks/usePlayer'
import { MiniPlayer } from '@features/player/components/MiniPlayer'
import { FullPlayer } from '@features/player/components/FullPlayer'
import { ROUTES } from '@lib/constants'

export const AppLayout: React.FC = () => {
    const navigate = useNavigate()
    const location = useLocation()
    const { userId, profile } = useAuth()
    usePlayer({ userId: userId ?? 'local-user' })
    const scrollContainerRef = useRef<HTMLDivElement | null>(null)

    const currentSong = usePlayerStore((state) => state.currentSong)
    const hasPlayer = !!currentSong

    useEffect(() => {
        scrollContainerRef.current?.scrollTo({ top: 0, left: 0 })
    }, [location.pathname])

    return (
        <div className="relative h-dvh overflow-hidden bg-background text-on-background">
            <header className="fixed inset-x-0 top-0 z-50 border-b border-white/5 bg-[linear-gradient(180deg,rgba(4,4,8,0.94)_0%,rgba(4,4,8,0.76)_100%)] px-4 pb-4 pt-[calc(env(safe-area-inset-top)+0.9rem)] backdrop-blur-2xl sm:px-6">
                <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-3">
                    <Link to={ROUTES.DASHBOARD} className="min-w-0">
                        <span className="font-display bg-gradient-to-r from-blue-300 to-blue-500 bg-clip-text text-[1.8rem] font-black italic tracking-[-0.06em] text-transparent sm:text-3xl">
                            The Appden
                        </span>
                    </Link>

                    <div className="flex items-center gap-3">
                        <Button
                            variant="ghost"
                            className="!min-h-0 rounded-full p-2 text-brand-300 hover:text-brand-100"
                            onClick={() => navigate(ROUTES.MUSIC)}
                            aria-label="Buscar en musica"
                        >
                            <Search className="h-5 w-5" />
                        </Button>
                        <Link to={ROUTES.PROFILE} aria-label="Perfil">
                            <Avatar src={profile?.avatar_url} name={profile?.display_name} size="sm" />
                        </Link>
                    </div>
                </div>
            </header>

            <div
                ref={scrollContainerRef}
                className="h-full overflow-y-auto overflow-x-hidden overscroll-y-contain"
                style={{ scrollbarGutter: 'stable' }}
            >
                <main className={hasPlayer ? 'relative min-h-full overflow-x-clip pb-[14rem] pt-[6.7rem] md:pb-44' : 'relative min-h-full overflow-x-clip pb-32 pt-[6.7rem]'}>
                    <Outlet />
                </main>
            </div>

            <MiniPlayer />
            <BottomNav />
            <FullPlayer />
        </div>
    )
}
