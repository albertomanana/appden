import React from 'react'
import { useQuery } from '@tanstack/react-query'
import {
    Activity,
    CheckCircle2,
    Heart,
    MessageCircle,
    Music2,
    PencilLine,
    Sparkles,
    UploadCloud,
} from 'lucide-react'
import { Avatar } from '@components/common/Avatar'
import { Skeleton } from '@components/ui/LoadingSkeleton'
import { formatRelative } from '@lib/utils'
import { groupActivityService } from '@features/social/services/activity-feed.service'
import type { GroupActivity } from '@/types'

interface GroupActivityFeedProps {
    groupId: string
}

export const GroupActivityFeed: React.FC<GroupActivityFeedProps> = ({ groupId }) => {
    const { data, isLoading } = useQuery({
        queryKey: ['group-activity', groupId],
        queryFn: () => groupActivityService.list(groupId, 30),
        enabled: !!groupId,
        staleTime: 15_000,
    })

    if (isLoading) {
        return (
            <section className="card p-4 space-y-2">
                <Skeleton className="h-16" />
                <Skeleton className="h-16" />
                <Skeleton className="h-16" />
            </section>
        )
    }

    const events = data ?? []

    return (
        <section className="card p-4 space-y-3">
            <div className="flex items-center justify-between">
                <h2 className="text-base font-semibold text-white">Feed del grupo</h2>
                <Activity className="w-4 h-4 text-gray-400" />
            </div>

            {events.length === 0 ? (
                <div className="relative overflow-hidden rounded-2xl border border-dashed border-surface-400 p-5 text-center">
                    <div className="absolute -top-8 -right-10 w-28 h-28 rounded-full bg-brand-500/20 blur-2xl" />
                    <div className="absolute -bottom-8 -left-10 w-28 h-28 rounded-full bg-cyan-500/20 blur-2xl" />
                    <p className="relative text-sm text-gray-300">Aun no hay actividad reciente en el grupo.</p>
                </div>
            ) : (
                <div className="space-y-2.5 max-h-[360px] overflow-y-auto no-scrollbar pr-1">
                    {events.map((event) => (
                        <article key={event.id} className="rounded-xl border border-surface-500 bg-surface-700/50 p-3">
                            <div className="flex items-start gap-2">
                                <Avatar src={event.actor?.avatar_url} name={event.actor?.display_name} size="sm" />
                                <div className="min-w-0 flex-1">
                                    <p className="text-sm text-gray-100 leading-relaxed">
                                        <span className="font-medium text-white">{event.actor?.display_name ?? 'Alguien'}</span>{' '}
                                        {buildActivityLabel(event)}
                                    </p>
                                    <p className="text-[11px] text-gray-500 mt-1">{formatRelative(event.created_at)}</p>
                                </div>
                                <span className="text-brand-200">{buildActivityIcon(event.action_type)}</span>
                            </div>
                        </article>
                    ))}
                </div>
            )}
        </section>
    )
}

function buildActivityLabel(event: GroupActivity): string {
    const songLabel = event.song ? `"${event.song.title}"` : 'una cancion'

    switch (event.action_type) {
        case 'song_uploaded':
            return `subio ${songLabel}.`
        case 'song_liked':
            return `dejo un like en ${songLabel}.`
        case 'song_reacted':
            return `reacciono en ${songLabel}.`
        case 'song_commented':
            return `comento en ${songLabel}.`
        case 'lyrics_updated':
            return `actualizo la letra de ${songLabel}.`
        case 'lyrics_proposed':
            return `propuso cambios de letra en ${songLabel}.`
        case 'lyrics_verified':
            return `verifico la letra de ${songLabel}.`
        default:
            return 'realizo una accion.'
    }
}

function buildActivityIcon(action: GroupActivity['action_type']): React.ReactNode {
    switch (action) {
        case 'song_uploaded':
            return <UploadCloud className="w-4 h-4" />
        case 'song_liked':
            return <Heart className="w-4 h-4" />
        case 'song_reacted':
            return <Sparkles className="w-4 h-4" />
        case 'song_commented':
            return <MessageCircle className="w-4 h-4" />
        case 'lyrics_updated':
            return <PencilLine className="w-4 h-4" />
        case 'lyrics_proposed':
            return <Sparkles className="w-4 h-4" />
        case 'lyrics_verified':
            return <CheckCircle2 className="w-4 h-4" />
        default:
            return <Music2 className="w-4 h-4" />
    }
}

