import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Calendar, Clock, Disc3, Edit2, Heart, MoreHorizontal, Music, Pause, Play } from 'lucide-react'
import { songsService } from '@services/songs.service'
import { useAuth } from '@hooks/useAuth'
import { useActiveGroup } from '@hooks/useActiveGroup'
import { usePlayerStore } from '@app/store/player.store'
import { Avatar } from '@components/common/Avatar'
import { LyricsPanel } from '@components/music/LyricsPanel'
import { SongSocialPanel } from '@features/social/components/SongSocialPanel'
import { Cover } from '@components/music/Cover'
import { EditSongForm } from '@components/music/EditSongForm'
import { SongActionsSheet } from '@components/music/SongActionsSheet'
import { EmptyState } from '@components/ui/EmptyState'
import { ListSkeleton, Skeleton } from '@components/ui/LoadingSkeleton'
import { PageHeader } from '@components/ui/PageHeader'
import { Tabs } from '@components/ui/Tabs'
import { useDominantColor } from '@features/player/hooks/useDominantColor'
import { getSongAlbumRouteId, getSongMemberCredits } from '@features/music/utils/library'
import { canEditSong } from '@features/music/utils/permissions'
import { useFavoriteToggle } from '@hooks/useFavoriteToggle'
import { ROUTES } from '@lib/constants'
import { cn, formatDate, formatDuration } from '@lib/utils'

