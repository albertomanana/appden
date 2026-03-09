import React from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Music, CreditCard, ListMusic, FolderOpen, Heart, TrendingUp, Users } from 'lucide-react'
import { useAuth } from '@hooks/useAuth'
import { useActiveGroup } from '@hooks/useActiveGroup'
import { Avatar } from '@components/common/Avatar'
import { ROUTES } from '@lib/constants'
import { songsService } from '@services/songs.service'
import { debtsService } from '@services/debts.service'
import { formatRelative } from '@lib/utils'

const DashboardPage: React.FC = () => {
    const { profile, userId } = useAuth()
    const { activeGroup, groupId, hasGroup } = useActiveGroup()

    const { data: recentSongs } = useQuery({
        queryKey: ['songs', groupId, 'recent'],
        queryFn: () => songsService.getSongs(groupId!, userId!),
        enabled: !!groupId && !!userId,
        select: (songs) => songs.slice(0, 3),
    })

    const { data: debts } = useQuery({
        queryKey: ['debts-summary', groupId],
        queryFn: () => debtsService.getGroupSummary(groupId!),
        enabled: !!groupId,
    })

    const myBalance = userId && debts ? (debts[userId] ?? { owed: 0, lent: 0 }) : null

    const quickLinks = [
        { icon: Music, label: 'Música', to: ROUTES.MUSIC, color: 'from-brand-600 to-brand-800' },
        { icon: ListMusic, label: 'Playlists', to: ROUTES.PLAYLISTS, color: 'from-accent-purple to-brand-800' },
        { icon: Heart, label: 'Favoritos', to: ROUTES.FAVORITES, color: 'from-pink-600 to-accent-purple' },
        { icon: CreditCard, label: 'Deudas', to: ROUTES.DEBTS, color: 'from-accent-amber to-orange-700' },
        { icon: FolderOpen, label: 'Archivos', to: ROUTES.FILES, color: 'from-accent-cyan to-brand-700' },
    ]

    return (
        <div className="p-4 md:p-6 space-y-6 animate-fade-in">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-white">
                        Hola, {profile?.display_name?.split(' ')[0] ?? 'amigo'} 👋
                    </h1>
                    {activeGroup && (
                        <p className="text-sm text-gray-400 mt-0.5 flex items-center gap-1.5">
                            <Users className="w-3.5 h-3.5" />
                            {activeGroup.name}
                        </p>
                    )}
                </div>
                <Link to={ROUTES.PROFILE}>
                    <Avatar src={profile?.avatar_url} name={profile?.display_name} size="md" />
                </Link>
            </div>

            {/* No group warning */}
            {!hasGroup && (
                <div className="card p-5 border-amber-500/30 bg-amber-500/5">
                    <p className="text-sm text-amber-300 font-medium">
                        No perteneces a ningún grupo todavía.
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                        Pide al administrador que te invite a un grupo para acceder a todas las funciones.
                    </p>
                </div>
            )}

            {/* Quick links grid */}
            <section>
                <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Accesos rápidos</h2>
                <div className="grid grid-cols-3 gap-3 md:grid-cols-5">
                    {quickLinks.map(({ icon: Icon, label, to, color }) => (
                        <Link
                            key={to}
                            to={to}
                            className="card-interactive flex flex-col items-center gap-2 p-4 text-center"
                        >
                            <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center`}>
                                <Icon className="w-5 h-5 text-white" />
                            </div>
                            <span className="text-xs font-medium text-gray-300">{label}</span>
                        </Link>
                    ))}
                </div>
            </section>

            {/* Balance summary */}
            {myBalance && (myBalance.owed > 0 || myBalance.lent > 0) && (
                <section>
                    <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                        <TrendingUp className="w-3.5 h-3.5 inline mr-1" />
                        Tu balance de deudas
                    </h2>
                    <div className="grid grid-cols-2 gap-3">
                        <div className="card p-4">
                            <p className="text-xs text-gray-400 mb-1">Debes</p>
                            <p className="text-xl font-bold text-red-400">
                                {myBalance.owed.toFixed(2)} €
                            </p>
                        </div>
                        <div className="card p-4">
                            <p className="text-xs text-gray-400 mb-1">Te deben</p>
                            <p className="text-xl font-bold text-emerald-400">
                                {myBalance.lent.toFixed(2)} €
                            </p>
                        </div>
                    </div>
                    <Link to={ROUTES.DEBTS} className="text-xs text-brand-400 hover:text-brand-300 transition-colors mt-2 inline-block">
                        Ver todas las deudas →
                    </Link>
                </section>
            )}

            {/* Recent music */}
            {recentSongs && recentSongs.length > 0 && (
                <section>
                    <div className="flex items-center justify-between mb-3">
                        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Añadido recientemente</h2>
                        <Link to={ROUTES.MUSIC} className="text-xs text-brand-400 hover:text-brand-300 transition-colors">
                            Ver todo
                        </Link>
                    </div>
                    <div className="space-y-2">
                        {recentSongs.map((song) => (
                            <Link
                                key={song.id}
                                to={ROUTES.SONG(song.id)}
                                className="card-interactive flex items-center gap-3 p-3"
                            >
                                <div className="w-11 h-11 rounded-lg overflow-hidden flex-shrink-0 bg-surface-600">
                                    {song.cover_url ? (
                                        <img src={song.cover_url} alt={song.title} className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center">
                                            <Music className="w-5 h-5 text-gray-500" />
                                        </div>
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-white truncate">{song.title}</p>
                                    <p className="text-xs text-gray-400 truncate">{song.artist_name}</p>
                                </div>
                                <p className="text-xs text-gray-500 flex-shrink-0">{formatRelative(song.created_at)}</p>
                            </Link>
                        ))}
                    </div>
                </section>
            )}
        </div>
    )
}

export default DashboardPage
