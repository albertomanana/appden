import React from 'react'
import { ListMusic } from 'lucide-react'
import { Cover } from '@components/music/Cover'
import { cn } from '@lib/utils'

interface PlaylistCoverProps {
    /** Covers of the first songs, in order. */
    covers: Array<{ id: string; cover_url: string | null }>
    seed: string
    className?: string
    iconClassName?: string
}

const gradients = [
    'from-[#335ebd] to-[#1a1f3d]',
    'from-[#6b3bd6] to-[#1d1236]',
    'from-[#c2417f] to-[#2b0f22]',
    'from-[#1f8a7a] to-[#0c2420]',
    'from-[#c97a2b] to-[#2a170a]',
]

function pick(seed: string): string {
    let hash = 0
    for (let i = 0; i < seed.length; i += 1) hash = (hash * 31 + seed.charCodeAt(i)) | 0
    return gradients[Math.abs(hash) % gradients.length]
}

/** 2×2 mosaic of the first four covers, one cover when there are fewer, a gradient when empty. */
export const PlaylistCover: React.FC<PlaylistCoverProps> = ({ covers, seed, className, iconClassName }) => {
    const withArt = covers.filter((cover) => !!cover.cover_url)

    if (withArt.length >= 4) {
        return (
            <div className={cn('grid shrink-0 grid-cols-2 grid-rows-2 overflow-hidden bg-surface-600', className)}>
                {withArt.slice(0, 4).map((cover) => (
                    <Cover key={cover.id} src={cover.cover_url} alt="" seed={cover.id} className="h-full w-full" />
                ))}
            </div>
        )
    }

    if (withArt.length > 0) {
        return <Cover src={withArt[0].cover_url} alt="" seed={withArt[0].id} className={className} />
    }

    return (
        <div className={cn('grid shrink-0 place-items-center overflow-hidden bg-gradient-to-br text-white/70', pick(seed), className)}>
            <ListMusic className={cn('h-6 w-6', iconClassName)} />
        </div>
    )
}
