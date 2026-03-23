import React, { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Clock3, Heart, Music, Play, Plus, Search, Sparkles, Upload } from 'lucide-react'
import { useAuth } from '@hooks/useAuth'
import { useActiveGroup } from '@hooks/useActiveGroup'
import { songsService } from '@services/songs.service'
import { usePlayerStore } from '@app/store/player.store'
import { useAdvancedPlayerStore } from '@features/player/player.store'
import { SongCard } from '@components/music/SongCard'
import { SongUploadForm } from '@components/music/SongUploadForm'
import { EditSongForm } from '@components/music/EditSongForm'
import { GroupActivityFeed } from '@features/social/components/GroupActivityFeed'
import { EmptyState } from '@components/ui/EmptyState'
import { ListSkeleton } from '@components/ui/LoadingSkeleton'
import { PageHeader } from '@components/ui/PageHeader'
import type { Song } from '@/types'

type SongFilter = 'all' | 'favorites' | 'recent'
type SongSort = 'recent' | 'title' | 'artist'

const MusicPage: React.FC = () => {
    const { userId } = useAuth()
    const { groupId, hasGroup } = useActiveGroup()
    const [showUpload, setShowUpload] = useState(false)
    const [editingSong, setEditingSong] = useState<Song | null>(null)
    const [search, setSearch] = useState('')
    const [filter, setFilter] = useState<SongFilter>('all')
    const [sortBy, setSortBy] = useState<SongSort>('recent')
    const theme = useAdvancedPlayerStore((state) => state.theme)
    const setTheme = useAdvancedPlayerStore((state) => state.setTheme)
    const setQueue = usePlayerStore((state) => state.setQueue)

    const { data: songs, isLoading } = useQuery({
        queryKey: ['songs', groupId],
        queryFn: () => songsService.getSongs(groupId!, userId!),
        enabled: !!groupId && !!userId,
    })

    const filtered = useMemo(() => {
        const source = songs ?? []
        const byText = source.filter(
            (song) =>
                song.title.toLowerCase().includes(search.toLowerCase()) ||
                song.artist_name.toLowerCase().includes(search.toLowerCase())
        )

        const byFilter = byText.filter((song) => {
            if (filter === 'favorites') return !!song.is_favorite
            if (filter === 'recent') {
                const createdAt = new Date(song.created_at).getTime()
                const days7 = 1000 * 60 * 60 * 24 * 7
                return Date.now() - createdAt <= days7
            }
            return true
        })

        const sorted = [...byFilter]
        if (sortBy === 'title') {
            sorted.sort((a, b) => a.title.localeCompare(b.title))
        } else if (sortBy === 'artist') {
            sorted.sort((a, b) => a.artist_name.localeCompare(b.artist_name))
        } else {
            sorted.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        }

        return sorted
    }, [songs, search, filter, sortBy])

    const favoritesCount = useMemo(() => (songs ?? []).filter((song) => song.is_favorite).length, [songs])

    const handlePlayAll = () => {
        if (filtered.length > 0) setQueue(filtered, 0)
    }

    return (
        <div className="page-shell animate-fade-in">
            <PageHeader
                kicker="Shared Library"
                title="Musica"
                description="Biblioteca social del grupo con player, actividad y curacion visual integrada sobre la logica existente."
                meta={
                    <>
                        <span className="hero-meta-pill">{songs?.length ?? 0} canciones</span>
                        <span className="hero-meta-pill">{favoritesCount} favoritas</span>
                    </>
                }
                actions={
                    <button onClick={() => setShowUpload(true)} className="btn-primary" disabled={!hasGroup} aria-label="Subir cancion">
                        <Plus className="w-4 h-4" />
                        Subir
                    </button>
                }
            />

            <section className="card p-5 space-y-4">
                <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                        <span className="text-gray-400">Tema visual:</span>
                        {(['dark', 'neon', 'minimal'] as const).map((option) => (
                            <button
                                key={option}
                                type="button"
                                onClick={() => setTheme(option)}
                                className={option === theme ? 'badge-brand' : 'badge bg-white/6 text-gray-300 border border-white/10'}
                            >
                                {option}
                            </button>
                        ))}
                    </div>

                    <div className="grid gap-2 sm:grid-cols-[1fr,auto] xl:min-w-[460px]">
                        <div className="relative">
                            <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
                            <input
                                type="search"
                                value={search}
                                onChange={(event) => setSearch(event.target.value)}
                                placeholder="Buscar canciones o artistas..."
                                className="input pl-11"
                            />
                        </div>
                        <button onClick={handlePlayAll} className="btn-secondary" aria-label="Reproducir todo">
                            <Play className="w-4 h-4" />
                            Play all
                        </button>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    <button
                        type="button"
                        onClick={() => setFilter('all')}
                        className={filter === 'all' ? 'badge-brand' : 'badge bg-white/6 text-gray-300 border border-white/10'}
                    >
                        <Sparkles className="w-3.5 h-3.5" />
                        Todas
                    </button>
                    <button
                        type="button"
                        onClick={() => setFilter('favorites')}
                        className={filter === 'favorites' ? 'badge-brand' : 'badge bg-white/6 text-gray-300 border border-white/10'}
                    >
                        <Heart className="w-3.5 h-3.5" />
                        Favoritas
                    </button>
                    <button
                        type="button"
                        onClick={() => setFilter('recent')}
                        className={filter === 'recent' ? 'badge-brand' : 'badge bg-white/6 text-gray-300 border border-white/10'}
                    >
                        <Clock3 className="w-3.5 h-3.5" />
                        Ultimos 7 dias
                    </button>

                    <select
                        value={sortBy}
                        onChange={(event) => setSortBy(event.target.value as SongSort)}
                        className="input ml-auto max-w-[220px] text-xs"
                    >
                        <option value="recent">Orden: Recientes</option>
                        <option value="title">Orden: Titulo</option>
                        <option value="artist">Orden: Artista</option>
                    </select>
                </div>
            </section>

            <div className="grid gap-4 xl:grid-cols-[1.2fr,0.8fr]">
                <section className="space-y-3">
                    {isLoading ? (
                        <ListSkeleton count={6} />
                    ) : filtered.length === 0 ? (
                        <EmptyState
                            icon={<Music className="w-7 h-7" />}
                            title={songs?.length === 0 ? 'Sin canciones todavia' : 'Sin resultados'}
                            description={
                                songs?.length === 0
                                    ? 'Sube la primera cancion para arrancar la biblioteca del grupo.'
                                    : 'Prueba con otra busqueda o cambia filtros.'
                            }
                            action={
                                songs?.length === 0 && hasGroup ? (
                                    <button onClick={() => setShowUpload(true)} className="btn-primary">
                                        <Upload className="w-4 h-4" />
                                        Subir primera cancion
                                    </button>
                                ) : undefined
                            }
                        />
                    ) : (
                        <>
                            <div className="flex items-center justify-between gap-3">
                                <div>
                                    <p className="page-kicker">Track Stack</p>
                                    <h2 className="mt-2 text-2xl font-headline font-extrabold text-white">Biblioteca visible</h2>
                                </div>
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

                {groupId ? <GroupActivityFeed groupId={groupId} /> : null}
            </div>

            {showUpload ? <SongUploadForm onClose={() => setShowUpload(false)} /> : null}
            {editingSong ? <EditSongForm song={editingSong} onClose={() => setEditingSong(null)} /> : null}
        </div>
    )
}

export default MusicPage
