import React from 'react'
import { cn } from '@lib/utils'

type ChipVariant = 'default' | 'active' | 'muted'

interface ChipProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: ChipVariant
}

const chipClass: Record<ChipVariant, string> = {
    default: 'badge bg-white/6 text-gray-300 border border-white/10',
    active: 'badge-brand',
    muted: 'badge bg-surface-700 text-gray-400 border border-white/5',
}

export const Chip = React.forwardRef<HTMLButtonElement, ChipProps>(
    ({ variant = 'default', className, ...props }, ref) => (
        <button
            ref={ref}
            className={cn(chipClass[variant], className)}
            {...props}
        />
    )
)

Chip.displayName = 'Chip'
