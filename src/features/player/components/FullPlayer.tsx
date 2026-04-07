import React, { useEffect, useMemo, useState } from 'react'
import { ChevronDown, ListMusic, Music, X } from 'lucide-react'
import { PlayerControls } from '@features/player/components/PlayerControls'
import { ProgressBar } from '@features/player/components/ProgressBar'
import { QueuePanel } from '@features/player/components/QueuePanel'
import { useAdvancedPlayerStore } from '@features/player/player.store'
import type { RepeatMode } from '@features/player/player.types'
import { cn } from '@lib/utils'

export const FullPlayer: React.FC = () => {
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
    const [coverFailed, setCoverFailed] = useState(false)

    const cycleRepeat = useMemo(() => () => setRepeatMode(nextRepeatMode(repeatMode)), [repeatMode, setRepeatMode])

    useEffect(() => {
        setCoverFailed(false)
    }, [currentSong?.id, currentSong?.cover_url])

    if (!currentSong || !isOpen) return null

    return (
        <div className="fixed inset-0 z-[90] overflow-y-auto bg-[radial-gradient(circle_at_top,rgba(42,64,117,0.18),transparent_28%),linear-gradient(180deg,#09090c_0%,#111114_100%)] text-white animate-player-fade-in">
            <div className="mx-auto min-h-screen w-full max-w-5xl px-4 pb-16 pt-[calc(env(safe-area-inset-top)+0.9rem)] sm:px-6">
                <div className="flex items-center justify-between gap-3">
                    <button
                        onClick={() => toggleFullPlayer(false)}
                        className="grid h-10 w-10 place-items-center rounded-full bg-white/8 text-white"
                        aria-label="Minimizar reproductor"
                    >
                        <ChevronDown className="h-5 w-5" />
                    </button>

                    <div className="text-center">
                        <p className="text-[11px] uppercase tracking-[0.28em] text-white/45">Reproductor</p>
                        <p className="mt-1 text-xs uppercase tracking-[0.18em] text-white/65">
                            {queue.length > 0 ? `${queue.length} en cola` : 'Sin cola'}
                        </p>
                    </div>

                    <button
                        onClick={() => toggleQueuePanel()}
                        className={cn(
                            'grid h-10 min-w-10 place-items-center rounded-full px-3 text-white transition-colors',
                            isQueueOpen ? 'bg-brand-500/25' : 'bg-white/8'
                        )}
                        aria-label="Abrir cola"
                    >
                        <ListMusic className="h-5 w-5" />
                    </button>
                </div>

                <div className={cn('mt-6 grid gap-8', isQueueOpen ? 'xl:grid-cols-[1.1fr,0.7fr]' : 'xl:grid-cols-1')}>
                    <section className="min-w-0">
                        <div className="grid gap-8 xl:grid-cols-[0.95fr,1.05fr] xl:items-center">
                            <div>
                                <div className="relative mx-auto aspect-square w-full max-w-[420px] overflow-hidden rounded-[2rem] border border-white/8 bg-[#131313] shadow-[0_30px_120px_rgba(0,0,0,0.55)]">
                                    {currentSong.cover_url && !coverFailed ? (
                                        <img
                                            src={currentSong.cover_url}
                                            alt={currentSong.title}
                                            className="h-full w-full object-cover"
                                            onError={() => setCoverFailed(true)}
                                        />
                                    ) : (
                                        <div className="grid h-full w-full place-items-center text-white/70">
                                            <Music className="h-16 w-16" />
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="min-w-0">
                                <h2 className="text-4xl font-headline font-extrabold tracking-tight text-white md:text-5xl">
                                    {currentSong.title}
                                </h2>
                                <p className="mt-2 text-sm uppercase tracking-[0.22em] text-white/60 md:text-base">
                                    {currentSong.artist_name}
                                </p>
                                {currentSong.album_name ? (
                                    <p className="mt-3 text-sm text-white/55">{currentSong.album_name}</p>
                                ) : null}

                                <ProgressBar
                                    className="mt-8"
                                    currentTime={metrics.currentTime}
                                    duration={metrics.duration}
                                    bufferedRatio={metrics.buffered}
                                    onSeek={seekTo}
                                />

                                <div className="mt-7 rounded-[1.8rem] border border-white/6 bg-[linear-gradient(180deg,rgba(19,19,19,0.98)_0%,rgba(14,14,14,0.96)_100%)] p-5 shadow-[0_24px_70px_rgba(0,0,0,0.28)]">
                                    <PlayerControls
                                        isPlaying={isPlaying}
                                        repeatMode={repeatMode}
                                        isShuffle={isShuffle}
                                        volume={volume}
                                        onPlayPause={() => void togglePlayPause()}
                                        onNext={() => void next()}
                                        onPrevious={() => void previous()}
                                        onToggleShuffle={toggleShuffle}
                                        onCycleRepeat={cycleRepeat}
                                        onVolumeChange={setVolume}
                                    />
                                </div>
                            </div>
                        </div>
                    </section>

                    {isQueueOpen ? (
                        <QueuePanel
                            queue={queue}
                            queueIndex={queueIndex}
                            onPlayIndex={(index) => {
                                const song = queue[index]
                                if (!song) return
                                void playSong(song, queue, index, 0)
                            }}
                            onRemove={removeFromQueue}
                            onReorder={reorderQueue}
                        />
                    ) : null}
                </div>
            </div>

            <button
                onClick={() => toggleFullPlayer(false)}
                className="fixed right-4 top-[calc(env(safe-area-inset-top)+1rem)] hidden h-10 w-10 place-items-center rounded-full bg-white/10 text-white md:grid"
                aria-label="Cerrar reproductor"
            >
                <X className="h-5 w-5" />
            </button>
        </div>
    )
}

function nextRepeatMode(mode: RepeatMode): RepeatMode {
    if (mode === 'off') return 'all'
    if (mode === 'all') return 'one'
    return 'off'
}
