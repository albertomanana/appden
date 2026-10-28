import { create } from 'zustand'
import { playerEngine } from '@features/player/player.engine'
import { playerPersistence } from '@features/player/player.persistence'
import { getStorageUrl, STORAGE_BUCKETS } from '@lib/supabase/client'
import {
    addSongToQueue,
    getNextIndex,
    getPreviousIndex,
    removeSongFromQueue,
    reorderQueue,
} from '@features/player/player.queue'
import type {
    ContinueListeningSnapshot,
    PlaybackHistoryItem,
    PlayerMetrics,
    PlayerSong,
    RepeatMode,
} from '@features/player/player.types'
import { clamp } from '@features/player/utils/audioUtils'

type ContinueOffer = ContinueListeningSnapshot | null

interface PlayerStoreState {
    userId: string
    currentSong: PlayerSong | null
    isPlaying: boolean
    queue: PlayerSong[]
    queueIndex: number
    history: PlaybackHistoryItem[]
    volume: number
    repeatMode: RepeatMode
    isShuffle: boolean
    isFullPlayer: boolean
    isQueueOpen: boolean
    metrics: PlayerMetrics
    catalog: PlayerSong[]
    continueOffer: ContinueOffer
    hasInitialized: boolean
    /** Last playback error, surfaced as a toast by the shell. */
    lastError: { message: string; at: number } | null

    initialize: (catalog?: PlayerSong[], userId?: string) => Promise<void>
    setCatalog: (catalog: PlayerSong[]) => void
    playSong: (song: PlayerSong, queue?: PlayerSong[], index?: number, startAt?: number) => Promise<void>
    pause: () => void
    resume: () => Promise<void>
    togglePlayPause: () => Promise<void>
    /** `auto` is true when the track ended by itself (repeat-one only applies then). */
    next: (auto?: boolean) => Promise<void>
    previous: () => Promise<void>
    seekTo: (time: number) => void
    setVolume: (volume: number) => void
    setRepeatMode: (mode: RepeatMode) => void
    toggleShuffle: () => void
    addToQueue: (song: PlayerSong) => void
    playNext: (song: PlayerSong) => void
    removeFromQueue: (songId: string) => void
    reorderQueue: (fromIndex: number, toIndex: number) => void
    clearQueue: () => void
    toggleFullPlayer: (next?: boolean) => void
    toggleQueuePanel: (next?: boolean) => void
    resumeFromContinueOffer: () => Promise<void>
    dismissContinueOffer: () => void
}

let engineBound = false
let lastSnapshotSave = 0

