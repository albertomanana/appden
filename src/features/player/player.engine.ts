import type { PlayerMetrics, PlayerSong } from '@features/player/player.types'
import { clamp, getBufferedRatio } from '@features/player/utils/audioUtils'

type EngineCallbacks = {
    onMetrics?: (metrics: PlayerMetrics) => void
    onPlaybackState?: (isPlaying: boolean) => void
    onTrackEnded?: () => void
    onError?: (message: string) => void
}

type MediaSessionHandlers = {
    play: () => void
    pause: () => void
    next: () => void
    previous: () => void
}

// 0.1s of silence, used to "unlock" the shared audio element on iOS during the first user gesture.
const SILENT_WAV =
    'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA'

/**
 * Single shared HTMLAudioElement. Metrics are pushed from media events
 * (timeupdate/durationchange/progress) instead of a 60fps loop, which keeps
 * React re-renders and battery usage low on phones.
 */
export class AdvancedPlayerEngine {
    private readonly audio: HTMLAudioElement
    private readonly callbacks: EngineCallbacks = {}
    private currentSong: PlayerSong | null = null
    private initialized = false
    private unlocked = false
    /** True while the silent unlock clip owns the element; its events must not reach the store. */
    private unlocking = false
    private playToken = 0

    constructor() {
        this.audio = typeof Audio !== 'undefined' ? new Audio() : ({} as HTMLAudioElement)
        if (typeof Audio === 'undefined') return
        this.audio.preload = 'auto'
        this.audio.setAttribute('playsinline', 'true')
    }

    async initialize(): Promise<void> {
        if (this.initialized || typeof window === 'undefined') return

        this.audio.addEventListener('play', this.handlePlay)
        this.audio.addEventListener('playing', this.handlePlay)
        this.audio.addEventListener('pause', this.handlePause)
        this.audio.addEventListener('ended', this.handleEnded)
        this.audio.addEventListener('error', this.handleError)
        for (const event of ['timeupdate', 'durationchange', 'loadedmetadata', 'progress', 'seeked', 'emptied']) {
            this.audio.addEventListener(event, this.emitMetrics)
        }

        // iOS only allows programmatic playback on an element that was started inside a user gesture.
        const unlock = () => {
            this.unlockAudio()
            window.removeEventListener('pointerdown', unlock, true)
            window.removeEventListener('keydown', unlock, true)
        }
        window.addEventListener('pointerdown', unlock, true)
        window.addEventListener('keydown', unlock, true)

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
        const token = ++this.playToken
        this.unlocking = false
        this.currentSong = song
        this.updateMediaSessionMetadata(song)

        const sourceChanged = this.audio.getAttribute('src') !== song.audio_url
        if (sourceChanged) {
            this.audio.src = song.audio_url
            this.audio.load()
        }

        if (startAt > 0) {
            this.seekWhenReady(startAt)
        } else if (sourceChanged) {
            try {
                this.audio.currentTime = 0
            } catch {
                // Some browsers throw before metadata is available.
            }
        }

        // play() waits for data by itself; calling it immediately keeps the user-gesture chain on mobile.
        await this.safePlay(token)
    }

    pause(): void {
        this.audio.pause()
    }

    async resume(): Promise<void> {
        await this.initialize()
        if (!this.audio.getAttribute('src')) return
        await this.safePlay(this.playToken)
    }

