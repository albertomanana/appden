import type { EqualizerPreset } from '@features/player/player.types'

type PresetBands = {
    lowShelf: number
    lowMid: number
    highMid: number
    highShelf: number
}

const PRESETS: Record<EqualizerPreset, PresetBands> = {
    flat: { lowShelf: 0, lowMid: 0, highMid: 0, highShelf: 0 },
    rock: { lowShelf: 4.5, lowMid: -1, highMid: 3, highShelf: 4 },
    pop: { lowShelf: 2, lowMid: 1.2, highMid: 2.8, highShelf: 2.5 },
    'bass-boost': { lowShelf: 8, lowMid: 2, highMid: -2, highShelf: -1.2 },
    voice: { lowShelf: -2, lowMid: 4, highMid: 5.5, highShelf: 1.5 },
}

export class EqualizerEngine {
    readonly input: GainNode
    readonly output: GainNode

    private readonly lowShelf: BiquadFilterNode
    private readonly lowMid: BiquadFilterNode
    private readonly highMid: BiquadFilterNode
    private readonly highShelf: BiquadFilterNode
    private currentPreset: EqualizerPreset

    constructor(private readonly context: AudioContext) {
        this.input = context.createGain()
        this.output = context.createGain()

        this.lowShelf = context.createBiquadFilter()
        this.lowShelf.type = 'lowshelf'
        this.lowShelf.frequency.value = 120

        this.lowMid = context.createBiquadFilter()
        this.lowMid.type = 'peaking'
        this.lowMid.frequency.value = 480
        this.lowMid.Q.value = 1.1

        this.highMid = context.createBiquadFilter()
        this.highMid.type = 'peaking'
        this.highMid.frequency.value = 2100
        this.highMid.Q.value = 1

        this.highShelf = context.createBiquadFilter()
        this.highShelf.type = 'highshelf'
        this.highShelf.frequency.value = 6200

        this.input
            .connect(this.lowShelf)
            .connect(this.lowMid)
            .connect(this.highMid)
            .connect(this.highShelf)
            .connect(this.output)

        this.currentPreset = 'flat'
        this.setPreset('flat')
    }

    setPreset(preset: EqualizerPreset): void {
        const config = PRESETS[preset]
        const now = this.context.currentTime
        this.lowShelf.gain.setTargetAtTime(config.lowShelf, now, 0.07)
        this.lowMid.gain.setTargetAtTime(config.lowMid, now, 0.07)
        this.highMid.gain.setTargetAtTime(config.highMid, now, 0.07)
        this.highShelf.gain.setTargetAtTime(config.highShelf, now, 0.07)
        this.currentPreset = preset
    }

    getPreset(): EqualizerPreset {
        return this.currentPreset
    }
}
