import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Song } from '@/types'
import { STORAGE_KEYS } from '@lib/constants'

export type RepeatMode = 'none' | 'all' | 'one'

interface PlayerState {
    // Current track
    currentSong: Song | null
    queue: Song[]
    queueIndex: number

    // Playback state
    isPlaying: boolean
    currentTime: number
    duration: number
    volume: number
    isMuted: boolean
    repeatMode: RepeatMode
    isShuffle: boolean

    // Player ref - not persisted, managed externally via audio element
    audioRef: HTMLAudioElement | null

    // Actions
    setCurrentSong: (song: Song, queue?: Song[], queueIndex?: number) => void
    setQueue: (songs: Song[], startIndex?: number) => void
    togglePlay: () => void
    setPlaying: (playing: boolean) => void
    setCurrentTime: (time: number) => void
    setDuration: (duration: number) => void
    setVolume: (volume: number) => void
    toggleMute: () => void
    nextTrack: () => void
    prevTrack: () => void
    toggleRepeat: () => void
    toggleShuffle: () => void
    setAudioRef: (ref: HTMLAudioElement | null) => void
    clearPlayer: () => void
}

/**
 * Global music player store.
 * Volume and mute state are persisted across sessions.
 * Queue and current song are session-only (cleared on reload).
 *
 * Why Zustand: provides a flat, non-context-propagation-heavy store
 * ideal for a cross-cutting concern like a music player that renders
 * independently from the current route. Context API would require
 * wrapping the entire app deeply and cause unnecessary re-renders.
 */
export const usePlayerStore = create<PlayerState>()(
    persist(
        (set, get) => ({
            currentSong: null,
            queue: [],
            queueIndex: 0,
            isPlaying: false,
            currentTime: 0,
            duration: 0,
            volume: 0.8,
            isMuted: false,
            repeatMode: 'none',
            isShuffle: false,
            audioRef: null,

            setCurrentSong: (song, queue = [], queueIndex = 0) => {
                set({ currentSong: song, queue, queueIndex, currentTime: 0, isPlaying: true })
            },

            setQueue: (songs, startIndex = 0) => {
                const song = songs[startIndex] ?? null
                set({ queue: songs, queueIndex: startIndex, currentSong: song, currentTime: 0, isPlaying: !!song })
            },

            togglePlay: () => {
                const { isPlaying, audioRef } = get()
                if (audioRef) {
                    if (isPlaying) {
                        audioRef.pause()
                    } else {
                        void audioRef.play().catch(() => {
                            set({ isPlaying: false })
                        })
                    }
                }
                set({ isPlaying: !isPlaying })
            },

            setPlaying: (playing) => set({ isPlaying: playing }),

            setCurrentTime: (time) => set({ currentTime: time }),

            setDuration: (duration) => set({ duration }),

            setVolume: (volume) => {
                const { audioRef } = get()
                if (audioRef) audioRef.volume = volume
                set({ volume, isMuted: volume === 0 })
            },

            toggleMute: () => {
                const { isMuted, volume, audioRef } = get()
                const newMuted = !isMuted
                if (audioRef) audioRef.muted = newMuted
                set({ isMuted: newMuted, volume: newMuted ? 0 : volume || 0.8 })
            },

            nextTrack: () => {
                const { queue, queueIndex, repeatMode, isShuffle, audioRef } = get()
                if (queue.length <= 1) {
                    if (audioRef) audioRef.currentTime = 0
                    set({ currentTime: 0, isPlaying: true })
                    return
                }

                let nextIndex: number
                if (isShuffle) {
                    nextIndex = Math.floor(Math.random() * queue.length)
                } else if (queueIndex < queue.length - 1) {
                    nextIndex = queueIndex + 1
                } else if (repeatMode === 'all') {
                    nextIndex = 0
                } else {
                    set({ isPlaying: false })
                    return
                }

                set({
                    queueIndex: nextIndex,
                    currentSong: queue[nextIndex],
                    currentTime: 0,
                    isPlaying: true,
                })
            },

            prevTrack: () => {
                const { queue, queueIndex, currentTime } = get()
                if (queue.length <= 1) {
                    const { audioRef } = get()
                    if (audioRef) audioRef.currentTime = 0
                    set({ currentTime: 0, isPlaying: true })
                    return
                }

                // If more than 3 seconds in, restart current track
                if (currentTime > 3) {
                    const { audioRef } = get()
                    if (audioRef) audioRef.currentTime = 0
                    set({ currentTime: 0 })
                    return
                }

                const prevIndex = queueIndex > 0 ? queueIndex - 1 : 0
                set({
                    queueIndex: prevIndex,
                    currentSong: queue[prevIndex],
                    currentTime: 0,
                    isPlaying: true,
                })
            },

            toggleRepeat: () => {
                const { repeatMode } = get()
                const next: RepeatMode =
                    repeatMode === 'none' ? 'all' : repeatMode === 'all' ? 'one' : 'none'
                set({ repeatMode: next })
            },

            toggleShuffle: () => set((s) => ({ isShuffle: !s.isShuffle })),

            setAudioRef: (ref) => set({ audioRef: ref }),

            clearPlayer: () =>
                set({
                    currentSong: null,
                    queue: [],
                    queueIndex: 0,
                    isPlaying: false,
                    currentTime: 0,
                    duration: 0,
                }),
        }),
        {
            name: STORAGE_KEYS.PLAYER_VOLUME,
            partialize: (state) => ({
                volume: state.volume,
                isMuted: state.isMuted,
                repeatMode: state.repeatMode,
                isShuffle: state.isShuffle,
            }),
        }
    )
)
