import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion, useDragControls, type PanInfo } from 'framer-motion'
import { ChevronDown, FileText, Heart, ListMusic } from 'lucide-react'
import { Cover } from '@components/music/Cover'
import { Modal } from '@components/ui/Modal'
import { nextRepeatMode, PlayerControls } from '@features/player/components/PlayerControls'
import { ProgressBar } from '@features/player/components/ProgressBar'
import { QueuePanel } from '@features/player/components/QueuePanel'
import { useAdvancedPlayerStore } from '@features/player/player.store'
import { useDominantColor } from '@features/player/hooks/useDominantColor'
import { useActiveGroup } from '@hooks/useActiveGroup'
import { useFavoriteToggle } from '@hooks/useFavoriteToggle'
import { useMediaQuery } from '@hooks/useMediaQuery'
import { ROUTES } from '@lib/constants'
import { cn } from '@lib/utils'

export const FullPlayer: React.FC = () => {
    const navigate = useNavigate()
    const { activeGroup } = useActiveGroup()
    const currentSong = useAdvancedPlayerStore((state) => state.currentSong)
    const isPlaying = useAdvancedPlayerStore((state) => state.isPlaying)
    const repeatMode = useAdvancedPlayerStore((state) => state.repeatMode)
    const isShuffle = useAdvancedPlayerStore((state) => state.isShuffle)
    const volume = useAdvancedPlayerStore((state) => state.volume)
    const metrics = useAdvancedPlayerStore((state) => state.metrics)
    const isOpen = useAdvancedPlayerStore((state) => state.isFullPlayer)
    const queue = useAdvancedPlayerStore((state) => state.queue)
    const queueIndex = useAdvancedPlayerStore((state) => state.queueIndex)
    const isQueueOpen = useAdvancedPlayerStore((state) => state.isQueueOpen)
    const toggleFullPlayer = useAdvancedPlayerStore((state) => state.toggleFullPlayer)
    const togglePlayPause = useAdvancedPlayerStore((state) => state.togglePlayPause)
    const next = useAdvancedPlayerStore((state) => state.next)
    const previous = useAdvancedPlayerStore((state) => state.previous)
    const seekTo = useAdvancedPlayerStore((state) => state.seekTo)
    const setVolume = useAdvancedPlayerStore((state) => state.setVolume)
    const setRepeatMode = useAdvancedPlayerStore((state) => state.setRepeatMode)
    const toggleShuffle = useAdvancedPlayerStore((state) => state.toggleShuffle)
    const removeFromQueue = useAdvancedPlayerStore((state) => state.removeFromQueue)
    const reorderQueue = useAdvancedPlayerStore((state) => state.reorderQueue)
    const playSong = useAdvancedPlayerStore((state) => state.playSong)
    const toggleQueuePanel = useAdvancedPlayerStore((state) => state.toggleQueuePanel)

    const dragControls = useDragControls()
    const tint = useDominantColor(currentSong?.cover_url)
    const finePointer = useMediaQuery('(hover: hover) and (pointer: fine)')
    const favorite = useFavoriteToggle(currentSong?.id, currentSong?.is_favorite)
    const [swipeDirection, setSwipeDirection] = useState(0)

    const close = () => toggleFullPlayer(false)

    useEffect(() => {
        if (!isOpen) return
        const onKey = (event: KeyboardEvent) => {
            if (event.key === 'Escape' && !useAdvancedPlayerStore.getState().isQueueOpen) close()
            if (event.key === ' ' && event.target === document.body) {
                event.preventDefault()
                void togglePlayPause()
            }
        }
        window.addEventListener('keydown', onKey)
        return () => window.removeEventListener('keydown', onKey)
    }, [isOpen])

    const handleSheetDragEnd = (_event: unknown, info: PanInfo) => {
        if (info.offset.y > 140 || info.velocity.y > 700) close()
    }

    const handleCoverDragEnd = (_event: unknown, info: PanInfo) => {
        if (info.offset.x < -80) {
            setSwipeDirection(1)
            void next()
        } else if (info.offset.x > 80) {
            setSwipeDirection(-1)
            void previous()
        }
    }

    const openDetails = () => {
        if (!currentSong) return
        close()
        navigate(ROUTES.SONG(currentSong.id))
    }

    return (
        <AnimatePresence>
            {currentSong && isOpen ? (
                <motion.div
                    key="full-player"
                    role="dialog"
                    aria-modal="true"
                    aria-label="Reproductor"
                    initial={{ y: '100%' }}
                    animate={{ y: 0 }}
                    exit={{ y: '100%' }}
                    transition={{ type: 'spring', stiffness: 380, damping: 40 }}
                    drag="y"
                    dragControls={dragControls}
                    dragListener={false}
                    dragConstraints={{ top: 0, bottom: 0 }}
                    dragElastic={{ top: 0, bottom: 0.7 }}
                    onDragEnd={handleSheetDragEnd}
                    className="fixed inset-0 z-[90] overflow-hidden bg-[#0b0b0d] text-white"
                >
                    {/* Backdrop: blurred artwork + colour wash from the cover. */}
                    <div className="pointer-events-none absolute inset-0">
                        {currentSong.cover_url ? (
                            <img src={currentSong.cover_url} alt="" className="absolute inset-0 h-full w-full scale-150 object-cover opacity-40 blur-3xl" />
                        ) : null}
                        <div
                            className="absolute inset-0 transition-[background] duration-700"
                            style={{
                                background: `linear-gradient(180deg, ${tint ? `color-mix(in srgb, ${tint} 55%, transparent)` : 'rgba(55,90,170,0.35)'} 0%, rgba(11,11,13,0.82) 55%, #0b0b0d 100%)`,
                            }}
                        />
                    </div>

                    <div className="relative mx-auto flex h-full w-full max-w-5xl flex-col px-6 pb-[calc(env(safe-area-inset-bottom)+1rem)] pt-[env(safe-area-inset-top)]">
                        <div onPointerDown={(event) => dragControls.start(event)} className="flex h-14 shrink-0 touch-none items-center justify-between gap-3">
                            <button onClick={close} className="icon-btn -ml-2 text-white" aria-label="Minimizar reproductor">
                                <ChevronDown className="h-7 w-7" />
                            </button>
                            <div className="min-w-0 text-center">
                                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/55">Reproduciendo</p>
                                <p className="truncate text-sm font-semibold text-white">{activeGroup?.name ?? 'The Appden'}</p>
                            </div>
                            <button onClick={() => toggleQueuePanel(true)} className="icon-btn -mr-2 text-white" aria-label="Ver cola">
                                <ListMusic className="h-6 w-6" />
                            </button>
                        </div>

                        <div className="flex min-h-0 flex-1 flex-col justify-center gap-6 md:grid md:grid-cols-2 md:items-center md:gap-12">
                            <div className="flex min-h-0 items-center justify-center py-2">
                                <AnimatePresence mode="popLayout" initial={false} custom={swipeDirection}>
                                    <motion.div
                                        key={currentSong.id}
                                        custom={swipeDirection}
                                        initial={{ opacity: 0, x: swipeDirection * 60, scale: 0.94 }}
                                        animate={{ opacity: 1, x: 0, scale: isPlaying ? 1 : 0.9 }}
                                        exit={{ opacity: 0, x: swipeDirection * -60, scale: 0.94 }}
                                        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                                        drag="x"
                                        dragSnapToOrigin
                                        dragElastic={0.4}
                                        dragConstraints={{ left: 0, right: 0 }}
                                        onDragEnd={handleCoverDragEnd}
                                        className="aspect-square w-full max-w-[min(100%,46dvh)] touch-pan-y md:max-w-[440px]"
                                    >
                                        <Cover
                                            src={currentSong.cover_url}
                                            alt={currentSong.title}
                                            seed={currentSong.id}
                                            className="h-full w-full rounded-[1.75rem] shadow-[0_30px_80px_rgba(0,0,0,0.55)]"
                                            iconClassName="h-16 w-16"
                                        />
                                    </motion.div>
                                </AnimatePresence>
                            </div>

                            <div className="shrink-0">
                                <div onPointerDown={(event) => dragControls.start(event)} className="flex touch-none items-end gap-3">
                                    <div className="min-w-0 flex-1">
                                        <h2 className="truncate font-headline text-2xl font-extrabold tracking-tight text-white md:text-4xl">
                                            {currentSong.title}
                                        </h2>
                                        <p className="mt-1 truncate text-base text-white/65">
                                            {currentSong.artist_name}
                                            {currentSong.album_name ? <span className="text-white/40"> · {currentSong.album_name}</span> : null}
                                        </p>
                                    </div>
                                    <button
                                        onClick={favorite.toggle}
                                        onPointerDown={(event) => event.stopPropagation()}
                                        className={cn('icon-btn -mr-2', favorite.isFavorite ? 'text-pink-400' : 'text-white/70')}
                                        aria-label={favorite.isFavorite ? 'Quitar de favoritos' : 'Añadir a favoritos'}
                                        aria-pressed={favorite.isFavorite}
                                    >
                                        <Heart className={cn('h-6 w-6', favorite.isFavorite && 'fill-current')} />
                                    </button>
                                </div>

                                <ProgressBar
                                    className="mt-4"
                                    currentTime={metrics.currentTime}
                                    duration={metrics.duration || currentSong.duration_seconds || 0}
                                    bufferedRatio={metrics.buffered}
                                    onSeek={seekTo}
                                />

                                <div className="mt-3">
                                    <PlayerControls
                                        isPlaying={isPlaying}
                                        repeatMode={repeatMode}
                                        isShuffle={isShuffle}
                                        volume={volume}
                                        showVolume={finePointer}
                                        onPlayPause={() => void togglePlayPause()}
                                        onNext={() => void next()}
                                        onPrevious={() => void previous()}
                                        onToggleShuffle={toggleShuffle}
                                        onCycleRepeat={() => setRepeatMode(nextRepeatMode(repeatMode))}
                                        onVolumeChange={setVolume}
                                    />
                                </div>

                                <div className="mt-5 flex items-center justify-between">
                                    <button onClick={openDetails} className="btn-ghost -ml-3 text-white/75">
                                        <FileText className="h-4 w-4" />
                                        Letra y comentarios
                                    </button>
                                    <button onClick={() => toggleQueuePanel(true)} className="btn-ghost -mr-3 text-white/75">
                                        {queue.length > queueIndex + 1 ? `${queue.length - queueIndex - 1} en cola` : 'Cola'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    <Modal open={isQueueOpen} onClose={() => toggleQueuePanel(false)} title="Cola de reproducción" size="md">
                        <QueuePanel
                            queue={queue}
                            queueIndex={queueIndex}
                            isPlaying={isPlaying}
                            onPlayIndex={(index) => {
                                const song = queue[index]
                                if (!song) return
                                void playSong(song, queue, index, 0)
                            }}
                            onRemove={removeFromQueue}
                            onReorder={reorderQueue}
                        />
                    </Modal>
                </motion.div>
            ) : null}
        </AnimatePresence>
    )
}
