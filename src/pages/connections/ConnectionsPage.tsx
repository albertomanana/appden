import React from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Check, ChevronRight, Inbox, MoreHorizontal, Search, UserMinus, UserPlus, UserRound, Users, X } from 'lucide-react'
import { FriendRelationButton } from '@components/social/FriendRelationButton'
import { InviteToGroupSheet } from '@components/social/InviteToGroupSheet'
import { PersonRow, type PersonSummary } from '@components/social/PersonRow'
import { SocialTabs } from '@components/social/SocialTabs'
import { ActionSheet } from '@components/ui/ActionSheet'
import { Avatar } from '@components/common/Avatar'
import { ConfirmDialog } from '@components/ui/ConfirmDialog'
import { EmptyState } from '@components/ui/EmptyState'
import { ErrorNotice } from '@components/ui/ErrorNotice'
import { ListSkeleton } from '@components/ui/LoadingSkeleton'
import { PageHeader, SectionHeader } from '@components/ui/PageHeader'
import { Tabs } from '@components/ui/Tabs'
import { useAuth } from '@hooks/useAuth'
import { useActiveGroup } from '@hooks/useActiveGroup'
import { useDebouncedValue } from '@hooks/useDebouncedValue'
import { useFriendActions, useFriends } from '@hooks/useFriends'
import { friendsService } from '@services/friends.service'
import { ROUTES } from '@lib/constants'
import { formatRelative } from '@lib/utils'

type View = 'amigos' | 'solicitudes' | 'buscar'
const VIEWS: View[] = ['amigos', 'solicitudes', 'buscar']

const firstName = (name?: string | null) => (name ?? '').trim().split(/\s+/)[0] || 'esta persona'

