import React, { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Plus, Music, Search, Upload, Play, Sparkles, Clock3, Heart } from 'lucide-react'
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
    const setQueue = usePlayerStore((s) => s.setQueue)

    const { data: songs, isLoading } = useQuery({
        queryKey: ['songs', groupId],
        queryFn: () => songsService.getSongs(groupId!, userId!),
        enabled: !!groupId && !!userId,
    })

    const filtered = useMemo(() => {
        const source = songs ?? []
        const byText = source.filter(
            (s) =>
                s.title.toLowerCase().includes(search.toLowerCase()) ||
                s.artist_name.toLowerCase().includes(search.toLowerCase())
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

    const favoritesCount = useMemo(
        () => (songs ?? []).filter((song) => song.is_favorite).length,
        [songs]
    )

    const handlePlayAll = () => {
        if (filtered.length > 0) setQueue(filtered, 0)
    }

    return (
        <div className="p-4 md:p-6 space-y-5 animate-fade-in">
            <section className="relative overflow-hidden card p-4 md:p-5">
                <div className="absolute -top-14 -right-16 w-52 h-52 rounded-full bg-brand-500/20 blur-3xl pointer-events-none" />
                <div className="absolute -bottom-16 -left-14 w-44 h-44 rounded-full bg-cyan-500/15 blur-3xl pointer-events-none" />

                <div className="relative flex items-start justify-between gap-4">
                    <div>
                        <h1 className="section-title">Musica</h1>
                        <p className="text-sm text-muted mt-0.5">Biblioteca del grupo y reproduccion social</p>
                        {songs ? (
                            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-gray-300">
                                <span className="badge-brand">{songs.length} canciones</span>
                                <span className="badge-green inline-flex items-center gap-1">
                                    <Heart className="w-3 h-3" /> {favoritesCount} favoritas
                                </span>
                            </div>
                        ) : null}
                    </div>

                    <button
                        onClick={() => setShowUpload(true)}
                        className="btn-primary"
                        disabled={!hasGroup}
                        aria-label="Subir cancion"
                    >
                        <Plus className="w-4 h-4" />
                        <span className="hidden sm:inline">Subir</span>
                    </button>
                </div>

                <div className="relative mt-4 flex flex-wrap items-center gap-2 text-xs">
                    <span className="text-gray-300">Tema visual:</span>
                    <button
                        type="button"
                        onClick={() => setTheme('dark')}
                        className={`px-2.5 py-1 rounded-full border ${theme === 'dark' ? 'bg-brand-500/20 border-brand-400/50 text-brand-100' : 'border-surface-400 text-gray-300'}`}
                    >
                        Dark
                    </button>
                    <button
                        type="button"
                        onClick={() => setTheme('neon')}
                        className={`px-2.5 py-1 rounded-full border ${theme === 'neon' ? 'bg-brand-500/20 border-brand-400/50 text-brand-100' : 'border-surface-400 text-gray-300'}`}
                    >
                        Neon
                    </button>
                    <button
                        type="button"
                        onClick={() => setTheme('minimal')}
                        className={`px-2.5 py-1 rounded-full border ${theme === 'minimal' ? 'bg-brand-500/20 border-brand-400/50 text-brand-100' : 'border-surface-400 text-gray-300'}`}
                    >
                        Minimal
                    </button>
                </div>
            </section>

            {songs && songs.length > 0 ? (
                <section className="space-y-3">
                    <div className="flex flex-col sm:flex-row gap-2">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                            <input
                                type="search"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Buscar canciones o artistas..."
                                className="input pl-9"
                            />
                        </div>
                        <button onClick={handlePlayAll} className="btn-secondary flex-shrink-0" aria-label="Reproducir todo">
                            <Play className="w-4 h-4" />
                            <span className="hidden sm:inline">Play all</span>
                        </button>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        <button
                            type="button"
                            onClick={() => setFilter('all')}
                            className={`px-3 py-1.5 rounded-full text-xs border transition-colors ${
                                filter === 'all'
                                    ? 'bg-brand-500/20 text-brand-200 border-brand-400/50'
                                    : 'bg-surface-700 text-gray-300 border-surface-500'
                            }`}
                        >
                            <Sparkles className="w-3.5 h-3.5 inline mr-1" /> Todas
                        </button>
                        <button
                            type="button"
                            onClick={() => setFilter('favorites')}
                            className={`px-3 py-1.5 rounded-full text-xs border transition-colors ${
                                filter === 'favorites'
                                    ? 'bg-brand-500/20 text-brand-200 border-brand-400/50'
                                    : 'bg-surface-700 text-gray-300 border-surface-500'
                            }`}
                        >
                            <Heart className="w-3.5 h-3.5 inline mr-1" /> Favoritas
                        </button>
                        <button
                            type="button"
                            onClick={() => setFilter('recent')}
                            className={`px-3 py-1.5 rounded-full text-xs border transition-colors ${
                                filter === 'recent'
                                    ? 'bg-brand-500/20 text-brand-200 border-brand-400/50'
                                    : 'bg-surface-700 text-gray-300 border-surface-500'
                            }`}
                        >
                            <Clock3 className="w-3.5 h-3.5 inline mr-1" /> Ultimos 7 dias
                        </button>

                        <select
                            value={sortBy}
                            onChange={(event) => setSortBy(event.target.value as SongSort)}
                            className="ml-auto bg-surface-700 border border-surface-500 text-gray-200 text-xs rounded-full px-3 py-1.5"
                        >
                            <option value="recent">Orden: Recientes</option>
                            <option value="title">Orden: Titulo</option>
                            <option value="artist">Orden: Artista</option>
                        </select>
                    </div>
                </section>
            ) : null}

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
                <div className="space-y-2">
                    {filtered.map((song, idx) => (
                        <SongCard
                            key={song.id}
                            song={song}
                            onPlay={() => setQueue(filtered, idx)}
                            onEdit={() => setEditingSong(song)}
                        />
                    ))}
                </div>
            )}

            {groupId ? <GroupActivityFeed groupId={groupId} /> : null}

            {showUpload ? <SongUploadForm onClose={() => setShowUpload(false)} /> : null}
            {editingSong ? <EditSongForm song={editingSong} onClose={() => setEditingSong(null)} /> : null}
        </div>
    )
}

export default MusicPage
