import React from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Activity, CheckCircle2, Heart, MessageCircle, Music2, PencilLine, Sparkles, UploadCloud } from 'lucide-react'
import { Avatar } from '@components/common/Avatar'
import { Chip } from '@components/ui/Chip'
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
            <section className="card p-5 space-y-2">
                <Skeleton className="h-16" />
                <Skeleton className="h-16" />
                <Skeleton className="h-16" />
            </section>
        )
    }

    const events = data ?? []
    const featuredEvent = events[0] ?? null
    const timelineEvents = featuredEvent ? events.slice(1) : []

    return (
        <section className="card skyline-border overflow-hidden p-5 space-y-4">
            <div className="flex items-center justify-between gap-3">
                <div>
                    <p className="page-kicker">Group Pulse</p>
                    <h2 className="mt-2 text-2xl font-headline font-extrabold text-white">Feed del grupo</h2>
                </div>
                <Chip variant="active">
                    <Activity className="w-3 h-3" />
                    Live
                </Chip>
            </div>

            {events.length === 0 ? (
                <div className="rounded-[1.6rem] bg-[#201f1f] p-6 text-center">
                    <p className="text-sm font-medium text-white">Aun no hay actividad reciente.</p>
                    <p className="mt-2 text-sm text-gray-400">Sube una cancion o deja un comentario para empezar a mover el feed.</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {featuredEvent ? (
                        <motion.article
                            initial={{ opacity: 0, y: 16 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.28, ease: 'easeOut' }}
                            className="overflow-hidden rounded-[1.7rem] border border-white/6 bg-[linear-gradient(180deg,rgba(28,28,30,0.98)_0%,rgba(18,18,18,0.98)_100%)]"
                        >
                            <div className="flex items-start gap-4 p-4">
                                <Avatar src={featuredEvent.actor?.avatar_url} name={featuredEvent.actor?.display_name} size="md" />

                                <div className="min-w-0 flex-1">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <span className="text-sm font-semibold text-white">{featuredEvent.actor?.display_name ?? 'Alguien'}</span>
                                        <Chip variant="default">{getActivityBadge(featuredEvent.action_type)}</Chip>
                                    </div>
                                    <p className="mt-2 text-sm leading-relaxed text-gray-200">{buildActivityLabel(featuredEvent)}</p>
                                    <p className="mt-3 text-[11px] uppercase tracking-[0.18em] text-gray-500">{formatRelative(featuredEvent.created_at)}</p>
                                </div>

                                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-white/6 text-brand-200">
                                    {buildActivityIcon(featuredEvent.action_type)}
                                </span>
                            </div>

                            {featuredEvent.song ? (
                                <div className="border-t border-white/5 bg-white/[0.03] px-4 py-3">
                                    <div className="flex items-center gap-3">
                                        <div className="h-14 w-14 overflow-hidden rounded-[1rem] bg-white/5">
                                            {featuredEvent.song.cover_url ? (
                                                <img src={featuredEvent.song.cover_url} alt={featuredEvent.song.title} className="h-full w-full object-cover" />
                                            ) : (
                                                <div className="grid h-full w-full place-items-center text-gray-500">
                                                    <Music2 className="h-5 w-5" />
                                                </div>
                                            )}
                                        </div>
                                        <div className="min-w-0">
                                            <p className="truncate text-sm font-semibold text-white">{featuredEvent.song.title}</p>
                                            <p className="truncate text-xs uppercase tracking-[0.18em] text-gray-500">{featuredEvent.song.artist_name}</p>
                                        </div>
                                    </div>
                                </div>
                            ) : null}
                        </motion.article>
                    ) : null}

                    {timelineEvents.length > 0 ? (
                        <div className="max-h-[420px] space-y-3 overflow-y-auto pr-1 no-scrollbar">
                            {timelineEvents.map((event, index) => (
                                <motion.article
                                    key={event.id}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.22, delay: index * 0.02, ease: 'easeOut' }}
                                    className="relative overflow-hidden rounded-[1.35rem] border border-white/5 bg-[#181818] p-3.5"
                                >
                                    <div className="flex items-start gap-3">
                                        <div className="relative flex shrink-0 flex-col items-center">
                                            <Avatar src={event.actor?.avatar_url} name={event.actor?.display_name} size="sm" />
                                            {index !== timelineEvents.length - 1 ? (
                                                <span className="mt-2 h-10 w-px bg-gradient-to-b from-brand-400/35 to-transparent" />
                                            ) : null}
                                        </div>

                                        <div className="min-w-0 flex-1">
                                            <div className="flex flex-wrap items-center justify-between gap-2">
                                                <div className="min-w-0">
                                                    <p className="text-sm leading-relaxed text-gray-100">
                                                        <span className="font-medium text-white">{event.actor?.display_name ?? 'Alguien'}</span>{' '}
                                                        {buildActivityLabel(event)}
                                                    </p>
                                                    <p className="mt-1 text-[11px] uppercase tracking-[0.18em] text-gray-500">{formatRelative(event.created_at)}</p>
                                                </div>
                                                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-2xl bg-white/5 text-brand-200">
                                                    {buildActivityIcon(event.action_type)}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </motion.article>
                            ))}
                        </div>
                    ) : null}
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

function getActivityBadge(action: GroupActivity['action_type']): string {
    switch (action) {
        case 'song_uploaded':
            return 'Upload'
        case 'song_liked':
            return 'Like'
        case 'song_reacted':
            return 'Reaction'
        case 'song_commented':
            return 'Comment'
        case 'lyrics_updated':
            return 'Lyrics'
        case 'lyrics_proposed':
            return 'Draft'
        case 'lyrics_verified':
            return 'Verified'
        default:
            return 'Activity'
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
