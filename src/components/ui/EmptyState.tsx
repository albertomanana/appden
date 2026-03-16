import React from 'react'
import { cn } from '@lib/utils'

interface EmptyStateProps {
    icon?: React.ReactNode
    title: string
    description?: string
    action?: React.ReactNode
    className?: string
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
}) => (
    <div
        className={cn(
            'relative overflow-hidden flex flex-col items-center justify-center text-center py-16 px-6 rounded-2xl border border-surface-500 bg-surface-700/60',
            className
        )}
    >
        <div className="absolute -top-12 -right-10 w-32 h-32 rounded-full bg-brand-500/20 blur-2xl pointer-events-none" />
        <div className="absolute -bottom-14 -left-10 w-32 h-32 rounded-full bg-cyan-500/15 blur-2xl pointer-events-none" />

        {icon && (
            <div className="relative w-16 h-16 rounded-2xl bg-surface-600 border border-surface-500 flex items-center justify-center mb-5 text-gray-500 shadow-card">
                {icon}
            </div>
        )}
        <h3 className="relative text-base font-semibold text-white mb-2">{title}</h3>
        {description && (
            <p className="relative text-sm text-gray-400 max-w-xs leading-relaxed mb-6">
                {description}
            </p>
        )}
        {action && <div className="relative">{action}</div>}
    </div>
)
