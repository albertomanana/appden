import React from 'react'
import { Link } from 'react-router-dom'
import { Check, ChevronRight } from 'lucide-react'
import { ROUTES } from '@lib/constants'
import { getInitials } from '@lib/utils'
import type { Group } from '@/types'

interface GroupCardProps {
    group: Group
    memberCount?: number
    isActive?: boolean
}

export const GroupCard: React.FC<GroupCardProps> = ({ group, memberCount, isActive = false }) => (
    <Link to={ROUTES.GROUP(group.id)} className="list-row">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-brand-400/80 to-violet-500/80 text-sm font-bold text-white">
            {getInitials(group.name)}
        </span>
        <span className="min-w-0 flex-1">
            <span className="flex items-center gap-1.5">
                <span className="truncate text-[15px] font-semibold text-white">{group.name}</span>
                {isActive ? <Check className="h-4 w-4 shrink-0 text-brand-300" aria-label="Grupo activo" /> : null}
            </span>
            <span className="block truncate text-[13px] text-gray-400">
                {memberCount != null ? `${memberCount} ${memberCount === 1 ? 'miembro' : 'miembros'}` : null}
                {memberCount != null && group.description ? ' · ' : null}
                {group.description}
            </span>
        </span>
        <ChevronRight className="h-5 w-5 shrink-0 text-gray-600" />
    </Link>
)
