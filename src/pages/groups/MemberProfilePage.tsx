import React from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Check, ChevronLeft, ChevronRight, Clock3, Music, Music2, PencilLine, Scale, UserPlus, Users } from 'lucide-react'
import { usePlayerStore } from '@app/store/player.store'
import { Avatar } from '@components/common/Avatar'
import { RoleTag } from '@components/groups/GroupMemberList'
import { YouPill } from '@components/social/PersonRow'
import { SongCard } from '@components/music/SongCard'
import { EmptyState } from '@components/ui/EmptyState'
import { ErrorNotice } from '@components/ui/ErrorNotice'
import { ListSkeleton, ProfileSkeleton } from '@components/ui/LoadingSkeleton'
import { SectionHeader } from '@components/ui/PageHeader'
import { useToast } from '@components/ui/Toast'
import { useAuth } from '@hooks/useAuth'
import { useActiveGroup } from '@hooks/useActiveGroup'
import { useFriendActions, useFriends } from '@hooks/useFriends'
import { debtsService } from '@services/debts.service'
import { groupsService } from '@services/groups.service'
import { profileService } from '@services/profile.service'
import { songsService } from '@services/songs.service'
import { ROUTES } from '@lib/constants'
import { cn, formatDate, formatMoney, formatRelative } from '@lib/utils'
import type { Debt, GroupRole } from '@/types'

const firstName = (name?: string | null) => (name ?? '').trim().split(/\s+/)[0] || 'Esta persona'
const remaining = (debt: Debt) => Math.max(0, Number(debt.amount) - Number(debt.amount_paid ?? 0))

