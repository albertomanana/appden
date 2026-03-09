import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, ListMusic } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAuth } from '@hooks/useAuth'
import { useActiveGroup } from '@hooks/useActiveGroup'
import { playlistsService } from '@services/playlists.service'
import { EmptyState } from '@components/ui/EmptyState'
import { PlaylistCardSkeleton, ListSkeleton } from '@components/ui/LoadingSkeleton'
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
            {playlist.description && <p className="text-xs text-gray-400 truncate">{playlist.description}</p>}
        </div>
    </Link>
)

const PlaylistsPage: React.FC = () => {
    const { groupId, hasGroup } = useActiveGroup()
    const [showForm, setShowForm] = useState(false)

    const { data: playlists, isLoading } = useQuery({
        queryKey: ['playlists', groupId],
        queryFn: () => playlistsService.getPlaylists(groupId!),
        enabled: !!groupId,
    })

    return (
        <div className="p-4 md:p-6 space-y-5 animate-fade-in">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="section-title">Playlists</h1>
                    {playlists && <p className="text-sm text-muted mt-0.5">{playlists.length} playlists</p>}
                </div>
                <button onClick={() => setShowForm(true)} className="btn-primary" disabled={!hasGroup}>
                    <Plus className="w-4 h-4" />
                    <span className="hidden sm:inline">Nueva</span>
                </button>
            </div>

            {isLoading ? (
                <ListSkeleton count={4} />
            ) : !playlists || playlists.length === 0 ? (
                <EmptyState
                    icon={<ListMusic className="w-7 h-7" />}
                    title="Sin playlists todavía"
                    description="Crea tu primera playlist y agrupa canciones del grupo."
                    action={hasGroup ? (
                        <button onClick={() => setShowForm(true)} className="btn-primary">
                            <Plus className="w-4 h-4" /> Crear playlist
                        </button>
                    ) : undefined}
                />
            ) : (
                <div className="space-y-2">
                    {playlists.map((p) => <PlaylistCard key={p.id} playlist={p} />)}
                </div>
            )}

            {showForm && <PlaylistForm onClose={() => setShowForm(false)} />}
        </div>
    )
}

export default PlaylistsPage
