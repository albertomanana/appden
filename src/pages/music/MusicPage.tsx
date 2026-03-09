import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Music, Search, Upload, Play } from 'lucide-react'
import { useAuth } from '@hooks/useAuth'
import { useActiveGroup } from '@hooks/useActiveGroup'
import { songsService } from '@services/songs.service'
import { usePlayerStore } from '@app/store/player.store'
import { SongCard } from '@components/music/SongCard'
import { SongUploadForm } from '@components/music/SongUploadForm'
import { EmptyState } from '@components/ui/EmptyState'
import { ListSkeleton } from '@components/ui/LoadingSkeleton'

const MusicPage: React.FC = () => {
    const { userId } = useAuth()
    const { groupId, hasGroup } = useActiveGroup()
    const [showUpload, setShowUpload] = useState(false)
    const [search, setSearch] = useState('')
    const setQueue = usePlayerStore((s) => s.setQueue)

    const { data: songs, isLoading } = useQuery({
        queryKey: ['songs', groupId],
        queryFn: () => songsService.getSongs(groupId!, userId!),
        enabled: !!groupId && !!userId,
    })

    const filtered = songs?.filter(
        (s) =>
            s.title.toLowerCase().includes(search.toLowerCase()) ||
            s.artist_name.toLowerCase().includes(search.toLowerCase())
    ) ?? []

    const handlePlayAll = () => {
        if (filtered.length > 0) setQueue(filtered, 0)
    }

    return (
        <div className="p-4 md:p-6 space-y-5 animate-fade-in">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="section-title">Música</h1>
                    {songs && <p className="text-sm text-muted mt-0.5">{songs.length} canciones</p>}
                </div>
                <button
                    onClick={() => setShowUpload(true)}
                    className="btn-primary"
                    disabled={!hasGroup}
                    aria-label="Subir canción"
                >
                    <Plus className="w-4 h-4" />
                    <span className="hidden sm:inline">Subir</span>
                </button>
            </div>

            {/* Search + Play all */}
            {songs && songs.length > 0 && (
                <div className="flex gap-2">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                        <input
                            type="search"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Buscar canciones..."
                            className="input pl-9"
                        />
                    </div>
                    <button onClick={handlePlayAll} className="btn-secondary flex-shrink-0" aria-label="Reproducir todo">
                        <Play className="w-4 h-4" />
                        <span className="hidden sm:inline">Todo</span>
                    </button>
                </div>
            )}

            {/* Song list */}
            {isLoading ? (
                <ListSkeleton count={5} />
            ) : filtered.length === 0 ? (
                <EmptyState
                    icon={<Music className="w-7 h-7" />}
                    title={songs?.length === 0 ? 'Sin canciones todavía' : 'Sin resultados'}
                    description={
                        songs?.length === 0
                            ? 'Sé el primero en subir una canción al grupo.'
                            : 'Prueba con otra búsqueda.'
                    }
                    action={
                        songs?.length === 0 && hasGroup ? (
                            <button onClick={() => setShowUpload(true)} className="btn-primary">
                                <Upload className="w-4 h-4" />
                                Subir primera canción
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
                        />
                    ))}
                </div>
            )}

            {/* Upload modal */}
            {showUpload && (
                <SongUploadForm onClose={() => setShowUpload(false)} />
            )}
        </div>
    )
}

export default MusicPage
