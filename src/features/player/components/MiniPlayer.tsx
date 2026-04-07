import React, { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Music, Pause, Play, SkipBack, SkipForward } from 'lucide-react'
import { useAdvancedPlayerStore } from '@features/player/player.store'

export const MiniPlayer: React.FC = () => {
    const currentSong = useAdvancedPlayerStore((state) => state.currentSong)
    const isPlaying = useAdvancedPlayerStore((state) => state.isPlaying)
    const metrics = useAdvancedPlayerStore((state) => state.metrics)
    const togglePlayPause = useAdvancedPlayerStore((state) => state.togglePlayPause)
    const next = useAdvancedPlayerStore((state) => state.next)
    const previous = useAdvancedPlayerStore((state) => state.previous)
    const toggleFullPlayer = useAdvancedPlayerStore((state) => state.toggleFullPlayer)
    const [coverFailed, setCoverFailed] = useState(false)

    useEffect(() => {
        setCoverFailed(false)
    }, [currentSong?.id, currentSong?.cover_url])

    if (!currentSong) return null

    const progress = metrics.duration > 0 ? (metrics.currentTime / metrics.duration) * 100 : 0

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            className="fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+5.45rem)] z-[70] px-3 safe-left safe-right md:bottom-4 md:left-auto md:right-4 md:inset-x-auto md:w-[min(620px,calc(100%-19rem))] md:px-0"
        >
            <div className="mx-auto w-full max-w-3xl overflow-hidden rounded-[1.5rem] border border-white/10 bg-[linear-gradient(180deg,rgba(18,18,21,0.96)_0%,rgba(11,11,13,0.98)_100%)] shadow-[0_28px_80px_rgba(0,0,0,0.5)] backdrop-blur-2xl">
                <div className="h-1 w-full bg-white/10">
                    <div className="h-full bg-white/80 transition-all" style={{ width: `${progress}%` }} />
                </div>

                <div className="flex items-center gap-3 px-3.5 py-3">
                    <button
                        onClick={() => toggleFullPlayer(true)}
                        className="h-12 w-12 shrink-0 overflow-hidden rounded-[1rem] bg-black/25"
                        aria-label="Abrir reproductor"
                    >
                        {currentSong.cover_url && !coverFailed ? (
                            <img
                                src={currentSong.cover_url}
                                alt={currentSong.title}
                                className="h-full w-full object-cover"
                                onError={() => setCoverFailed(true)}
                            />
                        ) : (
                            <div className="grid h-full w-full place-items-center text-white/70">
                                <Music className="h-4 w-4" />
                            </div>
                        )}
                    </button>

                    <button
                        onClick={() => toggleFullPlayer(true)}
                        className="min-w-0 flex-1 text-left"
                        aria-label="Abrir reproductor"
                    >
                        <p className="truncate text-sm font-semibold text-white">{currentSong.title}</p>
                        <p className="truncate text-xs uppercase tracking-[0.18em] text-white/65">{currentSong.artist_name}</p>
                    </button>

                    <div className="flex items-center gap-1.5">
                        <button
                            onClick={() => void previous()}
                            className="hidden h-10 w-10 place-items-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/18 sm:grid"
                            aria-label="Anterior"
                        >
                            <SkipBack className="h-4 w-4" />
                        </button>

                        <button
                            onClick={() => void togglePlayPause()}
                            className="grid h-11 w-11 place-items-center rounded-full bg-white text-black shadow-[0_12px_32px_rgba(255,255,255,0.18)]"
                            aria-label={isPlaying ? 'Pausar' : 'Reproducir'}
                        >
                            {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="ml-0.5 h-5 w-5" />}
                        </button>

                        <button
                            onClick={() => void next()}
                            className="grid h-10 w-10 place-items-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/18"
                            aria-label="Siguiente"
                        >
                            <SkipForward className="h-4 w-4" />
                        </button>
                    </div>
                </div>
            </div>
        </motion.div>
    )
}
