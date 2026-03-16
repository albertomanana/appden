import type {
    ContinueListeningSnapshot,
    PlaybackHistoryItem,
    PlayerPreferences,
    PlayerSong,
    QueueState,
} from '@features/player/player.types'

const STORAGE_KEYS = {
    queue: 'appden:player:queue',
    history: 'appden:player:history',
    snapshot: 'appden:player:snapshot',
    preferences: 'appden:player:preferences',
} as const

const MAX_HISTORY = 200

export const playerPersistence = {
    saveQueue(queueState: QueueState): void {
        write(STORAGE_KEYS.queue, queueState)
    },

    loadQueue(): QueueState | null {
        return read<QueueState>(STORAGE_KEYS.queue)
    },

    saveHistory(history: PlaybackHistoryItem[]): void {
        const sliced = history.slice(0, MAX_HISTORY)
        write(STORAGE_KEYS.history, sliced)
    },

    loadHistory(): PlaybackHistoryItem[] {
        return read<PlaybackHistoryItem[]>(STORAGE_KEYS.history) ?? []
    },

    saveSnapshot(snapshot: ContinueListeningSnapshot): void {
        write(STORAGE_KEYS.snapshot, snapshot)
    },

    loadSnapshot(): ContinueListeningSnapshot | null {
        return read<ContinueListeningSnapshot>(STORAGE_KEYS.snapshot)
    },

    clearSnapshot(): void {
        remove(STORAGE_KEYS.snapshot)
    },

    savePreferences(preferences: PlayerPreferences): void {
        write(STORAGE_KEYS.preferences, preferences)
    },

    loadPreferences(): PlayerPreferences | null {
        return read<PlayerPreferences>(STORAGE_KEYS.preferences)
    },

    async persistHistoryRemote(
        userId: string,
        song: PlayerSong,
        playedAt: string
    ): Promise<void> {
        // Backend simulation.
        await new Promise((resolve) => setTimeout(resolve, 60))
        const simulatedPayload = { userId, songId: song.id, playedAt }
        void simulatedPayload
    },
}

function write<T>(key: string, value: T): void {
    if (typeof window === 'undefined') return
    try {
        window.localStorage.setItem(key, JSON.stringify(value))
    } catch {
        // Ignore quota/storage restrictions.
    }
}

function read<T>(key: string): T | null {
    if (typeof window === 'undefined') return null
    try {
        const raw = window.localStorage.getItem(key)
        if (!raw) return null
        return JSON.parse(raw) as T
    } catch {
        return null
    }
}

function remove(key: string): void {
    if (typeof window === 'undefined') return
    try {
        window.localStorage.removeItem(key)
    } catch {
        // Ignore.
    }
}
