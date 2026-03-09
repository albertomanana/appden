import React from 'react'
import { User } from 'lucide-react'
import { cn, getInitials } from '@lib/utils'

interface AvatarProps {
    src?: string | null
    name?: string | null
    size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
    className?: string
}

const sizeClasses = {
    xs: 'w-6 h-6 text-[10px]',
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-14 h-14 text-lg',
    xl: 'w-24 h-24 text-2xl',
}

/**
 * Avatar component: shows image if available, else initials, else generic icon.
 */
export const Avatar: React.FC<AvatarProps> = ({ src, name, size = 'md', className }) => {
    const sizeClass = sizeClasses[size]

    if (src) {
        return (
            <img
                src={src}
                alt={name ?? 'Avatar'}
                className={cn(
                    'rounded-full object-cover flex-shrink-0 border border-surface-500',
                    sizeClass,
                    className
                )}
                onError={(e) => {
                    // Fallback to initials on load error
                    e.currentTarget.style.display = 'none'
                }}
            />
        )
    }

    if (name) {
        return (
            <div
                className={cn(
                    'rounded-full flex items-center justify-center font-semibold flex-shrink-0',
                    'bg-gradient-to-br from-brand-600 to-accent-purple text-white',
                    sizeClass,
                    className
                )}
                aria-label={name}
            >
                {getInitials(name)}
            </div>
        )
    }

    return (
        <div
            className={cn(
                'rounded-full flex items-center justify-center flex-shrink-0',
                'bg-surface-600 border border-surface-500 text-gray-500',
                sizeClass,
                className
            )}
        >
            <User className="w-1/2 h-1/2" />
        </div>
    )
}
