import React from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, Play, Heart, Music, Clock, User } from 'lucide-react'
import { songsService } from '@services/songs.service'
import { useAuth } from '@hooks/useAuth'
import { useActiveGroup } from '@hooks/useActiveGroup'
import { usePlayerStore } from '@app/store/player.store'
import { Avatar } from '@components/common/Avatar'
import { ShareButton } from '@components/share/ShareButton'
import { formatDuration, formatDate, formatBytes } from '@lib/utils'

const SongDetailPage: React.FC = () => {
    const { songId } = useParams<{ songId: string }>()
    const navigate = useNavigate()
    const { userId } = useAuth()
    const setQueue = usePlayerStore((s) => s.setQueue)

    const { data: song, isLoading } = useQuery({
        queryKey: ['song', songId],
        queryFn: () => songsService.getSong(songId!, userId!),
        enabled: !!songId && !!userId,
    })

    if (isLoading) {
        return (
            <div className="p-4 flex items-center justify-center h-64">
                <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
            </div>
        )
    }

    if (!song) {
        return <div className="p-4 text-gray-400">Canción no encontrada.</div>
    }

    return (
        <div className="p-4 md:p-6 max-w-lg mx-auto space-y-5 animate-fade-in">
            <button onClick={() => navigate(-1)} className="btn-ghost gap-2 -ml-1">
                <ArrowLeft className="w-4 h-4" /> Volver
            </button>

            {/* Cover art */}
            <div className="w-full aspect-square rounded-2xl overflow-hidden bg-surface-600">
                {song.cover_url ? (
                    <img src={song.cover_url} alt={song.title} className="w-full h-full object-cover" />
                ) : (
                    <div className="w-full h-full flex items-center justify-center">
                        <Music className="w-16 h-16 text-gray-600" />
                    </div>
                )}
            </div>

            {/* Info + play */}
            <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                    <h1 className="text-2xl font-extrabold text-white truncate">{song.title}</h1>
                    <p className="text-base text-gray-400 mt-1">{song.artist_name}</p>
                    {song.album_name && <p className="text-sm text-gray-500">{song.album_name}</p>}
                </div>
                <button
                    onClick={() => setQueue([song], 0)}
                    className="w-14 h-14 rounded-full bg-brand-600 hover:bg-brand-500 flex items-center justify-center flex-shrink-0 transition-colors shadow-glow-brand active:scale-95"
                    aria-label="Reproducir"
                >
                    <Play className="w-6 h-6 text-white ml-1" />
                </button>
            </div>

            {/* Metadata */}
            <div className="card p-4 grid grid-cols-2 gap-4">
                <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-gray-500" />
                    <div>
                        <p className="text-xs text-gray-500">Duración</p>
                        <p className="text-sm font-medium text-white">{formatDuration(song.duration_seconds)}</p>
                    </div>
                </div>
                {song.file_size && (
                    <div className="flex items-center gap-2">
                        <Music className="w-4 h-4 text-gray-500" />
                        <div>
                            <p className="text-xs text-gray-500">Tamaño</p>
                            <p className="text-sm font-medium text-white">{formatBytes(song.file_size)}</p>
                        </div>
                    </div>
                )}
                <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-gray-500" />
                    <div>
                        <p className="text-xs text-gray-500">Subida por</p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                            <Avatar src={song.uploader?.avatar_url} name={song.uploader?.display_name} size="xs" />
                            <p className="text-sm font-medium text-white">{song.uploader?.display_name}</p>
                        </div>
                    </div>
                </div>
                <div>
                    <p className="text-xs text-gray-500">Añadida</p>
                    <p className="text-sm font-medium text-white">{formatDate(song.created_at)}</p>
                </div>
            </div>

            {/* Share */}
            <ShareButton resourceType="song" resourceId={song.id} label={`${song.title} - ${song.artist_name}`} />
        </div>
    )
}

export default SongDetailPage
