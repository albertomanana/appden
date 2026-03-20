import React, { useMemo } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Check, Crown, Trash2, UserPlus, Users, X } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import type { GroupMember } from '@/types'
import { Avatar } from '@components/common/Avatar'
import { friendsService, type GroupFriendRequest } from '@services/friends.service'
import { useAuth } from '@hooks/useAuth'

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
        <div className="space-y-2">
            {members.map((member) => (
                <div
                    key={member.id}
                    className="flex items-center justify-between p-3 bg-neutral-800 rounded-lg hover:bg-neutral-700/50 transition-colors cursor-pointer"
                    onClick={() => navigate(`/groups/${groupId}/members/${member.user_id}`)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                            navigate(`/groups/${groupId}/members/${member.user_id}`)
                        }
                    }}
                >
                    <div className="flex items-center gap-3">
                        <Avatar src={member.profile?.avatar_url} name={member.profile?.display_name} size="sm" />
                        <div className="flex-1">
                            <p className="font-medium text-white">{member.profile?.display_name}</p>
                            <p className="text-xs text-neutral-400">
                                {member.user_id === currentUserId && '(You)'}
                                {member.role === 'owner' && ' • Owner'}
                                {member.role === 'admin' && ' • Admin'}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
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
                                        className="px-3 py-1.5 rounded-lg bg-brand-500/20 text-brand-300 hover:bg-brand-500/25 text-xs font-semibold transition-colors inline-flex items-center gap-1.5"
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
                                    <div className="px-3 py-1.5 rounded-lg bg-emerald-500/15 text-emerald-300 text-xs font-semibold inline-flex items-center gap-1.5">
                                        <Users className="w-4 h-4" />
                                        Amigos
                                    </div>
                                )
                            }

                            if (request.status === 'pending' && request.to_user_id === viewerUserId) {
                                return (
                                    <div className="flex items-center gap-1">
                                        <button
                                            onClick={(event) => {
                                                event.stopPropagation()
                                                acceptMutation.mutate(request.id)
                                            }}
                                            className="p-2 rounded-lg bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/20 transition-colors"
                                            title="Aceptar"
                                            disabled={acceptMutation.isPending}
                                        >
                                            <Check className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={(event) => {
                                                event.stopPropagation()
                                                rejectMutation.mutate(request.id)
                                            }}
                                            className="p-2 rounded-lg bg-red-500/10 text-red-300 hover:bg-red-500/15 transition-colors"
                                            title="Rechazar"
                                            disabled={rejectMutation.isPending}
                                        >
                                            <X className="w-4 h-4" />
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
                                        className="px-3 py-1.5 rounded-lg bg-white/10 text-white/80 hover:bg-white/15 text-xs font-semibold transition-colors inline-flex items-center gap-1.5"
                                        title="Cancelar solicitud"
                                        disabled={cancelMutation.isPending}
                                    >
                                        Pendiente
                                    </button>
                                )
                            }

                            return null
                        })() : null}

                        {member.role === 'owner' ? (
                            <div className="flex items-center gap-1 px-2 py-1 bg-brand-500/20 rounded text-xs text-brand-300">
                                <Crown size={14} />
                                Owner
                            </div>
                        ) : null}

                        {member.role === 'admin' ? (
                            <div className="flex items-center gap-1 px-2 py-1 bg-indigo-500/20 rounded text-xs text-indigo-300">
                                <Crown size={14} />
                                Admin
                            </div>
                        ) : null}

                        {canAssignRoles && member.user_id !== currentUserId ? (
                            <select
                                value={member.role}
                                onChange={(event) => {
                                    event.stopPropagation()
                                    if (!onUpdateRole) return
                                    void onUpdateRole(
                                        member.user_id,
                                        event.target.value as 'owner' | 'admin' | 'member'
                                    )
                                }}
                                className="px-2 py-1 rounded bg-surface-700 border border-surface-500 text-xs text-gray-200"
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
                                className="p-2 hover:bg-red-500/20 text-red-400 hover:text-red-300 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                title="Remove member"
                            >
                                <Trash2 size={18} />
                            </button>
                        ) : null}
                    </div>
                </div>
            ))}
        </div>
    )
}
