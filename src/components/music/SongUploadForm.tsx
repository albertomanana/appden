import React, { useState, useRef } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { X, Upload, Music, Image } from 'lucide-react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { songsService } from '@services/songs.service'
import { songSchema, validateAudioFile, validateImageFile, type SongFormData } from '@lib/validators'
import { useAuth } from '@hooks/useAuth'
import { useActiveGroup } from '@hooks/useActiveGroup'
import { useToast } from '@components/ui/Toast'
import { formatBytes } from '@lib/utils'

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
    const audioInputRef = useRef<HTMLInputElement>(null)
    const coverInputRef = useRef<HTMLInputElement>(null)

    const { register, handleSubmit, formState: { errors } } = useForm<SongFormData>({
        resolver: zodResolver(songSchema),
    })

    const { mutate: upload, isPending } = useMutation({
        mutationFn: async (data: SongFormData) => {
            if (!audioFile || !userId || !groupId) throw new Error('Faltan datos')
            return songsService.uploadSong(userId, groupId, audioFile, coverFile, data)
        },
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: ['songs', groupId] })
            success('¡Canción subida!', 'Ya está disponible para el grupo.')
            onClose()
        },
        onError: (err) => {
            const msg = err instanceof Error ? err.message : 'Error al subir la canción'
            toastError('Error', msg)
        },
    })

    const handleAudioChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return
        const err = validateAudioFile(file)
        if (err) { setAudioError(err); return }
        setAudioError(null)
        setAudioFile(file)
    }

    const handleCoverChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return
        const err = validateImageFile(file)
        if (err) { setCoverError(err); return }
        setCoverError(null)
        setCoverFile(file)
    }

    return (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
            <div className="relative w-full sm:max-w-md card rounded-t-2xl sm:rounded-2xl p-6 animate-slide-up">
                {/* Header */}
                <div className="flex items-center justify-between mb-5">
                    <h2 className="text-lg font-bold text-white">Subir canción</h2>
                    <button onClick={onClose} className="btn-ghost p-2 rounded-xl">
                        <X className="w-4 h-4" />
                    </button>
                </div>

                <form onSubmit={handleSubmit((d) => upload(d))} className="space-y-4">
                    {/* Audio file */}
                    <div>
                        <label className="label">Archivo de audio *</label>
                        <button
                            type="button"
                            onClick={() => audioInputRef.current?.click()}
                            className={`w-full border-2 border-dashed rounded-xl p-4 flex items-center gap-3 transition-colors ${audioFile ? 'border-brand-500/50 bg-brand-500/5' : 'border-surface-400 hover:border-surface-300'
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
                                        <p className="text-xs text-gray-500">MP3, WAV, FLAC, OGG — máx 50 MB</p>
                                    </>
                                )}
                            </div>
                            <Upload className="w-4 h-4 text-gray-500 flex-shrink-0" />
                        </button>
                        <input ref={audioInputRef} type="file" accept="audio/*" className="hidden" onChange={handleAudioChange} />
                        {audioError && <p className="text-xs text-red-400 mt-1">{audioError}</p>}
                    </div>

                    {/* Cover art */}
                    <div>
                        <label className="label">Portada (opcional)</label>
                        <button
                            type="button"
                            onClick={() => coverInputRef.current?.click()}
                            className={`w-full border-2 border-dashed rounded-xl p-4 flex items-center gap-3 transition-colors ${coverFile ? 'border-brand-500/50 bg-brand-500/5' : 'border-surface-400 hover:border-surface-300'
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
                                        <p className="text-xs text-gray-500">JPEG, PNG, WebP — máx 10 MB</p>
                                    </>
                                )}
                            </div>
                        </button>
                        <input ref={coverInputRef} type="file" accept="image/*" className="hidden" onChange={handleCoverChange} />
                        {coverError && <p className="text-xs text-red-400 mt-1">{coverError}</p>}
                    </div>

                    {/* Title */}
                    <div>
                        <label className="label" htmlFor="title">Título *</label>
                        <input id="title" type="text" placeholder="Nombre de la canción" className={`input ${errors.title ? 'border-red-500' : ''}`} {...register('title')} />
                        {errors.title && <p className="text-xs text-red-400 mt-1">{errors.title.message}</p>}
                    </div>

                    {/* Artist */}
                    <div>
                        <label className="label" htmlFor="artist_name">Artista *</label>
                        <input id="artist_name" type="text" placeholder="Nombre del artista" className={`input ${errors.artist_name ? 'border-red-500' : ''}`} {...register('artist_name')} />
                        {errors.artist_name && <p className="text-xs text-red-400 mt-1">{errors.artist_name.message}</p>}
                    </div>

                    {/* Album */}
                    <div>
                        <label className="label" htmlFor="album_name">Álbum (opcional)</label>
                        <input id="album_name" type="text" placeholder="Nombre del álbum" className="input" {...register('album_name')} />
                    </div>

                    {/* Submit */}
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
                                Subir canción
                            </span>
                        )}
                    </button>
                </form>
            </div>
        </div>
    )
}
