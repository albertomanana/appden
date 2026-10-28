import React from 'react'
import { Pause, Play, Repeat, Repeat1, Shuffle, SkipBack, SkipForward, Volume1, Volume2, VolumeX } from 'lucide-react'
import type { RepeatMode } from '@features/player/player.types'
import { cn } from '@lib/utils'

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
    /** Volume is hidden on touch devices, where the hardware buttons control it. */
    showVolume?: boolean
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
    showVolume = false,
}) => {
    const VolumeIcon = volume === 0 ? VolumeX : volume < 0.5 ? Volume1 : Volume2

    return (
        <div className="space-y-5">
            <div className="flex items-center justify-between gap-2">
                <button
                    onClick={onToggleShuffle}
                    className={cn('icon-btn relative', isShuffle ? 'text-brand-300' : 'text-white/60')}
                    aria-label={isShuffle ? 'Desactivar aleatorio' : 'Activar aleatorio'}
                    aria-pressed={isShuffle}
                >
                    <Shuffle className="h-5 w-5" />
                    {isShuffle ? <span className="absolute bottom-1 h-1 w-1 rounded-full bg-brand-300" /> : null}
                </button>

                <button onClick={onPrevious} className="icon-btn h-14 w-14 text-white" aria-label="Anterior">
                    <SkipBack className="h-7 w-7 fill-current" />
                </button>

                <button
                    onClick={onPlayPause}
                    className="grid h-[4.5rem] w-[4.5rem] place-items-center rounded-full bg-white text-black shadow-[0_16px_40px_rgba(0,0,0,0.35)] transition-transform active:scale-95"
                    aria-label={isPlaying ? 'Pausar' : 'Reproducir'}
                >
                    {isPlaying ? <Pause className="h-8 w-8 fill-current" /> : <Play className="ml-1 h-8 w-8 fill-current" />}
                </button>

                <button onClick={onNext} className="icon-btn h-14 w-14 text-white" aria-label="Siguiente">
                    <SkipForward className="h-7 w-7 fill-current" />
                </button>

                <button
                    onClick={onCycleRepeat}
                    className={cn('icon-btn relative', repeatMode !== 'off' ? 'text-brand-300' : 'text-white/60')}
                    aria-label={repeatLabel(repeatMode)}
                >
                    {repeatMode === 'one' ? <Repeat1 className="h-5 w-5" /> : <Repeat className="h-5 w-5" />}
                    {repeatMode !== 'off' ? <span className="absolute bottom-1 h-1 w-1 rounded-full bg-brand-300" /> : null}
                </button>
            </div>

            {showVolume ? (
                <div className="flex items-center gap-3 text-white/60">
                    <button onClick={() => onVolumeChange(volume === 0 ? 0.8 : 0)} className="icon-btn h-9 w-9" aria-label={volume === 0 ? 'Activar sonido' : 'Silenciar'}>
                        <VolumeIcon className="h-4 w-4" />
                    </button>
                    <input
                        type="range"
                        min={0}
                        max={1}
                        step={0.01}
                        value={volume}
                        onChange={(event) => onVolumeChange(Number(event.currentTarget.value))}
                        className="w-full"
                        aria-label="Volumen"
                    />
                </div>
            ) : null}
        </div>
    )
}

/** off → repeat queue → repeat song → off. */
export function nextRepeatMode(mode: RepeatMode): RepeatMode {
    if (mode === 'off') return 'all'
    if (mode === 'all') return 'one'
    return 'off'
}

export function repeatLabel(mode: RepeatMode): string {
    if (mode === 'off') return 'Repetir cola'
    if (mode === 'all') return 'Repetir canción'
    return 'Desactivar repetición'
}
