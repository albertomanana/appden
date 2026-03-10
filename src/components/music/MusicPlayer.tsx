import React, { useRef, useEffect } from 'react'
import { usePlayerStore } from '@app/store/player.store'
import { formatDuration } from '@lib/utils'
import {
    Play, Pause, SkipBack, SkipForward, Volume2, VolumeX,
    Repeat, Repeat1, Shuffle, ChevronDown, ChevronUp, Music
} from 'lucide-react'
import { cn } from '@lib/utils'

/**
 * Global music player component - always mounted when a song is loaded.
 * Uses an <audio> element whose ref is registered in the player store.
 */
export const MusicPlayer: React.FC = () => {
    const {
        currentSong, isPlaying, currentTime, duration, volume, isMuted,
        repeatMode, isShuffle,
        setPlaying, setCurrentTime, setDuration, setAudioRef,
        togglePlay, nextTrack, prevTrack, toggleRepeat, toggleShuffle,
        setVolume, toggleMute,
    } = usePlayerStore()

    const audioRef = useRef<HTMLAudioElement>(null)
    const [isExpanded, setIsExpanded] = React.useState(false)

    // Register audio ref in store so store actions can call play/pause
    useEffect(() => {
        setAudioRef(audioRef.current)
        return () => setAudioRef(null)
    }, [setAudioRef])

    // Sync audio src when song changes
    useEffect(() => {
        const audio = audioRef.current
        if (!audio || !currentSong?.audio_url) return

        audio.src = currentSong.audio_url
        audio.volume = volume
        audio.muted = isMuted
        audio.currentTime = 0
        setCurrentTime(0)
        setDuration(0)

        if (isPlaying) {
            void audio.play().catch((err) => {
                console.error('Failed to play:', err)
                setPlaying(false)
            })
        }
    }, [currentSong?.id, currentSong?.audio_url, isPlaying, volume, isMuted, setCurrentTime, setDuration, setPlaying])

    // Sync play/pause with store
    useEffect(() => {
        const audio = audioRef.current
        if (!audio) return
        if (isPlaying) {
            void audio.play().catch(() => setPlaying(false))
        } else {
            audio.pause()
        }
    }, [isPlaying, setPlaying])

    if (!currentSong) return null

    const progress = duration > 0 ? (currentTime / duration) * 100 : 0

    const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
        const time = (parseFloat(e.target.value) / 100) * duration
        if (audioRef.current) audioRef.current.currentTime = time
        setCurrentTime(time)
    }

    const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newVolume = parseFloat(e.target.value)
        setVolume(newVolume)
        if (audioRef.current) audioRef.current.volume = newVolume
    }

    return (
        <>
            {/* Hidden audio element */}
            <audio
                ref={audioRef}
                onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
                onDurationChange={(e) => setDuration(e.currentTarget.duration)}
                onEnded={() => {
                    if (repeatMode === 'one') {
                        audioRef.current!.currentTime = 0
                        void audioRef.current!.play()
                    } else {
                        nextTrack()
                    }
                }}
                onPlay={() => setPlaying(true)}
                onPause={() => setPlaying(false)}
                preload="auto"
                crossOrigin="anonymous"
            />

            {/* Player bar */}
            <div
                className={cn(
                    'fixed left-0 right-0 z-30 glass border-t border-surface-500 transition-all duration-300',
                    'bottom-[calc(4rem+env(safe-area-inset-bottom))] md:bottom-0',
                    isExpanded ? 'h-auto' : 'h-auto'
                )}
            >
                {/* Compact bar */}
                <div className="flex items-center gap-3 px-4 py-3">
                    {/* Cover art */}
                    <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 bg-surface-600">
                        {currentSong.cover_url ? (
                            <img
                                src={currentSong.cover_url}
                                alt={currentSong.title}
                                className="w-full h-full object-cover"
                            />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center">
                                <Music className="w-5 h-5 text-gray-500" />
                            </div>
                        )}
                    </div>

                    {/* Track info */}
                    <div className="flex-1 min-w-0" onClick={() => setIsExpanded((p) => !p)}>
                        <p className="text-sm font-semibold text-white truncate">{currentSong.title}</p>
                        <p className="text-xs text-gray-400 truncate">{currentSong.artist_name}</p>
                    </div>

                    {/* Controls */}
                    <div className="flex items-center gap-1">
                        <button
                            onClick={() => prevTrack()}
                            className="btn-ghost p-2 rounded-lg"
                            aria-label="Anterior"
                        >
                            <SkipBack className="w-4 h-4" />
                        </button>

                        <button
                            onClick={() => togglePlay()}
                            className="w-9 h-9 rounded-full bg-brand-600 hover:bg-brand-500 flex items-center justify-center transition-colors active:scale-95"
                            aria-label={isPlaying ? 'Pausar' : 'Reproducir'}
                        >
                            {isPlaying
                                ? <Pause className="w-4 h-4 text-white" />
                                : <Play className="w-4 h-4 text-white ml-0.5" />
                            }
                        </button>

                        <button
                            onClick={() => nextTrack()}
                            className="btn-ghost p-2 rounded-lg"
                            aria-label="Siguiente"
                        >
                            <SkipForward className="w-4 h-4" />
                        </button>

                        {/* Expand toggle */}
                        <button
                            onClick={() => setIsExpanded((p) => !p)}
                            className="btn-ghost p-2 rounded-lg hidden md:flex"
                            aria-label={isExpanded ? 'Contraer' : 'Expandir'}
                        >
                            {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                        </button>
                    </div>
                </div>

                {/* Progress bar (always visible) */}
                <div className="px-4 pb-2">
                    <div className="flex items-center gap-2">
                        <span className="text-[10px] text-gray-500 w-8 text-right">
                            {formatDuration(currentTime)}
                        </span>
                        <input
                            type="range"
                            min={0}
                            max={100}
                            value={progress}
                            onChange={handleSeek}
                            className="flex-1 h-1"
                            aria-label="Progreso"
                        />
                        <span className="text-[10px] text-gray-500 w-8">
                            {formatDuration(duration)}
                        </span>
                    </div>
                </div>

                {/* Expanded controls */}
                {isExpanded && (
                    <div className="px-4 pb-4 flex items-center gap-4 border-t border-surface-500 pt-3 animate-slide-up">
                        {/* Shuffle */}
                        <button
                            onClick={() => toggleShuffle()}
                            className={cn('btn-ghost p-2 rounded-lg', isShuffle && 'text-brand-400')}
                            aria-label="Aleatorio"
                        >
                            <Shuffle className="w-4 h-4" />
                        </button>

                        {/* Repeat */}
                        <button
                            onClick={() => toggleRepeat()}
                            className={cn('btn-ghost p-2 rounded-lg', repeatMode !== 'none' && 'text-brand-400')}
                            aria-label="Repetir"
                        >
                            {repeatMode === 'one' ? <Repeat1 className="w-4 h-4" /> : <Repeat className="w-4 h-4" />}
                        </button>

                        <div className="flex-1" />

                        {/* Volume */}
                        <button onClick={() => toggleMute()} className="btn-ghost p-2 rounded-lg" aria-label="Silenciar">
                            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                        </button>
                        <input
                            type="range"
                            min={0}
                            max={1}
                            step={0.01}
                            value={isMuted ? 0 : volume}
                            onChange={handleVolumeChange}
                            className="w-24 h-1"
                            aria-label="Volumen"
                        />
                    </div>
                )}
            </div>
        </>
    )
}