export default function ConnectionsPage() {
    const { userId } = useAuth()
    const { activeGroup, myGroups } = useActiveGroup()
    const navigate = useNavigate()
    const [searchParams, setSearchParams] = useSearchParams()
    const rawView = searchParams.get('vista') as View | null
    const view: View = rawView && VIEWS.includes(rawView) ? rawView : 'amigos'

    const setView = (next: string) => {
        if (next === 'amigos') searchParams.delete('vista')
        else searchParams.set('vista', next)
        setSearchParams(searchParams, { replace: true })
    }

    const { friends, incoming, outgoing, relationOf, isLoading, error, refetch } = useFriends()
    const { accept, reject, cancel, remove } = useFriendActions()

    const [menuFriend, setMenuFriend] = React.useState<PersonSummary | null>(null)
    const [inviteFriend, setInviteFriend] = React.useState<PersonSummary | null>(null)
    const [removingFriend, setRemovingFriend] = React.useState<PersonSummary | null>(null)

    const friendPeople = React.useMemo(
        () => friends.map((row) => row.friend_profile).filter((person): person is NonNullable<typeof person> => !!person),
        [friends]
    )

    // Groups shared with friends and with people in pending requests (only my groups are visible).
    const peopleIds = React.useMemo(
        () =>
            Array.from(
                new Set([...friendPeople.map((p) => p.id), ...incoming.map((r) => r.from_user_id), ...outgoing.map((r) => r.to_user_id)])
            ).sort(),
        [friendPeople, incoming, outgoing]
    )
    const myGroupIds = myGroups.map((group) => group.id)
    const { data: mutualGroups = {} } = useQuery({
        queryKey: ['friends', 'mutual-groups', userId, myGroupIds.join(','), peopleIds.join(',')],
        queryFn: () => friendsService.listMutualGroups(myGroupIds, peopleIds),
        enabled: !!userId && myGroupIds.length > 0 && peopleIds.length > 0,
        staleTime: 60_000,
    })

    const groupName = (groupId: string) => myGroups.find((group) => group.id === groupId)?.name
    const mutualLabel = (personId: string) => {
        const shared = mutualGroups[personId] ?? []
        if (shared.length === 0) return null
        if (shared.length === 1) return groupName(shared[0]) ?? '1 grupo en común'
        return `${shared.length} grupos en común`
    }

    /** Inside a shared group the member profile shows songs and money; otherwise the public profile. */
    const profileHref = (personId: string) => {
        const shared = mutualGroups[personId] ?? []
        const groupId = activeGroup && shared.includes(activeGroup.id) ? activeGroup.id : shared[0]
        return groupId ? ROUTES.GROUP_MEMBER(groupId, personId) : ROUTES.PROFILE_ID(personId)
    }

    const subtitle = (person: PersonSummary, extra?: string | null) =>
        [person.username ? `@${person.username}` : null, extra].filter(Boolean).join(' · ') || 'Sin grupos en común'

    return (
        <div className="page-shell animate-fade-in">
            <PageHeader title="Social" />
            <SocialTabs active="connections" requests={incoming.length} />

            <Tabs
                active={view}
                onChange={setView}
                stretch
                items={[
                    { label: 'Amigos', value: 'amigos' },
                    { label: 'Solicitudes', value: 'solicitudes', badge: incoming.length },
                    { label: 'Buscar', value: 'buscar' },
                ]}
            />

            {view === 'buscar' ? (
                <SearchView userId={userId} relationOf={relationOf} />
            ) : isLoading ? (
                <ListSkeleton count={3} />
            ) : error ? (
                <ErrorNotice title="No pudimos cargar tus amigos" error={error} onRetry={() => void refetch()} />
            ) : view === 'amigos' ? (
                <>
                    {incoming.length > 0 ? (
                        <button type="button" onClick={() => setView('solicitudes')} className="card-interactive flex w-full items-center gap-3 p-3 text-left">
                            <span className="flex -space-x-2">
                                {incoming.slice(0, 3).map((request) => (
                                    <Avatar
                                        key={request.id}
                                        src={request.from_profile?.avatar_url}
                                        name={request.from_profile?.display_name}
                                        size="sm"
                                        className="ring-2 ring-[#141416]"
                                    />
                                ))}
                            </span>
                            <span className="min-w-0 flex-1 text-sm text-gray-200">
                                {incoming.length === 1 ? (
                                    <>
                                        <strong className="font-semibold text-white">{firstName(incoming[0].from_profile?.display_name)}</strong> te ha enviado una solicitud de amistad
                                    </>
                                ) : (
                                    <>
                                        Tienes <strong className="font-semibold text-white">{incoming.length} solicitudes</strong> de amistad
                                    </>
                                )}
                            </span>
                            <ChevronRight className="h-5 w-5 shrink-0 text-gray-500" />
                        </button>
                    ) : null}

                    {friendPeople.length === 0 ? (
                        <EmptyState
                            icon={<Users className="h-6 w-6" />}
                            title="Aún no tienes amigos aquí"
                            description="Añade a tu gente y podrás invitarla a tus grupos con un toque."
                            action={
                                <button type="button" onClick={() => setView('buscar')} className="btn-primary">
                                    <Search className="h-4 w-4" />
                                    Buscar gente
                                </button>
                            }
                        />
                    ) : (
                        <section>
                            <SectionHeader
                                title="Tus amigos"
                                description={`${friendPeople.length} ${friendPeople.length === 1 ? 'persona' : 'personas'} · invítalas a tus grupos desde aquí`}
                            />
                            <div className="list-group">
                                {friendPeople.map((person) => (
                                    <PersonRow
                                        key={person.id}
                                        person={person}
                                        subtitle={subtitle(person, mutualLabel(person.id))}
                                        onOpen={() => navigate(profileHref(person.id))}
                                        openLabel={`Ver el perfil de ${person.display_name}`}
                                    >
                                        <button
                                            type="button"
                                            onClick={() => setMenuFriend(person)}
                                            className="icon-btn -mr-2 text-gray-400"
                                            aria-label={`Opciones de ${person.display_name}`}
                                        >
                                            <MoreHorizontal className="h-5 w-5" />
                                        </button>
                                    </PersonRow>
                                ))}
                            </div>
                        </section>
                    )}
                </>
            ) : (
                <>
                    {incoming.length === 0 && outgoing.length === 0 ? (
                        <EmptyState
                            icon={<Inbox className="h-6 w-6" />}
                            title="No tienes solicitudes pendientes"
                            description="Cuando alguien quiera ser tu amigo, aparecerá aquí."
                            action={
                                <button type="button" onClick={() => setView('buscar')} className="btn-secondary">
                                    <Search className="h-4 w-4" />
                                    Buscar gente
                                </button>
                            }
                        />
                    ) : null}

                    {incoming.length > 0 ? (
                        <section>
                            <SectionHeader title="Recibidas" />
                            <div className="list-group">
                                {incoming.map((request) => {
                                    const person = request.from_profile ?? { id: request.from_user_id, display_name: 'Usuario' }
                                    return (
                                        <PersonRow
                                            key={request.id}
                                            person={person}
                                            subtitle={request.message || subtitle(person, mutualLabel(person.id) ?? formatRelative(request.created_at))}
                                            onOpen={() => navigate(profileHref(person.id))}
                                            openLabel={`Ver el perfil de ${person.display_name}`}
                                        >
                                            <button
                                                type="button"
                                                onClick={() => reject.mutate(request)}
                                                disabled={reject.isPending || accept.isPending}
                                                className="icon-btn bg-white/[0.06] text-gray-300"
                                                aria-label={`Rechazar la solicitud de ${person.display_name}`}
                                            >
                                                <X className="h-5 w-5" />
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => accept.mutate(request)}
                                                disabled={reject.isPending || accept.isPending}
                                                className="icon-btn bg-emerald-400/15 text-emerald-200"
                                                aria-label={`Aceptar la solicitud de ${person.display_name}`}
                                            >
                                                <Check className="h-5 w-5" />
                                            </button>
                                        </PersonRow>
                                    )
                                })}
                            </div>
                        </section>
                    ) : null}

                    {outgoing.length > 0 ? (
                        <section>
                            <SectionHeader title="Enviadas" description="Esperando respuesta." />
                            <div className="list-group">
                                {outgoing.map((request) => {
                                    const person = request.to_profile ?? { id: request.to_user_id, display_name: 'Usuario' }
                                    return (
                                        <PersonRow
                                            key={request.id}
                                            person={person}
                                            subtitle={subtitle(person, `enviada ${formatRelative(request.created_at)}`)}
                                            onOpen={() => navigate(profileHref(person.id))}
                                            openLabel={`Ver el perfil de ${person.display_name}`}
                                        >
                                            <button
                                                type="button"
                                                onClick={() => cancel.mutate(request)}
                                                disabled={cancel.isPending}
                                                className="btn-ghost !px-3 text-gray-300"
                                            >
                                                Cancelar
                                            </button>
                                        </PersonRow>
                                    )
                                })}
                            </div>
                        </section>
                    ) : null}
                </>
            )}

            <ActionSheet
                open={!!menuFriend}
                onClose={() => setMenuFriend(null)}
                header={
                    menuFriend ? (
                        <div className="flex items-center gap-3">
                            <Avatar src={menuFriend.avatar_url} name={menuFriend.display_name} size="md" />
                            <div className="min-w-0">
                                <p className="truncate font-semibold text-white">{menuFriend.display_name}</p>
                                <p className="truncate text-sm text-gray-400">{subtitle(menuFriend, mutualLabel(menuFriend.id))}</p>
                            </div>
                        </div>
                    ) : null
                }
                items={[
                    { label: 'Ver perfil', icon: UserRound, onSelect: () => menuFriend && navigate(profileHref(menuFriend.id)) },
                    { label: 'Invitar a un grupo', icon: UserPlus, onSelect: () => setInviteFriend(menuFriend) },
                    { label: 'Eliminar amistad', icon: UserMinus, tone: 'danger', onSelect: () => setRemovingFriend(menuFriend) },
                ]}
            />

            <InviteToGroupSheet person={inviteFriend} onClose={() => setInviteFriend(null)} />

            <ConfirmDialog
                isOpen={!!removingFriend}
                title={`¿Eliminar a ${firstName(removingFriend?.display_name)} de tus amigos?`}
                description="Seguiréis compartiendo los grupos en los que estéis juntos. Podrás volver a enviarle una solicitud cuando quieras."
                confirmLabel="Eliminar amistad"
                isLoading={remove.isPending}
                onConfirm={() => removingFriend && remove.mutate(removingFriend, { onSettled: () => setRemovingFriend(null) })}
                onCancel={() => setRemovingFriend(null)}
            />
        </div>
    )
}

