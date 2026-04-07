import React from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
    CreditCard,
    Flag,
    MessageSquare,
    Music,
    Sparkles,
    TrendingUp,
    Users,
} from 'lucide-react'
import { useAuth } from '@hooks/useAuth'
import { useActiveGroup } from '@hooks/useActiveGroup'
import { PageHeader } from '@components/ui/PageHeader'
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
        {
            icon: Music,
            label: 'Musica',
            subtitle: 'Library and uploads',
            to: ROUTES.MUSIC,
            color: 'from-brand-400 via-brand-500 to-brand-600',
        },
        {
            icon: Users,
            label: 'Grupos',
            subtitle: 'Private rooms',
            to: ROUTES.GROUPS,
            color: 'from-violet-400 via-violet-500 to-indigo-500',
        },
        {
            icon: MessageSquare,
            label: 'Social',
            subtitle: 'Connections',
            to: ROUTES.CONNECTIONS,
            color: 'from-pink-400 via-fuchsia-500 to-violet-500',
        },
        {
            icon: CreditCard,
            label: 'Deudas',
            subtitle: 'Shared balance',
            to: ROUTES.DEBTS,
            color: 'from-amber-300 via-orange-400 to-orange-500',
        },
        {
            icon: Flag,
            label: 'Reports',
            subtitle: 'Issue board',
            to: ROUTES.REPORTS,
            color: 'from-cyan-300 via-sky-400 to-brand-500',
        },
    ]

    return (
        <div className="page-shell animate-fade-in">
            <PageHeader
                kicker="Private Sonic Room"
                title={`Hola, ${profile?.display_name?.split(' ')[0] ?? 'friend'}`}
                description="Tu base privada para musica compartida, grupos y seguimiento del dia a dia. Todo sigue cableado a la logica real del producto."
                meta={
                    <>
                        <span className="hero-meta-pill">
                            <Users className="w-3.5 h-3.5 text-brand-400" />
                            {activeGroup?.name ?? 'Sin grupo activo'}
                        </span>
                        <span className="hero-meta-pill">
                            <Sparkles className="w-3.5 h-3.5 text-brand-400" />
                            {(recentSongs?.length ?? 0)} tracks recientes
                        </span>
                    </>
                }
            />

            {!hasGroup ? (
                <section className="card p-5">
                    <p className="page-kicker">Access Layer</p>
                    <h2 className="mt-2 text-xl font-semibold text-white">Necesitas un grupo para desbloquear toda la app</h2>
                    <p className="mt-2 max-w-2xl text-sm leading-relaxed text-gray-400">
                        Cuando tengas un grupo activo podras compartir musica, ver actividad social y trabajar con deudas y reportes dentro del mismo contexto.
                    </p>
                    <div className="mt-4">
                        <Link to={ROUTES.GROUPS} className="btn-primary">
                            <Users className="w-4 h-4" />
                            Ir a grupos
                        </Link>
                    </div>
                </section>
            ) : null}

            <section className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                    <div>
                        <p className="page-kicker">Navigation Grid</p>
                        <h2 className="mt-2 text-2xl font-headline font-extrabold text-white">Accesos rapidos</h2>
                    </div>
                    <span className="hero-meta-pill">5 rutas clave</span>
                </div>

                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
                    {quickLinks.map(({ icon: Icon, label, subtitle, to, color }) => (
                        <Link key={to} to={to} className="card-interactive group p-4">
                            <div className={`flex h-12 w-12 items-center justify-center rounded-[1.35rem] bg-gradient-to-br ${color} shadow-[0_18px_40px_rgba(0,0,0,0.25)]`}>
                                <Icon className="h-5 w-5 text-white" />
                            </div>
                            <div className="mt-4 space-y-1">
                                <p className="text-sm font-semibold text-white group-hover:text-brand-200">{label}</p>
                                <p className="text-xs uppercase tracking-[0.18em] text-gray-500">{subtitle}</p>
                            </div>
                        </Link>
                    ))}
                </div>
            </section>

            <div className="grid gap-4 xl:grid-cols-[1.2fr,0.8fr]">
                <section className="card p-5">
                    <div className="flex items-center justify-between gap-3">
                        <div>
                            <p className="page-kicker">Fresh Additions</p>
                            <h2 className="mt-2 text-2xl font-headline font-extrabold text-white">Actividad musical reciente</h2>
                        </div>
                        <Link to={ROUTES.MUSIC} className="btn-secondary">
                            <Music className="w-4 h-4" />
                            Abrir musica
                        </Link>
                    </div>

                    {recentSongs && recentSongs.length > 0 ? (
                        <div className="mt-5 space-y-3">
                            {recentSongs.map((song) => (
                                <Link
                                    key={song.id}
                                    to={ROUTES.SONG(song.id)}
                                    className="group flex items-center gap-3 rounded-[1.6rem] border border-white/5 bg-black/20 px-3 py-3 transition-all duration-200 hover:border-brand-400/25 hover:bg-white/[0.03]"
                                >
                                    <div className="h-14 w-14 overflow-hidden rounded-[1.2rem] bg-surface-700">
                                        {song.cover_url ? (
                                            <img src={song.cover_url} alt={song.title} className="h-full w-full object-cover" />
                                        ) : (
                                            <div className="grid h-full w-full place-items-center">
                                                <Music className="h-5 w-5 text-gray-500" />
                                            </div>
                                        )}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="truncate text-sm font-semibold text-white group-hover:text-brand-200">{song.title}</p>
                                        <p className="truncate text-xs uppercase tracking-[0.18em] text-gray-500">{song.artist_name}</p>
                                    </div>
                                    <p className="shrink-0 text-xs text-gray-500">{formatRelative(song.created_at)}</p>
                                </Link>
                            ))}
                        </div>
                    ) : (
                        <div className="mt-5 rounded-[1.6rem] border border-dashed border-white/10 bg-black/10 px-4 py-8 text-sm text-gray-400">
                            Aun no hay canciones recientes en tu grupo.
                        </div>
                    )}
                </section>

                <section className="card p-5">
                    <div className="flex items-center justify-between gap-3">
                        <div>
                            <p className="page-kicker">Shared Balance</p>
                            <h2 className="mt-2 text-2xl font-headline font-extrabold text-white">Tu resumen</h2>
                        </div>
                        <TrendingUp className="h-5 w-5 text-brand-300" />
                    </div>

                    {myBalance && (myBalance.owed > 0 || myBalance.lent > 0) ? (
                        <div className="mt-5 grid gap-3">
                            <div className="rounded-[1.6rem] border border-red-400/15 bg-red-400/8 p-4">
                                <p className="text-[11px] uppercase tracking-[0.22em] text-red-200/80">Debes</p>
                                <p className="mt-2 text-3xl font-headline font-extrabold text-red-200">{myBalance.owed.toFixed(2)} EUR</p>
                            </div>
                            <div className="rounded-[1.6rem] border border-emerald-400/15 bg-emerald-400/8 p-4">
                                <p className="text-[11px] uppercase tracking-[0.22em] text-emerald-200/80">Te deben</p>
                                <p className="mt-2 text-3xl font-headline font-extrabold text-emerald-200">{myBalance.lent.toFixed(2)} EUR</p>
                            </div>
                            <Link to={ROUTES.DEBTS} className="btn-secondary mt-1">
                                <CreditCard className="w-4 h-4" />
                                Ver deudas
                            </Link>
                        </div>
                    ) : (
                        <div className="mt-5 rounded-[1.6rem] border border-dashed border-white/10 bg-black/10 px-4 py-8 text-sm text-gray-400">
                            Tu balance esta limpio por ahora. Cuando haya movimientos del grupo apareceran aqui.
                        </div>
                    )}
                </section>
            </div>
        </div>
    )
}

export default DashboardPage
