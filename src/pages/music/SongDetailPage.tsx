import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, Clock, Disc3, Music, Play, Sparkles, User } from 'lucide-react'
import { songsService } from '@services/songs.service'
import { useAuth } from '@hooks/useAuth'
import { useActiveGroup } from '@hooks/useActiveGroup'
import { usePlayerStore } from '@app/store/player.store'
import { Avatar } from '@components/common/Avatar'
import { LyricsPanel } from '@components/music/LyricsPanel'
import { SongSocialPanel } from '@features/social/components/SongSocialPanel'
import { ShareButton } from '@components/share/ShareButton'
import { formatBytes, formatDate, formatDuration } from '@lib/utils'

const SongDetailPage: React.FC = () => {
    const { songId } = useParams<{ songId: string }>()
    const [searchParams] = useSearchParams()
    const navigate = useNavigate()
    const { userId } = useAuth()
    const { groupId } = useActiveGroup()

    const setQueue = usePlayerStore((state) => state.setQueue)
    const setCurrentTime = usePlayerStore((state) => state.setCurrentTime)
    const setPlaying = usePlayerStore((state) => state.setPlaying)
    const togglePlay = usePlayerStore((state) => state.togglePlay)
    const currentSong = usePlayerStore((state) => state.currentSong)
    const currentTime = usePlayerStore((state) => state.currentTime)

    const [activeTab, setActiveTab] = useState<'overview' | 'lyrics' | 'social'>('overview')
    const [coverFailed, setCoverFailed] = useState(false)
    const appliedTimestampRef = useRef<string | null>(null)

    const { data: song, isLoading } = useQuery({
        queryKey: ['song', songId],
        queryFn: () => songsService.getSong(songId!, userId!),
        enabled: !!songId && !!userId,
    })

    const { data: groupSongs } = useQuery({
        queryKey: ['songs', groupId],
        queryFn: () => songsService.getSongs(groupId!, userId!),
        enabled: !!groupId && !!userId,
    })

    const sharedTimestamp = useMemo(() => {
        const raw = searchParams.get('t')
        if (!raw) return null
        const parsed = Number(raw)
        if (!Number.isFinite(parsed) || parsed < 0) return null
        return Math.floor(parsed)
    }, [searchParams])

    const handlePlay = () => {
        if (!song) return

        if (currentSong?.id === song.id) {
            togglePlay()
            return
        }

        if (groupSongs && groupSongs.length > 0) {
            const idx = groupSongs.findIndex((item) => item.id === song.id)
            setQueue(groupSongs, idx >= 0 ? idx : 0)
            return
        }

        setQueue([song], 0)
    }

    useEffect(() => {
        setCoverFailed(false)
    }, [song?.id, song?.cover_url])

    useEffect(() => {
        if (!song || sharedTimestamp == null) return

        const key = `${song.id}:${sharedTimestamp}`
        if (appliedTimestampRef.current === key) return
        appliedTimestampRef.current = key

        if (currentSong?.id !== song.id) {
            setQueue([song], 0)
            const timer = window.setTimeout(() => {
                setCurrentTime(sharedTimestamp)
                setPlaying(true)
            }, 220)

            return () => window.clearTimeout(timer)
        }

        setCurrentTime(sharedTimestamp)
        setPlaying(true)
    }, [song, sharedTimestamp, currentSong?.id, setCurrentTime, setPlaying, setQueue])

    const tabButtons = useMemo(
        () => [
            { id: 'overview', label: 'Resumen' },
            { id: 'lyrics', label: 'Letras' },
            { id: 'social', label: 'Comunidad' },
        ] as const,
        []
    )

    if (isLoading) {
        return (
            <div className="p-4 flex items-center justify-center h-64">
                <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
            </div>
        )
    }

    if (!song) {
        return <div className="p-4 text-gray-400">Cancion no encontrada.</div>
    }

    const artistCredits = song.artist_credits ?? []

    return (
        <div className="relative min-h-full">
            <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_top,rgba(42,64,117,0.18),transparent_28%),linear-gradient(180deg,#09090c_0%,#111114_100%)] opacity-95" />

            <div className="relative p-4 md:p-6 max-w-3xl mx-auto space-y-5 animate-fade-in">
                <button onClick={() => navigate(-1)} className="btn-ghost gap-2 -ml-1">
                    <ArrowLeft className="w-4 h-4" /> Volver
                </button>

                <section className="card overflow-hidden">
                    <div className="p-4 md:p-5 flex flex-col md:flex-row gap-4 md:gap-5">
                        <div className="w-full md:w-56 aspect-square rounded-2xl overflow-hidden bg-surface-600 flex-shrink-0">
                            {song.cover_url && !coverFailed ? (
                                <img
                                    src={song.cover_url}
                                    alt={song.title}
                                    className="w-full h-full object-cover"
                                    onError={() => setCoverFailed(true)}
                                />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                    <Music className="w-16 h-16 text-gray-600" />
                                </div>
                            )}
                        </div>

                        <div className="flex-1 min-w-0 space-y-4">
                            <div>
                                <h1 className="text-2xl md:text-3xl font-extrabold text-white truncate">{song.title}</h1>
                                <p className="text-base text-gray-300 mt-1 truncate">{song.artist_name}</p>
                                {song.album_name ? <p className="text-sm text-gray-400">{song.album_name}</p> : null}
                                {artistCredits.length > 0 ? (
                                    <div className="mt-3 flex flex-wrap gap-2">
                                        {artistCredits.map((credit) => {
                                            const label = credit.profile?.display_name ?? credit.artist_name ?? 'Artista'
                                            return credit.profile?.id ? (
                                                <button
                                                    key={credit.id}
                                                    type="button"
                                                    onClick={() => navigate(`/profile/${credit.profile!.id}`)}
                                                    className="hero-meta-pill hover:border-brand-300/40 hover:text-white"
                                                >
                                                    {label}
                                                </button>
                                            ) : (
                                                <span key={credit.id} className="hero-meta-pill">
                                                    {label}
                                                </span>
                                            )
                                        })}
                                    </div>
                                ) : null}
                            </div>

                            <div className="flex items-center gap-2">
                                <button onClick={handlePlay} className="btn-primary px-4 py-2.5" aria-label="Reproducir">
                                    <Play className="w-4 h-4" />
                                    Reproducir
                                </button>
                                <ShareButton
                                    resourceType="song"
                                    resourceId={song.id}
                                    label={`${song.title} - ${song.artist_name}`}
                                    timestampSeconds={currentSong?.id === song.id ? currentTime : null}
                                />
                            </div>

                            <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
                                <div className="rounded-xl bg-surface-600/70 border border-surface-500 p-2.5">
                                    <p className="text-[11px] text-gray-500">Duracion</p>
                                    <p className="text-sm text-white mt-0.5">{formatDuration(song.duration_seconds)}</p>
                                </div>
                                {song.file_size ? (
                                    <div className="rounded-xl bg-surface-600/70 border border-surface-500 p-2.5">
                                        <p className="text-[11px] text-gray-500">Tamano</p>
                                        <p className="text-sm text-white mt-0.5">{formatBytes(song.file_size)}</p>
                                    </div>
                                ) : null}
                                <div className="rounded-xl bg-surface-600/70 border border-surface-500 p-2.5">
                                    <p className="text-[11px] text-gray-500">Fecha</p>
                                    <p className="text-sm text-white mt-0.5">{formatDate(song.created_at)}</p>
                                </div>
                                <div className="rounded-xl bg-surface-600/70 border border-surface-500 p-2.5">
                                    <p className="text-[11px] text-gray-500">Formato</p>
                                    <p className="text-sm text-white mt-0.5 truncate">{song.mime_type ?? 'audio/*'}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="px-4 md:px-5 pb-4 md:pb-5">
                        <div className="flex gap-2 overflow-x-auto no-scrollbar">
                            {tabButtons.map((tab) => (
                                <button
                                    key={tab.id}
                                    type="button"
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`px-3.5 py-2 rounded-xl text-sm border transition-colors whitespace-nowrap ${
                                        activeTab === tab.id
                                            ? 'bg-brand-500/20 text-brand-200 border-brand-400/50'
                                            : 'bg-surface-700/50 text-gray-300 border-surface-500 hover:text-white'
                                    }`}
                                >
                                    {tab.label}
                                </button>
                            ))}
                        </div>
                    </div>
                </section>

                {activeTab === 'overview' ? (
                    <section className="card p-4 space-y-4">
                        <div className="flex items-center gap-2">
                            <Disc3 className="w-4 h-4 text-brand-300" />
                            <h2 className="text-base font-semibold text-white">Detalles de la cancion</h2>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div className="rounded-xl border border-surface-500 bg-surface-700/60 p-3">
                                <p className="text-xs text-gray-500 flex items-center gap-1.5">
                                    <User className="w-3.5 h-3.5" /> Subida por
                                </p>
                                <div className="flex items-center gap-2 mt-2">
                                    <Avatar src={song.uploader?.avatar_url} name={song.uploader?.display_name} size="sm" />
                                    <p className="text-sm text-white">{song.uploader?.display_name ?? 'Usuario'}</p>
                                </div>
                            </div>
                            <div className="rounded-xl border border-surface-500 bg-surface-700/60 p-3">
                                <p className="text-xs text-gray-500 flex items-center gap-1.5">
                                    <Clock className="w-3.5 h-3.5" /> Duracion
                                </p>
                                <p className="text-sm text-white mt-2">{formatDuration(song.duration_seconds)}</p>
                            </div>
                            <div className="rounded-xl border border-surface-500 bg-surface-700/60 p-3 md:col-span-2">
                                <p className="text-xs text-gray-500 flex items-center gap-1.5">
                                    <Sparkles className="w-3.5 h-3.5" /> Letras
                                </p>
                                <p className="text-sm text-gray-200 mt-2">
                                    Si quieres, puedes abrir la pestana de letras para editar o sincronizar el texto.
                                </p>
                            </div>
                        </div>
                    </section>
                ) : null}

                {activeTab === 'lyrics' && userId ? (
                    <LyricsPanel
                        song={song}
                        userId={userId}
                        canEdit={song.uploaded_by === userId}
                    />
                ) : null}

                {activeTab === 'social' && userId ? (
                    <SongSocialPanel song={song} userId={userId} groupId={groupId ?? song.group_id} />
                ) : null}
            </div>
        </div>
    )
}

export default SongDetailPage