export const useAdvancedPlayerStore = create<PlayerStoreState>((set, get) => ({
    userId: 'local-user',
    currentSong: null,
    isPlaying: false,
    queue: [],
    queueIndex: 0,
    history: [],
    volume: 0.85,
    repeatMode: 'off',
    isShuffle: false,
    isFullPlayer: false,
    isQueueOpen: false,
    metrics: { currentTime: 0, duration: 0, buffered: 0 },
    catalog: [],
    continueOffer: null,
    hasInitialized: false,
    lastError: null,

    initialize: async (catalog = [], userId = 'local-user') => {
        await playerEngine.initialize()
        set({ catalog, userId })

        if (!engineBound) {
            playerEngine.setCallbacks({
                onMetrics: (metrics) => {
                    set({ metrics })
                    const state = get()
                    maybePersistContinueSnapshot(state, metrics)
                },
                onPlaybackState: (isPlaying) => set({ isPlaying }),
                onTrackEnded: () => {
                    void get().next(true)
                },
                onError: (message) => set({ lastError: { message, at: Date.now() } }),
            })
            playerEngine.bindMediaSession({
                play: () => void get().resume(),
                pause: () => get().pause(),
                next: () => void get().next(),
                previous: () => void get().previous(),
            })
            engineBound = true
        }

        const persistedQueue = playerPersistence.loadQueue()
        const persistedHistory = playerPersistence.loadHistory()
        const continueSnapshot = playerPersistence.loadSnapshot()

        if (persistedQueue && persistedQueue.queue.length > 0) {
            const hydratedQueue = await refreshQueueMedia(persistedQueue.queue)
            const safeIndex = Math.min(
                Math.max(persistedQueue.queueIndex, 0),
                hydratedQueue.length - 1
            )
            set({
                queue: hydratedQueue,
                queueIndex: safeIndex,
                currentSong: hydratedQueue[safeIndex],
            })
            const nextIndex = getNextIndex(hydratedQueue, safeIndex, get().repeatMode, get().isShuffle)
            playerEngine.setUpcomingSong(nextIndex != null ? hydratedQueue[nextIndex] : null)
        }

        if (persistedHistory.length > 0) {
            set({ history: persistedHistory })
        }

        if (continueSnapshot) {
            set({ continueOffer: continueSnapshot })
        }

        playerEngine.setVolume(get().volume)
        set({ hasInitialized: true })
    },

    setCatalog: (catalog) => set({ catalog }),

    playSong: async (song, queue, index, startAt = 0) => {
        const state = get()
        let nextQueue = state.queue
        let nextIndex = state.queueIndex

        if (queue && queue.length > 0) {
            nextQueue = queue
            nextIndex = Math.min(Math.max(index ?? 0, 0), queue.length - 1)
        } else {
            const existingIndex = state.queue.findIndex((item) => item.id === song.id)
            if (existingIndex >= 0) {
                nextIndex = existingIndex
            } else {
                nextQueue = [...state.queue, song]
                nextIndex = nextQueue.length - 1
            }
        }

        // Optimistic UI: show the new track immediately, then resolve fresh media URLs.
        set({
            currentSong: song,
            queue: nextQueue,
            queueIndex: nextIndex,
            isPlaying: true,
            metrics: { currentTime: startAt, duration: song.duration_seconds ?? 0, buffered: 0 },
        })

        const playableSong = await refreshSongMedia(song)
        if (get().currentSong?.id !== song.id) return
        nextQueue = replaceQueueSongAt(get().queue, nextIndex, playableSong)
        set({ currentSong: playableSong, queue: nextQueue })

        await playerEngine.playSong(playableSong, startAt)
        const playedAt = new Date().toISOString()
        const entry: PlaybackHistoryItem = {
            userId: state.userId,
            songId: playableSong.id,
            playedAt,
        }
        const updatedHistory = [entry, ...state.history].slice(0, 200)

        set({ history: updatedHistory })

        playerPersistence.saveQueue({ queue: nextQueue, queueIndex: nextIndex })
        playerPersistence.saveHistory(updatedHistory)
        void playerPersistence.persistHistoryRemote(state.userId, playableSong, playedAt)

        const upcomingIndex = getNextIndex(nextQueue, nextIndex, state.repeatMode, state.isShuffle)
        const upcomingSong = upcomingIndex != null ? nextQueue[upcomingIndex] : null
        playerEngine.setUpcomingSong(upcomingSong)

        if (upcomingSong && upcomingIndex != null) {
            void (async () => {
                const refreshedUpcoming = await refreshSongMedia(upcomingSong)
                playerEngine.setUpcomingSong(refreshedUpcoming)
                const latest = get()
                const latestSong = latest.queue[upcomingIndex]
                if (!latestSong || latestSong.id !== refreshedUpcoming.id) return
                if (
                    latestSong.audio_url === refreshedUpcoming.audio_url &&
                    latestSong.cover_url === refreshedUpcoming.cover_url
                ) {
                    return
                }
                const patchedQueue = replaceQueueSongAt(latest.queue, upcomingIndex, refreshedUpcoming)
                set({ queue: patchedQueue })
                playerPersistence.saveQueue({ queue: patchedQueue, queueIndex: latest.queueIndex })
            })()
        }
    },

    pause: () => {
        playerEngine.pause()
        set({ isPlaying: false })
    },

    resume: async () => {
        const state = get()
        // After a reload the queue is restored but the audio element has no source yet.
        if (!playerEngine.getCurrentSong() && state.currentSong) {
            const snapshot = state.continueOffer
            const startAt = snapshot && snapshot.songId === state.currentSong.id ? snapshot.time : 0
            await state.playSong(state.currentSong, state.queue, state.queueIndex, startAt)
            return
        }
        set({ isPlaying: true })
        await playerEngine.resume()
    },

    togglePlayPause: async () => {
        const state = get()
        if (state.isPlaying) {
            state.pause()
            return
        }
        await state.resume()
    },

    next: async (auto = false) => {
        const state = get()
        const repeatMode = !auto && state.repeatMode === 'one' ? 'all' : state.repeatMode
        const nextIndex = getNextIndex(state.queue, state.queueIndex, repeatMode, state.isShuffle)
        if (nextIndex == null) {
            state.pause()
            return
        }
        const nextSong = state.queue[nextIndex]
        if (!nextSong) return
        await state.playSong(nextSong, state.queue, nextIndex, 0)
    },

    previous: async () => {
        const state = get()

        // Standard behaviour: restart the current track unless we are at its very beginning.
        if (state.metrics.currentTime > 3) {
            playerEngine.seek(0)
            set({ metrics: { ...state.metrics, currentTime: 0 } })
            return
        }

        const prevIndex = getPreviousIndex(state.queue, state.queueIndex)
        if (prevIndex != null && prevIndex !== state.queueIndex) {
            const prevSong = state.queue[prevIndex]
            if (!prevSong) return
            await state.playSong(prevSong, state.queue, prevIndex, 0)
            return
        }

        playerEngine.seek(0)
    },

    seekTo: (time) => {
        playerEngine.seek(time)
    },

    setVolume: (volume) => {
        const safeVolume = clamp(volume, 0, 1)
        playerEngine.setVolume(safeVolume)
        set({ volume: safeVolume })
    },

    setRepeatMode: (mode) => set({ repeatMode: mode }),

    toggleShuffle: () => set((state) => ({ isShuffle: !state.isShuffle })),

    addToQueue: (song) => {
        const state = get()
        const queueState = addSongToQueue({ queue: state.queue, queueIndex: state.queueIndex }, song)
        set({ queue: queueState.queue, queueIndex: queueState.queueIndex })
        playerPersistence.saveQueue(queueState)
    },

    playNext: (song) => {
        const state = get()
        if (!state.currentSong) {
            void state.playSong(song, [song], 0, 0)
            return
        }
        const withoutSong = state.queue.filter((item, index) => item.id !== song.id || index === state.queueIndex)
        const currentIndex = withoutSong.findIndex((item) => item.id === state.currentSong?.id)
        const insertAt = Math.max(currentIndex, 0) + 1
        const queue = [...withoutSong.slice(0, insertAt), song, ...withoutSong.slice(insertAt)]
        const queueIndex = Math.max(currentIndex, 0)
        set({ queue, queueIndex })
        playerPersistence.saveQueue({ queue, queueIndex })
    },

    removeFromQueue: (songId) => {
        const state = get()
        const queueState = removeSongFromQueue({ queue: state.queue, queueIndex: state.queueIndex }, songId)
        const nextCurrent = queueState.queue[queueState.queueIndex] ?? null
        set({
            queue: queueState.queue,
            queueIndex: queueState.queueIndex,
            currentSong: nextCurrent,
        })
        playerPersistence.saveQueue(queueState)
    },

    reorderQueue: (fromIndex, toIndex) => {
        const state = get()
        const queueState = reorderQueue({ queue: state.queue, queueIndex: state.queueIndex }, fromIndex, toIndex)
        set({ queue: queueState.queue, queueIndex: queueState.queueIndex })
        playerPersistence.saveQueue(queueState)
    },

    clearQueue: () => {
        playerEngine.setUpcomingSong(null)
        set({ queue: [], queueIndex: 0, currentSong: null, isPlaying: false })
        playerPersistence.saveQueue({ queue: [], queueIndex: 0 })
    },

    toggleFullPlayer: (next) => set((state) => ({ isFullPlayer: next ?? !state.isFullPlayer })),

    toggleQueuePanel: (next) => set((state) => ({ isQueueOpen: next ?? !state.isQueueOpen })),

    resumeFromContinueOffer: async () => {
        const state = get()
        const snapshot = state.continueOffer
        if (!snapshot || state.queue.length === 0) return

        const byId = state.queue.findIndex((song) => song.id === snapshot.songId)
        const targetIndex = byId >= 0
            ? byId
            : Math.min(Math.max(snapshot.queueIndex, 0), state.queue.length - 1)
        const song = state.queue[targetIndex]
        if (!song) return
        await state.playSong(song, state.queue, targetIndex, snapshot.time)
        playerPersistence.clearSnapshot()
        set({ continueOffer: null })
    },

    dismissContinueOffer: () => {
        playerPersistence.clearSnapshot()
        set({ continueOffer: null })
    },
}))

