import React, { useMemo } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Crown, Trash2, UserPlus, Users, Check, X } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import type { GroupMember } from '@/types'
import { Avatar } from '@components/common/Avatar'
import { friendsService, type GroupFriendRequest } from '@services/friends.service'
import { useAuth } from '@hooks/useAuth'

interface GroupMemberListProps {
    groupId: string
    members: GroupMember[]
    currentUserId: string
    isOwner: boolean
    onRemoveMember?: (userId: string) => Promise<void>
    isLoading?: boolean
}

export const GroupMemberList: React.FC<GroupMemberListProps> = ({
    groupId,
    members,
    currentUserId,
    isOwner,
    onRemoveMember,
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
        for (const r of requests) {
            const a = r.from_user_id
            const b = r.to_user_id
            const key = a < b ? `${a}:${b}` : `${b}:${a}`
            const existing = map.get(key)
            if (!existing || new Date(r.created_at).getTime() > new Date(existing.created_at).getTime()) {
                map.set(key, r)
            }
        }
        return map
    }, [requests])

    const sendMutation = useMutation({
        mutationFn: (toUserId: string) => friendsService.sendRequest(groupId, toUserId),
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
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') navigate(`/groups/${groupId}/members/${member.user_id}`)
                    }}
                >
                    <div className="flex items-center gap-3">
                        <Avatar
                            src={member.profile?.avatar_url}
                            name={member.profile?.display_name}
                            size="sm"
                        />
                        <div className="flex-1">
                            <p className="font-medium text-white">{member.profile?.display_name}</p>
                            <p className="text-xs text-neutral-400">
                                {member.user_id === currentUserId && '(You)'}
                                {member.role === 'owner' && ' • Owner'}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        {/* Friend actions */}
                        {viewerUserId && member.user_id !== viewerUserId ? (() => {
                            const a = viewerUserId
                            const b = member.user_id
                            const key = a < b ? `${a}:${b}` : `${b}:${a}`
                            const req = requestIndex.get(key)

                            if (!req || req.status === 'cancelled' || req.status === 'rejected') {
                                return (
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation()
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

                            if (req.status === 'accepted') {
                                return (
                                    <div className="px-3 py-1.5 rounded-lg bg-emerald-500/15 text-emerald-300 text-xs font-semibold inline-flex items-center gap-1.5">
                                        <Users className="w-4 h-4" />
                                        Amigos
                                    </div>
                                )
                            }

                            if (req.status === 'pending' && req.to_user_id === viewerUserId) {
                                return (
                                    <div className="flex items-center gap-1">
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                acceptMutation.mutate(req.id)
                                            }}
                                            className="p-2 rounded-lg bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/20 transition-colors"
                                            title="Aceptar"
                                            disabled={acceptMutation.isPending}
                                        >
                                            <Check className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                rejectMutation.mutate(req.id)
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

                            if (req.status === 'pending' && req.from_user_id === viewerUserId) {
                                return (
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            cancelMutation.mutate(req.id)
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

                        {member.role === 'owner' && (
                            <div className="flex items-center gap-1 px-2 py-1 bg-brand-500/20 rounded text-xs text-brand-300">
                                <Crown size={14} />
                                Owner
                            </div>
                        )}

                        {isOwner && member.user_id !== currentUserId && (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation()
                                    void handleRemove(member.user_id)
                                }}
                                disabled={isLoading}
                                className="p-2 hover:bg-red-500/20 text-red-400 hover:text-red-300 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                title="Remove member"
                            >
                                <Trash2 size={18} />
                            </button>
                        )}
                    </div>
                </div>
            ))}
        </div>
    )
}