const SearchView: React.FC<{ userId: string | null; relationOf: ReturnType<typeof useFriends>['relationOf'] }> = ({ userId, relationOf }) => {
    const navigate = useNavigate()
    const [query, setQuery] = React.useState('')
    const term = useDebouncedValue(query.trim(), 300)
    const enabled = !!userId && term.replace(/^@+/, '').length >= 2

    const results = useQuery({
        queryKey: ['friends', 'search', userId, term],
        queryFn: () => friendsService.searchPeople(term, userId!),
        enabled,
        staleTime: 30_000,
    })

    return (
        <section className="space-y-4">
            <label className="relative block">
                <span className="sr-only">Buscar personas</span>
                <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-500" />
                <input
                    type="search"
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Nombre o @usuario"
                    autoFocus
                    autoComplete="off"
                    autoCapitalize="none"
                    enterKeyHint="search"
                    className="input pl-12"
                />
            </label>

            {!enabled ? (
                <p className="px-1 text-sm text-gray-400">Escribe al menos 2 letras para encontrar a alguien de The Appden.</p>
            ) : results.isLoading ? (
                <ListSkeleton count={3} />
            ) : results.error ? (
                <ErrorNotice title="No pudimos buscar" error={results.error} onRetry={() => void results.refetch()} />
            ) : (results.data ?? []).length === 0 ? (
                <EmptyState
                    compact
                    icon={<Search className="h-6 w-6" />}
                    title={`Nadie coincide con «${term}»`}
                    description="Prueba con su nombre o con su @usuario."
                />
            ) : (
                <div className="list-group">
                    {(results.data ?? []).map((person) => (
                        <PersonRow
                            key={person.id}
                            person={person}
                            onOpen={() => navigate(ROUTES.PROFILE_ID(person.id))}
                            openLabel={`Ver el perfil de ${person.display_name}`}
                        >
                            <FriendRelationButton person={person} relation={relationOf(person.id)} />
                        </PersonRow>
                    ))}
                </div>
            )}
        </section>
    )
}
