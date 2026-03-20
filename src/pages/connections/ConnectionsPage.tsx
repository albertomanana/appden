import React from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Check, Search, UserCheck2, UserPlus2, Users, X } from 'lucide-react'
import { Avatar } from '@components/common/Avatar'
import { EmptyState } from '@components/ui/EmptyState'
import { LoadingSkeleton } from '@components/ui/LoadingSkeleton'
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
        <div className="max-w-4xl mx-auto px-4 py-6 space-y-5">
            <section className="card p-4">
                <h1 className="text-2xl font-bold text-white">Conexiones</h1>
                <p className="text-sm text-gray-400 mt-1">
                    Busca personas, envia solicitudes y conecta para invitar rapido a grupos.
                </p>
            </section>

            <section className="card p-4 space-y-3">
                <h2 className="text-sm font-semibold text-gray-200">Buscar usuarios</h2>
                <div className="relative">
                    <Search className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                        className="input pl-10"
                        value={query}
                        onChange={(event) => setQuery(event.target.value)}
                        placeholder="Nombre o username"
                    />
                </div>
                <textarea
                    className="input resize-none"
                    rows={2}
                    maxLength={280}
                    value={message}
                    onChange={(event) => setMessage(event.target.value)}
                    placeholder="Mensaje opcional para la solicitud"
                />

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
                                    className="rounded-xl border border-surface-500 bg-surface-700/40 p-3 flex items-center justify-between gap-3"
                                >
                                    <div className="flex items-center gap-2 min-w-0">
                                        <Avatar src={profile.avatar_url} name={profile.display_name} size="sm" />
                                        <div className="min-w-0">
                                            <p className="text-sm text-white font-medium truncate">{profile.display_name}</p>
                                            <p className="text-xs text-gray-400 truncate">@{profile.username ?? 'sin-username'}</p>
                                        </div>
                                    </div>

                                    {isFriend ? (
                                        <div className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-500/15 text-emerald-300 text-xs">
                                            <UserCheck2 className="w-3.5 h-3.5" />
                                            Conexion
                                        </div>
                                    ) : incomingRequest ? (
                                        <div className="flex items-center gap-1">
                                            <button
                                                className="p-2 rounded-lg bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/20"
                                                onClick={() => acceptMutation.mutate(incomingRequest.id)}
                                                title="Aceptar"
                                            >
                                                <Check className="w-4 h-4" />
                                            </button>
                                            <button
                                                className="p-2 rounded-lg bg-red-500/15 text-red-300 hover:bg-red-500/20"
                                                onClick={() => rejectMutation.mutate(incomingRequest.id)}
                                                title="Rechazar"
                                            >
                                                <X className="w-4 h-4" />
                                            </button>
                                        </div>
                                    ) : outgoingRequest ? (
                                        <button
                                            className="btn-ghost px-3 py-2 text-xs"
                                            onClick={() => cancelMutation.mutate(outgoingRequest.id)}
                                        >
                                            Pendiente
                                        </button>
                                    ) : (
                                        <button
                                            className="btn-primary px-3 py-2 text-xs"
                                            onClick={() => sendMutation.mutate(profile.id)}
                                            disabled={sendMutation.isPending}
                                        >
                                            <UserPlus2 className="w-3.5 h-3.5" />
                                            Conectar
                                        </button>
                                    )}
                                </div>
                            )
                        })}
                    </div>
                )}
            </section>

            <section className="grid gap-4 md:grid-cols-2">
                <div className="card p-4 space-y-2">
                    <h3 className="text-sm font-semibold text-gray-200">Solicitudes recibidas</h3>
                    {loadingIncoming ? (
                        <LoadingSkeleton count={2} />
                    ) : incoming.length === 0 ? (
                        <p className="text-xs text-gray-500">Sin solicitudes pendientes.</p>
                    ) : (
                        incoming.map((request) => (
                            <div key={request.id} className="rounded-lg border border-surface-500 bg-surface-700/40 p-3 flex items-center justify-between">
                                <div className="min-w-0">
                                    <p className="text-sm text-white truncate">{request.from_profile?.display_name ?? 'Usuario'}</p>
                                    <p className="text-xs text-gray-400">@{request.from_profile?.username ?? 'sin-username'}</p>
                                </div>
                                <div className="flex items-center gap-1">
                                    <button
                                        className="p-2 rounded-lg bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/20"
                                        onClick={() => acceptMutation.mutate(request.id)}
                                    >
                                        <Check className="w-4 h-4" />
                                    </button>
                                    <button
                                        className="p-2 rounded-lg bg-red-500/15 text-red-300 hover:bg-red-500/20"
                                        onClick={() => rejectMutation.mutate(request.id)}
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                <div className="card p-4 space-y-2">
                    <h3 className="text-sm font-semibold text-gray-200">Solicitudes enviadas</h3>
                    {loadingOutgoing ? (
                        <LoadingSkeleton count={2} />
                    ) : outgoing.length === 0 ? (
                        <p className="text-xs text-gray-500">No tienes solicitudes enviadas.</p>
                    ) : (
                        outgoing.map((request) => (
                            <div key={request.id} className="rounded-lg border border-surface-500 bg-surface-700/40 p-3 flex items-center justify-between">
                                <div className="min-w-0">
                                    <p className="text-sm text-white truncate">{request.to_profile?.display_name ?? 'Usuario'}</p>
                                    <p className="text-xs text-gray-400">@{request.to_profile?.username ?? 'sin-username'}</p>
                                </div>
                                <button className="btn-ghost px-3 py-2 text-xs" onClick={() => cancelMutation.mutate(request.id)}>
                                    Cancelar
                                </button>
                            </div>
                        ))
                    )}
                </div>
            </section>

            <section className="card p-4 space-y-2">
                <h3 className="text-sm font-semibold text-gray-200 inline-flex items-center gap-2">
                    <Users className="w-4 h-4 text-brand-300" />
                    Tus conexiones
                </h3>

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
                            <div key={friend.id} className="rounded-lg border border-surface-500 bg-surface-700/40 p-3 flex items-center justify-between">
                                <div className="flex items-center gap-2 min-w-0">
                                    <Avatar
                                        src={friend.friend_profile?.avatar_url}
                                        name={friend.friend_profile?.display_name}
                                        size="sm"
                                    />
                                    <div className="min-w-0">
                                        <p className="text-sm text-white truncate">{friend.friend_profile?.display_name ?? 'Usuario'}</p>
                                        <p className="text-xs text-gray-400">@{friend.friend_profile?.username ?? 'sin-username'}</p>
                                    </div>
                                </div>
                                <button
                                    className="btn-ghost px-3 py-2 text-xs"
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
            </section>
        </div>
    )
}
