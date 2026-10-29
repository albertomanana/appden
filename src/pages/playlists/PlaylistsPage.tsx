import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { AlertCircle, ListMusic, Plus } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useActiveGroup } from '@hooks/useActiveGroup'
import { playlistsService } from '@services/playlists.service'
import { EmptyState } from '@components/ui/EmptyState'
import { ListSkeleton } from '@components/ui/LoadingSkeleton'
import { PlaylistForm } from '@components/playlists/PlaylistForm'
import { PageHeader } from '@components/ui/PageHeader'
import { MusicTabs } from '@components/music/MusicTabs'
import { ROUTES } from '@lib/constants'
import type { Playlist } from '@/types'

const PlaylistCard: React.FC<{ playlist: Playlist }> = ({ playlist }) => (
    <Link to={ROUTES.PLAYLIST(playlist.id)} className="card-interactive flex items-center gap-4 p-4">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-[1.2rem] bg-gradient-to-br from-brand-600 to-accent-purple">
            {playlist.cover_url ? (
                <img src={playlist.cover_url} alt={playlist.name} className="h-full w-full object-cover" />
            ) : (
                <ListMusic className="h-5 w-5 text-white" />
            )}
        </div>
        <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-white">{playlist.name}</p>
            <p className="mt-1 truncate text-sm text-gray-400">
                {playlist.description?.trim() || 'Coleccion del grupo lista para reproducir.'}
            </p>
            <p className="mt-2 text-[11px] uppercase tracking-[0.18em] text-gray-500">
                {playlist.creator?.display_name ?? 'Grupo'} · {playlist.song_count ?? 0} canciones
            </p>
        </div>
        <div className="hero-meta-pill !px-3 !py-1">
            {playlist.song_count ?? 0}
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
        <div className="page-shell animate-fade-in">
            <PageHeader
                title="Música"
                description="Listas para escuchar juntos"
                meta={<span className="hero-meta-pill">{playlists?.length ?? 0} playlists</span>}
                actions={
                    <button onClick={() => setShowForm(true)} className="btn-primary" disabled={!hasGroup}>
                        <Plus className="h-4 w-4" />
                        Nueva playlist
                    </button>
                }
            />
            <MusicTabs active="playlists" />

            <section className="space-y-3">
                {!hasGroup ? (
                    <EmptyState
                        icon={<ListMusic className="w-7 h-7" />}
                        title="Sin grupo activo"
                        description="Elige un grupo arriba para ver sus playlists."
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
                        description="Crea la primera playlist del grupo con vuestras canciones favoritas."
                        action={
                            <button onClick={() => setShowForm(true)} className="btn-primary">
                                <Plus className="w-4 h-4" /> Crear playlist
                            </button>
                        }
                    />
                ) : (
                    <>
                        <div className="flex items-center justify-between gap-3">
                            <h2 className="text-2xl font-headline font-extrabold text-white">Tus playlists</h2>
                            <span className="hero-meta-pill">{playlists.length} activas</span>
                        </div>

                        <div className="space-y-3">
                            {playlists.map((playlist) => <PlaylistCard key={playlist.id} playlist={playlist} />)}
                        </div>
                    </>
                )}
            </section>

            {showForm ? <PlaylistForm onClose={() => setShowForm(false)} /> : null}
        </div>
    )
}

export default PlaylistsPage
