import React, { useEffect, useMemo, useRef, useState } from 'react'
import { ChevronDown, ListMusic, Music, Radio, X } from 'lucide-react'
import { PlayerControls } from '@features/player/components/PlayerControls'
import { ProgressBar } from '@features/player/components/ProgressBar'
import { QueuePanel } from '@features/player/components/QueuePanel'
import { useAdvancedPlayerStore } from '@features/player/player.store'
import type { RepeatMode } from '@features/player/player.types'

export const FullPlayer: React.FC = () => {
    const currentSong = useAdvancedPlayerStore((state) => state.currentSong)
    const isPlaying = useAdvancedPlayerStore((state) => state.isPlaying)
    const repeatMode = useAdvancedPlayerStore((state) => state.repeatMode)
    const isShuffle = useAdvancedPlayerStore((state) => state.isShuffle)
    const volume = useAdvancedPlayerStore((state) => state.volume)
    const crossfade = useAdvancedPlayerStore((state) => state.crossfade)
    const equalizerPreset = useAdvancedPlayerStore((state) => state.equalizerPreset)
    const metrics = useAdvancedPlayerStore((state) => state.metrics)
    const isOpen = useAdvancedPlayerStore((state) => state.isFullPlayer)
    const dynamicPalette = useAdvancedPlayerStore((state) => state.dynamicPalette)
    const queue = useAdvancedPlayerStore((state) => state.queue)
    const queueIndex = useAdvancedPlayerStore((state) => state.queueIndex)
    const isQueueOpen = useAdvancedPlayerStore((state) => state.isQueueOpen)
    const toggleFullPlayer = useAdvancedPlayerStore((state) => state.toggleFullPlayer)
    const togglePlayPause = useAdvancedPlayerStore((state) => state.togglePlayPause)
    const next = useAdvancedPlayerStore((state) => state.next)
    const previous = useAdvancedPlayerStore((state) => state.previous)
    const seekTo = useAdvancedPlayerStore((state) => state.seekTo)
    const setVolume = useAdvancedPlayerStore((state) => state.setVolume)
    const setCrossfade = useAdvancedPlayerStore((state) => state.setCrossfade)
    const setEqualizer = useAdvancedPlayerStore((state) => state.setEqualizer)
    const toggleShuffle = useAdvancedPlayerStore((state) => state.toggleShuffle)
    const setRepeatMode = useAdvancedPlayerStore((state) => state.setRepeatMode)
    const removeFromQueue = useAdvancedPlayerStore((state) => state.removeFromQueue)
    const reorderQueue = useAdvancedPlayerStore((state) => state.reorderQueue)
    const playSong = useAdvancedPlayerStore((state) => state.playSong)
    const toggleQueuePanel = useAdvancedPlayerStore((state) => state.toggleQueuePanel)
    const isRadioEnabled = useAdvancedPlayerStore((state) => state.isRadioEnabled)
    const startRadioFromSong = useAdvancedPlayerStore((state) => state.startRadioFromSong)
    const stopRadio = useAdvancedPlayerStore((state) => state.stopRadio)
    const [coverFailed, setCoverFailed] = useState(false)

    const touchStartX = useRef<number | null>(null)
    const cycleRepeat = useMemo(
        () => () => setRepeatMode(nextRepeatMode(repeatMode)),
        [repeatMode, setRepeatMode]
    )

    useEffect(() => {
        setCoverFailed(false)
    }, [currentSong?.id, currentSong?.cover_url])

    if (!currentSong || !isOpen) return null

    return (
        <div
            className="fixed inset-0 z-[80] text-white"
            style={{ backgroundImage: dynamicPalette.gradient }}
            onTouchStart={(event) => {
                touchStartX.current = event.touches[0]?.clientX ?? null
            }}
            onTouchEnd={(event) => {
                const startX = touchStartX.current
                const endX = event.changedTouches[0]?.clientX
                if (startX == null || endX == null) return
                const delta = endX - startX
                if (delta > 60) {
                    void previous()
                } else if (delta < -60) {
                    void next()
                }
                touchStartX.current = null
            }}
        >
            <div className="absolute inset-0" style={{ backgroundImage: dynamicPalette.blurOverlay }} />
            <div className="relative h-full flex flex-col p-4 md:p-6">
                <div className="flex items-center justify-between">
                    <button
                        onClick={() => toggleFullPlayer(false)}
                        className="w-10 h-10 rounded-full bg-black/25 grid place-items-center"
                        aria-label="Collapse player"
                    >
                        <ChevronDown className="w-5 h-5" />
                    </button>
                    <p className="text-xs uppercase tracking-[0.24em] text-white/75">Now Playing</p>
                    <button
                        onClick={() => toggleFullPlayer(false)}
                        className="w-10 h-10 rounded-full bg-black/25 grid place-items-center"
                        aria-label="Close player"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="flex-1 flex flex-col md:flex-row gap-6 mt-4">
                    <div className="flex-1 flex flex-col min-h-0">
                        <div className="mx-auto w-full max-w-sm aspect-square rounded-3xl overflow-hidden shadow-2xl bg-black/25 border border-white/10">
                            {currentSong.cover_url && !coverFailed ? (
                                <img
                                    src={currentSong.cover_url}
                                    alt={currentSong.title}
                                    className="w-full h-full object-cover"
                                    onError={() => setCoverFailed(true)}
                                />
                            ) : null}
                            {!currentSong.cover_url || coverFailed ? (
                                <div className="w-full h-full grid place-items-center text-white/70">
                                    <Music className="w-14 h-14" />
                                </div>
                            ) : null}
                        </div>

                        <div className="mt-5">
                            <h2 className="text-2xl md:text-3xl font-bold leading-tight">{currentSong.title}</h2>
                            <p className="text-base text-white/80 mt-1">{currentSong.artist_name}</p>
                        </div>

                        <ProgressBar
                            className="mt-5"
                            currentTime={metrics.currentTime}
                            duration={metrics.duration}
                            bufferedRatio={metrics.buffered}
                            onSeek={seekTo}
                        />

                        <div className="mt-5">
                            <PlayerControls
                                isPlaying={isPlaying}
                                repeatMode={repeatMode}
                                isShuffle={isShuffle}
                                volume={volume}
                                crossfade={crossfade}
                                equalizerPreset={equalizerPreset}
                                onPlayPause={() => void togglePlayPause()}
                                onNext={() => void next()}
                                onPrevious={() => void previous()}
                                onToggleShuffle={toggleShuffle}
                                onCycleRepeat={cycleRepeat}
                                onVolumeChange={setVolume}
                                onCrossfadeChange={setCrossfade}
                                onEqualizerChange={setEqualizer}
                            />
                        </div>

                        <div className="mt-4 flex items-center gap-2">
                            <button
                                onClick={() => toggleQueuePanel()}
                                className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-black/25 border border-white/15 text-sm"
                            >
                                <ListMusic className="w-4 h-4" />
                                Queue
                            </button>
                            <button
                                onClick={() => (isRadioEnabled ? stopRadio() : startRadioFromSong(currentSong))}
                                className={`inline-flex items-center gap-2 px-3 py-2 rounded-xl border text-sm ${
                                    isRadioEnabled ? 'bg-brand-500/35 border-brand-300/50' : 'bg-black/25 border-white/15'
                                }`}
                            >
                                <Radio className="w-4 h-4" />
                                {isRadioEnabled ? 'Radio ON' : 'Iniciar Radio'}
                            </button>
                        </div>
                    </div>

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
        </div>
    )
}

function nextRepeatMode(mode: RepeatMode): RepeatMode {
    if (mode === 'off') return 'all'
    if (mode === 'all') return 'one'
    return 'off'
}
