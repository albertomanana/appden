import React, { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion, type PanInfo } from 'framer-motion'
import {
    Heart,
    ListMusic,
    Maximize2,
    Mic2,
    Pause,
    Play,
    Repeat,
    Repeat1,
    Shuffle,
    SkipBack,
    SkipForward,
    Volume1,
    Volume2,
    VolumeX,
    X,
} from 'lucide-react'
import { Cover } from '@components/music/Cover'
import { nextRepeatMode, repeatLabel } from '@features/player/components/PlayerControls'
import { ProgressBar } from '@features/player/components/ProgressBar'
import { QueuePanel } from '@features/player/components/QueuePanel'
import { useAdvancedPlayerStore } from '@features/player/player.store'
import { useDominantColor } from '@features/player/hooks/useDominantColor'
import { useFavoriteToggle } from '@hooks/useFavoriteToggle'
import { useMediaQuery } from '@hooks/useMediaQuery'
import { ROUTES } from '@lib/constants'
import { cn } from '@lib/utils'

/**
 * Persistent player.
 * - Phones: floating card above the tab bar. Tap opens the full player; swipe skips tracks.
 * - Tablet / desktop (768px+): full-width bar across the main area, Spotify-style.
 */
export const MiniPlayer: React.FC = () => {
    const hasSong = useAdvancedPlayerStore((state) => !!state.currentSong)
    const isWide = useMediaQuery('(min-width: 768px)')
    if (!hasSong) return null
    return isWide ? <PlayerBar /> : <PhoneMiniPlayer />
}

const PhoneMiniPlayer: React.FC = () => {
    const currentSong = useAdvancedPlayerStore((state) => state.currentSong)
    const isPlaying = useAdvancedPlayerStore((state) => state.isPlaying)
    const currentTime = useAdvancedPlayerStore((state) => state.metrics.currentTime)
    const duration = useAdvancedPlayerStore((state) => state.metrics.duration)
    const togglePlayPause = useAdvancedPlayerStore((state) => state.togglePlayPause)
    const next = useAdvancedPlayerStore((state) => state.next)
    const previous = useAdvancedPlayerStore((state) => state.previous)
    const toggleFullPlayer = useAdvancedPlayerStore((state) => state.toggleFullPlayer)
    const tint = useDominantColor(currentSong?.cover_url)

    if (!currentSong) return null

    const progress = duration > 0 ? Math.min((currentTime / duration) * 100, 100) : 0

    const handleDragEnd = (_event: unknown, info: PanInfo) => {
        if (info.offset.x < -70) void next()
        else if (info.offset.x > 70) void previous()
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            className="fixed inset-x-0 bottom-[calc(var(--dock-h)+0.375rem)] z-[70] px-2 safe-left safe-right"
        >
            <div
                className="relative mx-auto h-16 w-full max-w-xl overflow-hidden rounded-2xl border border-white/10 shadow-[0_16px_50px_rgba(0,0,0,0.55)] backdrop-blur-2xl"
                style={{
                    background: tint
                        ? `linear-gradient(90deg, color-mix(in srgb, ${tint} 38%, #121214) 0%, rgba(20,20,23,0.96) 100%)`
                        : 'rgba(24,24,27,0.96)',
                }}
            >
                <div className="flex h-full items-center gap-1 pr-1.5">
                    <motion.button
                        type="button"
                        drag="x"
                        dragSnapToOrigin
                        dragElastic={0.35}
                        dragConstraints={{ left: 0, right: 0 }}
                        onDragEnd={handleDragEnd}
                        onTap={() => toggleFullPlayer(true)}
                        className="flex h-full min-w-0 flex-1 touch-pan-y items-center gap-3 pl-2 text-left"
                        aria-label={`Abrir reproductor: ${currentSong.title}`}
                    >
                        <Cover src={currentSong.cover_url} alt="" seed={currentSong.id} className="h-12 w-12 rounded-xl" iconClassName="h-4 w-4" />
                        <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-semibold text-white">{currentSong.title}</span>
                            <span className="block truncate text-xs text-white/60">{currentSong.artist_name}</span>
                        </span>
                    </motion.button>

                    <button
                        onClick={() => void togglePlayPause()}
                        className="icon-btn text-white"
                        aria-label={isPlaying ? 'Pausar' : 'Reproducir'}
                    >
                        {isPlaying ? <Pause className="h-6 w-6 fill-current" /> : <Play className="ml-0.5 h-6 w-6 fill-current" />}
                    </button>

                    <button onClick={() => void next()} className="icon-btn text-white" aria-label="Siguiente">
                        <SkipForward className="h-5 w-5 fill-current" />
                    </button>
                </div>

                <div className="absolute inset-x-3 bottom-0 h-[2px] overflow-hidden rounded-full bg-white/10">
                    <div className="h-full rounded-full bg-white/85 transition-[width] duration-300 ease-linear" style={{ width: `${progress}%` }} />
                </div>
            </div>
        </motion.div>
    )
}

