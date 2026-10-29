import React from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowRight, ChevronRight, MessageCircle, Music, Play, Plus, Upload, UserPlus, Users, Wallet } from 'lucide-react'
import { useAuth } from '@hooks/useAuth'
import { useActiveGroup } from '@hooks/useActiveGroup'
import { usePlayerStore } from '@app/store/player.store'
import { useAdvancedPlayerStore } from '@features/player/player.store'
import { Avatar } from '@components/common/Avatar'
import { Cover } from '@components/music/Cover'
import { SectionHeader } from '@components/ui/PageHeader'
import { Skeleton } from '@components/ui/LoadingSkeleton'
import { ROUTES } from '@lib/constants'
import { cn, formatMoney, formatRelative } from '@lib/utils'
import { songsService } from '@services/songs.service'
import { debtsService } from '@services/debts.service'
import { postsService } from '@services/posts.service'
import { computeMyBalances } from '@features/debts/balances'
import { centsToAmount } from '@features/debts/split'

function greeting(): string {
    const hour = new Date().getHours()
    if (hour < 6) return 'Buenas noches'
    if (hour < 13) return 'Buenos días'
    if (hour < 21) return 'Buenas tardes'
    return 'Buenas noches'
}

const DashboardPage: React.FC = () => {
    const { profile, userId } = useAuth()
    const { activeGroup, groupId, hasGroup } = useActiveGroup()
    const setQueue = usePlayerStore((state) => state.setQueue)
    const currentSong = useAdvancedPlayerStore((state) => state.currentSong)
    const isPlaying = useAdvancedPlayerStore((state) => state.isPlaying)
    const resume = useAdvancedPlayerStore((state) => state.resume)
    const openFullPlayer = useAdvancedPlayerStore((state) => state.toggleFullPlayer)

    const { data: songs, isLoading: songsLoading } = useQuery({
        queryKey: ['songs', groupId, userId],
        queryFn: () => songsService.getSongs(groupId!, userId!),
        enabled: !!groupId && !!userId,
    })
    const recentSongs = (songs ?? []).slice(0, 10)

    const { data: debts } = useQuery({
        queryKey: ['debts', groupId],
        queryFn: () => debtsService.getDebts(groupId!),
        enabled: !!groupId,
    })

    const { data: posts } = useQuery({
        queryKey: ['posts', 'feed'],
        queryFn: () => postsService.listFeed({ limit: 20, viewerId: userId! }),
        enabled: !!userId,
    })

    // Same computation as the Cuentas page (from the debt list, in cents, main currency first).
    const mainBalance = debts ? computeMyBalances(debts, userId)[0] : undefined
    const myBalance = debts
        ? { owed: centsToAmount(mainBalance?.iOweCents ?? 0), lent: centsToAmount(mainBalance?.owedToMeCents ?? 0) }
        : null
    const net = centsToAmount(mainBalance?.netCents ?? 0)
    const firstName = profile?.display_name?.split(' ')[0] ?? ''

    const quickActions = [
        { icon: Upload, label: 'Subir', to: `${ROUTES.MUSIC}?subir=1`, tone: 'from-brand-400 to-brand-600', disabled: !hasGroup },
        { icon: Wallet, label: 'Gasto', to: `${ROUTES.DEBTS}?nueva=1`, tone: 'from-amber-300 to-orange-500', disabled: !hasGroup },
        { icon: MessageCircle, label: 'Publicar', to: `${ROUTES.SOCIAL}?publicar=1`, tone: 'from-pink-400 to-fuchsia-600', disabled: false },
        {
            icon: UserPlus,
            label: 'Invitar',
            to: activeGroup ? `${ROUTES.GROUP(activeGroup.id)}?invitar=1` : ROUTES.GROUPS,
            tone: 'from-violet-400 to-indigo-600',
            disabled: false,
        },
    ]

    return (
        <div className="page-shell animate-fade-in">
            <section>
                <p className="text-sm font-medium text-gray-400">{greeting()}</p>
                <h1 className="page-title mt-0.5">{firstName ? `Hola, ${firstName}` : 'Hola'}</h1>
            </section>

            {!hasGroup ? (
                <section className="card overflow-hidden p-5">
                    <div className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-brand-400 to-violet-500">
                        <Users className="h-6 w-6 text-white" />
                    </div>
                    <h2 className="mt-4 text-lg font-bold text-white">Crea o únete a un grupo</h2>
                    <p className="mt-1 text-sm leading-relaxed text-gray-400">
                        La música, las cuentas y la actividad se comparten dentro de un grupo. Crea el tuyo o abre el enlace de invitación que te hayan enviado.
                    </p>
                    <Link to={`${ROUTES.GROUPS}?nuevo=1`} className="btn-primary mt-4 w-full sm:w-auto">
                        <Plus className="h-4 w-4" />
                        Crear grupo
                    </Link>
                </section>
            ) : null}

            {currentSong && !isPlaying ? (
                <section className="card flex items-center gap-3 p-3">
                    <button type="button" onClick={() => openFullPlayer(true)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
                        <Cover src={currentSong.cover_url} alt="" seed={currentSong.id} className="h-14 w-14 rounded-xl" />
                        <span className="min-w-0">
                            <span className="block text-xs font-medium text-brand-300">Continuar escuchando</span>
                            <span className="block truncate font-semibold text-white">{currentSong.title}</span>
                            <span className="block truncate text-sm text-gray-400">{currentSong.artist_name}</span>
                        </span>
                    </button>
                    <button
                        type="button"
                        onClick={() => void resume()}
                        className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-white text-black active:scale-95"
                        aria-label="Continuar reproducción"
                    >
                        <Play className="ml-0.5 h-5 w-5 fill-current" />
                    </button>
                </section>
            ) : null}

            <section className="grid grid-cols-4 gap-2">
                {quickActions.map(({ icon: Icon, label, to, tone, disabled }) => (
                    <Link
                        key={label}
                        to={to}
                        aria-disabled={disabled}
                        className={cn(
                            'flex flex-col items-center gap-2 rounded-2xl py-3 transition-colors active:bg-white/[0.05]',
                            disabled && 'pointer-events-none opacity-40'
                        )}
                    >
                        <span className={cn('grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br shadow-[0_10px_24px_rgba(0,0,0,0.3)]', tone)}>
                            <Icon className="h-5 w-5 text-white" />
                        </span>
                        <span className="text-xs font-medium text-gray-300">{label}</span>
                    </Link>
                ))}
            </section>

            {hasGroup ? (
                <Link to={ROUTES.DEBTS} className="card-interactive block p-5">
                    <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-gray-400">Tu balance en {activeGroup?.name}</p>
                        <ChevronRight className="h-5 w-5 text-gray-500" />
                    </div>
                    {myBalance ? (
                        <>
                            <p
                                className={cn(
                                    'mt-1 font-headline text-[2rem] font-extrabold tabular leading-tight',
                                    net > 0.004 ? 'text-emerald-300' : net < -0.004 ? 'text-red-300' : 'text-white'
                                )}
                            >
                                {net > 0.004 ? '+' : ''}
                                {formatMoney(net)}
                            </p>
                            <p className="mt-1 text-sm text-gray-400">
                                {myBalance.owed === 0 && myBalance.lent === 0 ? (
                                    'Estás en paz con todo el grupo.'
                                ) : (
                                    <>
                                        Debes <span className="font-semibold text-red-200">{formatMoney(myBalance.owed)}</span>
                                        <span className="mx-1.5 text-gray-600">·</span>
                                        Te deben <span className="font-semibold text-emerald-200">{formatMoney(myBalance.lent)}</span>
                                    </>
                                )}
                            </p>
                        </>
                    ) : (
                        <Skeleton className="mt-2 h-9 w-40" />
                    )}
                </Link>
            ) : null}

            {hasGroup ? (
                <section>
                    <SectionHeader
                        title="Recién subidas"
                        action={
                            <Link to={ROUTES.MUSIC} className="inline-flex min-h-[2.5rem] items-center gap-1 text-sm font-semibold text-brand-300">
                                Ver todo <ArrowRight className="h-4 w-4" />
                            </Link>
                        }
                    />
                    {songsLoading ? (
                        <div className="scroller-x">
                            {Array.from({ length: 4 }).map((_, i) => (
                                <div key={i} className="w-32 shrink-0 space-y-2">
                                    <Skeleton className="aspect-square w-full rounded-2xl" />
                                    <Skeleton className="h-3.5 w-3/4" />
                                </div>
                            ))}
                        </div>
                    ) : recentSongs.length > 0 ? (
                        <div className="scroller-x">
                            {recentSongs.map((song, index) => (
                                <button
                                    key={song.id}
                                    type="button"
                                    onClick={() => setQueue(recentSongs, index)}
                                    className="group w-32 shrink-0 text-left sm:w-36"
                                >
                                    <Cover src={song.cover_url} alt="" seed={song.id} className="aspect-square w-full rounded-2xl" iconClassName="h-8 w-8">
                                        <span className="absolute bottom-2 right-2 grid h-9 w-9 place-items-center rounded-full bg-black/55 text-white backdrop-blur transition-transform group-active:scale-90">
                                            <Play className="ml-0.5 h-4 w-4 fill-current" />
                                        </span>
                                    </Cover>
                                    <p className="mt-2 truncate text-sm font-semibold text-white">{song.title}</p>
                                    <p className="truncate text-xs text-gray-400">{song.artist_name}</p>
                                </button>
                            ))}
                        </div>
                    ) : (
                        <Link to={`${ROUTES.MUSIC}?subir=1`} className="card-interactive flex items-center gap-3 p-4">
                            <span className="grid h-12 w-12 place-items-center rounded-xl bg-white/[0.06]">
                                <Music className="h-5 w-5 text-gray-400" />
                            </span>
                            <span className="min-w-0 flex-1">
                                <span className="block font-semibold text-white">Sube la primera canción</span>
                                <span className="block text-sm text-gray-400">Todo el grupo podrá escucharla.</span>
                            </span>
                            <ChevronRight className="h-5 w-5 text-gray-500" />
                        </Link>
                    )}
                </section>
            ) : null}

            {posts && posts.length > 0 ? (
                <section>
                    <SectionHeader
                        title="Últimas publicaciones"
                        action={
                            <Link to={ROUTES.SOCIAL} className="inline-flex min-h-[2.5rem] items-center gap-1 text-sm font-semibold text-brand-300">
                                Ver feed <ArrowRight className="h-4 w-4" />
                            </Link>
                        }
                    />
                    <div className="list-group">
                        {posts.slice(0, 3).map((post) => (
                            <Link key={post.id} to={ROUTES.SOCIAL} className="list-row items-start">
                                <Avatar src={post.author?.avatar_url} name={post.author?.display_name} size="md" />
                                <span className="min-w-0 flex-1">
                                    <span className="flex items-baseline gap-2">
                                        <span className="truncate text-sm font-semibold text-white">{post.author?.display_name ?? 'Usuario'}</span>
                                        <span className="shrink-0 text-xs text-gray-500">{formatRelative(post.created_at)}</span>
                                    </span>
                                    <span className="mt-0.5 block text-sm leading-snug text-gray-300 truncate-2">{post.content}</span>
                                </span>
                            </Link>
                        ))}
                    </div>
                </section>
            ) : null}
        </div>
    )
}

export default DashboardPage
