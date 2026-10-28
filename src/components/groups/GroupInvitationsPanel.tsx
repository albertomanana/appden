import React from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Check, Search, Send } from 'lucide-react'
import { PersonRow, type PersonSummary } from '@components/social/PersonRow'
import { ErrorNotice } from '@components/ui/ErrorNotice'
import { ListSkeleton } from '@components/ui/LoadingSkeleton'
import { useToast } from '@components/ui/Toast'
import { useAuth } from '@hooks/useAuth'
import { useDebouncedValue } from '@hooks/useDebouncedValue'
import { useFriends } from '@hooks/useFriends'
import { groupInvitationsService } from '@features/social/services/group-invitations.service'
import { friendsService } from '@services/friends.service'
import { ROUTES } from '@lib/constants'
import { formatRelative } from '@lib/utils'
import type { GroupMember } from '@/types'

interface GroupInvitationsPanelProps {
    groupId: string
    members: GroupMember[]
    canInvite: boolean
}

const firstName = (name?: string | null) => (name ?? '').trim().split(/\s+/)[0] || 'Esa persona'

const Heading: React.FC<{ children: React.ReactNode; aside?: React.ReactNode }> = ({ children, aside }) => (
    <div className="mb-2 flex items-center justify-between gap-3 px-1">
        <h3 className="text-[13px] font-semibold text-gray-400">{children}</h3>
        {aside}
    </div>
)

/**
 * Lives inside the "Invitar" sheet of a group, under the share-link button:
 * friends who aren't members (one tap), search for anyone else, and pending invitations.
 */
