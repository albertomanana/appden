import type { PlayerMetrics, PlayerSong } from '@features/player/player.types'
import { clamp, getBufferedRatio } from '@features/player/utils/audioUtils'

type EngineCallbacks = {
    onMetrics?: (metrics: PlayerMetrics) => void
    onPlaybackState?: (isPlaying: boolean) => void
    onTrackEnded?: () => void
}

export class AdvancedPlayerEngine {
    private readonly audio = new Audio()
    private readonly callbacks: EngineCallbacks = {}
    private currentSong: PlayerSong | null = null
    private rafId: number | null = null
    private initialized = false

    constructor() {
        this.audio.preload = 'auto'
        this.audio.crossOrigin = 'anonymous'
    }

    async initialize(): Promise<void> {
        if (this.initialized) return

        this.audio.addEventListener('play', this.handlePlay)
        this.audio.addEventListener('pause', this.handlePause)
        this.audio.addEventListener('ended', this.handleEnded)
        this.startMetricsLoop()
        this.initialized = true
    }

    setCallbacks(callbacks: EngineCallbacks): void {
        Object.assign(this.callbacks, callbacks)
    }

    setVolume(volume: number): void {
        this.audio.volume = clamp(volume, 0, 1)
    }

    async playSong(song: PlayerSong, startAt = 0): Promise<void> {
        await this.initialize()
        this.currentSong = song

        const sourceChanged = this.audio.src !== song.audio_url
        if (sourceChanged) {
            this.audio.src = song.audio_url
            this.audio.load()
            await waitForCanPlay(this.audio, 4500)
        }

        if (startAt > 0) {
            const duration = Number.isFinite(this.audio.duration) ? this.audio.duration : Number.MAX_SAFE_INTEGER
            this.audio.currentTime = clamp(startAt, 0, duration)
        } else if (sourceChanged) {
            this.audio.currentTime = 0
        }

        await safePlay(this.audio)
    }

    pause(): void {
        this.audio.pause()
    }

    async resume(): Promise<void> {
        await this.initialize()
        await safePlay(this.audio)
    }

    seek(time: number): void {
        const duration = this.audio.duration
        if (!Number.isFinite(duration) || duration <= 0) return
        this.audio.currentTime = clamp(time, 0, duration)
    }

    getCurrentSong(): PlayerSong | null {
        return this.currentSong
    }

    setUpcomingSong(_song: PlayerSong | null): void {
        // Simplified player: no preload queue deck.
    }

    getCurrentMetrics(): PlayerMetrics {
        return {
            currentTime: this.audio.currentTime || 0,
            duration: Number.isFinite(this.audio.duration) ? this.audio.duration : 0,
            buffered: getBufferedRatio(this.audio),
        }
    }

    destroy(): void {
        if (this.rafId != null) {
            cancelAnimationFrame(this.rafId)
            this.rafId = null
        }

        this.audio.pause()
        this.audio.src = ''
        this.audio.removeEventListener('play', this.handlePlay)
        this.audio.removeEventListener('pause', this.handlePause)
        this.audio.removeEventListener('ended', this.handleEnded)
        this.currentSong = null
        this.initialized = false
    }

    private readonly handlePlay = () => {
        this.callbacks.onPlaybackState?.(true)
    }

    private readonly handlePause = () => {
        this.callbacks.onPlaybackState?.(false)
    }

    private readonly handleEnded = () => {
        this.callbacks.onTrackEnded?.()
    }

    private startMetricsLoop(): void {
        const loop = () => {
            this.callbacks.onMetrics?.(this.getCurrentMetrics())
            this.rafId = window.requestAnimationFrame(loop)
        }

        this.rafId = window.requestAnimationFrame(loop)
    }
}

async function waitForCanPlay(audio: HTMLAudioElement, timeoutMs: number): Promise<void> {
    if (audio.readyState >= 2) return

    await new Promise<void>((resolve) => {
        let done = false
        const finish = () => {
            if (done) return
            done = true
            audio.removeEventListener('loadedmetadata', finish)
            audio.removeEventListener('canplay', finish)
            audio.removeEventListener('canplaythrough', finish)
            resolve()
        }

        audio.addEventListener('loadedmetadata', finish, { once: true })
        audio.addEventListener('canplay', finish, { once: true })
        audio.addEventListener('canplaythrough', finish, { once: true })
        window.setTimeout(finish, timeoutMs)
    })
}

async function safePlay(audio: HTMLAudioElement): Promise<void> {
    try {
        await audio.play()
    } catch {
        // Browser autoplay restrictions are handled by UI state.
    }
}

export const playerEngine = new AdvancedPlayerEngine()
