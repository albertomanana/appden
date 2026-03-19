import React from 'react'
import { CalendarDays, Wrench, Rocket, Sparkles } from 'lucide-react'
import { EmptyState } from '@components/ui/EmptyState'
import { ListSkeleton } from '@components/ui/LoadingSkeleton'
import type { ChangelogItem, ChangelogItemType } from '@features/changelog/types'

type ChangelogTimelineProps = {
    entries: ChangelogItem[]
    isLoading: boolean
}

export const ChangelogTimeline: React.FC<ChangelogTimelineProps> = ({ entries, isLoading }) => {
    if (isLoading) {
        return <ListSkeleton count={4} item={<div className="card h-24" />} />
    }

    if (entries.length === 0) {
        return (
            <EmptyState
                icon={<Sparkles className="w-7 h-7" />}
                title="Sin cambios publicados"
                description="Cuando publiquemos nuevas mejoras del grupo apareceran aqui."
            />
        )
    }

    return (
        <div className="space-y-3">
            {entries.map((item) => (
                <article key={item.id} className="card p-4 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                            <span className={badgeClass(item.type)}>
                                {iconFor(item.type)}
                                {labelFor(item.type)}
                            </span>
                            <h3 className="text-base font-semibold text-white truncate">{item.title}</h3>
                        </div>
                        <span className="text-xs text-gray-400 whitespace-nowrap inline-flex items-center gap-1">
                            <CalendarDays className="w-3.5 h-3.5" />
                            {new Date(item.release_date).toLocaleDateString('es-ES', {
                                year: 'numeric',
                                month: 'short',
                                day: '2-digit',
                            })}
                        </span>
                    </div>

                    <p className="text-sm text-gray-300 leading-relaxed">{item.description}</p>
                    <p className="text-xs text-gray-500">Version {item.version}</p>
                </article>
            ))}
        </div>
    )
}

function labelFor(type: ChangelogItemType): string {
    switch (type) {
        case 'feature':
            return 'Feature'
        case 'fix':
            return 'Fix'
        case 'improvement':
            return 'Improvement'
        default:
            return 'Cambio'
    }
}

function badgeClass(type: ChangelogItemType): string {
    switch (type) {
        case 'feature':
            return 'badge badge-green inline-flex items-center gap-1'
        case 'fix':
            return 'badge badge-red inline-flex items-center gap-1'
        case 'improvement':
            return 'badge badge-brand inline-flex items-center gap-1'
        default:
            return 'badge'
    }
}

const iconByType: Record<ChangelogItemType, React.ReactNode> = {
    feature: <Rocket className="w-3 h-3" />,
    fix: <Wrench className="w-3 h-3" />,
    improvement: <Sparkles className="w-3 h-3" />,
}

function iconFor(type: ChangelogItemType): React.ReactNode {
    return iconByType[type] ?? <Sparkles className="w-3 h-3" />
}

