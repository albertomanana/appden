import React from 'react'
import { Sparkles } from 'lucide-react'
import { EmptyState } from '@components/ui/EmptyState'
import { ListSkeleton } from '@components/ui/LoadingSkeleton'
import type { ChangelogItem, ChangelogItemType } from '@features/changelog/types'

type ChangelogTimelineProps = {
    entries: ChangelogItem[]
    isLoading: boolean
}

export const ChangelogTimeline: React.FC<ChangelogTimelineProps> = ({ entries, isLoading }) => {
    if (isLoading) {
        return <ListSkeleton count={4} item={<div className="card h-40" />} />
    }

    if (entries.length === 0) {
        return (
            <EmptyState
                icon={<Sparkles className="w-7 h-7" />}
                title="Sin cambios publicados"
                description="Cuando publiquemos nuevas mejoras del producto apareceran aqui con su fecha y categoria."
            />
        )
    }

    return (
        <div className="space-y-8">
            {entries.map((item, index) => {
                const isLatest = index === 0
                const toneClass = isLatest ? 'bg-[#131313]' : 'surface-lowest'

                return (
                    <article key={item.id} className={`card ${toneClass} relative overflow-hidden p-8`}>
                        {isLatest ? <div className="absolute -right-16 -top-16 h-32 w-32 rounded-full bg-brand-500/10 blur-[80px]" /> : null}

                        <div className="mb-8 flex flex-col gap-2 md:flex-row md:items-baseline md:justify-between">
                            <div>
                                <h2 className={`font-headline text-3xl font-bold ${isLatest ? 'text-primary' : 'text-on-surface-variant opacity-60'}`}>
                                    v{item.version}
                                </h2>
                                <p className="mt-1 font-label text-xs uppercase tracking-widest text-on-surface-variant opacity-60">
                                    {new Date(item.release_date).toLocaleDateString('es-ES', {
                                        year: 'numeric',
                                        month: 'long',
                                        day: '2-digit',
                                    })}
                                </p>
                            </div>

                            {isLatest ? (
                                <span className="rounded-full border border-emerald-300/20 bg-emerald-400/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-200">
                                    Latest Release
                                </span>
                            ) : null}
                        </div>

                        <div className="space-y-6">
                            <div>
                                <div className="mb-4 flex items-center gap-2">
                                    <span className={badgeClass(item.type)}>{labelFor(item.type)}</span>
                                    <h3 className="font-headline text-lg font-bold text-white">{item.title}</h3>
                                </div>
                                <p className="text-sm leading-relaxed text-on-surface-variant">{item.description}</p>
                            </div>
                        </div>
                    </article>
                )
            })}
        </div>
    )
}

function labelFor(type: ChangelogItemType): string {
    switch (type) {
        case 'feature':
            return 'NEW'
        case 'fix':
            return 'FIX'
        case 'improvement':
            return 'IMPROVED'
        case 'update':
            return 'UPDATE'
        default:
            return 'CHANGE'
    }
}

function badgeClass(type: ChangelogItemType): string {
    switch (type) {
        case 'feature':
            return 'inline-flex items-center gap-1 rounded bg-primary px-2 py-0.5 text-[10px] font-black uppercase tracking-tight text-on-primary-fixed'
        case 'fix':
            return 'inline-flex items-center gap-1 rounded border border-error/30 bg-error/20 px-2 py-0.5 text-[10px] font-black uppercase tracking-tight text-error'
        case 'improvement':
            return 'inline-flex items-center gap-1 rounded bg-secondary-container px-2 py-0.5 text-[10px] font-black uppercase tracking-tight text-on-secondary-container'
        case 'update':
            return 'inline-flex items-center gap-1 rounded bg-white/10 px-2 py-0.5 text-[10px] font-black uppercase tracking-tight text-white/80'
        default:
            return 'inline-flex items-center gap-1 rounded bg-white/10 px-2 py-0.5 text-[10px] font-black uppercase tracking-tight text-white/80'
    }
}

