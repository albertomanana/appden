import React from 'react'
import { Link } from 'react-router-dom'
import { Play } from 'lucide-react'
import { usePlayerStore } from '@app/store/player.store'
import { Cover } from '@components/music/Cover'
import { ROUTES } from '@lib/constants'
import { cn } from '@lib/utils'
import { formatArtistNames } from '@features/music/utils/library'
import type { MusicAlbum } from '@features/music/types'

interface AlbumCardProps {
    album: MusicAlbum
    className?: string
    /** Second line: artists (default) or year + track count (artist pages). */
    subtitle?: 'artists' | 'meta'
}

/** Square album tile with a quick play button. */
export const AlbumCard: React.FC<AlbumCardProps> = ({ album, className, subtitle = 'artists' }) => {
    const setQueue = usePlayerStore((state) => state.setQueue)
    const count = album.songs.length
    const meta = [album.year, `${count} ${count === 1 ? 'canción' : 'canciones'}`].filter(Boolean).join(' · ')

    return (
        <Link to={ROUTES.ALBUM(album.id)} className={cn('group block min-w-0', className)}>
            <Cover src={album.coverUrl} alt="" seed={album.coverSeed} className="aspect-square w-full rounded-2xl" iconClassName="h-8 w-8">
                <button
                    type="button"
                    onClick={(event) => {
                        event.preventDefault()
                        event.stopPropagation()
                        if (album.songs.length > 0) setQueue(album.songs, 0)
                    }}
                    className="absolute bottom-2 right-2 grid h-10 w-10 place-items-center rounded-full bg-black/55 text-white backdrop-blur transition-transform active:scale-90 md:opacity-0 md:group-hover:opacity-100"
                    aria-label={`Reproducir ${album.title}`}
                >
                    <Play className="ml-0.5 h-4 w-4 fill-current" />
                </button>
            </Cover>
            <p className="mt-2 truncate text-sm font-semibold text-white">{album.title}</p>
            <p className="truncate text-xs text-gray-400">
                {subtitle === 'meta' ? meta : formatArtistNames(album.artists, 2) || meta}
            </p>
        </Link>
    )
}
