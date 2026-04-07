import React from 'react'
import { Pause, Play, Repeat, Repeat1, Shuffle, SkipBack, SkipForward, Volume2 } from 'lucide-react'
import type { RepeatMode } from '@features/player/player.types'

interface PlayerControlsProps {
    isPlaying: boolean
    repeatMode: RepeatMode
    isShuffle: boolean
    volume: number
    onPlayPause: () => void
    onNext: () => void
    onPrevious: () => void
    onToggleShuffle: () => void
    onCycleRepeat: () => void
    onVolumeChange: (volume: number) => void
}

export const PlayerControls: React.FC<PlayerControlsProps> = ({
    isPlaying,
    repeatMode,
    isShuffle,
    volume,
    onPlayPause,
    onNext,
    onPrevious,
    onToggleShuffle,
    onCycleRepeat,
    onVolumeChange,
}) => {
    return (
        <div className="space-y-5">
            <div className="flex items-center justify-center gap-3">
                <button
                    onClick={onToggleShuffle}
                    className={`rounded-full p-2.5 transition-colors ${isShuffle ? 'text-brand-300' : 'text-white/60 hover:text-white'}`}
                    aria-label="Shuffle"
                >
                    <Shuffle className="h-5 w-5" />
                </button>

                <button
                    onClick={onPrevious}
                    className="grid h-12 w-12 place-items-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/16"
                    aria-label="Anterior"
                >
                    <SkipBack className="h-5 w-5" />
                </button>

                <button
                    onClick={onPlayPause}
                    className="grid h-16 w-16 place-items-center rounded-full bg-white text-black shadow-[0_20px_40px_rgba(255,255,255,0.12)] transition-transform hover:scale-[1.02]"
                    aria-label={isPlaying ? 'Pausar' : 'Reproducir'}
                >
                    {isPlaying ? <Pause className="h-7 w-7" /> : <Play className="ml-0.5 h-7 w-7" />}
                </button>

                <button
                    onClick={onNext}
                    className="grid h-12 w-12 place-items-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/16"
                    aria-label="Siguiente"
                >
                    <SkipForward className="h-5 w-5" />
                </button>

                <button
                    onClick={onCycleRepeat}
                    className={`rounded-full p-2.5 transition-colors ${repeatMode !== 'off' ? 'text-brand-300' : 'text-white/60 hover:text-white'}`}
                    aria-label="Repetir"
                >
                    {repeatMode === 'one' ? <Repeat1 className="h-5 w-5" /> : <Repeat className="h-5 w-5" />}
                </button>
            </div>

            <label className="block rounded-[1.35rem] border border-white/6 bg-white/[0.05] px-4 py-3">
                <div className="mb-3 flex items-center gap-2 text-[11px] uppercase tracking-[0.22em] text-white/55">
                    <Volume2 className="h-3.5 w-3.5" />
                    Volumen
                </div>
                <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.01}
                    value={volume}
                    onChange={(event) => onVolumeChange(Number(event.currentTarget.value))}
                    className="w-full accent-white"
                    aria-label="Volumen"
                />
            </label>
        </div>
    )
}