export const GroupInvitationsPanel: React.FC<GroupInvitationsPanelProps> = ({ groupId, members, canInvite }) => {
    const { userId } = useAuth()
    const queryClient = useQueryClient()
    const toast = useToast()
    const { friends, friendIds, isLoading: loadingFriends } = useFriends()
    const [query, setQuery] = React.useState('')
    const term = useDebouncedValue(query.trim(), 300)
    const searching = term.replace(/^@+/, '').length >= 2

    const memberIds = React.useMemo(() => new Set(members.map((member) => member.user_id)), [members])
    const invitationsKey = ['group-invitations', groupId] as const

    const invitations = useQuery({
        queryKey: invitationsKey,
        queryFn: () => groupInvitationsService.listGroupInvitations(groupId, 'pending'),
        enabled: canInvite,
        staleTime: 10_000,
    })
    const pending = invitations.data ?? []
    const invitedIds = new Set(pending.map((invitation) => invitation.invited_user_id))

    const friendCandidates = friends
        .map((row) => row.friend_profile)
        .filter((person): person is NonNullable<typeof person> => !!person && !memberIds.has(person.id))
        .sort((a, b) => Number(invitedIds.has(a.id)) - Number(invitedIds.has(b.id)))

    const results = useQuery({
        queryKey: ['friends', 'search', userId, term],
        queryFn: () => friendsService.searchPeople(term, userId!),
        enabled: canInvite && !!userId && searching,
        staleTime: 30_000,
    })
    const searchResults = (results.data ?? []).filter((person) => !memberIds.has(person.id))

    const refresh = () => {
        void queryClient.invalidateQueries({ queryKey: invitationsKey })
        void queryClient.invalidateQueries({ queryKey: ['invite-targets'] })
    }

    const invite = useMutation({
        mutationFn: (person: PersonSummary) => groupInvitationsService.invite({ groupId, invitedBy: userId!, invitedUserId: person.id }),
        onSuccess: (_data, person) => toast.success('Invitación enviada', `${firstName(person.display_name)} la verá en Social · Grupos.`),
        onError: (error) => toast.error('No se pudo invitar', error instanceof Error ? error.message : undefined),
        onSettled: refresh,
    })

    const cancel = useMutation({
        mutationFn: (invitationId: string) => groupInvitationsService.cancel(invitationId),
        onSuccess: () => toast.info('Invitación cancelada'),
        onError: (error) => toast.error('No se pudo cancelar la invitación', error instanceof Error ? error.message : undefined),
        onSettled: refresh,
    })

    if (!canInvite) {
        return <p className="notice-info">Solo el propietario o un admin pueden invitar a gente nueva al grupo.</p>
    }

    const inviteControl = (person: PersonSummary) =>
        invitedIds.has(person.id) ? (
            <span className="badge border border-white/10 bg-white/[0.05] text-gray-300">
                <Check className="h-3.5 w-3.5" />
                Enviada
            </span>
        ) : (
            <button
                type="button"
                onClick={() => invite.mutate(person)}
                disabled={invite.isPending}
                className="btn-primary !px-4"
            >
                <Send className="h-4 w-4" />
                {invite.isPending && invite.variables?.id === person.id ? 'Enviando…' : 'Invitar'}
            </button>
        )

    return (
        <div className="space-y-6">
            <section>
                <Heading>Tus amigos</Heading>
                {loadingFriends ? (
                    <ListSkeleton count={2} />
                ) : friends.length === 0 ? (
                    <p className="card px-4 py-3 text-sm text-gray-400">
                        Cuando tengas amigos en The Appden podrás invitarlos aquí con un toque.{' '}
                        <Link to={`${ROUTES.CONNECTIONS}?vista=buscar`} className="font-semibold text-brand-300">
                            Buscar amigos
                        </Link>
                    </p>
                ) : friendCandidates.length === 0 ? (
                    <p className="card px-4 py-3 text-sm text-gray-400">Todos tus amigos ya están en el grupo.</p>
                ) : (
                    <div className="list-group">
                        {friendCandidates.map((person) => (
                            <PersonRow key={person.id} person={person}>
                                {inviteControl(person)}
                            </PersonRow>
                        ))}
                    </div>
                )}
            </section>

            <section>
                <Heading>Invitar a otra persona</Heading>
                <label className="relative block">
                    <span className="sr-only">Buscar por nombre o @usuario</span>
                    <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-500" />
                    <input
                        type="search"
                        value={query}
                        onChange={(event) => setQuery(event.target.value)}
                        placeholder="Nombre o @usuario"
                        autoComplete="off"
                        autoCapitalize="none"
                        enterKeyHint="search"
                        className="input pl-12"
                    />
                </label>
                {!searching ? null : results.isLoading ? (
                    <div className="mt-3">
                        <ListSkeleton count={2} />
                    </div>
                ) : results.error ? (
                    <ErrorNotice className="mt-3" title="No pudimos buscar" error={results.error} onRetry={() => void results.refetch()} />
                ) : searchResults.length === 0 ? (
                    <p className="mt-3 px-1 text-sm text-gray-400">
                        {(results.data ?? []).length > 0 ? 'Quien coincide ya está en el grupo.' : `Nadie coincide con «${term}».`}
                    </p>
                ) : (
                    <div className="list-group mt-3">
                        {searchResults.map((person) => (
                            <PersonRow
                                key={person.id}
                                person={person}
                                subtitle={[person.username ? `@${person.username}` : null, friendIds.has(person.id) ? 'Amigos' : null]
                                    .filter(Boolean)
                                    .join(' · ') || undefined}
                            >
                                {inviteControl(person)}
                            </PersonRow>
                        ))}
                    </div>
                )}
            </section>

            <section>
                <Heading>Invitaciones pendientes{pending.length ? ` · ${pending.length}` : ''}</Heading>
                {invitations.isLoading ? (
                    <ListSkeleton count={1} />
                ) : invitations.error ? (
                    <ErrorNotice title="No pudimos cargar las invitaciones" error={invitations.error} onRetry={() => void invitations.refetch()} />
                ) : pending.length === 0 ? (
                    <p className="px-1 text-sm text-gray-500">Nadie tiene una invitación pendiente.</p>
                ) : (
                    <div className="list-group">
                        {pending.map((invitation) => (
                            <PersonRow
                                key={invitation.id}
                                person={invitation.invited ?? { id: invitation.invited_user_id, display_name: 'Usuario' }}
                                subtitle={`Enviada ${formatRelative(invitation.created_at)}`}
                            >
                                <button
                                    type="button"
                                    onClick={() => cancel.mutate(invitation.id)}
                                    disabled={cancel.isPending}
                                    className="btn-ghost !px-3"
                                >
                                    Cancelar
                                </button>
                            </PersonRow>
                        ))}
                    </div>
                )}
                <p className="mt-3 px-1 text-xs text-gray-500">Cuando acepten, entrarán directamente al grupo.</p>
            </section>
        </div>
    )
}
