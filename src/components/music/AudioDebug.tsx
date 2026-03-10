import React, { useEffect, useState } from 'react'
import { usePlayerStore } from '@app/store/player.store'

/**
 * Debug component to verify audio URLs and player state
 */
export const AudioDebug: React.FC = () => {
    const { currentSong, audioRef, isPlaying } = usePlayerStore()
    const [audioState, setAudioState] = useState<any>(null)

    useEffect(() => {
        if (audioRef) {
            const state = {
                src: audioRef.src,
                currentTime: audioRef.currentTime,
                duration: audioRef.duration,
                paused: audioRef.paused,
                error: audioRef.error?.message || 'No error',
                readyState: audioRef.readyState,
                networkState: audioRef.networkState,
                volume: audioRef.volume,
            }
            setAudioState(state)

            // Log every 2 seconds
            const interval = setInterval(() => {
                setAudioState({
                    src: audioRef.src,
                    currentTime: audioRef.currentTime,
                    duration: audioRef.duration,
                    paused: audioRef.paused,
                    error: audioRef.error?.message || 'No error',
                    readyState: audioRef.readyState,
                    networkState: audioRef.networkState,
                    volume: audioRef.volume,
                })
            }, 2000)

            return () => clearInterval(interval)
        }
    }, [audioRef])

    if (!currentSong) return null

    return (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-black/80 border-t border-gray-700 text-xs text-gray-400 max-h-40 overflow-y-auto z-20">
            <div className="grid grid-cols-2 gap-2">
                <div>
                    <p className="font-bold text-white">Song:</p>
                    <p>{currentSong.title}</p>
                    <p className="text-blue-400">{currentSong.audio_url?.substring(0, 50)}...</p>
                </div>
                <div>
                    <p className="font-bold text-white">Player State:</p>
                    <p>Playing: {isPlaying ? 'Yes' : 'No'}</p>
                    <p>Paused: {audioState?.paused ? 'Yes' : 'No'}</p>
                </div>
                <div>
                    <p className="font-bold text-white">Audio Values:</p>
                    <p>ReadyState: {audioState?.readyState}</p>
                    <p>NetworkState: {audioState?.networkState}</p>
                    <p>Duration: {audioState?.duration}</p>
                </div>
                <div>
                    <p className="font-bold text-white">Error:</p>
                    <p className="text-red-400">{audioState?.error}</p>
                    <p>Src Loaded: {audioState?.src ? 'Yes' : 'No'}</p>
                </div>
            </div>
        </div>
    )
}