const SongDetailPage: React.FC = () => {
    const { songId } = useParams<{ songId: string }>()
    const [searchParams] = useSearchParams()
    const { userId } = useAuth()
    const { groupId } = useActiveGroup()

    const setQueue = usePlayerStore((state) => state.setQueue)
    const setCurrentTime = usePlayerStore((state) => state.setCurrentTime)
    const setPlaying = usePlayerStore((state) => state.setPlaying)
    const togglePlay = usePlayerStore((state) => state.togglePlay)
    const currentSong = usePlayerStore((state) => state.currentSong)

    const [activeTab, setActiveTab] = useState<'lyrics' | 'social'>(searchParams.get('tab') === 'comentarios' ? 'social' : 'lyrics')
    const [showActions, setShowActions] = useState(false)
    const [editing, setEditing] = useState(false)
    const isPlaying = usePlayerStore((state) => state.isPlaying)
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

    const favorite = useFavoriteToggle(song?.id, song?.is_favorite)
    const tint = useDominantColor(song?.cover_url)

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

    if (isLoading) {
        return (
            <div className="page-shell">
                <PageHeader back title={<span className="sr-only">Canción</span>} />
                <Skeleton className="mx-auto aspect-square w-56 rounded-3xl" />
                <ListSkeleton count={3} />
            </div>
        )
    }

    if (!song) {
        return (
            <div className="page-shell">
                <PageHeader back={ROUTES.MUSIC} title="Canción" />
                <EmptyState icon={<Music className="h-6 w-6" />} title="No encontramos esta canción" description="Puede que se haya eliminado o que pertenezca a otro grupo." />
            </div>
        )
    }

    const memberCredits = getSongMemberCredits(song)
    const externalCredits = (song.artist_credits ?? []).filter((credit) => !credit.profile_id && credit.artist_name)
    const albumRouteId = getSongAlbumRouteId(song)
    const isCurrent = currentSong?.id === song.id
    const isThisPlaying = isCurrent && isPlaying
    const canEdit = canEditSong(song, userId)
    const wash = tint ? `color-mix(in srgb, ${tint} 45%, transparent)` : 'rgba(55,90,170,0.25)'

    return (
        <div className="relative">
            <div
                className="pointer-events-none absolute inset-x-0 -top-[var(--header-h)] h-[28rem] transition-[background] duration-700"
                style={{ background: `linear-gradient(180deg, ${wash} 0%, transparent 100%)` }}
            />

            <div className="page-shell relative animate-fade-in">
                <PageHeader back title={<span className="sr-only">{song.title}</span>} className="-mb-4" />

                <section className="flex flex-col items-center text-center md:flex-row md:items-end md:gap-7 md:text-left">
                    <Cover
                        src={song.cover_url}
                        alt={song.title}
                        seed={song.id}
                        className="aspect-square w-56 rounded-3xl shadow-[0_24px_70px_rgba(0,0,0,0.55)]"
                        iconClassName="h-12 w-12"
                    />
                    <div className="mt-5 min-w-0 md:mt-0">
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/50">Canción</p>
                        <h1 className="mt-1 break-words font-headline text-3xl font-extrabold tracking-tight text-white md:text-4xl">{song.title}</h1>
                        <p className="mt-2 text-[15px] text-gray-300">
                            {memberCredits.length > 0 || externalCredits.length > 0 ? (
                                <>
                                    {memberCredits.map((artist, index) => (
                                        <React.Fragment key={artist.key}>
                                            {index > 0 ? ', ' : null}
                                            <Link
                                                to={ROUTES.ARTIST(artist.profileId!)}
                                                className="font-semibold text-white underline-offset-4 transition-colors hover:text-brand-200 hover:underline"
                                            >
                                                {artist.name}
                                            </Link>
                                        </React.Fragment>
                                    ))}
                                    {externalCredits.map((credit, index) => (
                                        <React.Fragment key={credit.id}>
                                            {memberCredits.length > 0 || index > 0 ? ', ' : null}
                                            {credit.artist_name}
                                        </React.Fragment>
                                    ))}
                                </>
                            ) : (
                                song.artist_name
                            )}
                        </p>
                        {song.album_name ? (
                            albumRouteId ? (
                                <Link to={ROUTES.ALBUM(albumRouteId)} className="mt-1 inline-flex items-center gap-1.5 text-sm text-gray-400 transition-colors hover:text-white">
                                    <Disc3 className="h-4 w-4" />
                                    {song.album_name}
                                </Link>
                            ) : (
                                <p className="mt-1 text-sm text-gray-400">{song.album_name}</p>
                            )
                        ) : null}
                    </div>
                </section>

                <div className="flex items-center justify-center gap-2 md:justify-start">
                    <button onClick={handlePlay} className="btn-primary !min-h-[3rem] flex-1 !px-6 sm:flex-none" aria-label={isThisPlaying ? 'Pausar' : 'Reproducir'}>
                        {isThisPlaying ? <Pause className="h-5 w-5 fill-current" /> : <Play className="h-5 w-5 fill-current" />}
                        {isThisPlaying ? 'Pausar' : 'Reproducir'}
                    </button>
                    <button
                        type="button"
                        onClick={favorite.toggle}
                        className={cn('btn-icon !h-12 !w-12', favorite.isFavorite && 'text-pink-400')}
                        aria-label={favorite.isFavorite ? 'Quitar de favoritas' : 'Añadir a favoritas'}
                        aria-pressed={favorite.isFavorite}
                    >
                        <Heart className={cn('h-5 w-5', favorite.isFavorite && 'fill-current')} />
                    </button>
                    {canEdit ? (
                        <button type="button" onClick={() => setEditing(true)} className="btn-icon !h-12 !w-12" aria-label="Editar canción">
                            <Edit2 className="h-5 w-5" />
                        </button>
                    ) : null}
                    <button type="button" onClick={() => setShowActions(true)} className="btn-icon !h-12 !w-12" aria-label="Más opciones">
                        <MoreHorizontal className="h-5 w-5" />
                    </button>
                </div>

                <div className="flex flex-wrap items-center justify-center gap-2 md:justify-start">
                    {song.uploader ? (
                        <Link to={ROUTES.ARTIST(song.uploaded_by)} className="hero-meta-pill transition-colors hover:border-white/20 hover:text-white">
                            <Avatar src={song.uploader.avatar_url} name={song.uploader.display_name} size="xs" />
                            Subida por {song.uploader.display_name.split(' ')[0]}
                        </Link>
                    ) : null}
                    <span className="hero-meta-pill">
                        <Clock className="h-3.5 w-3.5" />
                        {formatDuration(song.duration_seconds)}
                    </span>
                    <span className="hero-meta-pill">
                        <Calendar className="h-3.5 w-3.5" />
                        {formatDate(song.created_at)}
                    </span>
                </div>

                <Tabs
                    active={activeTab}
                    stretch
                    onChange={(value) => setActiveTab(value as 'lyrics' | 'social')}
                    items={[
                        { label: 'Letra', value: 'lyrics' },
                        { label: 'Comentarios', value: 'social' },
                    ]}
                />

                {activeTab === 'lyrics' && userId ? <LyricsPanel song={song} userId={userId} canEdit={canEdit} /> : null}
                {activeTab === 'social' && userId ? <SongSocialPanel song={song} userId={userId} groupId={groupId ?? song.group_id} /> : null}
            </div>

            <SongActionsSheet
                song={song}
                open={showActions}
                onClose={() => setShowActions(false)}
                favorite={favorite}
                isCurrent={isCurrent}
                isPlaying={isPlaying}
                onPrimary={handlePlay}
                onEdit={() => setEditing(true)}
                context="detail"
            />
            {editing ? <EditSongForm song={song} onClose={() => setEditing(false)} /> : null}
        </div>
    )
}

export default SongDetailPage
