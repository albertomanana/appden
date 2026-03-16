import { extractAudioDuration } from '@lib/utils'
import type { Song, SongLyricLine } from '@/types'

type AsrSegment = {
    start: number
    end?: number
    text: string
}

type AsrPayload = {
    text?: string
    language?: string
    confidence?: number
    segments?: AsrSegment[]
}

export type AsrTranscript = {
    rawText: string
    language: string
    confidence: number | null
    lines: SongLyricLine[]
}

const ASR_ENDPOINT = import.meta.env.VITE_ASR_TRANSCRIBE_ENDPOINT as string | undefined

export const asrService = {
    async transcribeOnUpload(file: File, song: Pick<Song, 'id' | 'title' | 'artist_name'>): Promise<AsrTranscript> {
        const remote = await requestAsrRemote(file, song.id)
        if (remote) {
            return {
                rawText: remote.rawText,
                language: remote.language,
                confidence: remote.confidence,
                lines: remote.lines,
            }
        }

        return buildLocalAsrFallback(file, song.id, song.title, song.artist_name)
    },
}

async function requestAsrRemote(file: File, songId: string): Promise<AsrTranscript | null> {
    if (!ASR_ENDPOINT) return null

    try {
        const body = new FormData()
        body.append('audio', file)
        body.append('songId', songId)

        const response = await fetch(ASR_ENDPOINT, {
            method: 'POST',
            body,
        })

        if (!response.ok) return null
        const payload = (await response.json()) as AsrPayload
        if ((!payload.text || payload.text.trim().length === 0) && (!payload.segments || payload.segments.length === 0)) {
            return null
        }

        const lines = normalizeSegments(songId, payload)
        const rawText = payload.text?.trim() || lines.map(toLrcLine).join('\n')
        return {
            rawText,
            language: payload.language ?? 'es',
            confidence: payload.confidence ?? null,
            lines,
        }
    } catch {
        return null
    }
}

async function buildLocalAsrFallback(
    file: File,
    songId: string,
    title: string,
    artist: string
): Promise<AsrTranscript> {
    let duration = 140
    try {
        duration = Math.max(40, Math.round(await extractAudioDuration(file)))
    } catch {
        // Keep fallback duration.
    }

    const seedLines = [
        `${title}`,
        `${artist}`,
        'Verso 1',
        'Verso 1',
        'Pre-coro',
        'Estribillo',
        'Estribillo',
        'Verso 2',
        'Pre-coro',
        'Estribillo',
        'Puente',
        'Outro',
    ]

    const step = Math.max(3, Math.floor(duration / seedLines.length))
    const lines: SongLyricLine[] = seedLines.map((content, index) => {
        const start = index * step
        const end = index === seedLines.length - 1 ? duration : (index + 1) * step - 0.1
        return {
            id: `${songId}-asr-${index}`,
            song_id: songId,
            line_index: index,
            content,
            start_seconds: start,
            end_seconds: end,
        }
    })

    return {
        rawText: lines.map(toLrcLine).join('\n'),
        language: 'es',
        confidence: 0.52,
        lines,
    }
}

function normalizeSegments(songId: string, payload: AsrPayload): SongLyricLine[] {
    const segments = payload.segments ?? []
    if (segments.length === 0) {
        const textLines = (payload.text ?? '')
            .split('\n')
            .map((line) => line.trim())
            .filter(Boolean)

        return textLines.map((content, index) => ({
            id: `${songId}-asr-line-${index}`,
            song_id: songId,
            line_index: index,
            content,
            start_seconds: index * 4,
            end_seconds: (index + 1) * 4 - 0.1,
        }))
    }

    return segments.map((segment, index) => {
        const start = Number.isFinite(segment.start) ? Math.max(0, segment.start) : index * 4
        const end = Number.isFinite(segment.end) ? Math.max(start, segment.end as number) : start + 4
        return {
            id: `${songId}-asr-segment-${index}`,
            song_id: songId,
            line_index: index,
            content: segment.text.trim(),
            start_seconds: start,
            end_seconds: end,
        }
    })
}

function toLrcLine(line: SongLyricLine): string {
    const time = line.start_seconds ?? 0
    const minutes = Math.floor(time / 60)
    const seconds = Math.floor(time % 60)
    const hundredths = Math.floor((time % 1) * 100)
    return `[${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${String(hundredths).padStart(2, '0')}] ${line.content}`
}
