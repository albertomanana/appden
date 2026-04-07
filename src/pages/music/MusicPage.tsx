import React, { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { AlertCircle, Music, Play, Plus, Search, Upload } from 'lucide-react'
import { useAuth } from '@hooks/useAuth'
import { useActiveGroup } from '@hooks/useActiveGroup'
import { songsService } from '@services/songs.service'
import { usePlayerStore } from '@app/store/player.store'
import { SongCard } from '@components/music/SongCard'
import { SongUploadForm } from '@components/music/SongUploadForm'
import { EditSongForm } from '@components/music/EditSongForm'
import { EmptyState } from '@components/ui/EmptyState'
import { ListSkeleton } from '@components/ui/LoadingSkeleton'
import { PageHeader } from '@components/ui/PageHeader'
import { Tabs } from '@components/ui/Tabs'
import { ROUTES } from '@lib/constants'
import type { Song } from '@/types'

const MusicPage: React.FC = () => {
    const { userId } = useAuth()
    const { groupId, hasGroup } = useActiveGroup()
    const [showUpload, setShowUpload] = useState(false)
    const [editingSong, setEditingSong] = useState<Song | null>(null)
    const [search, setSearch] = useState('')
    const setQueue = usePlayerStore((state) => state.setQueue)

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
        const source = songs ?? []
        const query = search.trim().toLowerCase()
        if (!query) return source

        return source.filter(
            (song) =>
                song.title.toLowerCase().includes(query) ||
                song.artist_name.toLowerCase().includes(query) ||
                (song.album_name ?? '').toLowerCase().includes(query)
        )
    }, [songs, search])

    const handlePlayAll = () => {
        if (filtered.length > 0) {
            setQueue(filtered, 0)
        }
    }

    return (
        <div className="page-shell animate-fade-in">
            <PageHeader
                kicker="Music"
                title="Musica"
                description="La biblioteca del grupo para subir, ordenar y reproducir sin ruido."
                meta={<span className="hero-meta-pill">{songs?.length ?? 0} canciones</span>}
                actions={
                    <button onClick={() => setShowUpload(true)} className="btn-primary" disabled={!hasGroup} aria-label="Subir cancion">
                        <Plus className="h-4 w-4" />
                        Subir
                    </button>
                }
            />

            <Tabs
                active="music"
                items={[
                    { label: 'Music', value: 'music', href: ROUTES.MUSIC },
                    { label: 'Playlists', value: 'playlists', href: ROUTES.PLAYLISTS },
                    { label: 'Favorites', value: 'favorites', href: ROUTES.FAVORITES },
                ]}
            />

            <section className="card space-y-4 p-5">
                <div className="grid gap-3 sm:grid-cols-[1fr,auto]">
                    <div className="relative">
                        <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
                        <input
                            type="search"
                            value={search}
                            onChange={(event) => setSearch(event.target.value)}
                            placeholder="Buscar por titulo, artista o album"
                            className="input pl-11"
                            disabled={!hasGroup}
                        />
                    </div>

                    <button onClick={handlePlayAll} className="btn-secondary" aria-label="Reproducir todo" disabled={filtered.length === 0}>
                        <Play className="h-4 w-4" />
                        Reproducir todo
                    </button>
                </div>
            </section>

            <section className="space-y-3">
                {!hasGroup ? (
                    <EmptyState
                        icon={<Music className="h-7 w-7" />}
                        title="Sin grupo activo"
                        description="Selecciona o crea un grupo antes de gestionar la musica."
                    />
                ) : isLoading ? (
                    <ListSkeleton count={6} />
                ) : error ? (
                    <section className="card border border-red-400/20 bg-red-400/8 p-4">
                        <div className="flex items-start gap-3">
                            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-300" />
                            <div className="min-w-0 flex-1">
                                <p className="text-sm font-semibold text-red-200">No pudimos cargar la biblioteca</p>
                                <p className="mt-1 text-sm text-red-100/80">
                                    {error instanceof Error ? error.message : 'La consulta de canciones fallo y no vamos a ocultarlo como si no hubiera datos.'}
                                </p>
                            </div>
                            <button onClick={() => void refetch()} className="btn-secondary !min-h-[2.5rem]">
                                Reintentar
                            </button>
                        </div>
                    </section>
                ) : filtered.length === 0 ? (
                    <EmptyState
                        icon={<Music className="h-7 w-7" />}
                        title={songs?.length === 0 ? 'Sin canciones' : 'Sin resultados'}
                        description={
                            songs?.length === 0
                                ? 'Sube la primera cancion del grupo.'
                                : 'Prueba otra busqueda.'
                        }
                        action={
                            songs?.length === 0 ? (
                                <button onClick={() => setShowUpload(true)} className="btn-primary">
                                    <Upload className="h-4 w-4" />
                                    Subir cancion
                                </button>
                            ) : undefined
                        }
                    />
                ) : (
                    <>
                        <div className="flex items-center justify-between gap-3">
                            <h2 className="text-2xl font-headline font-extrabold text-white">Biblioteca</h2>
                            <span className="hero-meta-pill">{filtered.length} resultados</span>
                        </div>

                        <div className="space-y-3">
                            {filtered.map((song, index) => (
                                <SongCard
                                    key={song.id}
                                    song={song}
                                    onPlay={() => setQueue(filtered, index)}
                                    onEdit={() => setEditingSong(song)}
                                />
                            ))}
                        </div>
                    </>
                )}
            </section>

            {showUpload ? <SongUploadForm onClose={() => setShowUpload(false)} /> : null}
            {editingSong ? <EditSongForm song={editingSong} onClose={() => setEditingSong(null)} /> : null}
        </div>
    )
}

export default MusicPage