function maybePersistContinueSnapshot(state: PlayerStoreState, metrics: PlayerMetrics): void {
    if (!state.currentSong || !state.isPlaying || metrics.currentTime < 2) return
    const now = Date.now()
    if (now - lastSnapshotSave < 2500) return
    lastSnapshotSave = now

    playerPersistence.saveSnapshot({
        songId: state.currentSong.id,
        queueIndex: state.queueIndex,
        time: metrics.currentTime,
        savedAt: new Date(now).toISOString(),
    })
}
function replaceQueueSongAt(queue: PlayerSong[], index: number, song: PlayerSong): PlayerSong[] {
    if (index < 0 || index >= queue.length) return queue
    const current = queue[index]
    if (
        current &&
        current.id === song.id &&
        current.audio_url === song.audio_url &&
        current.cover_url === song.cover_url
    ) {
        return queue
    }
    const nextQueue = [...queue]
    nextQueue[index] = song
    return nextQueue
}

async function refreshQueueMedia(queue: PlayerSong[]): Promise<PlayerSong[]> {
    if (queue.length === 0) return queue
    return Promise.all(queue.map((song) => refreshSongMedia(song)))
}

async function refreshSongMedia(song: PlayerSong): Promise<PlayerSong> {
    const [audioUrl, coverUrl] = await Promise.all([
        getStorageUrl(STORAGE_BUCKETS.SONGS, song.audio_url).catch(() => null),
        song.cover_url
            ? getStorageUrl(STORAGE_BUCKETS.COVERS, song.cover_url).catch(() => null)
            : Promise.resolve(null),
    ])

    const nextAudio = audioUrl ?? song.audio_url
    const nextCover = coverUrl ?? song.cover_url
    if (nextAudio === song.audio_url && nextCover === song.cover_url) {
        return song
    }

    return {
        ...song,
        audio_url: nextAudio,
        cover_url: nextCover,
    }
}
