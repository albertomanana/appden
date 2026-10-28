import React from 'react'
import { cn } from '@lib/utils'

interface EmptyStateProps {
    icon?: React.ReactNode
    title: string
    description?: string
    action?: React.ReactNode
    className?: string
    compact?: boolean
}

/**
 * Generic empty state component for empty lists and no-data scenarios.
 */
export const EmptyState: React.FC<EmptyStateProps> = ({
    icon,
    title,
    description,
    action,
    className,
    compact = false,
}) => (
    <div
        className={cn(
            'relative flex flex-col items-center justify-center overflow-hidden rounded-[1.25rem] border border-dashed border-white/10 px-6 text-center',
            compact ? 'py-8' : 'py-12',
            className
        )}
    >
        <div className="pointer-events-none absolute left-1/2 top-0 h-32 w-48 -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand-500/15 blur-3xl" />

        {icon ? (
            <div className="relative mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-white/[0.06] text-gray-400">
                {icon}
            </div>
        ) : null}
        <h3 className="relative text-base font-semibold text-white">{title}</h3>
        {description ? (
            <p className="relative mt-1.5 max-w-xs text-sm leading-relaxed text-gray-400">{description}</p>
        ) : null}
        {action ? <div className="relative mt-5">{action}</div> : null}
    </div>
)
