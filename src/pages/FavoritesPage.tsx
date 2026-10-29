import React from 'react'
import { useQuery } from '@tanstack/react-query'
import { Heart, Music } from 'lucide-react'
import { useAuth } from '@hooks/useAuth'
import { favoritesService } from '@services/favorites.service'
import { usePlayerStore } from '@app/store/player.store'
import { SongCard } from '@components/music/SongCard'
import { EmptyState } from '@components/ui/EmptyState'
import { ListSkeleton } from '@components/ui/LoadingSkeleton'
import { PageHeader } from '@components/ui/PageHeader'
import { MusicTabs } from '@components/music/MusicTabs'
import { ROUTES } from '@lib/constants'
import { Link } from 'react-router-dom'

const FavoritesPage: React.FC = () => {
    const { userId } = useAuth()
    const setQueue = usePlayerStore((s) => s.setQueue)

    const { data: favorites, isLoading } = useQuery({
        queryKey: ['favorites', userId],
        queryFn: () => favoritesService.getFavorites(userId!),
        enabled: !!userId,
    })

    return (
        <div className="page-shell animate-fade-in">
            <PageHeader
                title="Música"
                description={favorites ? `${favorites.length} ${favorites.length === 1 ? 'canción favorita' : 'canciones favoritas'}` : undefined}
            />
            <MusicTabs active="favorites" />

            {isLoading ? (
                <ListSkeleton count={5} />
            ) : !favorites || favorites.length === 0 ? (
                <EmptyState
                    icon={<Heart className="w-7 h-7" />}
                    title="Aún no tienes favoritas"
                    description="Marca el corazón en una canción para añadirla aquí."
                    action={
                        <Link to={ROUTES.MUSIC} className="btn-primary">
                            <Music className="w-4 h-4" />
                            Explorar música
                        </Link>
                    }
                />
            ) : (
                <div className="space-y-2">
                    {favorites.map((song, idx) => (
                        <SongCard
                            key={song.id}
                            song={song}
                            onPlay={() => setQueue(favorites, idx)}
                        />
                    ))}
                </div>
            )}
        </div>
    )
}

export default FavoritesPage
