import React, { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Play, Plus, Trash2, Edit2 } from 'lucide-react'
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
import { Music, ListMusic } from 'lucide-react'

const PlaylistDetailPage: React.FC = () => {
    const { playlistId } = useParams<{ playlistId: string }>()
    const navigate = useNavigate()
    const { userId } = useAuth()
    const { groupId } = useActiveGroup()
    const { success, error: toastError } = useToast()
    const queryClient = useQueryClient()
    const setQueue = usePlayerStore((s) => s.setQueue)

    const [showEditForm, setShowEditForm] = useState(false)
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
    const [showAddSongs, setShowAddSongs] = useState(false)

    const { data: playlist, isLoading } = useQuery({
        queryKey: ['playlist', playlistId],
        queryFn: () => playlistsService.getPlaylist(playlistId!),
        enabled: !!playlistId,
    })

    const { data: allSongs } = useQuery({
        queryKey: ['songs', groupId],
        queryFn: () => songsService.getSongs(groupId!, userId!),
        enabled: !!groupId && showAddSongs,
    })

    const { mutate: deletePlaylist, isPending: isDeleting } = useMutation({
        mutationFn: () => playlistsService.deletePlaylist(playlistId!),
        onSuccess: () => {
            success('Playlist eliminada')
            navigate(-1)
        },
        onError: () => toastError('Error', 'No se pudo eliminar la playlist.'),
    })

    const { mutate: addSong } = useMutation({
        mutationFn: (songId: string) => playlistsService.addSong(playlistId!, songId, userId!),
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: ['playlist', playlistId] })
            success('Canción añadida')
        },
        onError: () => toastError('Error', 'No se pudo añadir la canción.'),
    })

    const { mutate: removeSong } = useMutation({
        mutationFn: (songId: string) => playlistsService.removeSong(playlistId!, songId),
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: ['playlist', playlistId] })
            success('Canción eliminada')
        },
        onError: () => toastError('Error', 'No se pudo eliminar la canción.'),
    })

    if (isLoading) {
        return (
            <div className="p-4 flex items-center justify-center h-64">
                <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
            </div>
        )
    }

    if (!playlist) {
        return <div className="p-4 text-gray-400">Playlist no encontrada.</div>
    }

    const songs = playlist.songs?.map((ps) => ps.song!).filter(Boolean) ?? []
    const isOwner = playlist.created_by === userId

    return (
        <div className="p-4 md:p-6 max-w-xl mx-auto space-y-5 animate-fade-in">
            <button onClick={() => navigate(-1)} className="btn-ghost gap-2 -ml-1">
                <ArrowLeft className="w-4 h-4" /> Volver
            </button>

            {/* Header */}
            <div className="flex items-start gap-4">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-brand-600 to-accent-purple flex items-center justify-center flex-shrink-0">
                    <ListMusic className="w-9 h-9 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                    <h1 className="text-xl font-bold text-white">{playlist.name}</h1>
                    {playlist.description && (
                        <p className="text-sm text-gray-400 mt-0.5">{playlist.description}</p>
                    )}
                    <p className="text-xs text-gray-500 mt-1">
                        {songs.length} {songs.length === 1 ? 'canción' : 'canciones'}
                    </p>
                </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2 flex-wrap">
                {songs.length > 0 && (
                    <button
                        onClick={() => setQueue(songs, 0)}
                        className="btn-primary gap-2"
                    >
                        <Play className="w-4 h-4" />
                        Reproducir todo
                    </button>
                )}
                {isOwner && (
                    <>
                        <button onClick={() => setShowAddSongs((p) => !p)} className="btn-secondary gap-2">
                            <Plus className="w-4 h-4" />
                            Añadir canciones
                        </button>
                        <button onClick={() => setShowEditForm(true)} className="btn-ghost p-2.5">
                            <Edit2 className="w-4 h-4" />
                        </button>
                        <button onClick={() => setShowDeleteConfirm(true)} className="btn-ghost p-2.5 text-red-400">
                            <Trash2 className="w-4 h-4" />
                        </button>
                    </>
                )}
            </div>

            {/* Add songs panel */}
            {showAddSongs && allSongs && (
                <div className="card p-4 space-y-2">
                    <h3 className="text-sm font-semibold text-white mb-3">Añadir del grupo</h3>
                    {allSongs
                        .filter((s) => !songs.some((ps) => ps.id === s.id))
                        .map((song) => (
                            <div key={song.id} className="flex items-center gap-3">
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm text-white truncate">{song.title}</p>
                                    <p className="text-xs text-gray-400">{song.artist_name}</p>
                                </div>
                                <button
                                    onClick={() => addSong(song.id)}
                                    className="btn-ghost p-1.5 rounded-lg"
                                    aria-label="Añadir"
                                >
                                    <Plus className="w-4 h-4" />
                                </button>
                            </div>
                        ))}
                    {allSongs.filter((s) => !songs.some((ps) => ps.id === s.id)).length === 0 && (
                        <p className="text-xs text-gray-400">Todas las canciones del grupo ya están en la playlist.</p>
                    )}
                </div>
            )}

            {/* Song list */}
            {songs.length === 0 ? (
                <EmptyState
                    icon={<Music className="w-7 h-7" />}
                    title="Playlist vacía"
                    description="Añade canciones del grupo para empezar a reproducir."
                />
            ) : (
                <div className="space-y-2">
                    {songs.map((song, idx) => (
                        <div key={song.id} className="relative group/remove">
                            <SongCard
                                song={song}
                                onPlay={() => setQueue(songs, idx)}
                            />
                            {isOwner && (
                                <button
                                    onClick={() => removeSong(song.id)}
                                    className="absolute top-2 right-2 p-1.5 rounded-lg bg-surface-700 text-red-400 hover:text-red-300 opacity-0 group-hover/remove:opacity-100 transition-opacity"
                                    aria-label="Quitar de la playlist"
                                >
                                    <Trash2 className="w-3.5 h-3.5" />
                                </button>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {/* Edit form */}
            {showEditForm && (
                <PlaylistForm existing={playlist} onClose={() => setShowEditForm(false)} />
            )}

            {/* Delete confirm */}
            <ConfirmDialog
                isOpen={showDeleteConfirm}
                title="Eliminar playlist"
                description={`¿Seguro que quieres eliminar "${playlist.name}"? Las canciones no se borrarán.`}
                confirmLabel="Eliminar playlist"
                isLoading={isDeleting}
                onConfirm={() => deletePlaylist()}
                onCancel={() => setShowDeleteConfirm(false)}
            />
        </div>
    )
}

export default PlaylistDetailPage
