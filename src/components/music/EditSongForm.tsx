import React from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { X, Save } from 'lucide-react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { songsService } from '@services/songs.service'
import { songSchema, type SongFormData } from '@lib/validators'
import { useActiveGroup } from '@hooks/useActiveGroup'
import { useToast } from '@components/ui/Toast'
import type { Song } from '@/types'

interface EditSongFormProps {
    song: Song
    onClose: () => void
}

export const EditSongForm: React.FC<EditSongFormProps> = ({ song, onClose }) => {
    const { groupId } = useActiveGroup()
    const { success, error: toastError } = useToast()
    const queryClient = useQueryClient()

    const { register, handleSubmit, formState: { errors } } = useForm<SongFormData>({
        resolver: zodResolver(songSchema),
        defaultValues: {
            title: song.title,
            artist_name: song.artist_name,
            album_name: song.album_name ?? '',
        },
    })

    const { mutate: updateSong, isPending } = useMutation({
        mutationFn: async (data: SongFormData) => {
            return songsService.updateSong(song.id, {
                title: data.title,
                artist_name: data.artist_name,
                album_name: (data.album_name?.trim() || null) as string | null,
            })
        },
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: ['songs', groupId] })
            success('Éxito', 'Canción actualizada correctamente')
            onClose()
        },
        onError: (err) => {
            toastError('Error', err instanceof Error ? err.message : 'No se pudo actualizar la canción')
        },
    })

    return (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
            <div className="relative w-full sm:max-w-md card rounded-t-2xl sm:rounded-2xl p-6 animate-slide-up">
                {/* Header */}
                <div className="flex items-center justify-between mb-5">
                    <h2 className="text-lg font-bold text-white">Editar canción</h2>
                    <button onClick={onClose} className="btn-ghost p-2 rounded-xl">
                        <X className="w-4 h-4" />
                    </button>
                </div>

                <form onSubmit={handleSubmit((d) => updateSong(d))} className="space-y-4">
                    {/* Title */}
                    <div>
                        <label className="label" htmlFor="title">Título *</label>
                        <input
                            id="title"
                            type="text"
                            placeholder="Nombre de la canción"
                            className={`input ${errors.title ? 'border-red-500' : ''}`}
                            {...register('title')}
                        />
                        {errors.title && <p className="text-xs text-red-400 mt-1">{errors.title.message}</p>}
                    </div>

                    {/* Artist */}
                    <div>
                        <label className="label" htmlFor="artist_name">Artista *</label>
                        <input
                            id="artist_name"
                            type="text"
                            placeholder="Nombre del artista"
                            className={`input ${errors.artist_name ? 'border-red-500' : ''}`}
                            {...register('artist_name')}
                        />
                        {errors.artist_name && <p className="text-xs text-red-400 mt-1">{errors.artist_name.message}</p>}
                    </div>

                    {/* Album */}
                    <div>
                        <label className="label" htmlFor="album_name">Álbum (opcional)</label>
                        <input
                            id="album_name"
                            type="text"
                            placeholder="Nombre del álbum"
                            className="input"
                            {...register('album_name')}
                        />
                    </div>

                    {/* Submit */}
                    <button
                        type="submit"
                        disabled={isPending}
                        className="btn-primary w-full py-3 font-semibold"
                    >
                        {isPending ? (
                            <span className="flex items-center gap-2 justify-center">
                                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                Guardando...
                            </span>
                        ) : (
                            <span className="flex items-center gap-2 justify-center">
                                <Save className="w-4 h-4" />
                                Guardar cambios
                            </span>
                        )}
                    </button>
                </form>
            </div>
        </div>
    )
}
