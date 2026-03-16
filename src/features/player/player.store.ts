import { create } from 'zustand'
import { playerEngine } from '@features/player/player.engine'
import { playerPersistence } from '@features/player/player.persistence'
import { getStorageUrl, STORAGE_BUCKETS } from '@lib/supabase/client'
import {
    addSongToQueue,
    buildAutoRadioQueue,
    getNextIndex,
    getPreviousIndex,
    removeSongFromQueue,
    reorderQueue,
} from '@features/player/player.queue'
import type {
    ContinueListeningSnapshot,
    CrossfadeDuration,
    DynamicPalette,
    EqualizerPreset,
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
    crossfade: CrossfadeDuration
    equalizerPreset: EqualizerPreset
    repeatMode: RepeatMode
    isShuffle: boolean
    isFullPlayer: boolean
    isQueueOpen: boolean
    dynamicPalette: DynamicPalette
    metrics: PlayerMetrics
    catalog: PlayerSong[]
    isRadioEnabled: boolean
    radioSeedSong: PlayerSong | null
    continueOffer: ContinueOffer
    hasInitialized: boolean

    initialize: (catalog?: PlayerSong[], userId?: string) => Promise<void>
    setCatalog: (catalog: PlayerSong[]) => void
    playSong: (song: PlayerSong, queue?: PlayerSong[], index?: number, startAt?: number) => Promise<void>
    pause: () => void
    resume: () => Promise<void>
    togglePlayPause: () => Promise<void>
    next: () => Promise<void>
    previous: () => Promise<void>
    seekTo: (time: number) => void
    setVolume: (volume: number) => void
    setCrossfade: (seconds: CrossfadeDuration) => void
    setEqualizer: (preset: EqualizerPreset) => void
    setRepeatMode: (mode: RepeatMode) => void
    toggleShuffle: () => void
    addToQueue: (song: PlayerSong) => void
    removeFromQueue: (songId: string) => void
    reorderQueue: (fromIndex: number, toIndex: number) => void
    clearQueue: () => void
    toggleFullPlayer: (next?: boolean) => void
    toggleQueuePanel: (next?: boolean) => void
    setDynamicPalette: (palette: DynamicPalette) => void
    startRadioFromSong: (seed?: PlayerSong) => void
    stopRadio: () => void
    resumeFromContinueOffer: () => Promise<void>
    dismissContinueOffer: () => void
}

const DEFAULT_PALETTE: DynamicPalette = {
    dominant: 'rgb(28,31,45)',
    accent: 'rgb(78,97,180)',
    gradient: 'linear-gradient(135deg, rgba(28,31,45,0.94), rgba(14,16,24,0.98) 64%)',
    blurOverlay: 'radial-gradient(circle at 18% 12%, rgba(78,97,180,0.25), rgba(11,12,18,0) 62%)',
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
    crossfade: 4,
    equalizerPreset: 'flat',
    repeatMode: 'off',
    isShuffle: false,
    isFullPlayer: false,
    isQueueOpen: false,
    dynamicPalette: DEFAULT_PALETTE,
    metrics: { currentTime: 0, duration: 0, buffered: 0 },
    catalog: [],
    isRadioEnabled: false,
    radioSeedSong: null,
    continueOffer: null,
    hasInitialized: false,

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
                    void get().next()
                },
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
        playerEngine.setCrossfade(get().crossfade)
        playerEngine.setEqualizerPreset(get().equalizerPreset)
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

        const playableSong = await refreshSongMedia(song)
        nextQueue = replaceQueueSongAt(nextQueue, nextIndex, playableSong)

        await playerEngine.playSong(playableSong, startAt)
        const playedAt = new Date().toISOString()
        const entry: PlaybackHistoryItem = {
            userId: state.userId,
            songId: playableSong.id,
            playedAt,
        }
        const updatedHistory = [entry, ...state.history].slice(0, 200)

        set({
            currentSong: playableSong,
            queue: nextQueue,
            queueIndex: nextIndex,
            isPlaying: true,
            history: updatedHistory,
        })

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
        await playerEngine.resume()
        set({ isPlaying: true })
    },

    togglePlayPause: async () => {
        const state = get()
        if (state.isPlaying) {
            state.pause()
            return
        }
        await state.resume()
    },

    next: async () => {
        const state = get()
        const nextIndex = getNextIndex(state.queue, state.queueIndex, state.repeatMode, state.isShuffle)
        if (nextIndex == null) {
            state.pause()
            return
        }
        const nextSong = state.queue[nextIndex]
        if (!nextSong) return
        await state.playSong(nextSong, state.queue, nextIndex, 0)

        if (state.isRadioEnabled && state.queue.length - nextIndex <= 3) {
            state.startRadioFromSong(state.radioSeedSong ?? nextSong)
        }
    },

    previous: async () => {
        const state = get()
        const prevIndex = getPreviousIndex(state.queue, state.queueIndex)

        if (prevIndex != null && prevIndex !== state.queueIndex) {
            const prevSong = state.queue[prevIndex]
            if (!prevSong) return
            await state.playSong(prevSong, state.queue, prevIndex, 0)
            return
        }

        if (state.metrics.currentTime > 3) {
            playerEngine.seek(0)
            set({ metrics: { ...state.metrics, currentTime: 0 } })
            return
        }
    },

    seekTo: (time) => {
        playerEngine.seek(time)
    },

    setVolume: (volume) => {
        const safeVolume = clamp(volume, 0, 1)
        playerEngine.setVolume(safeVolume)
        set({ volume: safeVolume })
    },

    setCrossfade: (seconds) => {
        playerEngine.setCrossfade(seconds)
        set({ crossfade: seconds })
    },

    setEqualizer: (preset) => {
        playerEngine.setEqualizerPreset(preset)
        set({ equalizerPreset: preset })
    },

    setRepeatMode: (mode) => set({ repeatMode: mode }),

    toggleShuffle: () => set((state) => ({ isShuffle: !state.isShuffle })),

    addToQueue: (song) => {
        const state = get()
        const queueState = addSongToQueue({ queue: state.queue, queueIndex: state.queueIndex }, song)
        set({ queue: queueState.queue, queueIndex: queueState.queueIndex })
        playerPersistence.saveQueue(queueState)
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

    setDynamicPalette: (palette) => set({ dynamicPalette: palette }),

    startRadioFromSong: (seed) => {
        const state = get()
        const base = seed ?? state.currentSong
        if (!base || state.catalog.length === 0) return

        const generated = buildAutoRadioQueue(base, state.catalog, 20)
        if (generated.length === 0) return

        const deduped = generated.filter((item) => !state.queue.some((existing) => existing.id === item.id))
        if (deduped.length === 0) return

        const queue = [...state.queue, ...deduped]
        set({
            queue,
            isRadioEnabled: true,
            radioSeedSong: base,
        })
        playerPersistence.saveQueue({ queue, queueIndex: state.queueIndex })
    },

    stopRadio: () => set({ isRadioEnabled: false, radioSeedSong: null }),

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
