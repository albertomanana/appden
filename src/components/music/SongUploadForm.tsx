import React, { useEffect, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Image, Music, Upload, X } from 'lucide-react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { songsService } from '@services/songs.service'
import { groupsService } from '@services/groups.service'
import { songSchema, validateAudioFile, validateImageFile, type SongFormData } from '@lib/validators'
import { useAuth } from '@hooks/useAuth'
import { useActiveGroup } from '@hooks/useActiveGroup'
import { useToast } from '@components/ui/Toast'
import { formatBytes } from '@lib/utils'
import { SongArtistCreditsInput } from '@components/music/SongArtistCreditsInput'
import { buildMemberLookup, createEmptyArtistCredit } from '@features/music/utils/artistCredits'

interface SongUploadFormProps {
    onClose: () => void
    playlistId?: string
}

export const SongUploadForm: React.FC<SongUploadFormProps> = ({ onClose }) => {
    const { userId } = useAuth()
    const { groupId } = useActiveGroup()
    const { success, error: toastError } = useToast()
    const queryClient = useQueryClient()
    const audioInputRef = useRef<HTMLInputElement>(null)
    const coverInputRef = useRef<HTMLInputElement>(null)

    const [audioFile, setAudioFile] = useState<File | null>(null)
    const [coverFile, setCoverFile] = useState<File | null>(null)
    const [audioError, setAudioError] = useState<string | null>(null)
    const [coverError, setCoverError] = useState<string | null>(null)

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
            title: '',
            artist_credits: [createEmptyArtistCredit()],
            album_name: '',
        },
    })

    const { data: groupMembers = [] } = useQuery({
        queryKey: ['group-members', groupId],
        queryFn: () => groupsService.getGroupMembers(groupId!),
        enabled: !!groupId,
    })

    useEffect(() => {
        if (!userId || groupMembers.length === 0) return

        const currentCredits = watch('artist_credits') ?? []
        if (currentCredits.length !== 1) return

        const firstCredit = currentCredits[0]
        if (firstCredit?.source === 'profile' || firstCredit?.artist_name?.trim()) return

        const membersById = buildMemberLookup(groupMembers)
        const currentMember = membersById.get(userId)
        const displayName = currentMember?.profile?.display_name
        if (!displayName) return

        setValue('artist_credits.0.source', 'profile', { shouldDirty: false, shouldValidate: true })
        setValue('artist_credits.0.profile_id', userId, { shouldDirty: false, shouldValidate: true })
        setValue('artist_credits.0.artist_name', displayName, { shouldDirty: false, shouldValidate: true })
    }, [groupMembers, setValue, userId, watch])

    const { mutate: upload, isPending } = useMutation({
        mutationFn: async (data: SongFormData) => {
            if (!audioFile || !userId || !groupId) {
                throw new Error('Faltan datos para subir la cancion.')
            }

            return songsService.uploadSong(userId, groupId, audioFile, coverFile, {
                ...data,
                title: data.title.trim(),
                album_name: data.album_name?.trim() ?? '',
            })
        },
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: ['songs', groupId] })
            success('Cancion subida', 'Ya puedes reproducirla.')
            onClose()
        },
        onError: (err) => {
            const message = err instanceof Error ? err.message : 'Error al subir la cancion.'
            toastError('Error', message)
        },
    })

    const handleAudioChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0] ?? null
        if (!file) return

        const validationError = validateAudioFile(file)
        if (validationError) {
            setAudioFile(null)
            setAudioError(validationError)
            event.currentTarget.value = ''
            return
        }

        setAudioError(null)
        setAudioFile(file)
    }

    const handleCoverChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0] ?? null
        if (!file) return

        const validationError = validateImageFile(file)
        if (validationError) {
            setCoverFile(null)
            setCoverError(validationError)
            event.currentTarget.value = ''
            return
        }

        setCoverError(null)
        setCoverFile(file)
    }

    return (
        <div className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4">
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

            <div className="relative card max-h-[90vh] w-full overflow-y-auto rounded-t-2xl p-6 sm:max-w-md sm:rounded-2xl">
                <div className="mb-5 flex items-center justify-between">
                    <h2 className="text-lg font-bold text-white">Subir cancion</h2>
                    <button onClick={onClose} className="btn-ghost rounded-xl p-2" aria-label="Cerrar">
                        <X className="h-4 w-4" />
                    </button>
                </div>

                <form onSubmit={handleSubmit((data: SongFormData) => upload(data))} className="space-y-4">
                    {!groupId ? (
                        <div className="rounded-2xl border border-amber-400/20 bg-amber-400/10 px-4 py-3 text-sm text-amber-100">
                            Necesitas entrar en un grupo antes de subir musica.
                        </div>
                    ) : null}

                    <div>
                        <label className="label">Audio *</label>
                        <button
                            type="button"
                            onClick={() => audioInputRef.current?.click()}
                            className={`w-full rounded-xl border-2 border-dashed p-4 text-left transition-colors ${
                                audioFile ? 'border-brand-500/50 bg-brand-500/5' : 'border-surface-400 hover:border-surface-300'
                            }`}
                        >
                            <div className="flex items-center gap-3">
                                <Music className="h-5 w-5 flex-shrink-0 text-gray-400" />
                                <div className="min-w-0 flex-1">
                                    {audioFile ? (
                                        <>
                                            <p className="truncate text-sm font-medium text-white">{audioFile.name}</p>
                                            <p className="text-xs text-gray-400">{formatBytes(audioFile.size)}</p>
                                        </>
                                    ) : (
                                        <>
                                            <p className="text-sm text-gray-300">Seleccionar audio</p>
                                            <p className="text-xs text-gray-500">MP3, WAV, FLAC, OGG, M4A, AAC, WebM o MP4</p>
                                        </>
                                    )}
                                </div>
                                <Upload className="h-4 w-4 flex-shrink-0 text-gray-500" />
                            </div>
                        </button>
                        <input
                            ref={audioInputRef}
                            type="file"
                            accept="audio/*,.mp3,.wav,.ogg,.flac,.m4a,.aac,.webm,.mp4"
                            className="hidden"
                            onChange={handleAudioChange}
                        />
                        {audioError ? <p className="mt-1 text-xs text-red-400">{audioError}</p> : null}
                    </div>

                    <div>
                        <label className="label">Portada</label>
                        <button
                            type="button"
                            onClick={() => coverInputRef.current?.click()}
                            className={`w-full rounded-xl border-2 border-dashed p-4 text-left transition-colors ${
                                coverFile ? 'border-brand-500/50 bg-brand-500/5' : 'border-surface-400 hover:border-surface-300'
                            }`}
                        >
                            <div className="flex items-center gap-3">
                                <Image className="h-5 w-5 flex-shrink-0 text-gray-400" />
                                <div className="min-w-0 flex-1">
                                    {coverFile ? (
                                        <>
                                            <p className="truncate text-sm font-medium text-white">{coverFile.name}</p>
                                            <p className="text-xs text-gray-400">{formatBytes(coverFile.size)}</p>
                                        </>
                                    ) : (
                                        <>
                                            <p className="text-sm text-gray-300">Seleccionar imagen</p>
                                            <p className="text-xs text-gray-500">Opcional</p>
                                        </>
                                    )}
                                </div>
                            </div>
                        </button>
                        <input
                            ref={coverInputRef}
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={handleCoverChange}
                        />
                        {coverError ? <p className="mt-1 text-xs text-red-400">{coverError}</p> : null}
                    </div>

                    <div>
                        <label className="label" htmlFor="title">Titulo *</label>
                        <input
                            id="title"
                            type="text"
                            placeholder="Nombre de la cancion"
                            className={`input ${errors.title ? 'border-red-500' : ''}`}
                            {...register('title')}
                        />
                        {errors.title ? <p className="mt-1 text-xs text-red-400">{errors.title.message}</p> : null}
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
                        <label className="label" htmlFor="album_name">Album</label>
                        <input
                            id="album_name"
                            type="text"
                            placeholder="Opcional"
                            className="input"
                            {...register('album_name')}
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={isPending || !audioFile || !groupId}
                        className="btn-primary w-full py-3 font-semibold"
                    >
                        {isPending ? (
                            <span className="flex items-center justify-center gap-2">
                                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                                Subiendo...
                            </span>
                        ) : (
                            <span className="flex items-center justify-center gap-2">
                                <Upload className="h-4 w-4" />
                                Subir cancion
                            </span>
                        )}
                    </button>
                </form>
            </div>
        </div>
    )
}
