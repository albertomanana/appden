import React from 'react'
import { cn } from '@lib/utils'

interface SkeletonProps {
    className?: string
}

/**
 * Base skeleton pulse block for loading states.
 */
export const Skeleton: React.FC<SkeletonProps> = ({ className }) => (
    <div className={cn('animate-pulse rounded-xl bg-white/[0.06]', className)} aria-hidden="true" />
)

/** Skeleton for a song row */
export const SongCardSkeleton: React.FC = () => (
    <div className="flex items-center gap-3 py-1.5 pl-1.5">
        <Skeleton className="h-12 w-12 flex-shrink-0 rounded-xl" />
        <div className="flex-1 space-y-2">
            <Skeleton className="h-3.5 w-2/3 rounded" />
            <Skeleton className="h-3 w-1/3 rounded" />
        </div>
        <Skeleton className="mr-3 h-5 w-5 rounded-full" />
    </div>
)

/** Skeleton for a playlist card */
export const PlaylistCardSkeleton: React.FC = () => (
    <div className="space-y-2.5">
        <Skeleton className="aspect-square w-full rounded-2xl" />
        <Skeleton className="h-3.5 w-3/4 rounded" />
        <Skeleton className="h-3 w-1/2 rounded" />
    </div>
)

/** Skeleton for a debt card */
export const DebtCardSkeleton: React.FC = () => (
    <div className="card space-y-3 p-4">
        <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="flex-1 space-y-2">
                <Skeleton className="h-3.5 w-2/3 rounded" />
                <Skeleton className="h-3 w-1/3 rounded" />
            </div>
            <Skeleton className="h-6 w-16 rounded-full" />
        </div>
        <Skeleton className="h-1.5 w-full rounded-full" />
    </div>
)

/** Skeleton for profile header */
export const ProfileSkeleton: React.FC = () => (
    <div className="flex flex-col items-center gap-4 p-6">
        <Skeleton className="h-24 w-24 rounded-full" />
        <div className="w-full max-w-xs space-y-2 text-center">
            <Skeleton className="mx-auto h-5 w-40 rounded" />
            <Skeleton className="mx-auto h-4 w-24 rounded" />
        </div>
    </div>
)

/** Generic list skeleton */
export const ListSkeleton: React.FC<{ count?: number; item?: React.ReactNode }> = ({ count = 4, item }) => (
    <div className="space-y-2" role="status" aria-label="Cargando">
        {Array.from({ length: count }).map((_, i) => (
            <React.Fragment key={i}>{item ?? <SongCardSkeleton />}</React.Fragment>
        ))}
    </div>
)

/** Alias for ListSkeleton - easy generic loading state */
export const LoadingSkeleton: React.FC<{ count?: number }> = ({ count = 4 }) => <ListSkeleton count={count} />
