import React, { useRef, useState } from 'react'
import { formatTime } from '@features/player/utils/audioUtils'
import { cn } from '@lib/utils'

interface ProgressBarProps {
    currentTime: number
    duration: number
    bufferedRatio?: number
    onSeek: (time: number) => void
    className?: string
    /** `stacked`: times under the track (full player). `inline`: times on both sides (desktop bar). */
    variant?: 'stacked' | 'inline'
}

/**
 * Touch-friendly scrubber: a 32px hit area around a thin track. While dragging,
 * the time preview follows the finger and the seek is committed on release.
 */
export const ProgressBar: React.FC<ProgressBarProps> = ({
    currentTime: rawTime,
    duration: rawDuration,
    bufferedRatio = 0,
    onSeek,
    className,
    variant = 'stacked',
}) => {
    const duration = Number.isFinite(rawDuration) && rawDuration > 0 ? rawDuration : 0
    const currentTime = Number.isFinite(rawTime) ? Math.min(Math.max(rawTime, 0), duration || rawTime) : 0
    const trackRef = useRef<HTMLDivElement | null>(null)
    const [dragRatio, setDragRatio] = useState<number | null>(null)

    const liveRatio = duration > 0 ? Math.min(currentTime / duration, 1) : 0
    const ratio = dragRatio ?? liveRatio
    const buffered = Math.max(ratio, bufferedRatio)
    const shownTime = dragRatio != null ? dragRatio * duration : currentTime

    const ratioFromEvent = (clientX: number) => {
        const rect = trackRef.current?.getBoundingClientRect()
        if (!rect || rect.width === 0) return 0
        return Math.min(Math.max((clientX - rect.left) / rect.width, 0), 1)
    }

    const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
        if (duration <= 0) return
        event.currentTarget.setPointerCapture(event.pointerId)
        setDragRatio(ratioFromEvent(event.clientX))
    }

    const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
        if (dragRatio == null) return
        setDragRatio(ratioFromEvent(event.clientX))
    }

    const handlePointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
        if (dragRatio == null) return
        const finalRatio = ratioFromEvent(event.clientX)
        setDragRatio(null)
        onSeek(finalRatio * duration)
    }

    const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
        if (duration <= 0) return
        if (event.key === 'ArrowRight') onSeek(Math.min(currentTime + 5, duration))
        if (event.key === 'ArrowLeft') onSeek(Math.max(currentTime - 5, 0))
    }

    const dragging = dragRatio != null
    const inline = variant === 'inline'

    const track = (
        <div
            ref={trackRef}
            role="slider"
            tabIndex={0}
            aria-label="Posición de la canción"
            aria-valuemin={0}
            aria-valuemax={Math.round(duration)}
            aria-valuenow={Math.round(shownTime)}
            aria-valuetext={`${formatTime(shownTime)} de ${formatTime(duration)}`}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={() => setDragRatio(null)}
            onKeyDown={handleKeyDown}
            className={cn('group relative flex w-full cursor-pointer touch-none items-center rounded-full', inline ? 'h-6' : 'h-8')}
        >
            <div
                className={cn(
                    'relative w-full overflow-hidden rounded-full bg-white/15 transition-[height] duration-150',
                    dragging ? 'h-2' : inline ? 'h-1 group-hover:h-1.5' : 'h-1'
                )}
            >
                <div className="absolute inset-y-0 left-0 bg-white/20" style={{ width: `${buffered * 100}%` }} />
                <div
                    className={cn('absolute inset-y-0 left-0 rounded-full bg-white transition-colors', inline && 'group-hover:bg-brand-300')}
                    style={{ width: `${ratio * 100}%` }}
                />
            </div>
            <span
                className={cn(
                    'pointer-events-none absolute top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white shadow-[0_2px_10px_rgba(0,0,0,0.4)] transition-[opacity,transform] duration-150',
                    dragging ? 'scale-125 opacity-100' : 'opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100'
                )}
                style={{ left: `${ratio * 100}%` }}
            />
        </div>
    )

    if (inline) {
        return (
            <div className={cn('flex items-center gap-2.5 text-[11px] font-medium tabular text-white/55', className)}>
                <span className="w-9 shrink-0 text-right">{formatTime(shownTime)}</span>
                {track}
                <span className="w-9 shrink-0">{duration > 0 ? formatTime(duration) : '0:00'}</span>
            </div>
        )
    }

    return (
        <div className={className}>
            {track}
            <div className="mt-0.5 flex items-center justify-between text-xs font-medium tabular text-white/60">
                <span>{formatTime(shownTime)}</span>
                <span>{duration > 0 ? `-${formatTime(Math.max(duration - shownTime, 0))}` : '0:00'}</span>
            </div>
        </div>
    )
}
