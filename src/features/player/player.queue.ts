import type { PlayerSong, QueueState, RepeatMode } from '@features/player/player.types'
import { scoreSongSimilarity } from '@features/player/utils/audioUtils'

export function addSongToQueue(queueState: QueueState, song: PlayerSong): QueueState {
    return {
        ...queueState,
        queue: [...queueState.queue, song],
    }
}

export function removeSongFromQueue(queueState: QueueState, songId: string): QueueState {
    const filtered = queueState.queue.filter((song) => song.id !== songId)
    if (filtered.length === queueState.queue.length) return queueState

    const removedIndex = queueState.queue.findIndex((song) => song.id === songId)
    const nextIndex = removedIndex < queueState.queueIndex
        ? Math.max(queueState.queueIndex - 1, 0)
        : Math.min(queueState.queueIndex, Math.max(filtered.length - 1, 0))

    return {
        queue: filtered,
        queueIndex: filtered.length > 0 ? nextIndex : 0,
    }
}

export function reorderQueue(queueState: QueueState, fromIndex: number, toIndex: number): QueueState {
    if (fromIndex === toIndex) return queueState
    if (fromIndex < 0 || toIndex < 0 || fromIndex >= queueState.queue.length || toIndex >= queueState.queue.length) {
        return queueState
    }

    const updated = [...queueState.queue]
    const [moved] = updated.splice(fromIndex, 1)
    updated.splice(toIndex, 0, moved)

    let queueIndex = queueState.queueIndex
    if (queueState.queueIndex === fromIndex) {
        queueIndex = toIndex
    } else if (fromIndex < queueState.queueIndex && toIndex >= queueState.queueIndex) {
        queueIndex -= 1
    } else if (fromIndex > queueState.queueIndex && toIndex <= queueState.queueIndex) {
        queueIndex += 1
    }

    return { queue: updated, queueIndex }
}

export function getNextIndex(
    queue: PlayerSong[],
    queueIndex: number,
    repeatMode: RepeatMode,
    isShuffle: boolean
): number | null {
    if (queue.length === 0) return null
    if (repeatMode === 'one') return queueIndex

    if (isShuffle && queue.length > 1) {
        let next = queueIndex
        while (next === queueIndex) {
            next = Math.floor(Math.random() * queue.length)
        }
        return next
    }

    if (queueIndex < queue.length - 1) return queueIndex + 1
    if (repeatMode === 'all') return 0
    return null
}

export function getPreviousIndex(queue: PlayerSong[], queueIndex: number): number | null {
    if (queue.length === 0) return null
    if (queueIndex <= 0) return 0
    return queueIndex - 1
}

export function buildAutoRadioQueue(
    seedSong: PlayerSong,
    catalog: PlayerSong[],
    desiredSize = 25
): PlayerSong[] {
    const scored = catalog
        .map((song) => ({ song, score: scoreSongSimilarity(seedSong, song) }))
        .filter((entry) => entry.score > 0)
        .sort((a, b) => b.score - a.score)
        .map((entry) => entry.song)

    if (scored.length === 0) return []
    if (scored.length >= desiredSize) return scored.slice(0, desiredSize)

    const looped: PlayerSong[] = []
    let i = 0
    while (looped.length < desiredSize) {
        looped.push(scored[i % scored.length])
        i += 1
    }
    return looped
}
