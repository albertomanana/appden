import React from 'react'
import { cn } from '@lib/utils'

interface SkeletonProps {
    className?: string
}

/**
 * Base skeleton pulse block for loading states.
 */
export const Skeleton: React.FC<SkeletonProps> = ({ className }) => (
    <div
        className={cn('animate-pulse bg-surface-600 rounded-xl', className)}
        aria-hidden="true"
    />
)

/** Skeleton for a song card */
export const SongCardSkeleton: React.FC = () => (
    <div className="card p-4 flex items-center gap-4">
        <Skeleton className="w-14 h-14 rounded-xl flex-shrink-0" />
        <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-3/4 rounded" />
            <Skeleton className="h-3 w-1/2 rounded" />
        </div>
        <Skeleton className="w-8 h-8 rounded-full" />
    </div>
)

/** Skeleton for a playlist card */
export const PlaylistCardSkeleton: React.FC = () => (
    <div className="card p-4 space-y-3">
        <Skeleton className="w-full aspect-square rounded-xl" />
        <Skeleton className="h-4 w-3/4 rounded" />
        <Skeleton className="h-3 w-1/2 rounded" />
    </div>
)

/** Skeleton for a debt card */
export const DebtCardSkeleton: React.FC = () => (
    <div className="card p-5 space-y-3">
        <div className="flex items-center gap-3">
            <Skeleton className="w-10 h-10 rounded-full" />
            <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-2/3 rounded" />
                <Skeleton className="h-3 w-1/3 rounded" />
            </div>
            <Skeleton className="w-16 h-6 rounded-full" />
        </div>
        <Skeleton className="h-2 w-full rounded-full" />
    </div>
)

/** Skeleton for profile header */
export const ProfileSkeleton: React.FC = () => (
    <div className="flex flex-col items-center gap-4 p-6">
        <Skeleton className="w-24 h-24 rounded-full" />
        <div className="space-y-2 text-center w-full max-w-xs">
            <Skeleton className="h-5 w-40 mx-auto rounded" />
            <Skeleton className="h-4 w-24 mx-auto rounded" />
            <Skeleton className="h-3 w-56 mx-auto rounded" />
        </div>
    </div>
)

/** Generic list skeleton */
export const ListSkeleton: React.FC<{ count?: number; item?: React.ReactNode }> = ({
    count = 4,
    item,
}) => (
    <div className="space-y-3">
        {Array.from({ length: count }).map((_, i) => (
            <React.Fragment key={i}>{item ?? <SongCardSkeleton />}</React.Fragment>
        ))}
    </div>
)

/** Alias for ListSkeleton - easy generic loading state */
export const LoadingSkeleton: React.FC<{ count?: number }> = ({ count = 4 }) => (
    <ListSkeleton count={count} />
)
