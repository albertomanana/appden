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
            'flex flex-col items-center justify-center text-center py-16 px-6',
            className
        )}
    >
        {icon && (
            <div className="w-16 h-16 rounded-2xl bg-surface-600 border border-surface-500 flex items-center justify-center mb-5 text-gray-500">
                {icon}
            </div>
        )}
        <h3 className="text-base font-semibold text-white mb-2">{title}</h3>
        {description && (
            <p className="text-sm text-gray-400 max-w-xs leading-relaxed mb-6">
                {description}
            </p>
        )}
        {action && action}
    </div>
)
