import React from 'react'
import { User } from 'lucide-react'
import { STORAGE_BUCKETS, getStorageUrl } from '@lib/supabase/client'
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

const gradients = [
    'from-brand-400 to-brand-700',
    'from-violet-400 to-indigo-600',
    'from-pink-400 to-fuchsia-600',
    'from-amber-300 to-orange-500',
    'from-emerald-300 to-teal-600',
    'from-cyan-300 to-sky-600',
]

function pickGradient(name: string): string {
    let hash = 0
    for (let i = 0; i < name.length; i += 1) hash = (hash * 31 + name.charCodeAt(i)) | 0
    return gradients[Math.abs(hash) % gradients.length]
}

/**
 * Avatar component: shows image if available, else initials, else generic icon.
 * `src` may be a stable Storage path (signed on read) or a legacy full URL.
 */
export const Avatar: React.FC<AvatarProps> = ({ src, name, size = 'md', className }) => {
    const sizeClass = sizeClasses[size]
    const [resolvedSrc, setResolvedSrc] = React.useState<string | null>(null)
    const [failed, setFailed] = React.useState(false)

    React.useEffect(() => {
        let cancelled = false
        setFailed(false)

        if (!src) {
            setResolvedSrc(null)
            return () => {
                cancelled = true
            }
        }

        void getStorageUrl(STORAGE_BUCKETS.AVATARS, src)
            .then((url) => {
                if (!cancelled) setResolvedSrc(url)
            })
            .catch((error) => {
                if (!cancelled) {
                    console.error('[Avatar] Failed to resolve avatar URL:', error)
                    setResolvedSrc(null)
                }
            })

        return () => {
            cancelled = true
        }
    }, [src])

    if (resolvedSrc && !failed) {
        return (
            <img
                src={resolvedSrc}
                alt={name ?? 'Avatar'}
                loading="lazy"
                decoding="async"
                className={cn('flex-shrink-0 rounded-full border border-white/10 object-cover', sizeClass, className)}
                onError={() => setFailed(true)}
            />
        )
    }

    if (name) {
        return (
            <div
                className={cn(
                    'flex flex-shrink-0 select-none items-center justify-center rounded-full bg-gradient-to-br font-semibold text-white',
                    pickGradient(name),
                    sizeClass,
                    className
                )}
                role="img"
                aria-label={name}
            >
                {getInitials(name)}
            </div>
        )
    }

    return (
        <div
            className={cn(
                'flex flex-shrink-0 items-center justify-center rounded-full border border-white/10 bg-surface-700 text-gray-500',
                sizeClass,
                className
            )}
        >
            <User className="h-1/2 w-1/2" />
        </div>
    )
}
