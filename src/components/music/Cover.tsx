import React, { useEffect, useState } from 'react'
import { Music } from 'lucide-react'
import { cn } from '@lib/utils'

interface CoverProps {
    src?: string | null
    alt: string
    className?: string
    iconClassName?: string
    /** Seed used to pick the placeholder gradient when there is no artwork. */
    seed?: string
    children?: React.ReactNode
}

const placeholders = [
    'from-[#2a3a6b] to-[#141a2e]',
    'from-[#3b2a6b] to-[#16122b]',
    'from-[#5a2448] to-[#1f0f1a]',
    'from-[#1f4d4a] to-[#0d1d1c]',
    'from-[#5a3a1a] to-[#21160b]',
]

function pick(seed: string): string {
    let hash = 0
    for (let i = 0; i < seed.length; i += 1) hash = (hash * 31 + seed.charCodeAt(i)) | 0
    return placeholders[Math.abs(hash) % placeholders.length]
}

/** Square-ish artwork with a graceful fallback when the image is missing or fails. */
export const Cover: React.FC<CoverProps> = ({ src, alt, className, iconClassName, seed, children }) => {
    const [failed, setFailed] = useState(false)

    useEffect(() => {
        setFailed(false)
    }, [src])

    return (
        <div className={cn('relative shrink-0 overflow-hidden bg-surface-600', className)}>
            {src && !failed ? (
                <img
                    src={src}
                    alt={alt}
                    loading="lazy"
                    decoding="async"
                    draggable={false}
                    className="h-full w-full object-cover"
                    onError={() => setFailed(true)}
                />
            ) : (
                <div className={cn('grid h-full w-full place-items-center bg-gradient-to-br text-white/55', pick(seed ?? alt))}>
                    <Music className={cn('h-5 w-5', iconClassName)} />
                </div>
            )}
            {children}
        </div>
    )
}

/** Animated "now playing" bars. */
export const EqualizerBars: React.FC<{ playing: boolean; className?: string }> = ({ playing, className }) => (
    <span className={cn('inline-flex h-3.5 items-end gap-[3px]', className)} aria-hidden="true">
        {['animate-eq-1', 'animate-eq-2', 'animate-eq-3'].map((anim) => (
            <span
                key={anim}
                className={cn('h-full w-[3px] origin-bottom rounded-full bg-current', playing ? anim : 'scale-y-[0.35]')}
            />
        ))}
    </span>
)
