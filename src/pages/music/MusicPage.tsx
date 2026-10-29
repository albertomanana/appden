import React, { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'
import { ArrowDownUp, Music, Play, Plus, Search, Shuffle, Upload, X } from 'lucide-react'
import { useAuth } from '@hooks/useAuth'
import { useActiveGroup } from '@hooks/useActiveGroup'
import { songsService } from '@services/songs.service'
import { usePlayerStore } from '@app/store/player.store'
import { useAdvancedPlayerStore } from '@features/player/player.store'
import { SongCard } from '@components/music/SongCard'
import { SongUploadForm } from '@components/music/SongUploadForm'
import { EditSongForm } from '@components/music/EditSongForm'
import { MusicTabs } from '@components/music/MusicTabs'
import { EmptyState } from '@components/ui/EmptyState'
import { ErrorNotice } from '@components/ui/ErrorNotice'
import { ListSkeleton } from '@components/ui/LoadingSkeleton'
import { PageHeader } from '@components/ui/PageHeader'
import { Chip } from '@components/ui/Chip'
import type { Song } from '@/types'

type SortMode = 'recent' | 'title' | 'artist'

const sortLabels: Record<SortMode, string> = {
    recent: 'Recientes',
    title: 'Título',
    artist: 'Artista',
}

const MusicPage: React.FC = () => {
    const { userId } = useAuth()
    const { groupId, hasGroup } = useActiveGroup()
    const [searchParams, setSearchParams] = useSearchParams()
    const [showUpload, setShowUpload] = useState(searchParams.get('subir') === '1')
    const [editingSong, setEditingSong] = useState<Song | null>(null)
    const [search, setSearch] = useState('')
    const [sort, setSort] = useState<SortMode>('recent')
    const setQueue = usePlayerStore((state) => state.setQueue)
    const isShuffle = useAdvancedPlayerStore((state) => state.isShuffle)
    const toggleShuffle = useAdvancedPlayerStore((state) => state.toggleShuffle)

    const {
        data: songs,
        isLoading,
        error,
        refetch,
    } = useQuery({
        queryKey: ['songs', groupId, userId],
        queryFn: () => songsService.getSongs(groupId!, userId!),
        enabled: !!groupId && !!userId,
    })

    const filtered = useMemo(() => {
        const source = [...(songs ?? [])]
        const query = search.trim().toLowerCase()
        const matches = query
            ? source.filter(
                  (song) =>
                      song.title.toLowerCase().includes(query) ||
                      song.artist_name.toLowerCase().includes(query) ||
                      (song.album_name ?? '').toLowerCase().includes(query)
              )
            : source

        if (sort === 'title') matches.sort((a, b) => a.title.localeCompare(b.title, 'es'))
        if (sort === 'artist') matches.sort((a, b) => a.artist_name.localeCompare(b.artist_name, 'es') || a.title.localeCompare(b.title, 'es'))
        return matches
    }, [songs, search, sort])

    const closeUpload = () => {
        setShowUpload(false)
        if (searchParams.has('subir')) {
            searchParams.delete('subir')
            setSearchParams(searchParams, { replace: true })
        }
    }

    const handlePlayAll = () => {
        if (filtered.length === 0) return
        if (isShuffle) toggleShuffle()
        setQueue(filtered, 0)
    }

    const handleShuffle = () => {
        if (filtered.length === 0) return
        if (!isShuffle) toggleShuffle()
        setQueue(filtered, Math.floor(Math.random() * filtered.length))
    }

    const cycleSort = () => {
        const order: SortMode[] = ['recent', 'title', 'artist']
        setSort(order[(order.indexOf(sort) + 1) % order.length])
    }

    const total = songs?.length ?? 0

    return (
        <div className="page-shell animate-fade-in">
            <PageHeader
                title="Música"
                description={hasGroup ? `${total} ${total === 1 ? 'canción' : 'canciones'} en el grupo` : undefined}
                actions={
                    <button onClick={() => setShowUpload(true)} className="btn-primary !px-4" disabled={!hasGroup} aria-label="Subir canción">
                        <Plus className="h-4 w-4" />
                        Subir
                    </button>
                }
            />

            <MusicTabs active="music" />

            {!hasGroup ? (
                <EmptyState
                    icon={<Music className="h-6 w-6" />}
                    title="Sin grupo activo"
                    description="Elige o crea un grupo desde la parte superior para ver su biblioteca."
                />
            ) : (
                <>
                    <div className="space-y-3">
                        <div className="relative">
                            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
                            <input
                                type="search"
                                inputMode="search"
                                enterKeyHint="search"
                                value={search}
                                onChange={(event) => setSearch(event.target.value)}
                                placeholder="Buscar título, artista o álbum"
                                className="input pl-11 pr-11"
                                aria-label="Buscar canciones"
                            />
                            {search ? (
                                <button
                                    type="button"
                                    onClick={() => setSearch('')}
                                    className="absolute right-1 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full text-gray-400"
                                    aria-label="Borrar búsqueda"
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            ) : null}
                        </div>

                        <div className="flex items-center gap-2">
                            <button onClick={handlePlayAll} className="btn-primary flex-1 sm:flex-none" disabled={filtered.length === 0}>
                                <Play className="h-4 w-4 fill-current" />
                                Reproducir
                            </button>
                            <button onClick={handleShuffle} className="btn-secondary flex-1 sm:flex-none" disabled={filtered.length === 0}>
                                <Shuffle className="h-4 w-4" />
                                Aleatorio
                            </button>
                            <Chip
                                onClick={cycleSort}
                                className="ml-auto !min-h-[2.75rem] !min-w-[2.75rem] shrink-0 justify-center !px-3"
                                aria-label={`Ordenar por ${sortLabels[sort].toLowerCase()}`}
                                title={`Ordenar: ${sortLabels[sort]}`}
                            >
                                <ArrowDownUp className="h-4 w-4" />
                                <span className="hidden sm:inline">{sortLabels[sort]}</span>
                            </Chip>
                        </div>
                    </div>

                    <section>
                        {isLoading ? (
                            <ListSkeleton count={7} />
                        ) : error ? (
                            <ErrorNotice title="No pudimos cargar la biblioteca" error={error} onRetry={() => void refetch()} />
                        ) : filtered.length === 0 ? (
                            <EmptyState
                                icon={<Music className="h-6 w-6" />}
                                title={total === 0 ? 'Aún no hay canciones' : 'Sin resultados'}
                                description={total === 0 ? 'Sube la primera canción del grupo y empezad a escuchar juntos.' : `Nada coincide con "${search}".`}
                                action={
                                    total === 0 ? (
                                        <button onClick={() => setShowUpload(true)} className="btn-primary">
                                            <Upload className="h-4 w-4" />
                                            Subir canción
                                        </button>
                                    ) : (
                                        <button onClick={() => setSearch('')} className="btn-secondary">
                                            Limpiar búsqueda
                                        </button>
                                    )
                                }
                            />
                        ) : (
                            <div className="stagger -mx-1.5 space-y-0.5">
                                {filtered.map((song, index) => (
                                    <SongCard
                                        key={song.id}
                                        song={song}
                                        onPlay={() => setQueue(filtered, index)}
                                        onEdit={() => setEditingSong(song)}
                                    />
                                ))}
                            </div>
                        )}
                    </section>
                </>
            )}

            {showUpload ? <SongUploadForm onClose={closeUpload} /> : null}
            {editingSong ? <EditSongForm song={editingSong} onClose={() => setEditingSong(null)} /> : null}
        </div>
    )
}

export default MusicPage
