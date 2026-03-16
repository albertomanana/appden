import type { PlayerSong } from '@features/player/player.types'

export function clamp(value: number, min: number, max: number): number {
    return Math.min(max, Math.max(min, value))
}

export function formatTime(seconds: number): string {
    if (!Number.isFinite(seconds) || seconds < 0) return '0:00'
    const total = Math.floor(seconds)
    const mins = Math.floor(total / 60)
    const secs = total % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
}

export function dbToGain(db: number): number {
    return Math.pow(10, db / 20)
}

export function gainToDb(gain: number): number {
    if (gain <= 0) return -100
    return 20 * Math.log10(gain)
}

export function calculateNormalizedGain(song: PlayerSong, targetLUFS = -14): number {
    if (song.loudness_lufs == null) return 1
    const diffDb = targetLUFS - song.loudness_lufs
    return clamp(dbToGain(diffDb), 0.35, 2.2)
}

export function getBufferedRatio(audio: HTMLAudioElement): number {
    try {
        const duration = audio.duration
        if (!Number.isFinite(duration) || duration <= 0 || audio.buffered.length === 0) return 0
        const end = audio.buffered.end(audio.buffered.length - 1)
        return clamp(end / duration, 0, 1)
    } catch {
        return 0
    }
}

type DerivedSongFeatures = {
    tempo_bpm: number
    energy: number
    tags: string[]
}

export function deriveSongFeatures(song: PlayerSong): DerivedSongFeatures {
    const duration = song.duration_seconds ?? 180
    const seed = hashString(song.id + song.title + song.artist_name)
    const tempo_bpm = song.tempo_bpm ?? 80 + (seed % 90)
    const energy = song.energy ?? clamp((duration % 240) / 240 + (seed % 30) / 100, 0.15, 0.95)
    const tags = song.tags ?? inferTags(song.title, song.artist_name)
    return { tempo_bpm, energy, tags }
}

export function scoreSongSimilarity(base: PlayerSong, candidate: PlayerSong): number {
    if (base.id === candidate.id) return -1
    const baseFeatures = deriveSongFeatures(base)
    const candidateFeatures = deriveSongFeatures(candidate)

    const sameArtist = base.artist_name.toLowerCase() === candidate.artist_name.toLowerCase() ? 0.35 : 0
    const tempoDiff = Math.abs(baseFeatures.tempo_bpm - candidateFeatures.tempo_bpm)
    const tempoScore = clamp(1 - tempoDiff / 80, 0, 1) * 0.3
    const energyDiff = Math.abs(baseFeatures.energy - candidateFeatures.energy)
    const energyScore = clamp(1 - energyDiff, 0, 1) * 0.2
    const tagScore = tagOverlap(baseFeatures.tags, candidateFeatures.tags) * 0.15

    return sameArtist + tempoScore + energyScore + tagScore
}

function inferTags(title: string, artist: string): string[] {
    const src = `${title} ${artist}`.toLowerCase()
    const tags: string[] = []
    if (src.includes('love') || src.includes('heart')) tags.push('romantic')
    if (src.includes('night') || src.includes('moon')) tags.push('chill')
    if (src.includes('party') || src.includes('club')) tags.push('dance')
    if (src.includes('sun') || src.includes('summer')) tags.push('happy')
    if (tags.length === 0) tags.push('pop')
    return tags
}

function tagOverlap(a: string[], b: string[]): number {
    if (a.length === 0 || b.length === 0) return 0
    const set = new Set(a.map((v) => v.toLowerCase()))
    let overlap = 0
    for (const tag of b) {
        if (set.has(tag.toLowerCase())) overlap += 1
    }
    return clamp(overlap / Math.max(a.length, b.length), 0, 1)
}

function hashString(value: string): number {
    let hash = 0
    for (let i = 0; i < value.length; i += 1) {
        hash = (hash << 5) - hash + value.charCodeAt(i)
        hash |= 0
    }
    return Math.abs(hash)
}
