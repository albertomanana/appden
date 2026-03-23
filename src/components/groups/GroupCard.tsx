import React from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Users } from 'lucide-react'
import type { Group } from '@/types'

interface GroupCardProps {
    group: Group
    memberCount?: number
}

export const GroupCard: React.FC<GroupCardProps> = ({ group, memberCount = 0 }) => {
    return (
        <Link to={`/groups/${group.id}`} className="card-interactive group block overflow-hidden p-5">
            <div className="absolute" />
            <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                    <p className="page-kicker">Private group</p>
                    <h3 className="mt-2 truncate text-2xl font-headline font-extrabold tracking-tight text-white group-hover:text-brand-100">
                        {group.name}
                    </h3>
                    {group.description ? (
                        <p className="mt-3 truncate-2 text-sm leading-relaxed text-gray-400">{group.description}</p>
                    ) : (
                        <p className="mt-3 text-sm text-gray-500">Espacio listo para compartir musica, actividad y colaboracion.</p>
                    )}
                </div>
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[1.25rem] bg-white/6 text-gray-400 transition-colors group-hover:bg-brand-400/12 group-hover:text-brand-200">
                    <ArrowRight className="h-4 w-4" />
                </div>
            </div>

            <div className="mt-5 flex items-center justify-between gap-3">
                <span className="hero-meta-pill !px-3 !py-1.5">
                    <Users className="h-3.5 w-3.5 text-brand-300" />
                    {memberCount} {memberCount === 1 ? 'member' : 'members'}
                </span>
                <span className="text-[11px] uppercase tracking-[0.22em] text-gray-500">Open detail</span>
            </div>
        </Link>
    )
}
