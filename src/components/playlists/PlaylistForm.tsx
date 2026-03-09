import React from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { X, ListMusic } from 'lucide-react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { playlistsService } from '@services/playlists.service'
import { playlistSchema, type PlaylistFormData } from '@lib/validators'
import { useAuth } from '@hooks/useAuth'
import { useActiveGroup } from '@hooks/useActiveGroup'
import { useToast } from '@components/ui/Toast'
import type { Playlist } from '@/types'

interface PlaylistFormProps {
    onClose: () => void
    existing?: Playlist
}

export const PlaylistForm: React.FC<PlaylistFormProps> = ({ onClose, existing }) => {
    const { userId } = useAuth()
    const { groupId } = useActiveGroup()
    const { success, error: toastError } = useToast()
    const queryClient = useQueryClient()

    const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<PlaylistFormData>({
        resolver: zodResolver(playlistSchema),
        defaultValues: { name: existing?.name ?? '', description: existing?.description ?? '' },
    })

    const { mutate } = useMutation({
        mutationFn: (data: PlaylistFormData) =>
            existing
                ? playlistsService.updatePlaylist(existing.id, data)
                : playlistsService.createPlaylist(userId!, groupId!, data),
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: ['playlists', groupId] })
            success(existing ? 'Playlist actualizada' : 'Playlist creada')
            onClose()
        },
        onError: () => toastError('Error', 'No se pudo guardar la playlist.'),
    })

    return (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
            <div className="relative w-full sm:max-w-md card rounded-t-2xl sm:rounded-2xl p-6 animate-slide-up">
                <div className="flex items-center justify-between mb-5">
                    <div className="flex items-center gap-2">
                        <ListMusic className="w-5 h-5 text-brand-400" />
                        <h2 className="text-lg font-bold text-white">{existing ? 'Editar playlist' : 'Nueva playlist'}</h2>
                    </div>
                    <button onClick={onClose} className="btn-ghost p-2 rounded-xl"><X className="w-4 h-4" /></button>
                </div>

                <form onSubmit={handleSubmit((d) => mutate(d))} className="space-y-4">
                    <div>
                        <label className="label" htmlFor="pl-name">Nombre *</label>
                        <input id="pl-name" type="text" placeholder="Mi playlist" className={`input ${errors.name ? 'border-red-500' : ''}`} {...register('name')} />
                        {errors.name && <p className="text-xs text-red-400 mt-1">{errors.name.message}</p>}
                    </div>
                    <div>
                        <label className="label" htmlFor="pl-desc">Descripción (opcional)</label>
                        <textarea id="pl-desc" rows={2} className="input resize-none" placeholder="De qué va esta playlist..." {...register('description')} />
                    </div>
                    <button type="submit" disabled={isSubmitting} className="btn-primary w-full py-3 font-semibold">
                        {isSubmitting ? 'Guardando...' : existing ? 'Actualizar' : 'Crear playlist'}
                    </button>
                </form>
            </div>
        </div>
    )
}
