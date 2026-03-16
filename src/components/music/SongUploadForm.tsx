import React, { useState, useRef, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { X, Upload, Music, Image } from 'lucide-react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { songsService } from '@services/songs.service'
import { groupsService } from '@services/groups.service'
import { lyricsService } from '@services/lyrics.service'
import { groupActivityService } from '@services/group-activity.service'
import { songSchema, validateAudioFile, validateImageFile, type SongFormData } from '@lib/validators'
import { useAuth } from '@hooks/useAuth'
import { useActiveGroup } from '@hooks/useActiveGroup'
import { useToast } from '@components/ui/Toast'
import { formatBytes } from '@lib/utils'
import type { GroupMember } from '@/types'

interface SongUploadFormProps {
    onClose: () => void
    playlistId?: string
}

export const SongUploadForm: React.FC<SongUploadFormProps> = ({ onClose }) => {
    const { userId } = useAuth()
    const { groupId } = useActiveGroup()
    const { success, error: toastError } = useToast()
    const queryClient = useQueryClient()

    const [audioFile, setAudioFile] = useState<File | null>(null)
    const [coverFile, setCoverFile] = useState<File | null>(null)
    const [audioError, setAudioError] = useState<string | null>(null)
    const [coverError, setCoverError] = useState<string | null>(null)
    const [members, setMembers] = useState<GroupMember[]>([])
    const [useCustomArtist, setUseCustomArtist] = useState(false)
    const audioInputRef = useRef<HTMLInputElement>(null)
    const coverInputRef = useRef<HTMLInputElement>(null)

    const { register, handleSubmit, formState: { errors }, watch, setValue } = useForm<SongFormData>({
        resolver: zodResolver(songSchema),
    })

    const artistValue = watch('artist_name')

    useEffect(() => {
        if (!groupId) return
        groupsService.getGroupMembers(groupId)
            .then(setMembers)
            .catch(() => setMembers([]))
    }, [groupId])

    const { mutate: upload, isPending } = useMutation({
        mutationFn: async (data: SongFormData) => {
            if (!audioFile || !userId || !groupId) throw new Error('Faltan datos')
            return songsService.uploadSong(userId, groupId, audioFile, coverFile, data)
        },
        onSuccess: async (uploadedSong) => {
            if (audioFile && userId && groupId) {
                try {
                    await lyricsService.autoTranscribeOnUpload({
                        song: uploadedSong,
                        audioFile,
                        userId,
                    })
                    void queryClient.invalidateQueries({ queryKey: ['song-lyrics', uploadedSong.id] })
                } catch {
                    // ASR should not block upload flow.
                }

                void groupActivityService.create({
                    groupId,
                    actorId: userId,
                    actionType: 'song_uploaded',
                    songId: uploadedSong.id,
                    payload: {
                        title: uploadedSong.title,
                        artistName: uploadedSong.artist_name,
                    },
                })
            }

            void queryClient.invalidateQueries({ queryKey: ['songs', groupId] })
            success('Cancion subida', 'Ya esta disponible para el grupo.')
            onClose()
        },
        onError: (err) => {
            const msg = err instanceof Error ? err.message : 'Error al subir la cancion'
            toastError('Error', msg)
        },
    })

    const handleAudioChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return
        const err = validateAudioFile(file)
        if (err) {
            setAudioError(err)
            return
        }
        setAudioError(null)
        setAudioFile(file)
    }

    const handleCoverChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return
        const err = validateImageFile(file)
        if (err) {
            setCoverError(err)
            return
        }
        setCoverError(null)
        setCoverFile(file)
    }

    const handleSelectMember = (displayName: string) => {
        setValue('artist_name', displayName)
        setUseCustomArtist(false)
    }

    return (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
            <div className="relative w-full sm:max-w-md card rounded-t-2xl sm:rounded-2xl p-6 animate-slide-up max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between mb-5">
                    <h2 className="text-lg font-bold text-white">Subir cancion</h2>
                    <button onClick={onClose} className="btn-ghost p-2 rounded-xl">
                        <X className="w-4 h-4" />
                    </button>
                </div>

                <form onSubmit={handleSubmit((d) => upload(d))} className="space-y-4">
                    <div>
                        <label className="label">Archivo de audio *</label>
                        <button
                            type="button"
                            onClick={() => audioInputRef.current?.click()}
                            className={`w-full border-2 border-dashed rounded-xl p-4 flex items-center gap-3 transition-colors ${
                                audioFile ? 'border-brand-500/50 bg-brand-500/5' : 'border-surface-400 hover:border-surface-300'
                            }`}
                        >
                            <Music className="w-5 h-5 text-gray-400 flex-shrink-0" />
                            <div className="text-left flex-1 min-w-0">
                                {audioFile ? (
                                    <>
                                        <p className="text-sm text-white font-medium truncate">{audioFile.name}</p>
                                        <p className="text-xs text-gray-400">{formatBytes(audioFile.size)}</p>
                                    </>
                                ) : (
                                    <>
                                        <p className="text-sm text-gray-300">Seleccionar audio</p>
                                        <p className="text-xs text-gray-500">MP3, WAV, FLAC, OGG - max 50 MB</p>
                                    </>
                                )}
                            </div>
                            <Upload className="w-4 h-4 text-gray-500 flex-shrink-0" />
                        </button>
                        <input ref={audioInputRef} type="file" accept="audio/*,.mp4,.mov" className="hidden" onChange={handleAudioChange} />
                        {audioError ? <p className="text-xs text-red-400 mt-1">{audioError}</p> : null}
                    </div>

                    <div>
                        <label className="label">Portada (opcional)</label>
                        <button
                            type="button"
                            onClick={() => coverInputRef.current?.click()}
                            className={`w-full border-2 border-dashed rounded-xl p-4 flex items-center gap-3 transition-colors ${
                                coverFile ? 'border-brand-500/50 bg-brand-500/5' : 'border-surface-400 hover:border-surface-300'
                            }`}
                        >
                            <Image className="w-5 h-5 text-gray-400 flex-shrink-0" />
                            <div className="text-left flex-1 min-w-0">
                                {coverFile ? (
                                    <>
                                        <p className="text-sm text-white font-medium truncate">{coverFile.name}</p>
                                        <p className="text-xs text-gray-400">{formatBytes(coverFile.size)}</p>
                                    </>
                                ) : (
                                    <>
                                        <p className="text-sm text-gray-300">Seleccionar imagen</p>
                                        <p className="text-xs text-gray-500">JPEG, PNG, WebP - max 10 MB</p>
                                    </>
                                )}
                            </div>
                        </button>
                        <input ref={coverInputRef} type="file" accept="image/*" className="hidden" onChange={handleCoverChange} />
                        {coverError ? <p className="text-xs text-red-400 mt-1">{coverError}</p> : null}
                    </div>

                    <div>
                        <label className="label" htmlFor="title">Titulo *</label>
                        <input id="title" type="text" placeholder="Nombre de la cancion" className={`input ${errors.title ? 'border-red-500' : ''}`} {...register('title')} />
                        {errors.title ? <p className="text-xs text-red-400 mt-1">{errors.title.message}</p> : null}
                    </div>

                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <label className="label" htmlFor="artist_name">Artista *</label>
                            {!useCustomArtist ? (
                                <button
                                    type="button"
                                    onClick={() => setUseCustomArtist(true)}
                                    className="text-xs text-brand-400 hover:text-brand-300 transition-colors"
                                >
                                    + Otro
                                </button>
                            ) : null}
                        </div>

                        {!useCustomArtist && members.length > 0 ? (
                            <div className="grid grid-cols-2 gap-2 mb-3">
                                {members.map((member) => (
                                    <button
                                        key={member.user_id}
                                        type="button"
                                        onClick={() => handleSelectMember(member.profile?.display_name || 'Unknown')}
                                        className={`text-xs p-2 rounded-lg transition-colors ${
                                            artistValue === member.profile?.display_name
                                                ? 'bg-brand-500 text-white'
                                                : 'bg-surface-600 text-gray-300 hover:bg-surface-500'
                                        }`}
                                    >
                                        {member.profile?.display_name || 'Unknown'}
                                    </button>
                                ))}
                            </div>
                        ) : null}

                        {useCustomArtist ? (
                            <div className="mb-3">
                                <input
                                    id="artist_name"
                                    type="text"
                                    placeholder="Nombre del artista"
                                    className={`input ${errors.artist_name ? 'border-red-500' : ''}`}
                                    {...register('artist_name')}
                                />
                                {members.length > 0 ? (
                                    <button
                                        type="button"
                                        onClick={() => setUseCustomArtist(false)}
                                        className="text-xs text-brand-400 hover:text-brand-300 transition-colors mt-2"
                                    >
                                        Volver a seleccionar del grupo
                                    </button>
                                ) : null}
                            </div>
                        ) : null}

                        {!useCustomArtist && !artistValue ? (
                            <input
                                id="artist_name"
                                type="text"
                                placeholder="Nombre del artista"
                                className={`input ${errors.artist_name ? 'border-red-500' : ''}`}
                                {...register('artist_name')}
                            />
                        ) : null}

                        {errors.artist_name ? <p className="text-xs text-red-400 mt-1">{errors.artist_name.message}</p> : null}
                    </div>

                    <div>
                        <label className="label" htmlFor="album_name">Album (opcional)</label>
                        <input id="album_name" type="text" placeholder="Nombre del album" className="input" {...register('album_name')} />
                    </div>

                    <button
                        type="submit"
                        disabled={isPending || !audioFile}
                        className="btn-primary w-full py-3 font-semibold"
                    >
                        {isPending ? (
                            <span className="flex items-center gap-2 justify-center">
                                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                Subiendo...
                            </span>
                        ) : (
                            <span className="flex items-center gap-2 justify-center">
                                <Upload className="w-4 h-4" />
                                Subir cancion
                            </span>
                        )}
                    </button>
                </form>
            </div>
        </div>
    )
}
