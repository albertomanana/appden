import React, { useRef, useEffect, useState } from 'react'
import { usePlayerStore } from '@app/store/player.store'
import { Link } from 'react-router-dom'
import { formatDuration } from '@lib/utils'
import {
    Play, Pause, SkipBack, SkipForward, Volume2, VolumeX,
    Repeat, Repeat1, Shuffle, ChevronDown, Music, Share2, Heart
} from 'lucide-react'
import { ROUTES } from '@lib/constants'
import { cn } from '@lib/utils'

/**
 * Premium Spotify-style music player
 * Handles all audio playback, volume, seek, and queue management
 */
export const SpotifyMusicPlayer: React.FC = () => {
    const {
        currentSong, isPlaying, currentTime, duration, volume, isMuted,
        repeatMode, isShuffle,
        setPlaying, setCurrentTime, setDuration, setAudioRef,
        togglePlay, nextTrack, prevTrack, toggleRepeat, toggleShuffle,
        setVolume, toggleMute,
    } = usePlayerStore()

    const audioRef = useRef<HTMLAudioElement>(null)
    const [isExpanded, setIsExpanded] = useState(false)

    // Register audio ref on mount
    useEffect(() => {
        if (audioRef.current) {
            console.log('[Player] Registering audio ref')
            setAudioRef(audioRef.current)
        }
    }, [])

    // Load new song when song changes
    useEffect(() => {
        const audio = audioRef.current
        if (!audio || !currentSong?.audio_url) {
            console.log('[Player] No audio element or song URL')
            return
        }

        console.log('[Player] Loading song:', {
            title: currentSong.title,
            artist: currentSong.artist_name,
            url: currentSong.audio_url?.substring(0, 50) + '...',
        })

        // Set source
        audio.src = currentSong.audio_url
        audio.load()

        // Auto-play if should be playing
        if (isPlaying) {
            const playPromise = audio.play()
            if (playPromise) {
                playPromise.catch((err: Error) => {
                    console.error('[Player] Auto-play failed:', err.message)
                    setPlaying(false)
                })
            }
        }

        return () => {
            if (audio && !audio.paused) {
                audio.pause()
            }
        }
    }, [currentSong?.id])

    // Sync play/pause
    useEffect(() => {
        const audio = audioRef.current
        if (!audio) return

        if (isPlaying) {
            const promise = audio.play()
            if (promise) {
                promise.catch((err: Error) => {
                    console.error('[Player] Play failed:', err.message)
                    setPlaying(false)
                    // Reset state if play fails
                    setPlaying(false)
                })
            }
        } else {
            audio.pause()
        }
    }, [isPlaying])

    // Sync volume and mute
    useEffect(() => {
        const audio = audioRef.current
        if (!audio) return

        const newVolume = isMuted ? 0 : volume
        audio.volume = newVolume
        audio.muted = isMuted
        console.log('[Player] Volume updated:', { volume: newVolume, isMuted })
    }, [volume, isMuted])

    if (!currentSong) return null

    const progress = duration > 0 ? (currentTime / duration) * 100 : 0

    return (
        <>
            <audio
                ref={audioRef}
                onTimeUpdate={(e) => {
                    setCurrentTime(e.currentTarget.currentTime)
                }}
                onDurationChange={(e) => {
                    const newDuration = e.currentTarget.duration
                    console.log('[Player] Duration:', newDuration)
                    setDuration(newDuration)
                }}
                onEnded={() => {
                    console.log('[Player] Song ended')
                    if (repeatMode === 'one') {
                        audioRef.current!.currentTime = 0
                        audioRef.current!.play().catch(() => {})
                    } else {
                        nextTrack()
                    }
                }}
                onPlay={() => {
                    console.log('[Player] Playing')
                    setPlaying(true)
                }}
                onPause={() => {
                    console.log('[Player] Paused')
                    setPlaying(false)
                }}
                onError={(e) => {
                    const error = e.currentTarget.error
                    console.error('[Player] Audio error:', {
                        code: error?.code,
                        message: error?.message,
                    })
                }}
                crossOrigin="anonymous"
            />

            {/* Mobile expanded player */}
            {isExpanded && (
                <div className="fixed inset-0 z-40 bg-gradient-to-b from-brand-900/80 to-surface-900 flex flex-col p-4 md:hidden">
                    {/* Close button */}
                    <button
                        onClick={() => setIsExpanded(false)}
                        className="mb-4 text-gray-300 hover:text-white"
                    >
                        <ChevronDown className="w-6 h-6" />
                    </button>

                    {/* Large cover */}
                    <div className="flex-1 flex items-center justify-center mb-8">
                        <div className="w-64 h-64 rounded-2xl overflow-hidden shadow-2xl bg-surface-600">
                            {currentSong.cover_url ? (
                                <img
                                    src={currentSong.cover_url}
                                    alt={currentSong.title}
                                    className="w-full h-full object-cover"
                                    onError={() => console.error('[Player] Cover load error')}
                                />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                    <Music className="w-32 h-32 text-gray-600" />
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Song info */}
                    <div className="text-center mb-8">
                        <h2 className="text-3xl font-bold text-white mb-2">{currentSong.title}</h2>
                        <Link
                            to={ROUTES.PROFILE_ID(currentSong.uploaded_by)}
                            className="text-lg text-brand-400 hover:text-brand-300 transition-colors"
                        >
                            {currentSong.artist_name}
                        </Link>
                        {currentSong.album_name && (
                            <p className="text-sm text-gray-400 mt-1">{currentSong.album_name}</p>
                        )}
                    </div>

                    {/* Progress */}
                    <div className="mb-6">
                        <input
                            type="range"
                            min={0}
                            max={100}
                            value={progress}
                            onChange={(e) => {
                                const time = (parseFloat(e.target.value) / 100) * duration
                                if (audioRef.current) audioRef.current.currentTime = time
                                setCurrentTime(time)
                            }}
                            className="w-full h-1 bg-gray-600 rounded-full"
                        />
                        <div className="flex justify-between text-xs text-gray-400 mt-2">
                            <span>{formatDuration(currentTime)}</span>
                            <span>{formatDuration(duration)}</span>
                        </div>
                    </div>

                    {/* Controls */}
                    <div className="flex items-center justify-center gap-6 mb-6">
                        <button
                            onClick={() => toggleShuffle()}
                            className={cn('p-2 rounded-full transition-colors', isShuffle ? 'text-brand-400' : 'text-gray-400')}
                        >
                            <Shuffle className="w-5 h-5" />
                        </button>

                        <button onClick={() => prevTrack()} className="p-3 rounded-full bg-surface-700 hover:bg-surface-600">
                            <SkipBack className="w-6 h-6 text-white" />
                        </button>

                        <button
                            onClick={() => togglePlay()}
                            className="p-4 rounded-full bg-brand-500 hover:bg-brand-400 transition-colors"
                        >
                            {isPlaying ? (
                                <Pause className="w-8 h-8 text-white" />
                            ) : (
                                <Play className="w-8 h-8 text-white ml-1" />
                            )}
                        </button>

                        <button onClick={() => nextTrack()} className="p-3 rounded-full bg-surface-700 hover:bg-surface-600">
                            <SkipForward className="w-6 h-6 text-white" />
                        </button>

                        <button
                            onClick={() => toggleRepeat()}
                            className={cn('p-2 rounded-full transition-colors', repeatMode !== 'none' ? 'text-brand-400' : 'text-gray-400')}
                        >
                            {repeatMode === 'one' ? <Repeat1 className="w-5 h-5" /> : <Repeat className="w-5 h-5" />}
                        </button>
                    </div>

                    {/* Bottom actions */}
                    <div className="flex justify-around">
                        <button className="text-gray-400 hover:text-white p-2">
                            <Heart className="w-5 h-5" />
                        </button>
                        <button className="text-gray-400 hover:text-white p-2">
                            <Share2 className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            )}

            {/* Mini player bar */}
            <div className="fixed left-0 right-0 bottom-0 z-30 bg-gradient-to-t from-surface-900 to-surface-800/80 border-t border-surface-700 backdrop-blur-md">
                {/* Progress bar */}
                <div className="h-1 w-full bg-surface-700/50">
                    <div
                        className="h-full bg-brand-500 transition-all"
                        style={{ width: `${progress}%` }}
                    />
                </div>

                {/* Controls */}
                <div className="p-3 flex items-center gap-3">
                    {/* Song info */}
                    <button
                        onClick={() => setIsExpanded(true)}
                        className="flex-1 min-w-0 text-left hover:opacity-80 transition-opacity md:hidden"
                    >
                        <div className="w-10 h-10 rounded-lg overflow-hidden bg-surface-600 flex-shrink-0">
                            {currentSong.cover_url ? (
                                <img src={currentSong.cover_url} alt="" className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                    <Music className="w-5 h-5 text-gray-600" />
                                </div>
                            )}
                        </div>
                        <div className="ml-2 flex-1 min-w-0">
                            <p className="text-xs font-semibold text-white truncate">{currentSong.title}</p>
                            <Link
                                to={ROUTES.PROFILE_ID(currentSong.uploaded_by)}
                                onClick={(e) => e.stopPropagation()}
                                className="text-xs text-gray-400 truncate hover:text-brand-400 transition-colors"
                            >
                                {currentSong.artist_name}
                            </Link>
                        </div>
                    </button>

                    {/* Desktop info */}
                    <div className="hidden md:flex items-center gap-3 flex-1">
                        <div className="w-12 h-12 rounded-lg overflow-hidden bg-surface-600 flex-shrink-0">
                            {currentSong.cover_url ? (
                                <img src={currentSong.cover_url} alt="" className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                    <Music className="w-5 h-5 text-gray-600" />
                                </div>
                            )}
                        </div>
                        <div className="flex-1">
                            <p className="text-sm font-semibold text-white">{currentSong.title}</p>
                            <Link
                                to={ROUTES.PROFILE_ID(currentSong.uploaded_by)}
                                className="text-xs text-gray-400 hover:text-brand-400 transition-colors"
                            >
                                {currentSong.artist_name}
                            </Link>
                        </div>
                    </div>

                    {/* Controls */}
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => prevTrack()}
                            className="p-2 text-gray-400 hover:text-white transition-colors"
                        >
                            <SkipBack className="w-4 h-4" />
                        </button>

                        <button
                            onClick={() => togglePlay()}
                            className="w-10 h-10 flex items-center justify-center rounded-full bg-brand-500 hover:bg-brand-400 text-white transition-colors"
                        >
                            {isPlaying ? (
                                <Pause className="w-5 h-5" />
                            ) : (
                                <Play className="w-5 h-5 ml-0.5" />
                            )}
                        </button>

                        <button
                            onClick={() => nextTrack()}
                            className="p-2 text-gray-400 hover:text-white transition-colors"
                        >
                            <SkipForward className="w-4 h-4" />
                        </button>

                        {/* Volume */}
                        <div className="hidden md:flex items-center gap-2 ml-4 pl-4 border-l border-surface-700">
                            <button
                                onClick={() => toggleMute()}
                                className="p-1 text-gray-400 hover:text-white transition-colors"
                            >
                                {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                            </button>
                            <input
                                type="range"
                                min={0}
                                max={1}
                                step={0.01}
                                value={isMuted ? 0 : volume}
                                onChange={(e) => {
                                    const v = parseFloat(e.target.value)
                                    setVolume(v)
                                    if (audioRef.current) audioRef.current.volume = v
                                }}
                                className="w-20 h-1"
                            />
                        </div>
                    </div>
                </div>
            </div>
        </>
    )
}
