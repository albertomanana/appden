import React from 'react'
import { CalendarDays, Rocket, Sparkles, Wrench } from 'lucide-react'
import { motion } from 'framer-motion'
import { EmptyState } from '@components/ui/EmptyState'
import { ListSkeleton } from '@components/ui/LoadingSkeleton'
import type { ChangelogItem, ChangelogItemType } from '@features/changelog/types'

type ChangelogTimelineProps = {
    entries: ChangelogItem[]
    isLoading: boolean
}

export const ChangelogTimeline: React.FC<ChangelogTimelineProps> = ({ entries, isLoading }) => {
    if (isLoading) {
        return <ListSkeleton count={4} item={<div className="card h-36" />} />
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
        <div className="relative space-y-4 pl-4 md:pl-8">
            <div className="absolute bottom-0 left-[1.1rem] top-0 w-px bg-gradient-to-b from-brand-400/50 via-white/10 to-transparent md:left-[1.9rem]" />

            {entries.map((item, index) => (
                <motion.article
                    key={item.id}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.28, delay: index * 0.04 }}
                    className="relative card overflow-hidden p-5"
                >
                    <div className="absolute left-[-0.1rem] top-7 h-3.5 w-3.5 rounded-full border border-brand-200/30 bg-brand-300 shadow-[0_0_18px_rgba(133,173,255,0.45)] md:left-[-1.12rem]" />
                    <div className="absolute -right-14 top-0 h-32 w-32 rounded-full bg-brand-400/10 blur-3xl" />

                    <div className="relative flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                        <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                                <span className={badgeClass(item.type)}>
                                    {iconFor(item.type)}
                                    {labelFor(item.type)}
                                </span>
                                <span className="hero-meta-pill !px-3 !py-1">v{item.version}</span>
                            </div>

                            <h3 className="mt-4 text-2xl font-headline font-extrabold tracking-tight text-white">
                                {item.title}
                            </h3>
                            <p className="mt-3 max-w-3xl text-sm leading-relaxed text-gray-300 md:text-[15px]">
                                {item.description}
                            </p>
                        </div>

                        <div className="shrink-0 text-xs uppercase tracking-[0.24em] text-gray-500">
                            <span className="inline-flex items-center gap-2">
                                <CalendarDays className="w-3.5 h-3.5 text-brand-300" />
                                {new Date(item.release_date).toLocaleDateString('es-ES', {
                                    year: 'numeric',
                                    month: 'short',
                                    day: '2-digit',
                                })}
                            </span>
                        </div>
                    </div>
                </motion.article>
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
        case 'update':
            return 'Update'
        default:
            return 'Cambio'
    }
}

function badgeClass(type: ChangelogItemType): string {
    switch (type) {
        case 'feature':
            return 'badge bg-emerald-400/14 text-emerald-200 border border-emerald-300/20 inline-flex items-center gap-1.5'
        case 'fix':
            return 'badge bg-red-400/14 text-red-200 border border-red-300/20 inline-flex items-center gap-1.5'
        case 'improvement':
            return 'badge bg-brand-400/14 text-brand-100 border border-brand-300/20 inline-flex items-center gap-1.5'
        case 'update':
            return 'badge bg-white/6 text-gray-200 border border-white/10 inline-flex items-center gap-1.5'
        default:
            return 'badge'
    }
}

const iconByType: Record<ChangelogItemType, React.ReactNode> = {
    feature: <Rocket className="w-3 h-3" />,
    fix: <Wrench className="w-3 h-3" />,
    improvement: <Sparkles className="w-3 h-3" />,
    update: <Sparkles className="w-3 h-3" />,
}

function iconFor(type: ChangelogItemType): React.ReactNode {
    return iconByType[type] ?? <Sparkles className="w-3 h-3" />
}
