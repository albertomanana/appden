import React, { useMemo, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { AlertCircle, ArrowLeft, Edit2, ListMusic, Music, Play, Plus, Trash2 } from 'lucide-react'
import { playlistsService } from '@services/playlists.service'
import { songsService } from '@services/songs.service'
import { useAuth } from '@hooks/useAuth'
import { useActiveGroup } from '@hooks/useActiveGroup'
import { usePlayerStore } from '@app/store/player.store'
import { useToast } from '@components/ui/Toast'
import { ConfirmDialog } from '@components/ui/ConfirmDialog'
import { SongCard } from '@components/music/SongCard'
import { PlaylistForm } from '@components/playlists/PlaylistForm'
import { EmptyState } from '@components/ui/EmptyState'
import { PageHeader } from '@components/ui/PageHeader'

const PlaylistDetailPage: React.FC = () => {
    const { playlistId } = useParams<{ playlistId: string }>()
    const navigate = useNavigate()
    const { userId } = useAuth()
    const { groupId } = useActiveGroup()
    const { success, error: toastError } = useToast()
    const queryClient = useQueryClient()
    const setQueue = usePlayerStore((state) => state.setQueue)

    const [showEditForm, setShowEditForm] = useState(false)
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
    const [showAddSongs, setShowAddSongs] = useState(false)

    const {
        data: playlist,
        isLoading,
        error,
        refetch,
    } = useQuery({
        queryKey: ['playlist', playlistId, userId],
        queryFn: () => playlistsService.getPlaylist(playlistId!, userId!),
        enabled: !!playlistId && !!userId,
    })

    const {
        data: allSongs,
        error: allSongsError,
    } = useQuery({
        queryKey: ['songs', groupId, userId],
        queryFn: () => songsService.getSongs(groupId!, userId!),
        enabled: !!groupId && !!userId && showAddSongs,
    })

    const songs = useMemo(
        () =>
            (playlist?.songs ?? [])
                .map((entry) => entry.song)
                .filter((song): song is NonNullable<typeof song> => !!song),
        [playlist]
    )

    const availableSongs = useMemo(
        () => (allSongs ?? []).filter((song) => !songs.some((playlistSong) => playlistSong.id === song.id)),
        [allSongs, songs]
    )

    const { mutate: deletePlaylist, isPending: isDeleting } = useMutation({
        mutationFn: () => playlistsService.deletePlaylist(playlistId!),
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: ['playlists', groupId] })
            success('Playlist eliminada')
            navigate(-1)
        },
        onError: () => toastError('Error', 'No se pudo eliminar la playlist.'),
    })

    const { mutate: addSong } = useMutation({
        mutationFn: (songId: string) => playlistsService.addSong(playlistId!, songId, userId!),
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: ['playlist', playlistId] })
            void queryClient.invalidateQueries({ queryKey: ['playlists', groupId] })
            success('Cancion anadida')
        },
        onError: (err) => {
            toastError('Error', err instanceof Error ? err.message : 'No se pudo anadir la cancion.')
        },
    })

    const { mutate: removeSong } = useMutation({
        mutationFn: (songId: string) => playlistsService.removeSong(playlistId!, songId),
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: ['playlist', playlistId] })
            void queryClient.invalidateQueries({ queryKey: ['playlists', groupId] })
            success('Cancion eliminada')
        },
        onError: () => toastError('Error', 'No se pudo eliminar la cancion.'),
    })

    if (isLoading) {
        return (
            <div className="p-4 flex items-center justify-center h-64">
                <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
            </div>
        )
    }

    if (error) {
        return (
            <div className="page-shell max-w-3xl">
                <section className="card border border-red-400/20 bg-red-400/8 p-4">
                    <div className="flex items-start gap-3">
                        <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-300" />
                        <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold text-red-200">No pudimos cargar la playlist</p>
                            <p className="mt-1 text-sm text-red-100/80">
                                {error instanceof Error ? error.message : 'La playlist fallo al hidratarse.'}
                            </p>
                        </div>
                        <button onClick={() => void refetch()} className="btn-secondary !min-h-[2.5rem]">
                            Reintentar
                        </button>
                    </div>
                </section>
            </div>
        )
    }

    if (!playlist) {
        return <div className="page-shell text-gray-400">Playlist no encontrada.</div>
    }

    const isOwner = playlist.created_by === userId

    return (
        <div className="page-shell max-w-3xl space-y-5 animate-fade-in">
            <button onClick={() => navigate(-1)} className="btn-ghost gap-2 -ml-1">
                <ArrowLeft className="w-4 h-4" /> Volver
            </button>

            <PageHeader
                kicker="Playlist"
                title={playlist.name}
                description={playlist.description?.trim() || 'Coleccion lista para reproducir con canciones reales del grupo.'}
                meta={
                    <>
                        <span className="hero-meta-pill">
                            <ListMusic className="h-3.5 w-3.5 text-brand-400" />
                            {songs.length} {songs.length === 1 ? 'cancion' : 'canciones'}
                        </span>
                        <span className="hero-meta-pill">
                            {playlist.creator?.display_name ?? 'Grupo'}
                        </span>
                    </>
                }
            />

            <div className="flex gap-2 flex-wrap">
                {songs.length > 0 ? (
                    <button onClick={() => setQueue(songs, 0)} className="btn-primary gap-2">
                        <Play className="w-4 h-4" />
                        Reproducir todo
                    </button>
                ) : null}
                {isOwner ? (
                    <>
                        <button onClick={() => setShowAddSongs((value) => !value)} className="btn-secondary gap-2">
                            <Plus className="w-4 h-4" />
                            Anadir canciones
                        </button>
                        <button onClick={() => setShowEditForm(true)} className="btn-ghost p-2.5">
                            <Edit2 className="w-4 h-4" />
                        </button>
                        <button onClick={() => setShowDeleteConfirm(true)} className="btn-ghost p-2.5 text-red-400">
                            <Trash2 className="w-4 h-4" />
                        </button>
                    </>
                ) : null}
            </div>

            {showAddSongs ? (
                <div className="card p-4 space-y-3">
                    <h3 className="text-sm font-semibold text-white">Anadir canciones del grupo</h3>
                    {allSongsError ? (
                        <p className="text-sm text-red-300">
                            {allSongsError instanceof Error ? allSongsError.message : 'No pudimos cargar las canciones disponibles.'}
                        </p>
                    ) : availableSongs.length === 0 ? (
                        <p className="text-xs text-gray-400">Todas las canciones del grupo ya estan en la playlist.</p>
                    ) : (
                        availableSongs.map((song) => (
                            <div key={song.id} className="flex items-center gap-3 rounded-xl border border-surface-500 bg-surface-700/50 p-3">
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm text-white truncate">{song.title}</p>
                                    <p className="text-xs text-gray-400 truncate">{song.artist_name}</p>
                                </div>
                                <button
                                    onClick={() => addSong(song.id)}
                                    className="btn-ghost p-1.5 rounded-lg"
                                    aria-label="Anadir"
                                >
                                    <Plus className="w-4 h-4" />
                                </button>
                            </div>
                        ))
                    )}
                </div>
            ) : null}

            {songs.length === 0 ? (
                <EmptyState
                    icon={<Music className="w-7 h-7" />}
                    title="Playlist vacia"
                    description="Anade canciones del grupo para empezar a reproducir."
                />
            ) : (
                <div className="space-y-2">
                    {songs.map((song, index) => (
                        <div key={song.id} className="relative group/remove">
                            <SongCard song={song} onPlay={() => setQueue(songs, index)} />
                            {isOwner ? (
                                <button
                                    onClick={() => removeSong(song.id)}
                                    className="absolute top-2 right-2 p-1.5 rounded-lg bg-surface-700 text-red-400 hover:text-red-300 opacity-0 group-hover/remove:opacity-100 transition-opacity"
                                    aria-label="Quitar de la playlist"
                                >
                                    <Trash2 className="w-3.5 h-3.5" />
                                </button>
                            ) : null}
                        </div>
                    ))}
                </div>
            )}

            {showEditForm ? <PlaylistForm existing={playlist} onClose={() => setShowEditForm(false)} /> : null}

            <ConfirmDialog
                isOpen={showDeleteConfirm}
                title="Eliminar playlist"
                description={`Seguro que quieres eliminar \"${playlist.name}\"? Las canciones no se borraran.`}
                confirmLabel="Eliminar playlist"
                isLoading={isDeleting}
                onConfirm={() => deletePlaylist()}
                onCancel={() => setShowDeleteConfirm(false)}
            />
        </div>
    )
}

export default PlaylistDetailPage