function isTypingTarget(target: EventTarget | null): boolean {
    if (!(target instanceof HTMLElement)) return false
    const tag = target.tagName
    return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target.isContentEditable
}

const PlayerBar: React.FC = () => {
    const navigate = useNavigate()
    const currentSong = useAdvancedPlayerStore((state) => state.currentSong)
    const isPlaying = useAdvancedPlayerStore((state) => state.isPlaying)
    const metrics = useAdvancedPlayerStore((state) => state.metrics)
    const volume = useAdvancedPlayerStore((state) => state.volume)
    const repeatMode = useAdvancedPlayerStore((state) => state.repeatMode)
    const isShuffle = useAdvancedPlayerStore((state) => state.isShuffle)
    const isQueueOpen = useAdvancedPlayerStore((state) => state.isQueueOpen)
    const isFullPlayer = useAdvancedPlayerStore((state) => state.isFullPlayer)
    const togglePlayPause = useAdvancedPlayerStore((state) => state.togglePlayPause)
    const next = useAdvancedPlayerStore((state) => state.next)
    const previous = useAdvancedPlayerStore((state) => state.previous)
    const seekTo = useAdvancedPlayerStore((state) => state.seekTo)
    const setVolume = useAdvancedPlayerStore((state) => state.setVolume)
    const setRepeatMode = useAdvancedPlayerStore((state) => state.setRepeatMode)
    const toggleShuffle = useAdvancedPlayerStore((state) => state.toggleShuffle)
    const toggleFullPlayer = useAdvancedPlayerStore((state) => state.toggleFullPlayer)
    const toggleQueuePanel = useAdvancedPlayerStore((state) => state.toggleQueuePanel)
    const tint = useDominantColor(currentSong?.cover_url)
    const favorite = useFavoriteToggle(currentSong?.id, currentSong?.is_favorite)

    // Space toggles playback anywhere outside text fields (the full player handles it while open).
    useEffect(() => {
        const onKey = (event: KeyboardEvent) => {
            if (event.key !== ' ' || event.repeat || isTypingTarget(event.target)) return
            const state = useAdvancedPlayerStore.getState()
            if (state.isFullPlayer || document.documentElement.dataset.scrollLocked) return
            if (event.target instanceof HTMLElement && event.target.closest('button, a, [role="slider"], [role="tab"]')) return
            event.preventDefault()
            void state.togglePlayPause()
        }
        window.addEventListener('keydown', onKey)
        return () => window.removeEventListener('keydown', onKey)
    }, [])

    if (!currentSong) return null

    const VolumeIcon = volume === 0 ? VolumeX : volume < 0.5 ? Volume1 : Volume2
    const openFull = () => {
        toggleQueuePanel(false)
        toggleFullPlayer(true)
    }

    return (
        <>
            <motion.div
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                transition={{ type: 'spring', stiffness: 380, damping: 38 }}
                className="player-bar fixed bottom-0 left-[var(--sidebar-w)] right-0 z-[70] pb-[var(--dock-h)] transition-[left] duration-300 ease-[var(--shell-ease)]"
                role="region"
                aria-label="Reproductor"
            >
                {tint ? (
                    <div
                        className="pointer-events-none absolute inset-y-0 left-0 w-[45%] opacity-70 transition-[background] duration-700"
                        style={{ background: `radial-gradient(120% 140% at 0% 50%, color-mix(in srgb, ${tint} 30%, transparent), transparent 70%)` }}
                    />
                ) : null}

                <div className="relative grid h-[var(--mini-h)] grid-cols-[minmax(0,1fr)_minmax(0,1.35fr)_minmax(0,1fr)] items-center gap-3 px-3 lg:gap-6 lg:px-5">
                    {/* Track */}
                    <div className="flex min-w-0 items-center gap-3">
                        <button
                            type="button"
                            onClick={openFull}
                            className="group relative shrink-0 overflow-hidden rounded-xl shadow-[0_8px_22px_rgba(0,0,0,0.45)] transition-transform duration-150 active:scale-95"
                            aria-label={`Abrir reproductor: ${currentSong.title}`}
                        >
                            <Cover src={currentSong.cover_url} alt="" seed={currentSong.id} className="h-12 w-12 lg:h-14 lg:w-14" iconClassName="h-4 w-4" />
                            <span className="absolute inset-0 grid place-items-center bg-black/45 opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus-visible:opacity-100">
                                <Maximize2 className="h-4 w-4 text-white" />
                            </span>
                        </button>
                        <div className="min-w-0">
                            <button
                                type="button"
                                onClick={() => navigate(ROUTES.SONG(currentSong.id))}
                                className="block max-w-full truncate text-left text-sm font-semibold text-white hover:underline"
                            >
                                {currentSong.title}
                            </button>
                            <p className="truncate text-xs text-white/55">{currentSong.artist_name}</p>
                        </div>
                        <button
                            type="button"
                            onClick={favorite.toggle}
                            className={cn('icon-btn hidden h-9 w-9 lg:inline-grid', favorite.isFavorite ? 'text-pink-400' : 'text-white/50')}
                            aria-label={favorite.isFavorite ? 'Quitar de favoritos' : 'Añadir a favoritos'}
                            aria-pressed={favorite.isFavorite}
                        >
                            <Heart className={cn('h-[18px] w-[18px]', favorite.isFavorite && 'fill-current')} />
                        </button>
                    </div>

                    {/* Transport */}
                    <div className="flex min-w-0 flex-col items-center">
                        <div className="flex items-center gap-1 lg:gap-2">
                            <button
                                type="button"
                                onClick={toggleShuffle}
                                className={cn('icon-btn relative hidden h-9 w-9 lg:inline-grid', isShuffle ? 'text-brand-300' : 'text-white/55')}
                                aria-label={isShuffle ? 'Desactivar aleatorio' : 'Activar aleatorio'}
                                aria-pressed={isShuffle}
                            >
                                <Shuffle className="h-4 w-4" />
                                {isShuffle ? <span className="absolute bottom-0.5 h-1 w-1 rounded-full bg-brand-300" /> : null}
                            </button>
                            <button type="button" onClick={() => void previous()} className="icon-btn h-10 w-10 text-white/85 hover:text-white" aria-label="Anterior">
                                <SkipBack className="h-5 w-5 fill-current" />
                            </button>
                            <button
                                type="button"
                                onClick={() => void togglePlayPause()}
                                className="grid h-10 w-10 place-items-center rounded-full bg-white text-black shadow-[0_8px_20px_rgba(0,0,0,0.35)] transition-transform duration-150 hover:scale-105 active:scale-95"
                                aria-label={isPlaying ? 'Pausar' : 'Reproducir'}
                            >
                                {isPlaying ? <Pause className="h-[18px] w-[18px] fill-current" /> : <Play className="ml-0.5 h-[18px] w-[18px] fill-current" />}
                            </button>
                            <button type="button" onClick={() => void next()} className="icon-btn h-10 w-10 text-white/85 hover:text-white" aria-label="Siguiente">
                                <SkipForward className="h-5 w-5 fill-current" />
                            </button>
                            <button
                                type="button"
                                onClick={() => setRepeatMode(nextRepeatMode(repeatMode))}
                                className={cn('icon-btn relative hidden h-9 w-9 lg:inline-grid', repeatMode !== 'off' ? 'text-brand-300' : 'text-white/55')}
                                aria-label={repeatLabel(repeatMode)}
                            >
                                {repeatMode === 'one' ? <Repeat1 className="h-4 w-4" /> : <Repeat className="h-4 w-4" />}
                                {repeatMode !== 'off' ? <span className="absolute bottom-0.5 h-1 w-1 rounded-full bg-brand-300" /> : null}
                            </button>
                        </div>
                        <ProgressBar
                            variant="inline"
                            className="-mt-0.5 w-full max-w-[36rem]"
                            currentTime={metrics.currentTime}
                            duration={metrics.duration || currentSong.duration_seconds || 0}
                            bufferedRatio={metrics.buffered}
                            onSeek={seekTo}
                        />
                    </div>

                    {/* Extras */}
                    <div className="flex min-w-0 items-center justify-end gap-0.5 lg:gap-1">
                        <button
                            type="button"
                            onClick={() => navigate(ROUTES.SONG(currentSong.id))}
                            className="icon-btn hidden h-9 w-9 text-white/60 xl:inline-grid"
                            aria-label="Letra y comentarios"
                            title="Letra y comentarios"
                        >
                            <Mic2 className="h-[18px] w-[18px]" />
                        </button>
                        <button
                            type="button"
                            onClick={() => toggleQueuePanel(!isQueueOpen)}
                            className={cn('icon-btn relative h-9 w-9', isQueueOpen ? 'text-brand-300' : 'text-white/60')}
                            aria-label={isQueueOpen ? 'Cerrar cola' : 'Ver cola'}
                            aria-pressed={isQueueOpen}
                            title="Cola"
                        >
                            <ListMusic className="h-[18px] w-[18px]" />
                            {isQueueOpen ? <span className="absolute bottom-0.5 h-1 w-1 rounded-full bg-brand-300" /> : null}
                        </button>
                        <div className="hidden items-center gap-1.5 lg:flex">
                            <button
                                type="button"
                                onClick={() => setVolume(volume === 0 ? 0.8 : 0)}
                                className="icon-btn h-9 w-9 text-white/60"
                                aria-label={volume === 0 ? 'Activar sonido' : 'Silenciar'}
                            >
                                <VolumeIcon className="h-[18px] w-[18px]" />
                            </button>
                            <input
                                type="range"
                                min={0}
                                max={1}
                                step={0.01}
                                value={volume}
                                onChange={(event) => setVolume(Number(event.currentTarget.value))}
                                className="range-fill w-24 xl:w-28"
                                style={{ '--fill': `${Math.round(volume * 100)}%` } as React.CSSProperties}
                                aria-label="Volumen"
                            />
                        </div>
                        <button type="button" onClick={openFull} className="icon-btn h-9 w-9 text-white/60" aria-label="Pantalla completa" title="Pantalla completa">
                            <Maximize2 className="h-[18px] w-[18px]" />
                        </button>
                    </div>
                </div>
            </motion.div>

            <QueueDrawer open={isQueueOpen && !isFullPlayer} onClose={() => toggleQueuePanel(false)} />
        </>
    )
}

