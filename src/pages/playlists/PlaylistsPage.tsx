import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { AlertCircle, ListMusic, Plus } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useActiveGroup } from '@hooks/useActiveGroup'
import { playlistsService } from '@services/playlists.service'
import { EmptyState } from '@components/ui/EmptyState'
import { ListSkeleton } from '@components/ui/LoadingSkeleton'
import { PlaylistForm } from '@components/playlists/PlaylistForm'
import { ROUTES } from '@lib/constants'
import type { Playlist } from '@/types'

const PlaylistCard: React.FC<{ playlist: Playlist }> = ({ playlist }) => (
    <Link to={ROUTES.PLAYLIST(playlist.id)} className="card-interactive flex items-center gap-3 p-3">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-brand-600 to-accent-purple flex-shrink-0 flex items-center justify-center overflow-hidden">
            {playlist.cover_url ? (
                <img src={playlist.cover_url} alt={playlist.name} className="w-full h-full object-cover" />
            ) : (
                <ListMusic className="w-5 h-5 text-white" />
            )}
        </div>
        <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white truncate">{playlist.name}</p>
            {playlist.description ? <p className="text-xs text-gray-400 truncate">{playlist.description}</p> : null}
            <p className="text-[11px] uppercase tracking-[0.18em] text-gray-500 mt-1">
                {playlist.song_count ?? 0} canciones
            </p>
        </div>
    </Link>
)

const PlaylistsPage: React.FC = () => {
    const { groupId, hasGroup } = useActiveGroup()
    const [showForm, setShowForm] = useState(false)

    const {
        data: playlists,
        isLoading,
        error,
        refetch,
    } = useQuery({
        queryKey: ['playlists', groupId],
        queryFn: () => playlistsService.getPlaylists(groupId!),
        enabled: !!groupId,
    })

    return (
        <div className="p-4 md:p-6 space-y-5 animate-fade-in">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="section-title">Playlists</h1>
                    <p className="text-sm text-muted mt-0.5">{playlists?.length ?? 0} playlists</p>
                </div>
                <button onClick={() => setShowForm(true)} className="btn-primary" disabled={!hasGroup}>
                    <Plus className="w-4 h-4" />
                    <span className="hidden sm:inline">Nueva</span>
                </button>
            </div>

            {!hasGroup ? (
                <EmptyState
                    icon={<ListMusic className="w-7 h-7" />}
                    title="Sin grupo activo"
                    description="Selecciona o crea un grupo antes de trabajar con playlists."
                />
            ) : isLoading ? (
                <ListSkeleton count={4} />
            ) : error ? (
                <section className="card border border-red-400/20 bg-red-400/8 p-4">
                    <div className="flex items-start gap-3">
                        <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-300" />
                        <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold text-red-200">No pudimos cargar las playlists</p>
                            <p className="mt-1 text-sm text-red-100/80">
                                {error instanceof Error ? error.message : 'La consulta de playlists fallo.'}
                            </p>
                        </div>
                        <button onClick={() => void refetch()} className="btn-secondary !min-h-[2.5rem]">
                            Reintentar
                        </button>
                    </div>
                </section>
            ) : !playlists || playlists.length === 0 ? (
                <EmptyState
                    icon={<ListMusic className="w-7 h-7" />}
                    title="Sin playlists"
                    description="Crea tu primera playlist y agrupa canciones del grupo."
                    action={
                        <button onClick={() => setShowForm(true)} className="btn-primary">
                            <Plus className="w-4 h-4" /> Crear playlist
                        </button>
                    }
                />
            ) : (
                <div className="space-y-2">
                    {playlists.map((playlist) => <PlaylistCard key={playlist.id} playlist={playlist} />)}
                </div>
            )}

            {showForm ? <PlaylistForm onClose={() => setShowForm(false)} /> : null}
        </div>
    )
}

export default PlaylistsPage