export default function MemberProfilePage() {
    const { groupId = '', userId: memberId = '' } = useParams<{ groupId: string; userId: string }>()
    const navigate = useNavigate()
    const toast = useToast()
    const { userId: viewerId } = useAuth()
    const { activeGroup, setActiveGroup } = useActiveGroup()
    const setQueue = usePlayerStore((state) => state.setQueue)
    const { relationOf } = useFriends()
    const { send, accept } = useFriendActions()
    const isMe = memberId === viewerId

    // Same key and shape as GroupDetailPage, so coming from the member list is instant.
    const groupQuery = useQuery({
        queryKey: ['group', groupId],
        queryFn: async () => {
            const [group, members] = await Promise.all([groupsService.getGroup(groupId), groupsService.getGroupMembers(groupId)])
            return { group, members }
        },
        enabled: !!groupId,
        retry: false,
    })
    const group = groupQuery.data?.group ?? null
    const member = groupQuery.data?.members.find((item) => item.user_id === memberId) ?? null

    const profileQuery = useQuery({
        queryKey: ['profile', memberId],
        queryFn: () => profileService.getProfile(memberId),
        enabled: !!memberId && groupQuery.isSuccess && !member?.profile,
    })
    const profile = member?.profile ?? profileQuery.data ?? null

    const songsQuery = useQuery({
        queryKey: ['songs-by-owner', groupId, memberId],
        queryFn: () => songsService.getSongsByOwner(groupId, memberId, viewerId ?? ''),
        enabled: !!viewerId && !!member,
    })
    const songs = songsQuery.data ?? []

    const debtsQuery = useQuery({
        queryKey: ['debts', groupId],
        queryFn: () => debtsService.getDebts(groupId),
        enabled: !!member && !isMe,
    })

    const between = React.useMemo(
        () =>
            (debtsQuery.data ?? []).filter(
                (debt) =>
                    (debt.creditor_id === viewerId && debt.debtor_id === memberId) ||
                    (debt.creditor_id === memberId && debt.debtor_id === viewerId)
            ),
        [debtsQuery.data, viewerId, memberId]
    )
    const openDebts = between.filter((debt) => debt.status !== 'paid' && remaining(debt) > 0)
    // Net per currency: positive = they owe me.
    const nets = React.useMemo(() => {
        const totals = new Map<string, number>()
        for (const debt of openDebts) {
            const sign = debt.creditor_id === viewerId ? 1 : -1
            totals.set(debt.currency, (totals.get(debt.currency) ?? 0) + sign * remaining(debt))
        }
        return Array.from(totals.entries()).filter(([, value]) => Math.abs(value) >= 0.005)
    }, [openDebts, viewerId])

    const goBack = () => {
        if (window.history.length > 1) navigate(-1)
        else navigate(ROUTES.GROUP(groupId))
    }

    const openDebtsPage = () => {
        if (group && activeGroup?.id !== group.id) {
            setActiveGroup(group)
            toast.info(`Ahora estás en ${group.name}`)
        }
        navigate(ROUTES.DEBTS)
    }

    const backButton = (
        <button
            type="button"
            onClick={goBack}
            className="-ml-2 mb-2 inline-flex min-h-[2.5rem] items-center gap-0.5 rounded-full pl-1 pr-3 text-sm font-medium text-gray-300 active:bg-white/5"
        >
            <ChevronLeft className="h-5 w-5" />
            Volver
        </button>
    )

    if (groupQuery.isLoading || (!member?.profile && profileQuery.isLoading)) {
        return (
            <div className="page-shell">
                {backButton}
                <ProfileSkeleton />
                <ListSkeleton count={3} />
            </div>
        )
    }

    if (groupQuery.error || !group) {
        return (
            <div className="page-shell">
                {backButton}
                <EmptyState
                    icon={<Users className="h-6 w-6" />}
                    title="No tienes acceso a este grupo"
                    description="Solo los miembros del grupo pueden ver los perfiles de su gente."
                />
            </div>
        )
    }

    if (!member || !profile) {
        return (
            <div className="page-shell">
                {backButton}
                <EmptyState
                    icon={<Users className="h-6 w-6" />}
                    title={profile ? `${firstName(profile.display_name)} ya no está en ${group.name}` : 'Esta persona no está en el grupo'}
                    description="Puede que haya salido o que la hayan expulsado."
                    action={
                        profile ? (
                            <Link to={ROUTES.ARTIST(memberId)} className="btn-secondary">
                                <Music2 className="h-4 w-4" />
                                Ver como artista
                            </Link>
                        ) : undefined
                    }
                />
            </div>
        )
    }

    const role: GroupRole = group.created_by === memberId ? 'owner' : member.role
    const relation = relationOf(memberId)
    const person = { id: profile.id, display_name: profile.display_name, username: profile.username, avatar_url: profile.avatar_url }
    const name = firstName(profile.display_name)

    return (
        <div className="page-shell animate-fade-in">
            <header className="page-hero">
                {backButton}
                <div className="flex items-center gap-4">
                    <Avatar src={profile.avatar_url} name={profile.display_name} size="xl" className="h-20 w-20 text-2xl md:h-24 md:w-24" />
                    <div className="min-w-0 flex-1">
                        <h1 className="page-title break-words">{profile.display_name}</h1>
                        <p className="mt-1 truncate text-sm text-gray-400">
                            {profile.username ? `@${profile.username}` : 'Sin nombre de usuario'}
                        </p>
                        <div className="mt-2 flex flex-wrap items-center gap-1.5">
                            <RoleTag role={role} />
                            {isMe ? <YouPill /> : null}
                            <span className="text-xs text-gray-500">en {group.name} desde {formatDate(member.joined_at)}</span>
                        </div>
                    </div>
                </div>
                {profile.bio ? <p className="mt-4 whitespace-pre-wrap break-words text-[15px] leading-relaxed text-gray-300">{profile.bio}</p> : null}

                <div className="mt-5 grid grid-cols-2 gap-2">
                    {isMe ? (
                        <Link to={ROUTES.PROFILE} className="btn-secondary">
                            <PencilLine className="h-4 w-4" />
                            Editar perfil
                        </Link>
                    ) : relation.kind === 'friend' ? (
                        <span className="btn-secondary pointer-events-none border-emerald-400/25 text-emerald-200">
                            <Check className="h-4 w-4" />
                            Amigos
                        </span>
                    ) : relation.kind === 'outgoing' ? (
                        <span className="btn-secondary pointer-events-none text-gray-300">
                            <Clock3 className="h-4 w-4" />
                            Solicitud enviada
                        </span>
                    ) : relation.kind === 'incoming' ? (
                        <button type="button" className="btn-primary" disabled={accept.isPending} onClick={() => accept.mutate(relation.request)}>
                            <Check className="h-4 w-4" />
                            Aceptar solicitud
                        </button>
                    ) : (
                        <button type="button" className="btn-primary" disabled={send.isPending} onClick={() => send.mutate(person)}>
                            <UserPlus className="h-4 w-4" />
                            {send.isPending ? 'Enviando…' : 'Añadir amigo'}
                        </button>
                    )}
                    <Link to={ROUTES.ARTIST(memberId)} className="btn-secondary">
                        <Music2 className="h-4 w-4" />
                        Ver como artista
                    </Link>
                </div>
            </header>

            {!isMe ? (
                <section>
                    <SectionHeader title="Cuentas entre vosotros" description={`Solo en ${group.name}.`} />
                    {debtsQuery.isLoading ? (
                        <ListSkeleton count={1} />
                    ) : debtsQuery.error ? (
                        <ErrorNotice title="No pudimos cargar las cuentas" error={debtsQuery.error} onRetry={() => void debtsQuery.refetch()} />
                    ) : (
                        <div className="list-group">
                            <div className="flex items-center gap-3 px-4 py-4">
                                <span
                                    className={cn(
                                        'grid h-11 w-11 shrink-0 place-items-center rounded-xl',
                                        nets.length === 0
                                            ? 'bg-white/[0.06] text-gray-300'
                                            : nets[0][1] > 0
                                              ? 'bg-emerald-400/15 text-emerald-200'
                                              : 'bg-red-400/12 text-red-200'
                                    )}
                                >
                                    <Scale className="h-5 w-5" />
                                </span>
                                <div className="min-w-0 flex-1">
                                    {nets.length === 0 ? (
                                        <>
                                            <p className="text-[15px] font-semibold text-white">Estáis en paz</p>
                                            <p className="text-[13px] text-gray-400">
                                                {openDebts.length > 0
                                                    ? 'Lo que os debéis se compensa.'
                                                    : between.length > 0
                                                      ? 'Todas vuestras cuentas están saldadas.'
                                                      : 'No tenéis cuentas entre vosotros.'}
                                            </p>
                                        </>
                                    ) : (
                                        nets.map(([currency, value]) => (
                                            <p key={currency} className="text-[15px] text-gray-200">
                                                {value > 0 ? `${name} te debe ` : `Le debes a ${name} `}
                                                <strong className={cn('tabular font-bold', value > 0 ? 'text-emerald-300' : 'text-red-300')}>
                                                    {formatMoney(Math.abs(value), currency)}
                                                </strong>
                                            </p>
                                        ))
                                    )}
                                    {openDebts.length > 0 ? (
                                        <p className="text-[13px] text-gray-400">
                                            {openDebts.length} {openDebts.length === 1 ? 'cuenta pendiente' : 'cuentas pendientes'}
                                        </p>
                                    ) : null}
                                </div>
                            </div>
                            {openDebts.slice(0, 4).map((debt) => {
                                const theyOwe = debt.creditor_id === viewerId
                                return (
                                    <Link key={debt.id} to={ROUTES.DEBT(debt.id)} className="list-row">
                                        <span className="min-w-0 flex-1">
                                            <span className="block truncate text-[15px] font-medium text-white">{debt.concept}</span>
                                            <span className="block truncate text-[13px] text-gray-400">
                                                {theyOwe ? `${name} te debe` : 'Le debes'} · {formatRelative(debt.created_at)}
                                            </span>
                                        </span>
                                        <span className={cn('tabular shrink-0 text-[15px] font-semibold', theyOwe ? 'text-emerald-300' : 'text-red-300')}>
                                            {formatMoney(remaining(debt), debt.currency)}
                                        </span>
                                        <ChevronRight className="h-5 w-5 shrink-0 text-gray-600" />
                                    </Link>
                                )
                            })}
                            <button type="button" onClick={openDebtsPage} className="list-row text-[15px] font-medium text-brand-300">
                                <span className="flex-1">Ver todas las cuentas del grupo</span>
                                <ChevronRight className="h-5 w-5 shrink-0 text-gray-600" />
                            </button>
                        </div>
                    )}
                </section>
            ) : null}

            <section>
                <SectionHeader
                    title={isMe ? 'Tus canciones aquí' : `Canciones de ${name}`}
                    description={songs.length > 0 ? `${songs.length} ${songs.length === 1 ? 'canción' : 'canciones'} en ${group.name}` : undefined}
                />
                {songsQuery.isLoading ? (
                    <ListSkeleton count={3} />
                ) : songsQuery.error ? (
                    <ErrorNotice title="No pudimos cargar las canciones" error={songsQuery.error} onRetry={() => void songsQuery.refetch()} />
                ) : songs.length === 0 ? (
                    <EmptyState
                        compact
                        icon={<Music className="h-6 w-6" />}
                        title={isMe ? 'Aún no has subido canciones a este grupo' : `${name} aún no ha subido canciones aquí`}
                        description={isMe ? 'Sube tu primera maqueta y que el grupo la escuche.' : 'Cuando lo haga, aparecerán aquí.'}
                    />
                ) : (
                    <div className="space-y-1">
                        {songs.map((song, index) => (
                            <SongCard key={song.id} song={song} showArtist onPlay={() => setQueue(songs, index)} />
                        ))}
                    </div>
                )}
            </section>
        </div>
    )
}
