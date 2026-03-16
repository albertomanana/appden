import { EqualizerEngine } from '@features/player/player.equalizer'
import type { CrossfadeDuration, EqualizerPreset, PlayerMetrics, PlayerSong } from '@features/player/player.types'
import { calculateNormalizedGain, clamp, getBufferedRatio } from '@features/player/utils/audioUtils'

type Deck = {
    audio: HTMLAudioElement
    source: MediaElementAudioSourceNode
    preGain: GainNode
    fadeGain: GainNode
    song: PlayerSong | null
}

type EngineCallbacks = {
    onMetrics?: (metrics: PlayerMetrics) => void
    onPlaybackState?: (isPlaying: boolean) => void
    onTrackEnded?: () => void
    onCrossfadeStart?: (fromSongId: string, toSongId: string, seconds: number) => void
}

export class AdvancedPlayerEngine {
    private context: AudioContext | null = null
    private readonly callbacks: EngineCallbacks = {}
    private readonly decks: Deck[] = []
    private equalizer: EqualizerEngine | null = null
    private compressor: DynamicsCompressorNode | null = null
    private mixBus: GainNode | null = null
    private masterGain: GainNode | null = null

    private activeDeckIndex = 0
    private preloadedSong: PlayerSong | null = null
    private crossfadeSeconds: CrossfadeDuration = 4
    private rafId: number | null = null
    private isTransitioning = false
    private playRequestId = 0

    async initialize(): Promise<void> {
        if (this.context) return

        this.context = new AudioContext()
        this.mixBus = this.context.createGain()
        this.compressor = this.context.createDynamicsCompressor()
        this.compressor.threshold.value = -19
        this.compressor.knee.value = 12
        this.compressor.ratio.value = 2.2
        this.compressor.attack.value = 0.005
        this.compressor.release.value = 0.22

        this.equalizer = new EqualizerEngine(this.context)
        this.masterGain = this.context.createGain()
        this.masterGain.gain.value = 0.8

        this.mixBus.connect(this.compressor)
        this.compressor.connect(this.equalizer.input)
        this.equalizer.output.connect(this.masterGain)
        this.masterGain.connect(this.context.destination)

        this.decks.push(this.createDeck(), this.createDeck())
        this.startMetricsLoop()
    }

    setCallbacks(callbacks: EngineCallbacks): void {
        Object.assign(this.callbacks, callbacks)
    }

    setVolume(volume: number): void {
        if (!this.masterGain || !this.context) return
        this.masterGain.gain.setTargetAtTime(clamp(volume, 0, 1), this.context.currentTime, 0.05)
    }

    setCrossfade(seconds: CrossfadeDuration): void {
        this.crossfadeSeconds = seconds
    }

    setEqualizerPreset(preset: EqualizerPreset): void {
        this.equalizer?.setPreset(preset)
    }

    async playSong(song: PlayerSong, startAt = 0): Promise<void> {
        if (!this.context) await this.initialize()
        if (!this.context) return

        await this.context.resume()
        const requestId = ++this.playRequestId

        const activeDeck = this.decks[this.activeDeckIndex]
        if (!activeDeck.song || activeDeck.audio.paused || activeDeck.audio.ended) {
            await this.loadIntoDeck(activeDeck, song, startAt)
            if (requestId !== this.playRequestId) return
            await safePlay(activeDeck.audio)
            this.callbacks.onPlaybackState?.(true)
            return
        }

        await this.crossfadeToSong(song, startAt, this.crossfadeSeconds, requestId)
    }

    pause(): void {
        const activeDeck = this.decks[this.activeDeckIndex]
        activeDeck.audio.pause()
        this.callbacks.onPlaybackState?.(false)
    }

    async resume(): Promise<void> {
        if (!this.context) await this.initialize()
        if (!this.context) return
        await this.context.resume()
        const activeDeck = this.decks[this.activeDeckIndex]
        await safePlay(activeDeck.audio)
        this.callbacks.onPlaybackState?.(true)
    }

    seek(time: number): void {
        const activeDeck = this.decks[this.activeDeckIndex]
        const duration = activeDeck.audio.duration
        if (!Number.isFinite(duration) || duration <= 0) return
        activeDeck.audio.currentTime = clamp(time, 0, duration)
    }

    getCurrentSong(): PlayerSong | null {
        return this.decks[this.activeDeckIndex].song
    }

    setUpcomingSong(song: PlayerSong | null): void {
        this.preloadedSong = song
        if (!song || this.isTransitioning) return
        void this.preloadSong(song)
    }

    getCurrentMetrics(): PlayerMetrics {
        const deck = this.decks[this.activeDeckIndex]
        return {
            currentTime: deck.audio.currentTime || 0,
            duration: Number.isFinite(deck.audio.duration) ? deck.audio.duration : 0,
            buffered: getBufferedRatio(deck.audio),
        }
    }

    destroy(): void {
        if (this.rafId != null) {
            cancelAnimationFrame(this.rafId)
            this.rafId = null
        }

        for (const deck of this.decks) {
            deck.audio.pause()
            deck.audio.src = ''
            deck.source.disconnect()
            deck.preGain.disconnect()
            deck.fadeGain.disconnect()
        }

        this.masterGain?.disconnect()
        this.mixBus?.disconnect()
        this.compressor?.disconnect()
        this.equalizer?.input.disconnect()
        this.equalizer?.output.disconnect()
        this.context?.close().catch(() => undefined)
        this.context = null
    }

