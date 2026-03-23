import React, { useMemo } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Check, Crown, Shield, Trash2, UserPlus, Users, X } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Avatar } from '@components/common/Avatar'
import { useAuth } from '@hooks/useAuth'
import { friendsService, type GroupFriendRequest } from '@services/friends.service'
import type { GroupMember } from '@/types'

interface GroupMemberListProps {
    groupId: string
    members: GroupMember[]
    currentUserId: string
    isManager: boolean
    canAssignRoles?: boolean
    onRemoveMember?: (userId: string) => Promise<void>
    onUpdateRole?: (userId: string, role: 'owner' | 'admin' | 'member') => Promise<void>
    isLoading?: boolean
}

export const GroupMemberList: React.FC<GroupMemberListProps> = ({
    groupId,
    members,
    currentUserId,
    isManager,
    canAssignRoles = false,
    onRemoveMember,
    onUpdateRole,
    isLoading = false,
}) => {
    const navigate = useNavigate()
    const { userId: viewerUserId } = useAuth()
    const queryClient = useQueryClient()

    const handleRemove = async (userId: string) => {
        if (!onRemoveMember) return
        if (confirm('Remove this member from the group?')) {
            await onRemoveMember(userId)
        }
    }

    const { data: requests = [] } = useQuery({
        queryKey: ['friend-requests', groupId],
        queryFn: () => friendsService.getRequestsForGroup(groupId),
        enabled: !!viewerUserId && !!groupId,
        staleTime: 10_000,
    })

    const requestIndex = useMemo(() => {
        const map = new Map<string, GroupFriendRequest>()
        for (const request of requests) {
            const a = request.from_user_id
            const b = request.to_user_id
            const key = a < b ? `${a}:${b}` : `${b}:${a}`
            const existing = map.get(key)
            if (!existing || +new Date(request.created_at) > +new Date(existing.created_at)) {
                map.set(key, request)
            }
        }
        return map
    }, [requests])

    const sendMutation = useMutation({
        mutationFn: (toUserId: string) => friendsService.sendRequest(groupId, toUserId, viewerUserId ?? undefined),
        onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['friend-requests', groupId] }),
    })

    const acceptMutation = useMutation({
        mutationFn: (requestId: string) => friendsService.acceptRequest(requestId),
        onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['friend-requests', groupId] }),
    })

    const rejectMutation = useMutation({
        mutationFn: (requestId: string) => friendsService.rejectRequest(requestId),
        onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['friend-requests', groupId] }),
    })

    const cancelMutation = useMutation({
        mutationFn: (requestId: string) => friendsService.cancelRequest(requestId),
        onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['friend-requests', groupId] }),
    })

    return (
        <div className="space-y-3">
            {members.map((member) => (
                <div
                    key={member.id}
                    className="rounded-[1.55rem] border border-white/8 bg-black/15 p-4 transition-colors hover:border-brand-300/18 hover:bg-white/[0.03]"
                    onClick={() => navigate(`/groups/${groupId}/members/${member.user_id}`)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                            navigate(`/groups/${groupId}/members/${member.user_id}`)
                        }
                    }}
                >
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                        <div className="flex min-w-0 items-center gap-3">
                            <Avatar src={member.profile?.avatar_url} name={member.profile?.display_name} size="sm" />
                            <div className="min-w-0">
                                <p className="truncate text-sm font-semibold text-white">{member.profile?.display_name}</p>
                                <p className="mt-1 truncate text-xs uppercase tracking-[0.18em] text-gray-500">
                                    {member.user_id === currentUserId ? 'You' : 'Member'}
                                </p>
                            </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                            {member.role === 'owner' ? (
                                <span className="badge bg-brand-400/14 text-brand-100 border border-brand-300/20">
                                    <Crown className="w-3.5 h-3.5" />
                                    Owner
                                </span>
                            ) : null}

                            {member.role === 'admin' ? (
                                <span className="badge bg-violet-400/14 text-violet-200 border border-violet-300/20">
                                    <Shield className="w-3.5 h-3.5" />
                                    Admin
                                </span>
                            ) : null}

                            {viewerUserId && member.user_id !== viewerUserId ? (() => {
                                const a = viewerUserId
                                const b = member.user_id
                                const key = a < b ? `${a}:${b}` : `${b}:${a}`
                                const request = requestIndex.get(key)

                                if (!request || request.status === 'cancelled' || request.status === 'rejected') {
                                    return (
                                        <button
                                            onClick={(event) => {
                                                event.stopPropagation()
                                                sendMutation.mutate(member.user_id)
                                            }}
                                            className="btn-secondary !min-h-[2.4rem]"
                                            title="Agregar amigo"
                                            disabled={sendMutation.isPending}
                                        >
                                            <UserPlus className="w-4 h-4" />
                                            Agregar
                                        </button>
                                    )
                                }

                                if (request.status === 'accepted') {
                                    return (
                                        <div className="badge bg-emerald-400/14 text-emerald-200 border border-emerald-300/20">
                                            <Users className="w-3.5 h-3.5" />
                                            Amigos
                                        </div>
                                    )
                                }

                                if (request.status === 'pending' && request.to_user_id === viewerUserId) {
                                    return (
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={(event) => {
                                                    event.stopPropagation()
                                                    acceptMutation.mutate(request.id)
                                                }}
                                                className="btn-secondary !min-h-[2.4rem] bg-emerald-400/12 text-emerald-200"
                                                title="Aceptar"
                                                disabled={acceptMutation.isPending}
                                            >
                                                <Check className="w-4 h-4" />
                                                Aceptar
                                            </button>
                                            <button
                                                onClick={(event) => {
                                                    event.stopPropagation()
                                                    rejectMutation.mutate(request.id)
                                                }}
                                                className="btn-secondary !min-h-[2.4rem] bg-red-400/12 text-red-200"
                                                title="Rechazar"
                                                disabled={rejectMutation.isPending}
                                            >
                                                <X className="w-4 h-4" />
                                                Rechazar
                                            </button>
                                        </div>
                                    )
                                }

                                if (request.status === 'pending' && request.from_user_id === viewerUserId) {
                                    return (
                                        <button
                                            onClick={(event) => {
                                                event.stopPropagation()
                                                cancelMutation.mutate(request.id)
                                            }}
                                            className="btn-secondary !min-h-[2.4rem]"
                                            title="Cancelar solicitud"
                                            disabled={cancelMutation.isPending}
                                        >
                                            Pendiente
                                        </button>
                                    )
                                }

                                return null
                            })() : null}

                            {canAssignRoles && member.user_id !== currentUserId ? (
                                <select
                                    value={member.role}
                                    onChange={(event) => {
                                        event.stopPropagation()
                                        if (!onUpdateRole) return
                                        void onUpdateRole(member.user_id, event.target.value as 'owner' | 'admin' | 'member')
                                    }}
                                    className="input !min-h-[2.45rem] !max-w-[132px] !px-3 !py-2 text-xs"
                                    onClick={(event) => event.stopPropagation()}
                                    aria-label="Cambiar rol"
                                >
                                    <option value="member">Member</option>
                                    <option value="admin">Admin</option>
                                    <option value="owner">Owner</option>
                                </select>
                            ) : null}

                            {isManager && member.user_id !== currentUserId ? (
                                <button
                                    onClick={(event) => {
                                        event.stopPropagation()
                                        void handleRemove(member.user_id)
                                    }}
                                    disabled={isLoading}
                                    className="btn-icon !h-10 !w-10 !rounded-full text-red-200 disabled:opacity-50"
                                    title="Remove member"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            ) : null}
                        </div>
                    </div>
                </div>
            ))}
        </div>
    )
}
