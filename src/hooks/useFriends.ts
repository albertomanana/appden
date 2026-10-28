import { useCallback, useMemo } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@hooks/useAuth'
import { useToast } from '@components/ui/Toast'
import { friendsService, type FriendRelation } from '@services/friends.service'
import type { FriendRequest, Profile } from '@/types'

type PersonLike = Pick<Profile, 'id' | 'display_name'> & Partial<Pick<Profile, 'username' | 'avatar_url'>>

export const friendsKeys = {
    all: ['friends'] as const,
    list: (userId: string | null) => ['friends', 'list', userId] as const,
    incoming: (userId: string | null) => ['friends', 'incoming', userId] as const,
    outgoing: (userId: string | null) => ['friends', 'outgoing', userId] as const,
}

const firstName = (name?: string | null) => (name ?? '').trim().split(/\s+/)[0] || 'Esa persona'
const errorText = (error: unknown) => (error instanceof Error ? error.message : undefined)

function useIncomingQuery() {
    const { userId } = useAuth()
    return useQuery({
        queryKey: friendsKeys.incoming(userId),
        queryFn: () => friendsService.listIncoming(userId!),
        enabled: !!userId,
        staleTime: 30_000,
        refetchInterval: 120_000,
        refetchOnWindowFocus: true,
    })
}

/** Pending friend requests addressed to me (badge of the "Amigos" tab). */
export function useFriendRequestsCount(): number {
    return useIncomingQuery().data?.length ?? 0
}

/** My friends plus pending requests in both directions, with a relation lookup. */
export function useFriends() {
    const { userId } = useAuth()
    const incomingQuery = useIncomingQuery()

    const friendsQuery = useQuery({
        queryKey: friendsKeys.list(userId),
        queryFn: () => friendsService.listFriends(userId!),
        enabled: !!userId,
        staleTime: 30_000,
    })

    const outgoingQuery = useQuery({
        queryKey: friendsKeys.outgoing(userId),
        queryFn: () => friendsService.listOutgoing(userId!),
        enabled: !!userId,
        staleTime: 30_000,
    })

    const friends = useMemo(() => friendsQuery.data ?? [], [friendsQuery.data])
    const incoming = useMemo(() => incomingQuery.data ?? [], [incomingQuery.data])
    const outgoing = useMemo(() => outgoingQuery.data ?? [], [outgoingQuery.data])

    const friendIds = useMemo(() => {
        const ids = new Set<string>()
        for (const row of friends) ids.add(row.user_a === userId ? row.user_b : row.user_a)
        return ids
    }, [friends, userId])

    const relationOf = useCallback(
        (otherId: string): FriendRelation => {
            if (otherId === userId) return { kind: 'self' }
            const friendship = friends.find((row) => row.user_a === otherId || row.user_b === otherId)
            if (friendship) return { kind: 'friend', friendship }
            const received = incoming.find((request) => request.from_user_id === otherId)
            if (received) return { kind: 'incoming', request: received }
            const sent = outgoing.find((request) => request.to_user_id === otherId)
            if (sent) return { kind: 'outgoing', request: sent }
            return { kind: 'none' }
        },
        [friends, incoming, outgoing, userId]
    )

    return {
        friends,
        incoming,
        outgoing,
        friendIds,
        relationOf,
        isLoading: friendsQuery.isLoading || incomingQuery.isLoading || outgoingQuery.isLoading,
        error: friendsQuery.error ?? incomingQuery.error ?? outgoingQuery.error ?? null,
        refetch: () => Promise.all([friendsQuery.refetch(), incomingQuery.refetch(), outgoingQuery.refetch()]),
    }
}

/** Friend mutations with toasts and cache updates, shared by every screen that shows people. */
export function useFriendActions() {
    const { userId } = useAuth()
    const queryClient = useQueryClient()
    const toast = useToast()

    const refresh = () => void queryClient.invalidateQueries({ queryKey: friendsKeys.all })
    const dropRequest = (key: readonly unknown[], requestId: string) =>
        queryClient.setQueryData<FriendRequest[]>(key, (items) => items?.filter((item) => item.id !== requestId))

    const send = useMutation({
        mutationFn: (person: PersonLike) => friendsService.sendRequest(userId!, person.id),
        onSuccess: (request, person) => {
            if (request.status === 'accepted') toast.success('¡Ya sois amigos!', `${firstName(person.display_name)} ya te había enviado una solicitud.`)
            else toast.success('Solicitud enviada', `Te avisaremos cuando ${firstName(person.display_name)} la acepte.`)
        },
        onError: (error) => toast.error('No se pudo enviar la solicitud', errorText(error)),
        onSettled: refresh,
    })

    const accept = useMutation({
        mutationFn: (request: FriendRequest) => friendsService.respond(request.id, true),
        onMutate: (request) => dropRequest(friendsKeys.incoming(userId), request.id),
        onSuccess: (_data, request) =>
            toast.success('¡Ya sois amigos!', `${firstName(request.from_profile?.display_name)} ya está en tu lista de amigos.`),
        onError: (error) => toast.error('No se pudo aceptar la solicitud', errorText(error)),
        onSettled: refresh,
    })

    const reject = useMutation({
        mutationFn: (request: FriendRequest) => friendsService.respond(request.id, false),
        onMutate: (request) => dropRequest(friendsKeys.incoming(userId), request.id),
        onSuccess: () => toast.info('Solicitud rechazada'),
        onError: (error) => toast.error('No se pudo rechazar la solicitud', errorText(error)),
        onSettled: refresh,
    })

    const cancel = useMutation({
        mutationFn: (request: FriendRequest) => friendsService.cancel(request.id),
        onMutate: (request) => dropRequest(friendsKeys.outgoing(userId), request.id),
        onSuccess: () => toast.info('Solicitud cancelada'),
        onError: (error) => toast.error('No se pudo cancelar la solicitud', errorText(error)),
        onSettled: refresh,
    })

    const remove = useMutation({
        mutationFn: (person: PersonLike) => friendsService.removeFriend(userId!, person.id),
        onSuccess: (_data, person) => toast.info('Amistad eliminada', `${firstName(person.display_name)} ya no está en tus amigos.`),
        onError: (error) => toast.error('No se pudo eliminar la amistad', errorText(error)),
        onSettled: refresh,
    })

    return { send, accept, reject, cancel, remove }
}
