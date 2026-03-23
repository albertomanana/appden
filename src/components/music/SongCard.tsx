import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Edit2, Heart, Music, Pause, Play, Trash2 } from 'lucide-react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { usePlayerStore } from '@app/store/player.store'
import { ConfirmDialog } from '@components/ui/ConfirmDialog'
import { useToast } from '@components/ui/Toast'
import { useAuth } from '@hooks/useAuth'
import { useActiveGroup } from '@hooks/useActiveGroup'
import { ROUTES } from '@lib/constants'
import { cn, formatDuration } from '@lib/utils'
import { favoritesService } from '@services/favorites.service'
import { songsService } from '@services/songs.service'
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
    const currentSong = usePlayerStore((state) => state.currentSong)
    const isPlaying = usePlayerStore((state) => state.isPlaying)
    const { success, error: toastError } = useToast()
    const queryClient = useQueryClient()
    const isCurrentSong = currentSong?.id === song.id
    const isThisPlaying = isCurrentSong && isPlaying
    const isOwner = userId === song.uploaded_by
    const [showDeleteDialog, setShowDeleteDialog] = useState(false)
    const [coverFailed, setCoverFailed] = useState(false)

    useEffect(() => {
        setCoverFailed(false)
    }, [song.id, song.cover_url])

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
            success('Cancion', 'Cancion eliminada correctamente')
            setShowDeleteDialog(false)
        },
        onError: () => {
            toastError('Error', 'No se pudo eliminar la cancion')
        },
    })

    return (
        <>
            <article
                className={cn(
                    'card-interactive group relative overflow-hidden p-3',
                    isCurrentSong && 'border-brand-400/25 bg-brand-400/8'
                )}
            >
                <div className="flex items-center gap-3">
                    <button
                        onClick={onPlay}
                        className="group/play relative h-16 w-16 shrink-0 overflow-hidden rounded-[1.35rem] bg-surface-700"
                        aria-label={isThisPlaying ? 'Pausar' : 'Reproducir'}
                    >
                        {song.cover_url && !coverFailed ? (
                            <img src={song.cover_url} alt={song.title} className="h-full w-full object-cover" onError={() => setCoverFailed(true)} />
                        ) : (
                            <div className="grid h-full w-full place-items-center text-gray-500">
                                <Music className="h-5 w-5" />
                            </div>
                        )}
                        <div className="absolute inset-0 grid place-items-center bg-black/45 opacity-0 transition-opacity group-hover/play:opacity-100">
                            {isThisPlaying ? <Pause className="h-5 w-5 text-white" /> : <Play className="ml-0.5 h-5 w-5 text-white" />}
                        </div>
                        {isThisPlaying ? <div className="absolute bottom-1.5 right-1.5 h-2.5 w-2.5 rounded-full bg-brand-300 shadow-[0_0_12px_rgba(133,173,255,0.55)]" /> : null}
                    </button>

                    <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                            <Link to={ROUTES.SONG(song.id)} className="min-w-0">
                                <p className={cn('truncate text-base font-semibold', isCurrentSong ? 'text-brand-200' : 'text-white')}>
                                    {song.title}
                                </p>
                            </Link>
                            {song.is_favorite ? <span className="badge-brand !px-2 !py-0.5">Fav</span> : null}
                        </div>

                        {showArtist ? (
                            <p className="mt-1 truncate text-xs uppercase tracking-[0.18em] text-gray-500">{song.artist_name}</p>
                        ) : null}

                        <div className="mt-3 flex flex-wrap items-center gap-2">
                            <span className="hero-meta-pill !px-3 !py-1">{formatDuration(song.duration_seconds)}</span>
                            {isCurrentSong ? <span className="hero-meta-pill !px-3 !py-1">Now playing</span> : null}
                        </div>
                    </div>

                    <div className="flex items-center gap-1 opacity-100 transition-opacity md:opacity-0 md:group-hover:opacity-100">
                        <button
                            onClick={() => toggleFavorite()}
                            disabled={isPending}
                            aria-label={song.is_favorite ? 'Quitar de favoritos' : 'Anadir a favoritos'}
                            className={cn(
                                'btn-icon !h-10 !w-10 !rounded-full',
                                song.is_favorite ? 'text-pink-300' : 'text-gray-400'
                            )}
                        >
                            <Heart className={cn('h-4 w-4', song.is_favorite && 'fill-current')} />
                        </button>

                        {isOwner && onEdit ? (
                            <button onClick={onEdit} className="btn-icon !h-10 !w-10 !rounded-full" aria-label="Editar">
                                <Edit2 className="h-4 w-4" />
                            </button>
                        ) : null}

                        {isOwner ? (
                            <button onClick={() => setShowDeleteDialog(true)} className="btn-icon !h-10 !w-10 !rounded-full text-red-200" aria-label="Eliminar">
                                <Trash2 className="h-4 w-4" />
                            </button>
                        ) : null}
                    </div>
                </div>
            </article>

            <ConfirmDialog
                isOpen={showDeleteDialog}
                title="Eliminar cancion"
                description={`Estas seguro de que quieres eliminar "${song.title}"? Esta accion no se puede deshacer.`}
                variant="danger"
                isLoading={isDeleting}
                confirmLabel="Eliminar"
                onConfirm={() => deleteSong()}
                onCancel={() => setShowDeleteDialog(false)}
            />
        </>
    )
}
