import React from 'react'
import {
    Pause,
    Play,
    Repeat,
    Repeat1,
    Shuffle,
    SkipBack,
    SkipForward,
    SlidersHorizontal,
    Volume2,
} from 'lucide-react'
import type { CrossfadeDuration, EqualizerPreset, RepeatMode } from '@features/player/player.types'

interface PlayerControlsProps {
    isPlaying: boolean
    repeatMode: RepeatMode
    isShuffle: boolean
    volume: number
    crossfade: CrossfadeDuration
    equalizerPreset: EqualizerPreset
    onPlayPause: () => void
    onNext: () => void
    onPrevious: () => void
    onToggleShuffle: () => void
    onCycleRepeat: () => void
    onVolumeChange: (volume: number) => void
    onCrossfadeChange: (value: CrossfadeDuration) => void
    onEqualizerChange: (preset: EqualizerPreset) => void
}

const EQ_PRESETS: EqualizerPreset[] = ['flat', 'rock', 'pop', 'bass-boost', 'voice']
const CROSSFADE_OPTIONS: CrossfadeDuration[] = [0, 2, 4, 6]

export const PlayerControls: React.FC<PlayerControlsProps> = ({
    isPlaying,
    repeatMode,
    isShuffle,
    volume,
    crossfade,
    equalizerPreset,
    onPlayPause,
    onNext,
    onPrevious,
    onToggleShuffle,
    onCycleRepeat,
    onVolumeChange,
    onCrossfadeChange,
    onEqualizerChange,
}) => {
    return (
        <div className="space-y-4">
            <div className="flex items-center justify-center gap-3">
                <button
                    onClick={onToggleShuffle}
                    className={`rounded-full p-2.5 transition-colors ${isShuffle ? 'text-brand-400' : 'text-white/65 hover:text-white'}`}
                    aria-label="Toggle shuffle"
                >
                    <Shuffle className="w-5 h-5" />
                </button>
                <button
                    onClick={onPrevious}
                    className="rounded-full bg-white/10 hover:bg-white/20 p-3 transition-colors text-white"
                    aria-label="Previous"
                >
                    <SkipBack className="w-5 h-5" />
                </button>
                <button
                    onClick={onPlayPause}
                    className="rounded-full bg-white text-black p-4 hover:scale-[1.03] transition-transform"
                    aria-label={isPlaying ? 'Pause' : 'Play'}
                >
                    {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 ml-0.5" />}
                </button>
                <button
                    onClick={onNext}
                    className="rounded-full bg-white/10 hover:bg-white/20 p-3 transition-colors text-white"
                    aria-label="Next"
                >
                    <SkipForward className="w-5 h-5" />
                </button>
                <button
                    onClick={onCycleRepeat}
                    className={`rounded-full p-2.5 transition-colors ${repeatMode !== 'off' ? 'text-brand-400' : 'text-white/65 hover:text-white'}`}
                    aria-label="Cycle repeat mode"
                >
                    {repeatMode === 'one' ? <Repeat1 className="w-5 h-5" /> : <Repeat className="w-5 h-5" />}
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <label className="flex items-center gap-2 rounded-xl bg-white/10 px-3 py-2.5">
                    <Volume2 className="w-4 h-4 text-white/80" />
                    <input
                        type="range"
                        min={0}
                        max={1}
                        step={0.01}
                        value={volume}
                        onChange={(event) => onVolumeChange(Number(event.currentTarget.value))}
                        className="w-full accent-white"
                        aria-label="Volume"
                    />
                </label>

                <label className="flex items-center gap-2 rounded-xl bg-white/10 px-3 py-2.5">
                    <SlidersHorizontal className="w-4 h-4 text-white/80" />
                    <select
                        value={crossfade}
                        onChange={(event) => onCrossfadeChange(Number(event.currentTarget.value) as CrossfadeDuration)}
                        className="w-full bg-transparent text-sm text-white outline-none"
                        aria-label="Crossfade"
                    >
                        {CROSSFADE_OPTIONS.map((value) => (
                            <option key={value} value={value} className="text-black">
                                Crossfade {value}s
                            </option>
                        ))}
                    </select>
                </label>

                <label className="flex items-center gap-2 rounded-xl bg-white/10 px-3 py-2.5">
                    <SlidersHorizontal className="w-4 h-4 text-white/80" />
                    <select
                        value={equalizerPreset}
                        onChange={(event) => onEqualizerChange(event.currentTarget.value as EqualizerPreset)}
                        className="w-full bg-transparent text-sm text-white outline-none"
                        aria-label="Equalizer preset"
                    >
                        {EQ_PRESETS.map((preset) => (
                            <option key={preset} value={preset} className="text-black">
                                EQ {preset}
                            </option>
                        ))}
                    </select>
                </label>
            </div>
        </div>
    )
}
