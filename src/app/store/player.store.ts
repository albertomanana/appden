import type { Song } from '@/types'
import { useAdvancedPlayerStore } from '@features/player/player.store'
import type { PlayerSong } from '@features/player/player.types'

export type RepeatMode = 'none' | 'all' | 'one'

interface LegacyPlayerState {
    currentSong: Song | null
    queue: Song[]
    queueIndex: number
    isPlaying: boolean
    currentTime: number
    duration: number
    volume: number
    isMuted: boolean
    repeatMode: RepeatMode
    isShuffle: boolean
    audioRef: HTMLAudioElement | null

    setCurrentSong: (song: Song, queue?: Song[], queueIndex?: number) => void
    setQueue: (songs: Song[], startIndex?: number) => void
    togglePlay: () => void
    setPlaying: (playing: boolean) => void
    setCurrentTime: (time: number) => void
    setDuration: (_duration: number) => void
    setVolume: (volume: number) => void
    toggleMute: () => void
    nextTrack: () => void
    prevTrack: () => void
    toggleRepeat: () => void
    toggleShuffle: () => void
    setAudioRef: (_ref: HTMLAudioElement | null) => void
    clearPlayer: () => void
}

type AdvancedPlayerState = ReturnType<typeof useAdvancedPlayerStore.getState>

const legacyActions: Pick<
    LegacyPlayerState,
    | 'setCurrentSong'
    | 'setQueue'
    | 'togglePlay'
    | 'setPlaying'
    | 'setCurrentTime'
    | 'setDuration'
    | 'setVolume'
    | 'toggleMute'
    | 'nextTrack'
    | 'prevTrack'
    | 'toggleRepeat'
    | 'toggleShuffle'
    | 'setAudioRef'
    | 'clearPlayer'
> = {
    setCurrentSong: (song, queue = [], queueIndex = 0) => {
        const player = useAdvancedPlayerStore.getState()
        const castQueue = queue as PlayerSong[]
        if (castQueue.length > 0) {
            player.setCatalog(castQueue)
        }
        void player.playSong(song as PlayerSong, castQueue.length > 0 ? castQueue : undefined, queueIndex, 0)
    },

    setQueue: (songs, startIndex = 0) => {
        const player = useAdvancedPlayerStore.getState()
        const castQueue = songs as PlayerSong[]
        const selected = castQueue[startIndex]
        if (!selected) return
        player.setCatalog(castQueue)
        void player.playSong(selected, castQueue, startIndex, 0)
    },

    togglePlay: () => {
        const player = useAdvancedPlayerStore.getState()
        void player.togglePlayPause()
    },

    setPlaying: (playing) => {
        const player = useAdvancedPlayerStore.getState()
        if (playing) {
            void player.resume()
            return
        }
        player.pause()
    },

    setCurrentTime: (time) => {
        const player = useAdvancedPlayerStore.getState()
        player.seekTo(time)
    },

    setDuration: () => {
        // Duration is managed by engine metrics.
    },

    setVolume: (volume) => {
        const player = useAdvancedPlayerStore.getState()
        player.setVolume(volume)
    },

    toggleMute: () => {
        const player = useAdvancedPlayerStore.getState()
        player.setVolume(player.volume === 0 ? 0.8 : 0)
    },

    nextTrack: () => {
        const player = useAdvancedPlayerStore.getState()
        void player.next()
    },

    prevTrack: () => {
        const player = useAdvancedPlayerStore.getState()
        void player.previous()
    },

    toggleRepeat: () => {
        const player = useAdvancedPlayerStore.getState()
        const current = mapModernRepeatToLegacy(player.repeatMode)
        const next: RepeatMode = current === 'none' ? 'all' : current === 'all' ? 'one' : 'none'
        player.setRepeatMode(mapLegacyRepeatToModern(next))
    },

    toggleShuffle: () => {
        const player = useAdvancedPlayerStore.getState()
        player.toggleShuffle()
    },

    setAudioRef: () => {
        // Audio element is fully managed by AdvancedPlayerEngine.
    },

    clearPlayer: () => {
        const player = useAdvancedPlayerStore.getState()
        player.clearQueue()
    },
}

export function usePlayerStore<T = LegacyPlayerState>(
    selector?: (state: LegacyPlayerState) => T
): T {
    return useAdvancedPlayerStore((state) => {
        const legacyState = createLegacyState(state)
        return selector ? selector(legacyState) : (legacyState as unknown as T)
    })
}

function createLegacyState(player: AdvancedPlayerState): LegacyPlayerState {
    return {
        currentSong: player.currentSong,
        queue: player.queue,
        queueIndex: player.queueIndex,
        isPlaying: player.isPlaying,
        currentTime: player.metrics.currentTime,
        duration: player.metrics.duration,
        volume: player.volume,
        isMuted: player.volume === 0,
        repeatMode: mapModernRepeatToLegacy(player.repeatMode),
        isShuffle: player.isShuffle,
        audioRef: null,
        ...legacyActions,
    }
}

function mapModernRepeatToLegacy(mode: 'off' | 'all' | 'one'): RepeatMode {
    if (mode === 'off') return 'none'
    return mode
}

function mapLegacyRepeatToModern(mode: RepeatMode): 'off' | 'all' | 'one' {
    if (mode === 'none') return 'off'
    return mode
}