const QueueDrawer: React.FC<{ open: boolean; onClose: () => void }> = ({ open, onClose }) => {
    const queue = useAdvancedPlayerStore((state) => state.queue)
    const queueIndex = useAdvancedPlayerStore((state) => state.queueIndex)
    const isPlaying = useAdvancedPlayerStore((state) => state.isPlaying)
    const playSong = useAdvancedPlayerStore((state) => state.playSong)
    const removeFromQueue = useAdvancedPlayerStore((state) => state.removeFromQueue)
    const reorderQueue = useAdvancedPlayerStore((state) => state.reorderQueue)
    const upcoming = Math.max(queue.length - queueIndex - 1, 0)

    useEffect(() => {
        if (!open) return
        const onKey = (event: KeyboardEvent) => {
            if (event.key === 'Escape') onClose()
        }
        window.addEventListener('keydown', onKey)
        return () => window.removeEventListener('keydown', onKey)
    }, [open, onClose])

    return (
        <AnimatePresence>
            {open ? (
                <motion.aside
                    key="queue-drawer"
                    initial={{ opacity: 0, x: 40 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 40 }}
                    transition={{ type: 'spring', stiffness: 420, damping: 38 }}
                    aria-label="Cola de reproducción"
                    className="fixed bottom-[calc(var(--dock-h)+var(--mini-h)+0.75rem)] right-3 top-[calc(var(--header-h)+0.25rem)] z-[75] flex w-[23rem] max-w-[calc(100vw-var(--sidebar-w)-1.5rem)] flex-col overflow-hidden rounded-[1.5rem] border border-white/10 bg-[#141417]/95 shadow-[0_30px_80px_rgba(0,0,0,0.55)] backdrop-blur-2xl"
                >
                    <div className="flex shrink-0 items-center justify-between gap-3 px-5 pb-2 pt-4">
                        <div className="min-w-0">
                            <h2 className="font-headline text-lg font-extrabold tracking-tight text-white">Cola</h2>
                            <p className="text-xs text-gray-500">{upcoming === 0 ? 'No hay más canciones' : `${upcoming} ${upcoming === 1 ? 'canción' : 'canciones'} a continuación`}</p>
                        </div>
                        <button type="button" onClick={onClose} className="icon-btn -mr-2 h-9 w-9" aria-label="Cerrar cola">
                            <X className="h-[18px] w-[18px]" />
                        </button>
                    </div>
                    <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-4 pt-2">
                        <QueuePanel
                            queue={queue}
                            queueIndex={queueIndex}
                            isPlaying={isPlaying}
                            onPlayIndex={(index) => {
                                const song = queue[index]
                                if (song) void playSong(song, queue, index, 0)
                            }}
                            onRemove={removeFromQueue}
                            onReorder={reorderQueue}
                        />
                    </div>
                </motion.aside>
            ) : null}
        </AnimatePresence>
    )
}
