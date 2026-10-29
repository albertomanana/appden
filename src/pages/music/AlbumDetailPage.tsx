import React, { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Disc3, Play, Shuffle } from 'lucide-react'
import { usePlayerStore } from '@app/store/player.store'
import { useAdvancedPlayerStore } from '@features/player/player.store'
import { Cover } from '@components/music/Cover'
import { EditSongForm } from '@components/music/EditSongForm'
import { SongCard } from '@components/music/SongCard'
import { EmptyState } from '@components/ui/EmptyState'
import { ErrorNotice } from '@components/ui/ErrorNotice'
import { ListSkeleton, Skeleton } from '@components/ui/LoadingSkeleton'
import { PageHeader } from '@components/ui/PageHeader'
import { useMusicLibrary } from '@features/music/hooks/useMusicLibrary'
import { findAlbum, formatTotalDuration, randomIndex } from '@features/music/utils/library'
import { ROUTES } from '@lib/constants'
import type { Song } from '@/types'

const AlbumDetailPage: React.FC = () => {
    const { albumId = '' } = useParams<{ albumId: string }>()
    const { albums, isLoading, error, songsQuery } = useMusicLibrary()
    const setQueue = usePlayerStore((state) => state.setQueue)
    const isShuffle = useAdvancedPlayerStore((state) => state.isShuffle)
    const toggleShuffle = useAdvancedPlayerStore((state) => state.toggleShuffle)
    const [editingSong, setEditingSong] = useState<Song | null>(null)

    const album = findAlbum(albums, decodeURIComponent(albumId))

    if (isLoading) {
        return (
            <div className="page-shell">
                <PageHeader back={ROUTES.ALBUMS} title="Álbum" />
                <Skeleton className="mx-auto aspect-square w-56 rounded-3xl" />
                <ListSkeleton count={5} />
            </div>
        )
    }

    if (error) {
        return (
            <div className="page-shell">
                <PageHeader back={ROUTES.ALBUMS} title="Álbum" />
                <ErrorNotice title="No pudimos cargar el álbum" error={error} onRetry={() => void songsQuery.refetch()} />
            </div>
        )
    }

    if (!album) {
        return (
            <div className="page-shell">
                <PageHeader back={ROUTES.ALBUMS} title="Álbum" />
                <EmptyState icon={<Disc3 className="h-6 w-6" />} title="No encontramos este álbum" description="Puede que se haya renombrado o que ya no tenga canciones." />
            </div>
        )
    }

    const playAll = (shuffle: boolean) => {
        if (album.songs.length === 0) return
        if (shuffle !== isShuffle) toggleShuffle()
        setQueue(album.songs, shuffle ? randomIndex(album.songs.length) : 0)
    }

    const meta = [album.year, `${album.songs.length} ${album.songs.length === 1 ? 'canción' : 'canciones'}`, formatTotalDuration(album.durationSeconds)]
        .filter(Boolean)
        .join(' · ')

    return (
        <div className="page-shell animate-fade-in">
            <PageHeader back={ROUTES.ALBUMS} title={<span className="sr-only">{album.title}</span>} className="-mb-4" />

            <section className="flex flex-col items-center text-center md:flex-row md:items-end md:gap-6 md:text-left">
                <Cover
                    src={album.coverUrl}
                    alt={album.title}
                    seed={album.coverSeed}
                    className="aspect-square w-56 rounded-3xl shadow-[0_24px_70px_rgba(0,0,0,0.5)] md:w-52"
                    iconClassName="h-12 w-12"
                />
                <div className="mt-5 min-w-0 md:mt-0">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">Álbum</p>
                    <h1 className="mt-1 font-headline text-3xl font-extrabold tracking-tight text-white md:text-4xl">{album.title}</h1>
                    {album.artists.length > 0 ? (
                        <p className="mt-2 text-[15px] text-gray-300">
                            {album.artists.map((artist, index) => (
                                <React.Fragment key={artist.key}>
                                    {index > 0 ? ', ' : null}
                                    {artist.profileId ? (
                                        <Link to={ROUTES.ARTIST(artist.profileId)} className="font-semibold text-white hover:underline">
                                            {artist.name}
                                        </Link>
                                    ) : (
                                        artist.name
                                    )}
                                </React.Fragment>
                            ))}
                        </p>
                    ) : null}
                    <p className="mt-1 text-sm text-gray-500">{meta}</p>
                </div>
            </section>

            <div className="flex gap-2">
                <button type="button" className="btn-primary flex-1 sm:flex-none" onClick={() => playAll(false)}>
                    <Play className="h-4 w-4 fill-current" />
                    Reproducir
                </button>
                <button type="button" className="btn-secondary flex-1 sm:flex-none" onClick={() => playAll(true)}>
                    <Shuffle className="h-4 w-4" />
                    Aleatorio
                </button>
            </div>

            <div className="stagger -mx-1.5 space-y-0.5">
                {album.songs.map((song, index) => (
                    <SongCard key={song.id} song={song} index={index} onPlay={() => setQueue(album.songs, index)} onEdit={() => setEditingSong(song)} />
                ))}
            </div>

            {editingSong ? <EditSongForm song={editingSong} onClose={() => setEditingSong(null)} /> : null}
        </div>
    )
}

export default AlbumDetailPage
