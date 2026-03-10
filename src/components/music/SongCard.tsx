import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { Play, Pause, Heart, Trash2, Edit2, Music } from 'lucide-react'
import { usePlayerStore } from '@app/store/player.store'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { favoritesService } from '@services/favorites.service'
import { songsService } from '@services/songs.service'
import { useAuth } from '@hooks/useAuth'
import { useActiveGroup } from '@hooks/useActiveGroup'
import { useToast } from '@components/ui/Toast'
import { formatDuration, formatRelative, cn } from '@lib/utils'
import { ROUTES } from '@lib/constants'
import { ConfirmDialog } from '@components/ui/ConfirmDialog'
import type { Song } from '@/types'

interface SongCardProps {
    song: Song
    onPlay: () => void
    showArtist?: boolean
    onEdit?: () => void
}

export const SongCard: React.FC<SongCardProps> = ({ song, onPlay, showArtist = true, onEdit }) => {
    const { userId } = useAuth()
    const { groupId } = useActiveGroup()
    const { currentSong, isPlaying } = usePlayerStore()
    const { success, error: toastError } = useToast()
    const queryClient = useQueryClient()
    const isCurrentSong = currentSong?.id === song.id
    const isThisPlaying = isCurrentSong && isPlaying
    const isOwner = userId === song.uploaded_by
    const [showDeleteDialog, setShowDeleteDialog] = useState(false)

    const { mutate: toggleFavorite, isPending } = useMutation({
        mutationFn: async () => {
            if (!userId) return
            if (song.is_favorite) {
                await favoritesService.removeFavorite(userId, song.id)
            } else {
                await favoritesService.addFavorite(userId, song.id)
            }
        },
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: ['songs', groupId] })
            void queryClient.invalidateQueries({ queryKey: ['favorites'] })
        },
        onError: () => {
            toastError('Error', 'No se pudo actualizar favoritos.')
        },
    })

    const { mutate: deleteSong, isPending: isDeleting } = useMutation({
        mutationFn: async () => {
            await songsService.deleteSong(song.id)
        },
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: ['songs', groupId] })
            success('Canción', 'Canción eliminada correctamente')
            setShowDeleteDialog(false)
        },
        onError: () => {
            toastError('Error', 'No se pudo eliminar la canción')
        },
    })

    return (
        <>
            <div
                className={cn(
                    'card-interactive flex items-center gap-3 p-3 group',
                    isCurrentSong && 'border-brand-500/40 bg-brand-500/5'
                )}
            >
                {/* Play button / Cover art */}
                <button
                    onClick={onPlay}
                    className="relative w-12 h-12 rounded-xl overflow-hidden flex-shrink-0 bg-surface-600 group/play"
                    aria-label={isThisPlaying ? 'Pausar' : 'Reproducir'}
                >
                    {song.cover_url ? (
                        <img src={song.cover_url} alt={song.title} className="w-full h-full object-cover" />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center">
                            <Music className="w-5 h-5 text-gray-500" />
                        </div>
                    )}
                    {/* Play overlay */}
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover/play:opacity-100 transition-opacity">
                        {isThisPlaying
                            ? <Pause className="w-5 h-5 text-white" />
                            : <Play className="w-5 h-5 text-white ml-0.5" />
                        }
                    </div>
                    {/* Now playing indicator */}
                    {isThisPlaying && (
                        <div className="absolute bottom-1 right-1 w-2 h-2 bg-brand-400 rounded-full animate-pulse-slow" />
                    )}
                </button>

                {/* Song info */}
                <Link to={ROUTES.SONG(song.id)} className="flex-1 min-w-0">
                    <p className={cn('text-sm font-semibold truncate', isCurrentSong ? 'text-brand-400' : 'text-white')}>
                        {song.title}
                    </p>
                    {showArtist && <p className="text-xs text-gray-400 truncate">{song.artist_name}</p>}
                </Link>

                {/* Duration */}
                <span className="text-xs text-gray-500 flex-shrink-0">
                    {formatDuration(song.duration_seconds)}
                </span>

                {/* Action buttons */}
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {/* Favorite button */}
                    <button
                        onClick={() => toggleFavorite()}
                        disabled={isPending}
                        aria-label={song.is_favorite ? 'Quitar de favoritos' : 'Añadir a favoritos'}
                        className={cn(
                            'p-1.5 rounded-lg transition-all duration-200',
                            song.is_favorite
                                ? 'text-pink-400 hover:text-pink-300'
                                : 'text-gray-600 hover:text-gray-400'
                        )}
                    >
                        <Heart className={cn('w-4 h-4', song.is_favorite && 'fill-current')} />
                    </button>

                    {/* Edit button (only for owner) */}
                    {isOwner && onEdit && (
                        <button
                            onClick={onEdit}
                            className="p-1.5 rounded-lg text-gray-600 hover:text-blue-400 transition-colors"
                            aria-label="Editar"
                        >
                            <Edit2 className="w-4 h-4" />
                        </button>
                    )}

                    {/* Delete button (only for owner) */}
                    {isOwner && (
                        <button
                            onClick={() => setShowDeleteDialog(true)}
                            className="p-1.5 rounded-lg text-gray-600 hover:text-red-400 transition-colors"
                            aria-label="Eliminar"
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>
                    )}
                </div>
            </div>

            {/* Delete confirmation dialog */}
            <ConfirmDialog
                isOpen={showDeleteDialog}
                title="Eliminar canción"
                description={`¿Estás seguro de que quieres eliminar "${song.title}"? Esta acción no se puede deshacer.`}
                variant="danger"
                isLoading={isDeleting}
                confirmLabel="Eliminar"
                onConfirm={() => deleteSong()}
                onCancel={() => setShowDeleteDialog(false)}
            />
        </>
    )
}
