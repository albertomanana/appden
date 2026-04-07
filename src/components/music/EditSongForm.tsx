import React from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { X, Save } from 'lucide-react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { songsService } from '@services/songs.service'
import { groupsService } from '@services/groups.service'
import { songSchema, type SongFormData } from '@lib/validators'
import { useAuth } from '@hooks/useAuth'
import { useActiveGroup } from '@hooks/useActiveGroup'
import { useToast } from '@components/ui/Toast'
import { SongArtistCreditsInput } from '@components/music/SongArtistCreditsInput'
import { getSongArtistCreditDrafts } from '@features/music/utils/artistCredits'
import type { Song } from '@/types'

interface EditSongFormProps {
    song: Song
    onClose: () => void
}

export const EditSongForm: React.FC<EditSongFormProps> = ({ song, onClose }) => {
    const { userId } = useAuth()
    const { groupId } = useActiveGroup()
    const { success, error: toastError } = useToast()
    const queryClient = useQueryClient()
    const targetGroupId = groupId ?? song.group_id

    const { data: groupMembers = [] } = useQuery({
        queryKey: ['group-members', targetGroupId],
        queryFn: () => groupsService.getGroupMembers(targetGroupId),
        enabled: !!targetGroupId,
    })

    const {
        control,
        register,
        handleSubmit,
        watch,
        setValue,
        formState: { errors },
    } = useForm<SongFormData, undefined, SongFormData>({
        resolver: zodResolver(songSchema),
        defaultValues: {
            title: song.title,
            artist_credits: getSongArtistCreditDrafts(song),
            album_name: song.album_name ?? '',
        },
    })

    const { mutate: updateSong, isPending } = useMutation({
        mutationFn: async (data: SongFormData) => {
            if (!userId) {
                throw new Error('Necesitas sesion para editar la cancion.')
            }

            return songsService.updateSong(song.id, userId, {
                ...data,
                title: data.title,
                album_name: data.album_name?.trim() ?? '',
            })
        },
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: ['songs', targetGroupId] })
            void queryClient.invalidateQueries({ queryKey: ['song', song.id] })
            success('Exito', 'Cancion actualizada correctamente')
            onClose()
        },
        onError: (err) => {
            toastError('Error', err instanceof Error ? err.message : 'No se pudo actualizar la cancion')
        },
    })

    return (
        <div className="fixed inset-0 z-50 flex items-end justify-center overflow-y-auto p-0 sm:items-center sm:p-4">
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
            <div className="relative my-auto w-full sm:max-w-md card rounded-t-2xl sm:rounded-2xl p-6 animate-slide-up">
                <div className="flex items-center justify-between mb-5">
                    <h2 className="text-lg font-bold text-white">Editar cancion</h2>
                    <button onClick={onClose} className="btn-ghost p-2 rounded-xl">
                        <X className="w-4 h-4" />
                    </button>
                </div>

                <form onSubmit={handleSubmit((data: SongFormData) => updateSong(data))} className="space-y-4">
                    <div>
                        <label className="label" htmlFor="title">Titulo *</label>
                        <input
                            id="title"
                            type="text"
                            placeholder="Nombre de la cancion"
                            className={`input ${errors.title ? 'border-red-500' : ''}`}
                            {...register('title')}
                        />
                        {errors.title && <p className="text-xs text-red-400 mt-1">{errors.title.message}</p>}
                    </div>

                    <SongArtistCreditsInput
                        control={control}
                        register={register}
                        watch={watch}
                        setValue={setValue}
                        errors={errors}
                        members={groupMembers}
                        disabled={isPending}
                    />

                    <div>
                        <label className="label" htmlFor="album_name">Album (opcional)</label>
                        <input
                            id="album_name"
                            type="text"
                            placeholder="Nombre del album"
                            className="input"
                            {...register('album_name')}
                        />
                    </div>

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
