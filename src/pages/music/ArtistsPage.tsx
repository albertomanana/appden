import React from 'react'
import { Link } from 'react-router-dom'
import { ChevronRight, Mic2 } from 'lucide-react'
import { Avatar } from '@components/common/Avatar'
import { MusicTabs } from '@components/music/MusicTabs'
import { EmptyState } from '@components/ui/EmptyState'
import { ErrorNotice } from '@components/ui/ErrorNotice'
import { ListSkeleton } from '@components/ui/LoadingSkeleton'
import { PageHeader, SectionHeader } from '@components/ui/PageHeader'
import { useMusicLibrary } from '@features/music/hooks/useMusicLibrary'
import { useActiveGroup } from '@hooks/useActiveGroup'
import { ROUTES } from '@lib/constants'
import type { MusicArtist } from '@features/music/types'

function songCount(artist: MusicArtist): string {
    const total = artist.songs.length + artist.uploadedOnly.length
    return `${total} ${total === 1 ? 'canción' : 'canciones'}`
}

const ArtistsPage: React.FC = () => {
    const { hasGroup } = useActiveGroup()
    const { artists, isLoading, error, songsQuery } = useMusicLibrary()

    const members = artists.filter((artist) => artist.profileId)
    const external = artists.filter((artist) => !artist.profileId)

    return (
        <div className="page-shell animate-fade-in">
            <PageHeader title="Música" description={hasGroup ? 'Los artistas sois vosotros' : undefined} />
            <MusicTabs active="artists" />

            {!hasGroup ? (
                <EmptyState icon={<Mic2 className="h-6 w-6" />} title="Sin grupo activo" description="Elige un grupo arriba para ver sus artistas." />
            ) : isLoading ? (
                <ListSkeleton count={4} />
            ) : error ? (
                <ErrorNotice title="No pudimos cargar los artistas" error={error} onRetry={() => void songsQuery.refetch()} />
            ) : artists.length === 0 ? (
                <EmptyState
                    icon={<Mic2 className="h-6 w-6" />}
                    title="Aún no hay artistas"
                    description="Al subir una canción, acredita a los miembros que la han hecho y tendrán su página de artista."
                />
            ) : (
                <>
                    {members.length > 0 ? (
                        <section>
                            <SectionHeader title="Del grupo" />
                            <div className="list-group">
                                {members.map((artist) => (
                                    <Link key={artist.key} to={ROUTES.ARTIST(artist.profileId!)} className="list-row">
                                        <Avatar src={artist.avatarUrl} name={artist.name} size="lg" />
                                        <span className="min-w-0 flex-1">
                                            <span className="block truncate text-[15px] font-semibold text-white">{artist.name}</span>
                                            <span className="block truncate text-[13px] text-gray-400">
                                                {artist.username ? `@${artist.username} · ` : ''}
                                                {songCount(artist)}
                                            </span>
                                        </span>
                                        <ChevronRight className="h-5 w-5 shrink-0 text-gray-600" />
                                    </Link>
                                ))}
                            </div>
                        </section>
                    ) : null}

                    {external.length > 0 ? (
                        <section>
                            <SectionHeader title="Colaboraciones" description="Artistas acreditados que no tienen cuenta." />
                            <div className="list-group">
                                {external.map((artist) => (
                                    <div key={artist.key} className="list-row">
                                        <Avatar name={artist.name} size="md" />
                                        <span className="min-w-0 flex-1">
                                            <span className="block truncate text-[15px] font-medium text-white">{artist.name}</span>
                                            <span className="block text-[13px] text-gray-400">{songCount(artist)}</span>
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </section>
                    ) : null}
                </>
            )}
        </div>
    )
}

export default ArtistsPage