    private createDeck(): Deck {
        if (!this.context || !this.mixBus) {
            throw new Error('Engine must be initialized before creating decks')
        }
        const audio = new Audio()
        audio.preload = 'auto'
        audio.crossOrigin = 'anonymous'

        const source = this.context.createMediaElementSource(audio)
        const preGain = this.context.createGain()
        const fadeGain = this.context.createGain()
        preGain.gain.value = 1
        fadeGain.gain.value = 1
        source.connect(preGain).connect(fadeGain).connect(this.mixBus)

        audio.addEventListener('ended', () => {
            if (!this.isTransitioning) {
                this.callbacks.onTrackEnded?.()
            }
        })

        return { audio, source, preGain, fadeGain, song: null }
    }

    private async preloadSong(song: PlayerSong): Promise<void> {
        const targetDeck = this.decks[this.inactiveDeckIndex()]
        if (targetDeck.song?.id === song.id) return
        await this.loadIntoDeck(targetDeck, song, 0)
    }

    private async loadIntoDeck(deck: Deck, song: PlayerSong, startAt: number): Promise<void> {
        const sourceChanged = deck.audio.src !== song.audio_url
        deck.song = song
        deck.preGain.gain.value = calculateNormalizedGain(song)

        if (sourceChanged) {
            deck.audio.src = song.audio_url
            deck.audio.load()
            await waitForCanPlay(deck.audio, 4500)
        }

        if (startAt > 0 && Number.isFinite(deck.audio.duration) && deck.audio.duration > startAt) {
            deck.audio.currentTime = startAt
        } else if (startAt === 0) {
            deck.audio.currentTime = 0
        }
    }

    private async crossfadeToSong(
        song: PlayerSong,
        startAt: number,
        seconds: CrossfadeDuration,
        requestId: number
    ): Promise<void> {
        const fromDeck = this.decks[this.activeDeckIndex]
        const toIndex = this.inactiveDeckIndex()
        const toDeck = this.decks[toIndex]

        this.isTransitioning = true
        await this.loadIntoDeck(toDeck, song, startAt)
        if (requestId !== this.playRequestId || !this.context) {
            this.isTransitioning = false
            return
        }

        const now = this.context.currentTime
        toDeck.fadeGain.gain.cancelScheduledValues(now)
        fromDeck.fadeGain.gain.cancelScheduledValues(now)
        toDeck.fadeGain.gain.setValueAtTime(0.0001, now)
        fromDeck.fadeGain.gain.setValueAtTime(Math.max(fromDeck.fadeGain.gain.value, 0.0001), now)

        await safePlay(toDeck.audio)

        const duration = Math.max(seconds, 0)
        if (duration > 0) {
            this.callbacks.onCrossfadeStart?.(fromDeck.song?.id ?? '', song.id, duration)
            toDeck.fadeGain.gain.linearRampToValueAtTime(1, now + duration)
            fromDeck.fadeGain.gain.linearRampToValueAtTime(0.0001, now + duration)
            window.setTimeout(() => {
                fromDeck.audio.pause()
                fromDeck.audio.currentTime = 0
            }, duration * 1000 + 80)
        } else {
            fromDeck.audio.pause()
        }

        this.activeDeckIndex = toIndex
        this.preloadedSong = null
        this.callbacks.onPlaybackState?.(true)
        this.isTransitioning = false
    }

    private startMetricsLoop(): void {
        const loop = () => {
            const active = this.decks[this.activeDeckIndex]
            const duration = Number.isFinite(active.audio.duration) ? active.audio.duration : 0
            const current = active.audio.currentTime || 0
            this.callbacks.onMetrics?.({
                currentTime: current,
                duration,
                buffered: getBufferedRatio(active.audio),
            })

            const preloaded = this.preloadedSong
            const shouldCrossfade = Boolean(
                preloaded &&
                !this.isTransitioning &&
                this.crossfadeSeconds > 0 &&
                duration > 0 &&
                duration - current <= this.crossfadeSeconds + 0.05
            )

            if (preloaded && shouldCrossfade) {
                void this.crossfadeToSong(preloaded, 0, this.crossfadeSeconds, ++this.playRequestId)
            }

            this.rafId = window.requestAnimationFrame(loop)
        }
        this.rafId = window.requestAnimationFrame(loop)
    }

    private inactiveDeckIndex(): number {
        return this.activeDeckIndex === 0 ? 1 : 0
    }
}

async function waitForCanPlay(audio: HTMLAudioElement, timeoutMs: number): Promise<void> {
    if (audio.readyState >= 3) return
    await new Promise<void>((resolve) => {
        let done = false
        const finish = () => {
            if (done) return
            done = true
            audio.removeEventListener('canplay', finish)
            audio.removeEventListener('canplaythrough', finish)
            resolve()
        }
        audio.addEventListener('canplay', finish, { once: true })
        audio.addEventListener('canplaythrough', finish, { once: true })
        window.setTimeout(finish, timeoutMs)
    })
}

async function safePlay(audio: HTMLAudioElement): Promise<void> {
    try {
        await audio.play()
    } catch {
        // Browser may block autoplay; consumer handles state.
    }
}

export const playerEngine = new AdvancedPlayerEngine()
