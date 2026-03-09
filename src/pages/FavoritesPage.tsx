import React from 'react'
import { useQuery } from '@tanstack/react-query'
import { Heart, Music } from 'lucide-react'
import { useAuth } from '@hooks/useAuth'
import { useActiveGroup } from '@hooks/useActiveGroup'
import { favoritesService } from '@services/favorites.service'
import { usePlayerStore } from '@app/store/player.store'
import { SongCard } from '@components/music/SongCard'
import { EmptyState } from '@components/ui/EmptyState'
import { ListSkeleton } from '@components/ui/LoadingSkeleton'
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
        <div className="p-4 md:p-6 space-y-5 animate-fade-in">
            <div>
                <h1 className="section-title flex items-center gap-2">
                    <Heart className="w-5 h-5 text-pink-400 fill-current" />
                    Favoritos
                </h1>
                {favorites && <p className="text-sm text-muted mt-0.5">{favorites.length} canciones</p>}
            </div>

            {isLoading ? (
                <ListSkeleton count={5} />
            ) : !favorites || favorites.length === 0 ? (
                <EmptyState
                    icon={<Heart className="w-7 h-7" />}
                    title="Sin favoritos todavía"
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
