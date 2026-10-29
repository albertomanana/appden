import React, { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Mic2, Play, Shuffle, UserRound } from 'lucide-react'
import { usePlayerStore } from '@app/store/player.store'
import { useAdvancedPlayerStore } from '@features/player/player.store'
import { Avatar } from '@components/common/Avatar'
import { AlbumCard } from '@components/music/AlbumCard'
import { EditSongForm } from '@components/music/EditSongForm'
import { SongCard } from '@components/music/SongCard'
import { EmptyState } from '@components/ui/EmptyState'
import { ListSkeleton, ProfileSkeleton } from '@components/ui/LoadingSkeleton'
import { PageHeader, SectionHeader } from '@components/ui/PageHeader'
import { useMusicLibrary } from '@features/music/hooks/useMusicLibrary'
import { getArtistSongs, randomIndex } from '@features/music/utils/library'
import { useActiveGroup } from '@hooks/useActiveGroup'
import { useAuth } from '@hooks/useAuth'
import { ROUTES } from '@lib/constants'
import { profileService } from '@services/profile.service'
import type { Song } from '@/types'

const ArtistProfilePage: React.FC = () => {
    const { id = '' } = useParams<{ id: string }>()
    const { userId } = useAuth()
    const { groupId } = useActiveGroup()
    const { songs, albums, memberIndex, isLoading } = useMusicLibrary()
    const setQueue = usePlayerStore((state) => state.setQueue)
    const isShuffle = useAdvancedPlayerStore((state) => state.isShuffle)
    const toggleShuffle = useAdvancedPlayerStore((state) => state.toggleShuffle)
    const [editingSong, setEditingSong] = useState<Song | null>(null)

    const { data: profile, isLoading: profileLoading } = useQuery({
        queryKey: ['profile', id],
        queryFn: () => profileService.getProfile(id),
        enabled: !!id,
    })

    const { credited, uploadedOnly } = useMemo(() => getArtistSongs(songs, id, memberIndex), [songs, id, memberIndex])
    const allSongs = useMemo(() => [...credited, ...uploadedOnly], [credited, uploadedOnly])
    const artistAlbums = useMemo(() => albums.filter((album) => album.artists.some((artist) => artist.profileId === id)), [albums, id])

    const play = (shuffle: boolean) => {
        if (allSongs.length === 0) return
        if (shuffle !== isShuffle) toggleShuffle()
        setQueue(allSongs, shuffle ? randomIndex(allSongs.length) : 0)
    }

    if (profileLoading) {
        return (
            <div className="page-shell">
                <PageHeader back title={<span className="sr-only">Artista</span>} />
                <ProfileSkeleton />
            </div>
        )
    }

    if (!profile) {
        return (
            <div className="page-shell">
                <PageHeader back={ROUTES.ARTISTS} title="Artista" />
                <EmptyState icon={<Mic2 className="h-6 w-6" />} title="No encontramos a este artista" />
            </div>
        )
    }

    const isMe = profile.id === userId

    return (
        <div className="page-shell animate-fade-in">
            <PageHeader back title={<span className="sr-only">{profile.display_name}</span>} className="-mb-4" />

            <section className="flex flex-col items-center text-center md:flex-row md:items-end md:gap-6 md:text-left">
                <div className="rounded-full p-1 ring-2 ring-brand-400/40 shadow-[0_20px_60px_rgba(110,159,255,0.25)]">
                    <Avatar src={profile.avatar_url} name={profile.display_name} size="xl" className="!h-32 !w-32 !text-4xl" />
                </div>
                <div className="mt-4 min-w-0 md:mt-0">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">Artista</p>
                    <h1 className="mt-1 font-headline text-3xl font-extrabold tracking-tight text-white md:text-4xl">{profile.display_name}</h1>
                    <p className="mt-1 text-sm text-gray-400">
                        {profile.username ? `@${profile.username} · ` : ''}
                        {allSongs.length} {allSongs.length === 1 ? 'canción' : 'canciones'}
                        {artistAlbums.length > 0 ? ` · ${artistAlbums.length} ${artistAlbums.length === 1 ? 'álbum' : 'álbumes'}` : ''}
                    </p>
                    {profile.bio ? <p className="mt-2 max-w-md text-sm leading-relaxed text-gray-300">{profile.bio}</p> : null}
                </div>
            </section>

            <div className="flex gap-2">
                <button type="button" className="btn-primary flex-1 sm:flex-none" onClick={() => play(false)} disabled={allSongs.length === 0}>
                    <Play className="h-4 w-4 fill-current" />
                    Reproducir
                </button>
                <button type="button" className="btn-secondary flex-1 sm:flex-none" onClick={() => play(true)} disabled={allSongs.length === 0}>
                    <Shuffle className="h-4 w-4" />
                    Aleatorio
                </button>
                {groupId && !isMe ? (
                    <Link to={ROUTES.GROUP_MEMBER(groupId, profile.id)} className="btn-icon" aria-label="Ver perfil en el grupo" title="Ver perfil en el grupo">
                        <UserRound className="h-5 w-5" />
                    </Link>
                ) : null}
            </div>

            {artistAlbums.length > 0 ? (
                <section>
                    <SectionHeader title="Álbumes" />
                    <div className="scroller-x">
                        {artistAlbums.map((album) => (
                            <AlbumCard key={album.id} album={album} subtitle="meta" className="w-36 shrink-0 sm:w-40" />
                        ))}
                    </div>
                </section>
            ) : null}

            <section>
                <SectionHeader title="Canciones" />
                {isLoading ? (
                    <ListSkeleton count={4} />
                ) : allSongs.length === 0 ? (
                    <EmptyState
                        compact
                        icon={<Mic2 className="h-6 w-6" />}
                        title={isMe ? 'Aún no tienes canciones acreditadas' : 'Aún no tiene canciones en este grupo'}
                        description="Al subir una canción, acredita a los artistas para que aparezcan aquí."
                    />
                ) : (
                    <div className="stagger -mx-1.5 space-y-0.5">
                        {credited.map((song, index) => (
                            <SongCard key={song.id} song={song} onPlay={() => setQueue(allSongs, index)} onEdit={() => setEditingSong(song)} />
                        ))}
                        {uploadedOnly.length > 0 ? (
                            <>
                                <p className="px-1.5 pb-1 pt-4 text-xs font-semibold uppercase tracking-[0.14em] text-gray-500">Subidas por {profile.display_name.split(' ')[0]}</p>
                                {uploadedOnly.map((song, index) => (
                                    <SongCard key={song.id} song={song} onPlay={() => setQueue(allSongs, credited.length + index)} onEdit={() => setEditingSong(song)} />
                                ))}
                            </>
                        ) : null}
                    </div>
                )}
            </section>

            {editingSong ? <EditSongForm song={editingSong} onClose={() => setEditingSong(null)} /> : null}
        </div>
    )
}

export default ArtistProfilePage
