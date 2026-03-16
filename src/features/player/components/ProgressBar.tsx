import React from 'react'
import { formatTime } from '@features/player/utils/audioUtils'

interface ProgressBarProps {
    currentTime: number
    duration: number
    bufferedRatio?: number
    onSeek: (time: number) => void
    className?: string
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
    currentTime,
    duration,
    bufferedRatio = 0,
    onSeek,
    className,
}) => {
    const progress = duration > 0 ? (currentTime / duration) * 100 : 0
    const buffered = Math.max(progress, bufferedRatio * 100)

    return (
        <div className={className}>
            <div className="relative h-1.5 w-full rounded-full bg-white/10 overflow-hidden">
                <div
                    className="absolute inset-y-0 left-0 bg-white/20"
                    style={{ width: `${buffered}%` }}
                />
                <div
                    className="absolute inset-y-0 left-0 bg-white"
                    style={{ width: `${progress}%` }}
                />
                <input
                    type="range"
                    min={0}
                    max={duration > 0 ? duration : 0}
                    step={0.01}
                    value={duration > 0 ? currentTime : 0}
                    onChange={(event) => onSeek(Number(event.currentTarget.value))}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    aria-label="Seek"
                />
            </div>
            <div className="mt-2 flex items-center justify-between text-[11px] text-white/65 tracking-wide">
                <span>{formatTime(currentTime)}</span>
                <span>{formatTime(duration)}</span>
            </div>
        </div>
    )
}
