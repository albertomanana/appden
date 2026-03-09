import React from 'react'
import { Users, ChevronRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { Group } from '@/types'

interface GroupCardProps {
    group: Group
    memberCount?: number
}

export const GroupCard: React.FC<GroupCardProps> = ({ group, memberCount = 0 }) => {
    return (
        <Link
            to={`/groups/${group.id}`}
            className="block p-4 bg-neutral-800 hover:bg-neutral-700/50 rounded-lg border border-neutral-700 hover:border-brand-500/50 transition-all group"
        >
            <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                    <h3 className="font-semibold text-white group-hover:text-brand-300 transition-colors mb-1">
                        {group.name}
                    </h3>
                    {group.description && (
                        <p className="text-sm text-neutral-400 line-clamp-2">
                            {group.description}
                        </p>
                    )}
                </div>
                <ChevronRight className="text-neutral-600 group-hover:text-brand-500 transition-colors flex-shrink-0" />
            </div>

            <div className="flex items-center gap-2 text-sm text-neutral-400">
                <Users size={16} />
                <span>{memberCount} member{memberCount !== 1 ? 's' : ''}</span>
            </div>
        </Link>
    )
}
