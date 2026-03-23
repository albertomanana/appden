import React from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Check, Search, UserCheck2, UserPlus2, Users, X } from 'lucide-react'
import { Avatar } from '@components/common/Avatar'
import { EmptyState } from '@components/ui/EmptyState'
import { LoadingSkeleton } from '@components/ui/LoadingSkeleton'
import { PageHeader } from '@components/ui/PageHeader'
import { useAuth } from '@hooks/useAuth'
import { useToast } from '@components/ui/Toast'
import { connectionsService } from '@features/social/services/connections.service'

export default function ConnectionsPage() {
    const { userId } = useAuth()
    const { success, error } = useToast()
    const queryClient = useQueryClient()

    const [query, setQuery] = React.useState('')
    const [message, setMessage] = React.useState('')

    const { data: incoming = [], isLoading: loadingIncoming } = useQuery({
        queryKey: ['connections', 'incoming', userId],
        queryFn: () => connectionsService.listIncoming(userId!),
        enabled: !!userId,
    })

    const { data: outgoing = [], isLoading: loadingOutgoing } = useQuery({
        queryKey: ['connections', 'outgoing', userId],
        queryFn: () => connectionsService.listOutgoing(userId!),
        enabled: !!userId,
    })

    const { data: friends = [], isLoading: loadingFriends } = useQuery({
        queryKey: ['connections', 'friends', userId],
        queryFn: () => connectionsService.listFriends(userId!),
        enabled: !!userId,
    })

    const { data: searchResults = [], isLoading: loadingSearch } = useQuery({
        queryKey: ['connections', 'search', userId, query],
        queryFn: () => connectionsService.searchPeople(query.trim(), userId!),
        enabled: !!userId && query.trim().length >= 2,
    })

    const refreshAll = async () => {
        await Promise.all([
            queryClient.invalidateQueries({ queryKey: ['connections', 'incoming', userId] }),
            queryClient.invalidateQueries({ queryKey: ['connections', 'outgoing', userId] }),
            queryClient.invalidateQueries({ queryKey: ['connections', 'friends', userId] }),
        ])
    }

    const sendMutation = useMutation({
        mutationFn: (toUserId: string) => connectionsService.sendRequest(userId!, toUserId, message),
        onSuccess: async () => {
            setMessage('')
            await refreshAll()
            success('Solicitud enviada', 'La persona la vera en sus conexiones pendientes.')
        },
        onError: (err) => {
            error('No se pudo enviar', err instanceof Error ? err.message : 'Error inesperado')
        },
    })

    const acceptMutation = useMutation({
        mutationFn: (requestId: string) => connectionsService.respond(requestId, true),
        onSuccess: async () => {
            await refreshAll()
            success('Conexion aceptada')
        },
        onError: () => error('No se pudo aceptar la solicitud'),
    })

    const rejectMutation = useMutation({
        mutationFn: (requestId: string) => connectionsService.respond(requestId, false),
        onSuccess: async () => {
            await refreshAll()
            success('Solicitud rechazada')
        },
        onError: () => error('No se pudo rechazar la solicitud'),
    })

    const cancelMutation = useMutation({
        mutationFn: (requestId: string) => connectionsService.cancel(requestId),
        onSuccess: async () => {
            await refreshAll()
            success('Solicitud cancelada')
        },
        onError: () => error('No se pudo cancelar la solicitud'),
    })

    const removeMutation = useMutation({
        mutationFn: (friendUserId: string) => connectionsService.removeFriend(userId!, friendUserId),
        onSuccess: async () => {
            await refreshAll()
            success('Conexion eliminada')
        },
        onError: () => error('No se pudo eliminar la conexion'),
    })

    const incomingByUser = React.useMemo(() => new Map(incoming.map((item) => [item.from_user_id, item])), [incoming])
    const outgoingByUser = React.useMemo(() => new Map(outgoing.map((item) => [item.to_user_id, item])), [outgoing])
    const friendIds = React.useMemo(
        () => new Set(friends.map((item) => item.friend_profile?.id).filter((id): id is string => !!id)),
        [friends]
    )

    if (!userId) return null

    return (
        <div className="page-shell animate-fade-in">
            <PageHeader
                kicker="People Layer"
                title="Conexiones"
                description="Busca usuarios, envia solicitudes y crea una red social privada que alimente la invitacion a grupos y la colaboracion real dentro de la app."
                meta={
                    <>
                        <span className="hero-meta-pill">{friends.length} conexiones</span>
                        <span className="hero-meta-pill">{incoming.length} pendientes</span>
                    </>
                }
            />

            <section className="card p-5 space-y-4">
                <div>
                    <p className="page-kicker">Search Directory</p>
                    <h2 className="mt-2 text-2xl font-headline font-extrabold text-white">Buscar personas</h2>
                </div>

                <div className="grid gap-3 md:grid-cols-[1fr,0.9fr]">
                    <div className="relative">
                        <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
                        <input
                            className="input pl-11"
                            value={query}
                            onChange={(event) => setQuery(event.target.value)}
                            placeholder="Nombre o username"
                        />
                    </div>
                    <textarea
                        className="input min-h-[112px] resize-none"
                        rows={3}
                        maxLength={280}
                        value={message}
                        onChange={(event) => setMessage(event.target.value)}
                        placeholder="Mensaje opcional para acompanar la solicitud"
                    />
                </div>

                {loadingSearch ? (
                    <LoadingSkeleton count={2} />
                ) : searchResults.length === 0 && query.trim().length >= 2 ? (
                    <p className="text-sm text-gray-400">No encontramos usuarios con esa busqueda.</p>
                ) : (
                    <div className="space-y-2">
                        {searchResults.map((profile) => {
                            const incomingRequest = incomingByUser.get(profile.id)
                            const outgoingRequest = outgoingByUser.get(profile.id)
                            const isFriend = friendIds.has(profile.id)

                            return (
                                <div
                                    key={profile.id}
                                    className="rounded-[1.5rem] border border-white/8 bg-black/15 p-3 sm:flex sm:items-center sm:justify-between"
                                >
                                    <div className="flex min-w-0 items-center gap-3">
                                        <Avatar src={profile.avatar_url} name={profile.display_name} size="sm" />
                                        <div className="min-w-0">
                                            <p className="truncate text-sm font-semibold text-white">{profile.display_name}</p>
                                            <p className="truncate text-xs uppercase tracking-[0.18em] text-gray-500">@{profile.username ?? 'sin-username'}</p>
                                        </div>
                                    </div>

                                    <div className="mt-3 sm:mt-0">
                                        {isFriend ? (
                                            <div className="badge bg-emerald-400/14 text-emerald-200 border border-emerald-300/20">
                                                <UserCheck2 className="w-3.5 h-3.5" />
                                                Conexion activa
                                            </div>
                                        ) : incomingRequest ? (
                                            <div className="flex items-center gap-2">
                                                <button
                                                    className="btn-secondary !min-h-[2.5rem] bg-emerald-400/12 text-emerald-200"
                                                    onClick={() => acceptMutation.mutate(incomingRequest.id)}
                                                    title="Aceptar"
                                                >
                                                    <Check className="w-4 h-4" />
                                                    Aceptar
                                                </button>
                                                <button
                                                    className="btn-secondary !min-h-[2.5rem] bg-red-400/12 text-red-200"
                                                    onClick={() => rejectMutation.mutate(incomingRequest.id)}
                                                    title="Rechazar"
                                                >
                                                    <X className="w-4 h-4" />
                                                    Rechazar
                                                </button>
                                            </div>
                                        ) : outgoingRequest ? (
                                            <button className="btn-secondary" onClick={() => cancelMutation.mutate(outgoingRequest.id)}>
                                                Pendiente
                                            </button>
                                        ) : (
                                            <button
                                                className="btn-primary"
                                                onClick={() => sendMutation.mutate(profile.id)}
                                                disabled={sendMutation.isPending}
                                            >
                                                <UserPlus2 className="w-3.5 h-3.5" />
                                                Conectar
                                            </button>
                                        )}
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                )}
            </section>

            <section className="grid gap-4 xl:grid-cols-[0.9fr,0.9fr,1.2fr]">
                <div className="card p-5 space-y-3">
                    <div>
                        <p className="page-kicker">Incoming</p>
                        <h3 className="mt-2 text-2xl font-headline font-extrabold text-white">Solicitudes recibidas</h3>
                    </div>
                    {loadingIncoming ? (
                        <LoadingSkeleton count={2} />
                    ) : incoming.length === 0 ? (
                        <p className="text-sm text-gray-500">Sin solicitudes pendientes.</p>
                    ) : (
                        incoming.map((request) => (
                            <div key={request.id} className="rounded-[1.35rem] border border-white/8 bg-black/15 p-3">
                                <p className="truncate text-sm font-semibold text-white">{request.from_profile?.display_name ?? 'Usuario'}</p>
                                <p className="mt-1 truncate text-xs uppercase tracking-[0.18em] text-gray-500">@{request.from_profile?.username ?? 'sin-username'}</p>
                                <div className="mt-3 flex items-center gap-2">
                                    <button className="btn-secondary !min-h-[2.4rem] bg-emerald-400/12 text-emerald-200" onClick={() => acceptMutation.mutate(request.id)}>
                                        <Check className="w-4 h-4" />
                                        Aceptar
                                    </button>
                                    <button className="btn-secondary !min-h-[2.4rem] bg-red-400/12 text-red-200" onClick={() => rejectMutation.mutate(request.id)}>
                                        <X className="w-4 h-4" />
                                        Rechazar
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                <div className="card p-5 space-y-3">
                    <div>
                        <p className="page-kicker">Outgoing</p>
                        <h3 className="mt-2 text-2xl font-headline font-extrabold text-white">Solicitudes enviadas</h3>
                    </div>
                    {loadingOutgoing ? (
                        <LoadingSkeleton count={2} />
                    ) : outgoing.length === 0 ? (
                        <p className="text-sm text-gray-500">No tienes solicitudes enviadas.</p>
                    ) : (
                        outgoing.map((request) => (
                            <div key={request.id} className="rounded-[1.35rem] border border-white/8 bg-black/15 p-3">
                                <p className="truncate text-sm font-semibold text-white">{request.to_profile?.display_name ?? 'Usuario'}</p>
                                <p className="mt-1 truncate text-xs uppercase tracking-[0.18em] text-gray-500">@{request.to_profile?.username ?? 'sin-username'}</p>
                                <div className="mt-3">
                                    <button className="btn-secondary" onClick={() => cancelMutation.mutate(request.id)}>
                                        Cancelar
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                <div className="card p-5 space-y-4">
                    <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-brand-300" />
                        <div>
                            <p className="page-kicker">Trusted Network</p>
                            <h3 className="mt-2 text-2xl font-headline font-extrabold text-white">Tus conexiones</h3>
                        </div>
                    </div>

                    {loadingFriends ? (
                        <LoadingSkeleton count={3} />
                    ) : friends.length === 0 ? (
                        <EmptyState
                            icon={<Users className="w-7 h-7" />}
                            title="Aun no tienes conexiones"
                            description="Empieza enviando solicitudes para invitar mas rapido a tus grupos."
                        />
                    ) : (
                        <div className="space-y-2">
                            {friends.map((friend) => (
                                <div key={friend.id} className="rounded-[1.35rem] border border-white/8 bg-black/15 p-3 sm:flex sm:items-center sm:justify-between">
                                    <div className="flex min-w-0 items-center gap-3">
                                        <Avatar src={friend.friend_profile?.avatar_url} name={friend.friend_profile?.display_name} size="sm" />
                                        <div className="min-w-0">
                                            <p className="truncate text-sm font-semibold text-white">{friend.friend_profile?.display_name ?? 'Usuario'}</p>
                                            <p className="truncate text-xs uppercase tracking-[0.18em] text-gray-500">@{friend.friend_profile?.username ?? 'sin-username'}</p>
                                        </div>
                                    </div>
                                    <button
                                        className="btn-secondary mt-3 sm:mt-0"
                                        onClick={() => {
                                            const friendUserId = friend.friend_profile?.id
                                            if (!friendUserId) return
                                            removeMutation.mutate(friendUserId)
                                        }}
                                    >
                                        Quitar
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </section>
        </div>
    )
}