    seek(time: number): void {
        const duration = this.audio.duration
        if (!Number.isFinite(duration) || duration <= 0) return
        this.audio.currentTime = clamp(time, 0, duration)
        this.emitMetrics()
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

    /** Wires lock-screen / headset controls through the Media Session API. */
    bindMediaSession(handlers: MediaSessionHandlers): void {
        if (typeof navigator === 'undefined' || !('mediaSession' in navigator)) return
        const session = navigator.mediaSession
        const set = (action: MediaSessionAction, handler: MediaSessionActionHandler | null) => {
            try {
                session.setActionHandler(action, handler)
            } catch {
                // Unsupported action on this browser.
            }
        }
        set('play', () => handlers.play())
        set('pause', () => handlers.pause())
        set('nexttrack', () => handlers.next())
        set('previoustrack', () => handlers.previous())
        set('seekto', (details) => {
            if (typeof details.seekTime === 'number') this.seek(details.seekTime)
        })
        set('seekbackward', (details) => this.seek(this.audio.currentTime - (details.seekOffset ?? 10)))
        set('seekforward', (details) => this.seek(this.audio.currentTime + (details.seekOffset ?? 10)))
    }

    destroy(): void {
        this.audio.pause()
        this.audio.removeAttribute('src')
        this.audio.load()
        this.audio.removeEventListener('play', this.handlePlay)
        this.audio.removeEventListener('playing', this.handlePlay)
        this.audio.removeEventListener('pause', this.handlePause)
        this.audio.removeEventListener('ended', this.handleEnded)
        this.audio.removeEventListener('error', this.handleError)
        this.currentSong = null
        this.initialized = false
    }

    private unlockAudio(): void {
        if (this.unlocked || this.audio.getAttribute('src')) {
            this.unlocked = true
            return
        }
        this.unlocked = true
        this.unlocking = true
        const token = this.playToken
        const previousVolume = this.audio.volume
        this.audio.src = SILENT_WAV
        this.audio.volume = 0
        void this.audio
            .play()
            .then(() => {
                this.audio.pause()
            })
            .catch(() => undefined)
            .finally(() => {
                this.audio.volume = previousVolume
                // Only clean up if no real track started meanwhile.
                if (this.unlocking && token === this.playToken) {
                    this.audio.removeAttribute('src')
                    this.audio.load()
                }
                this.unlocking = false
            })
    }

    private seekWhenReady(time: number): void {
        const apply = () => {
            const duration = Number.isFinite(this.audio.duration) ? this.audio.duration : time
            this.audio.currentTime = clamp(time, 0, duration)
        }
        if (this.audio.readyState >= 1) {
            apply()
            return
        }
        this.audio.addEventListener('loadedmetadata', apply, { once: true })
    }

    private async safePlay(token: number): Promise<void> {
        try {
            await this.audio.play()
        } catch (error) {
            // A newer play request superseded this one (AbortError) - nothing to report.
            if (token !== this.playToken) return
            const name = error instanceof DOMException ? error.name : ''
            if (name === 'AbortError') return
            this.callbacks.onPlaybackState?.(false)
            if (name === 'NotAllowedError') {
                this.callbacks.onError?.('Toca reproducir para empezar a escuchar.')
                return
            }
            // NotSupportedError means the source failed to load: the media 'error' event already reported it.
            if (name === 'NotSupportedError') return
            this.callbacks.onError?.('No se pudo reproducir esta canción.')
        }
    }

    private updateMediaSessionMetadata(song: PlayerSong): void {
        if (typeof navigator === 'undefined' || !('mediaSession' in navigator) || typeof MediaMetadata === 'undefined') return
        try {
            navigator.mediaSession.metadata = new MediaMetadata({
                title: song.title,
                artist: song.artist_name,
                album: song.album_name ?? 'The Appden',
                artwork: song.cover_url
                    ? [{ src: song.cover_url, sizes: '512x512' }]
                    : [{ src: '/icons/icon-512x512.png', sizes: '512x512', type: 'image/png' }],
            })
        } catch {
            // Ignore metadata errors (e.g. invalid artwork URL).
        }
    }

    private readonly emitMetrics = () => {
        if (this.unlocking || !this.currentSong) return
        this.callbacks.onMetrics?.(this.getCurrentMetrics())
        if (typeof navigator !== 'undefined' && 'mediaSession' in navigator && 'setPositionState' in navigator.mediaSession) {
            const { currentTime, duration } = this.getCurrentMetrics()
            if (duration > 0 && currentTime <= duration) {
                try {
                    navigator.mediaSession.setPositionState({ duration, position: currentTime, playbackRate: this.audio.playbackRate || 1 })
                } catch {
                    // Ignore invalid position states.
                }
            }
        }
    }

    private readonly handlePlay = () => {
        if (this.unlocking) return
        this.callbacks.onPlaybackState?.(true)
        if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'playing'
    }

    private readonly handlePause = () => {
        if (this.unlocking) return
        this.callbacks.onPlaybackState?.(false)
        if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'paused'
    }

    private readonly handleEnded = () => {
        if (this.unlocking || !this.currentSong) return
        this.callbacks.onTrackEnded?.()
    }

    private readonly handleError = () => {
        if (this.unlocking || !this.currentSong || !this.audio.getAttribute('src')) return
        this.callbacks.onPlaybackState?.(false)
        this.callbacks.onError?.('No se pudo cargar el audio. Puede que el enlace haya caducado.')
    }
}

export const playerEngine = new AdvancedPlayerEngine()
