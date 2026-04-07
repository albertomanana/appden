import React from 'react'
import { cn } from '@lib/utils'

type CardTone = 'default' | 'lowest' | 'glass'

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
    tone?: CardTone
}

const toneClass: Record<CardTone, string> = {
    default: 'card',
    lowest: 'card surface-lowest',
    glass: 'card glass',
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
    ({ tone = 'default', className, ...props }, ref) => (
        <div
            ref={ref}
            className={cn(toneClass[tone], className)}
            {...props}
        />
    )
)

Card.displayName = 'Card'
