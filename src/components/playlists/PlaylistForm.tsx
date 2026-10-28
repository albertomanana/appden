import React from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { playlistsService } from '@services/playlists.service'
import { playlistSchema, type PlaylistFormData } from '@lib/validators'
import { useAuth } from '@hooks/useAuth'
import { useActiveGroup } from '@hooks/useActiveGroup'
import { useToast } from '@components/ui/Toast'
import type { Playlist } from '@/types'
import { Modal } from '@components/ui/Modal'

interface PlaylistFormProps {
    onClose: () => void
    existing?: Playlist
    /** Called with the saved playlist (e.g. to add a song right after creating it). */
    onSaved?: (playlist: Playlist) => void
    /** Shown under the title, e.g. "Se añadirá «Luces de neón»". */
    description?: string
}

export const PlaylistForm: React.FC<PlaylistFormProps> = ({ onClose, existing, onSaved, description }) => {
    const { userId } = useAuth()
    const { groupId } = useActiveGroup()
    const { success, error: toastError } = useToast()
    const queryClient = useQueryClient()

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<PlaylistFormData>({
        resolver: zodResolver(playlistSchema),
        defaultValues: { name: existing?.name ?? '', description: existing?.description ?? '' },
    })

    const { mutate, isPending } = useMutation({
        mutationFn: (data: PlaylistFormData) => {
            if (existing) return playlistsService.updatePlaylist(existing.id, data)
            if (!userId || !groupId) throw new Error('Elige un grupo antes de crear una playlist.')
            return playlistsService.createPlaylist(userId, groupId, data)
        },
        onSuccess: (playlist) => {
            void queryClient.invalidateQueries({ queryKey: ['playlists', groupId] })
            if (existing) {
                void queryClient.invalidateQueries({ queryKey: ['playlist', existing.id] })
            }
            if (!onSaved) success(existing ? 'Playlist actualizada' : 'Playlist creada')
            onSaved?.(playlist)
            onClose()
        },
        onError: (err) => {
            toastError('No se pudo guardar la playlist', err instanceof Error ? err.message : undefined)
        },
    })

    return (
        <Modal
            open
            onClose={onClose}
            title={existing ? 'Editar playlist' : 'Nueva playlist'}
            description={description}
            size="sm"
            footer={
                <button type="submit" form="playlist-form" disabled={isPending} className="btn-primary w-full">
                    {isPending ? 'Guardando…' : existing ? 'Guardar cambios' : 'Crear playlist'}
                </button>
            }
        >
            <form id="playlist-form" onSubmit={handleSubmit((data) => mutate(data))} className="space-y-4">
                <div>
                    <label className="label" htmlFor="pl-name">Nombre</label>
                    <input
                        id="pl-name"
                        type="text"
                        autoComplete="off"
                        placeholder="Para el coche, Ensayo del jueves…"
                        className="input"
                        aria-invalid={!!errors.name}
                        {...register('name')}
                    />
                    {errors.name ? <p className="field-error">{errors.name.message}</p> : null}
                </div>
                <div>
                    <label className="label" htmlFor="pl-desc">Descripción (opcional)</label>
                    <textarea
                        id="pl-desc"
                        rows={3}
                        className="input resize-none"
                        placeholder="¿De qué va esta playlist?"
                        {...register('description')}
                    />
                    {errors.description ? <p className="field-error">{errors.description.message}</p> : null}
                </div>
            </form>
        </Modal>
    )
}
