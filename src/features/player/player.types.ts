import type { Song } from '@/types'

export type RepeatMode = 'off' | 'all' | 'one'

export interface PlayerSong extends Song {
    tempo_bpm?: number | null
    energy?: number | null // 0..1
    tags?: string[]
    loudness_lufs?: number | null
}

export interface PlaybackHistoryItem {
    userId: string
    songId: string
    playedAt: string
}

export interface ContinueListeningSnapshot {
    songId: string
    time: number
    queueIndex: number
    savedAt: string
}

export interface QueueState {
    queue: PlayerSong[]
    queueIndex: number
}

export interface PlayerMetrics {
    currentTime: number
    duration: number
    buffered: number
}
