import React, { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Music, Pause, Play, SkipBack, SkipForward } from 'lucide-react'
import { useAdvancedPlayerStore } from '@features/player/player.store'

export const MiniPlayer: React.FC = () => {
    const currentSong = useAdvancedPlayerStore((state) => state.currentSong)
    const isPlaying = useAdvancedPlayerStore((state) => state.isPlaying)
    const metrics = useAdvancedPlayerStore((state) => state.metrics)
    const dynamicPalette = useAdvancedPlayerStore((state) => state.dynamicPalette)
    const isCompactMode = useAdvancedPlayerStore((state) => state.isCompactMode)
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
            transition={{ duration: 0.28, ease: 'easeOut' }}
            className="fixed bottom-[calc(env(safe-area-inset-bottom)+5.6rem)] left-1/2 z-[70] w-[calc(100%-1rem)] max-w-3xl -translate-x-1/2 md:bottom-4 md:left-auto md:right-4 md:w-[min(620px,calc(100%-19rem))] md:translate-x-0"
        >
            <div className="glass-dock overflow-hidden rounded-[1.8rem]" style={{ backgroundImage: dynamicPalette.gradient }}>
                <div className="h-1 w-full bg-white/10">
                    <div className="h-full bg-white/80 transition-all" style={{ width: `${progress}%` }} />
                </div>

                <div className={`flex items-center gap-3 px-3 ${isCompactMode ? 'py-2' : 'py-3'}`}>
                    <button
                        onClick={() => toggleFullPlayer(true)}
                        className={`${isCompactMode ? 'h-10 w-10' : 'h-12 w-12'} shrink-0 overflow-hidden rounded-[1.1rem] bg-black/25`}
                        aria-label="Open full player"
                    >
                        {currentSong.cover_url && !coverFailed ? (
                            <img src={currentSong.cover_url} alt={currentSong.title} className="h-full w-full object-cover" onError={() => setCoverFailed(true)} />
                        ) : (
                            <div className="grid h-full w-full place-items-center text-white/70">
                                <Music className="h-4 w-4" />
                            </div>
                        )}
                    </button>

                    <button onClick={() => toggleFullPlayer(true)} className="min-w-0 flex-1 text-left" aria-label="Open full player">
                        <p className="truncate text-sm font-semibold text-white">{currentSong.title}</p>
                        <p className="truncate text-xs uppercase tracking-[0.18em] text-white/70">{currentSong.artist_name}</p>
                    </button>

                    <div className="flex items-center gap-1.5">
                        <button
                            onClick={() => void previous()}
                            className={`${isCompactMode ? 'h-9 w-9' : 'h-10 w-10'} grid place-items-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/18`}
                            aria-label="Previous"
                        >
                            <SkipBack className="h-4 w-4" />
                        </button>
                        <button
                            onClick={() => void togglePlayPause()}
                            className={`${isCompactMode ? 'h-10 w-10' : 'h-11 w-11'} grid place-items-center rounded-full bg-white text-black shadow-[0_12px_32px_rgba(255,255,255,0.18)]`}
                            aria-label={isPlaying ? 'Pause' : 'Play'}
                        >
                            {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="ml-0.5 h-5 w-5" />}
                        </button>
                        <button
                            onClick={() => void next()}
                            className={`${isCompactMode ? 'h-9 w-9' : 'h-10 w-10'} grid place-items-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/18`}
                            aria-label="Next"
                        >
                            <SkipForward className="h-4 w-4" />
                        </button>
                    </div>
                </div>
            </div>
        </motion.div>
    )
}
