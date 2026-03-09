import React from 'react'
import { Trash2, Crown } from 'lucide-react'
import type { GroupMember } from '@/types'
import { Avatar } from '@components/common/Avatar'

interface GroupMemberListProps {
    members: GroupMember[]
    currentUserId: string
    isOwner: boolean
    onRemoveMember?: (userId: string) => Promise<void>
    isLoading?: boolean
}

export const GroupMemberList: React.FC<GroupMemberListProps> = ({
    members,
    currentUserId,
    isOwner,
    onRemoveMember,
    isLoading = false,
}) => {
    const handleRemove = async (userId: string) => {
        if (!onRemoveMember) return
        if (confirm('Remove this member from the group?')) {
            await onRemoveMember(userId)
        }
    }

    return (
        <div className="space-y-2">
            {members.map((member) => (
                <div
                    key={member.id}
                    className="flex items-center justify-between p-3 bg-neutral-800 rounded-lg hover:bg-neutral-700/50 transition-colors"
                >
                    <div className="flex items-center gap-3">
                        <Avatar
                            src={member.profile?.avatar_url}
                            alt={member.profile?.display_name}
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
                        {member.role === 'owner' && (
                            <div className="flex items-center gap-1 px-2 py-1 bg-brand-500/20 rounded text-xs text-brand-300">
                                <Crown size={14} />
                                Owner
                            </div>
                        )}

                        {isOwner && member.user_id !== currentUserId && (
                            <button
                                onClick={() => handleRemove(member.user_id)}
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
