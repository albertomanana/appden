import React, { useEffect, useState } from 'react'
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
        <div
            className="fixed left-0 right-0 bottom-[calc(env(safe-area-inset-bottom)+4.5rem)] md:bottom-0 z-[70] border-t border-white/15 backdrop-blur-xl transition-all duration-300"
            style={{ backgroundImage: dynamicPalette.gradient }}
        >
            <div className="h-1 w-full bg-white/10">
                <div className="h-full bg-white/80 transition-all" style={{ width: `${progress}%` }} />
            </div>

            <div className={`px-3 flex items-center gap-3 ${isCompactMode ? 'py-1.5' : 'py-2.5'}`}>
                <button
                    onClick={() => toggleFullPlayer(true)}
                    className={`${isCompactMode ? 'w-9 h-9' : 'w-11 h-11'} rounded-lg overflow-hidden bg-black/20 flex-shrink-0 transition-all`}
                    aria-label="Open full player"
                >
                    {currentSong.cover_url && !coverFailed ? (
                        <img
                            src={currentSong.cover_url}
                            alt={currentSong.title}
                            className="w-full h-full object-cover"
                            onError={() => setCoverFailed(true)}
                        />
                    ) : (
                        <div className="w-full h-full grid place-items-center text-white/70">
                            <Music className="w-4 h-4" />
                        </div>
                    )}
                </button>

                <button
                    onClick={() => toggleFullPlayer(true)}
                    className="min-w-0 flex-1 text-left"
                    aria-label="Open full player"
                >
                    <p className="text-sm font-semibold text-white truncate">{currentSong.title}</p>
                    <p className="text-xs text-white/75 truncate">{currentSong.artist_name}</p>
                </button>

                <div className="flex items-center gap-1.5">
                    <button
                        onClick={() => void previous()}
                        className={`${isCompactMode ? 'w-8 h-8' : 'w-9 h-9'} rounded-full bg-white/10 hover:bg-white/20 text-white grid place-items-center transition-all`}
                        aria-label="Previous"
                    >
                        <SkipBack className="w-4 h-4" />
                    </button>
                    <button
                        onClick={() => void togglePlayPause()}
                        className={`${isCompactMode ? 'w-9 h-9' : 'w-10 h-10'} rounded-full bg-white text-black grid place-items-center transition-all`}
                        aria-label={isPlaying ? 'Pause' : 'Play'}
                    >
                        {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
                    </button>
                    <button
                        onClick={() => void next()}
                        className={`${isCompactMode ? 'w-8 h-8' : 'w-9 h-9'} rounded-full bg-white/10 hover:bg-white/20 text-white grid place-items-center transition-all`}
                        aria-label="Next"
                    >
                        <SkipForward className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </div>
    )
}
