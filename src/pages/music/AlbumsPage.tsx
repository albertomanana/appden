import React from 'react'
import { Disc3 } from 'lucide-react'
import { AlbumCard } from '@components/music/AlbumCard'
import { MusicTabs } from '@components/music/MusicTabs'
import { EmptyState } from '@components/ui/EmptyState'
import { ErrorNotice } from '@components/ui/ErrorNotice'
import { PlaylistCardSkeleton } from '@components/ui/LoadingSkeleton'
import { PageHeader } from '@components/ui/PageHeader'
import { useMusicLibrary } from '@features/music/hooks/useMusicLibrary'
import { useActiveGroup } from '@hooks/useActiveGroup'

const AlbumsPage: React.FC = () => {
    const { hasGroup } = useActiveGroup()
    const { albums, isLoading, error, songsQuery } = useMusicLibrary()

    return (
        <div className="page-shell-wide animate-fade-in">
            <PageHeader title="Música" description={hasGroup ? `${albums.length} ${albums.length === 1 ? 'álbum' : 'álbumes'} en el grupo` : undefined} />
            <MusicTabs active="albums" />

            {!hasGroup ? (
                <EmptyState icon={<Disc3 className="h-6 w-6" />} title="Sin grupo activo" description="Elige un grupo arriba para ver sus álbumes." />
            ) : isLoading ? (
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
                    {Array.from({ length: 6 }).map((_, i) => (
                        <PlaylistCardSkeleton key={i} />
                    ))}
                </div>
            ) : error ? (
                <ErrorNotice title="No pudimos cargar los álbumes" error={error} onRetry={() => void songsQuery.refetch()} />
            ) : albums.length === 0 ? (
                <EmptyState
                    icon={<Disc3 className="h-6 w-6" />}
                    title="Todavía no hay álbumes"
                    description="Al subir o editar una canción, indica su álbum y aparecerá aquí con todas sus pistas."
                />
            ) : (
                <div className="grid grid-cols-2 gap-x-4 gap-y-5 sm:grid-cols-3 lg:grid-cols-5">
                    {albums.map((album) => (
                        <AlbumCard key={album.id} album={album} />
                    ))}
                </div>
            )}
        </div>
    )
}

export default AlbumsPage
