import React, { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useInfiniteQuery, useMutation, useQueryClient, type InfiniteData } from '@tanstack/react-query'
import { Copy, Globe2, Heart, MessageCircle, MoreHorizontal, Trash2, Users } from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'
import { Avatar } from '@components/common/Avatar'
import { SocialTabs } from '@components/social/SocialTabs'
import { ActionSheet } from '@components/ui/ActionSheet'
import { ConfirmDialog } from '@components/ui/ConfirmDialog'
import { EmptyState } from '@components/ui/EmptyState'
import { ErrorNotice } from '@components/ui/ErrorNotice'
import { PageHeader } from '@components/ui/PageHeader'
import { Skeleton } from '@components/ui/LoadingSkeleton'
import { useToast } from '@components/ui/Toast'
import { useAuth } from '@hooks/useAuth'
import { useActiveGroup } from '@hooks/useActiveGroup'
import { cn, formatRelative } from '@lib/utils'
import { POST_MAX_LENGTH, postsService } from '@services/posts.service'
import type { Post } from '@/types'

const PAGE_SIZE = 20
const feedKey = ['posts', 'feed-infinite'] as const

type FeedData = InfiniteData<Post[], string | undefined>

const SocialPage: React.FC = () => {
    const { userId, profile } = useAuth()
    const { activeGroup } = useActiveGroup()
    const queryClient = useQueryClient()
    const toast = useToast()
    const [searchParams] = useSearchParams()
    const textareaRef = useRef<HTMLTextAreaElement | null>(null)
    const [content, setContent] = useState('')
    const [audience, setAudience] = useState<'public' | 'group'>('public')
    const [menuPost, setMenuPost] = useState<Post | null>(null)
    const [deletingPost, setDeletingPost] = useState<Post | null>(null)

    useEffect(() => {
        if (searchParams.get('publicar') === '1') textareaRef.current?.focus()
    }, [searchParams])

    const feed = useInfiniteQuery({
        queryKey: feedKey,
        queryFn: ({ pageParam }) => postsService.listFeed({ limit: PAGE_SIZE, before: pageParam, viewerId: userId! }),
        initialPageParam: undefined as string | undefined,
        getNextPageParam: (lastPage) => (lastPage.length < PAGE_SIZE ? undefined : lastPage[lastPage.length - 1]?.created_at),
        enabled: !!userId,
    })

    const posts = feed.data?.pages.flat() ?? []

    const patchPost = (postId: string, patch: (post: Post) => Post | null) => {
        queryClient.setQueryData<FeedData>(feedKey, (data) =>
            data
                ? {
                      ...data,
                      pages: data.pages.map((page) =>
                          page.map((post) => (post.id === postId ? patch(post) : post)).filter((post): post is Post => post !== null)
                      ),
                  }
                : data
        )
    }

    const createPost = useMutation({
        mutationFn: () =>
            postsService.createPost(userId!, content, audience === 'group' ? 'group' : 'public', audience === 'group' ? activeGroup?.id : null),
        onSuccess: (post) => {
            setContent('')
            queryClient.setQueryData<FeedData>(feedKey, (data) =>
                data ? { ...data, pages: [[post, ...(data.pages[0] ?? [])], ...data.pages.slice(1)] } : data
            )
            void queryClient.invalidateQueries({ queryKey: ['posts', 'feed'] })
            toast.success('Publicado')
        },
        onError: (error) => toast.error('No se pudo publicar', error instanceof Error ? error.message : undefined),
    })

    const toggleLike = useMutation({
        mutationFn: async (post: Post) => {
            if (post.liked_by_me) await postsService.unlikePost(post.id, userId!)
            else await postsService.likePost(post.id, userId!)
        },
        onMutate: (post) => {
            patchPost(post.id, (current) => ({
                ...current,
                liked_by_me: !post.liked_by_me,
                like_count: Math.max(0, (current.like_count ?? 0) + (post.liked_by_me ? -1 : 1)),
            }))
        },
        onError: (_error, post) => {
            patchPost(post.id, (current) => ({ ...current, liked_by_me: post.liked_by_me, like_count: post.like_count }))
            toast.error('No se pudo actualizar el me gusta')
        },
    })

    const deletePost = useMutation({
        mutationFn: (post: Post) => postsService.deletePost(post.id),
        onSuccess: (_data, post) => {
            patchPost(post.id, () => null)
            void queryClient.invalidateQueries({ queryKey: ['posts', 'feed'] })
            setDeletingPost(null)
            toast.success('Publicación eliminada')
        },
        onError: () => toast.error('No se pudo eliminar la publicación'),
    })

    const remaining = POST_MAX_LENGTH - content.length
    const canPublish = content.trim().length > 0 && remaining >= 0 && !createPost.isPending

    return (
        <div className="page-shell animate-fade-in">
            <PageHeader title="Social" />
            <SocialTabs active="feed" />

            <section className="card p-4">
                <div className="flex gap-3">
                    <Avatar src={profile?.avatar_url} name={profile?.display_name} size="md" />
                    <div className="min-w-0 flex-1">
                        <textarea
                            ref={textareaRef}
                            value={content}
                            onChange={(event) => setContent(event.target.value)}
                            onKeyDown={(event) => {
                                if ((event.metaKey || event.ctrlKey) && event.key === 'Enter' && canPublish) createPost.mutate()
                            }}
                            placeholder="¿Qué quieres contarle a tu gente?"
                            rows={content.length > 60 ? 4 : 2}
                            maxLength={POST_MAX_LENGTH + 20}
                            className="w-full resize-none bg-transparent pt-2 text-base text-white placeholder-gray-500 outline-none"
                            aria-label="Escribe una publicación"
                        />
                    </div>
                </div>
                <div className="mt-2 flex items-center gap-2 border-t border-white/[0.06] pt-3">
                    <div className="flex min-w-0 flex-1 gap-1.5 overflow-x-auto no-scrollbar">
                        <AudienceChip active={audience === 'public'} onClick={() => setAudience('public')} icon={Globe2} label="Todos" />
                        {activeGroup ? (
                            <AudienceChip active={audience === 'group'} onClick={() => setAudience('group')} icon={Users} label={activeGroup.name} />
                        ) : null}
                    </div>
                    {remaining < 60 ? (
                        <span className={cn('shrink-0 text-xs tabular', remaining < 0 ? 'text-red-300' : remaining < 20 ? 'text-amber-300' : 'text-gray-500')}>
                            {remaining}
                        </span>
                    ) : null}
                    <button type="button" onClick={() => createPost.mutate()} disabled={!canPublish} className="btn-primary !min-h-[2.5rem] !px-4">
                        {createPost.isPending ? 'Publicando…' : 'Publicar'}
                    </button>
                </div>
            </section>

            {feed.isLoading ? (
                <div className="space-y-3">
                    {Array.from({ length: 3 }).map((_, i) => (
                        <div key={i} className="card space-y-3 p-4">
                            <div className="flex items-center gap-3">
                                <Skeleton className="h-10 w-10 rounded-full" />
                                <div className="flex-1 space-y-2">
                                    <Skeleton className="h-3.5 w-1/3" />
                                    <Skeleton className="h-3 w-1/4" />
                                </div>
                            </div>
                            <Skeleton className="h-4 w-full" />
                            <Skeleton className="h-4 w-2/3" />
                        </div>
                    ))}
                </div>
            ) : feed.error ? (
                <ErrorNotice title="No pudimos cargar el feed" error={feed.error} onRetry={() => void feed.refetch()} />
            ) : posts.length === 0 ? (
                <EmptyState
                    icon={<MessageCircle className="h-6 w-6" />}
                    title="Todavía no hay publicaciones"
                    description="Escribe la primera: un plan, una canción que te ha flipado o un recordatorio para el grupo."
                />
            ) : (
                <div className="space-y-3">
                    <AnimatePresence initial={false}>
                        {posts.map((post) => (
                            <PostItem
                                key={post.id}
                                post={post}
                                onLike={() => toggleLike.mutate(post)}
                                onMenu={() => setMenuPost(post)}
                            />
                        ))}
                    </AnimatePresence>
                    {feed.hasNextPage ? (
                        <button
                            type="button"
                            onClick={() => void feed.fetchNextPage()}
                            disabled={feed.isFetchingNextPage}
                            className="btn-secondary w-full"
                        >
                            {feed.isFetchingNextPage ? 'Cargando…' : 'Ver publicaciones anteriores'}
                        </button>
                    ) : null}
                </div>
            )}

            <ActionSheet
                open={!!menuPost}
                onClose={() => setMenuPost(null)}
                items={[
                    {
                        label: 'Copiar texto',
                        icon: Copy,
                        onSelect: () => {
                            if (!menuPost) return
                            void navigator.clipboard.writeText(menuPost.content).then(() => toast.success('Texto copiado'))
                        },
                    },
                    {
                        label: 'Eliminar publicación',
                        icon: Trash2,
                        tone: 'danger',
                        hidden: menuPost?.user_id !== userId,
                        onSelect: () => setDeletingPost(menuPost),
                    },
                ]}
            />

            <ConfirmDialog
                isOpen={!!deletingPost}
                title="¿Eliminar publicación?"
                description="Desaparecerá del feed de todo el mundo."
                confirmLabel="Eliminar"
                isLoading={deletePost.isPending}
                onConfirm={() => deletingPost && deletePost.mutate(deletingPost)}
                onCancel={() => setDeletingPost(null)}
            />
        </div>
    )
}

const AudienceChip: React.FC<{
    active: boolean
    onClick: () => void
    icon: React.ComponentType<{ className?: string }>
    label: string
}> = ({ active, onClick, icon: Icon, label }) => (
    <button
        type="button"
        onClick={onClick}
        aria-pressed={active}
        className={cn(
            'inline-flex min-h-[2.25rem] max-w-[11rem] shrink-0 items-center gap-1.5 rounded-full border px-3 text-xs font-semibold transition-colors',
            active ? 'border-brand-400/40 bg-brand-400/15 text-brand-200' : 'border-white/10 text-gray-400'
        )}
    >
        <Icon className="h-3.5 w-3.5 shrink-0" />
        <span className="truncate">{label}</span>
    </button>
)

const PostItem: React.FC<{ post: Post; onLike: () => void; onMenu: () => void }> = ({ post, onLike, onMenu }) => {
    const [burst, setBurst] = useState(false)

    const likeFromDoubleTap = () => {
        setBurst(true)
        window.setTimeout(() => setBurst(false), 650)
        if (!post.liked_by_me) onLike()
    }

    return (
        <motion.article
            layout
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, height: 0, marginTop: 0 }}
            className="card relative overflow-hidden p-4"
        >
            <header className="flex items-start gap-3">
                <Avatar src={post.author?.avatar_url} name={post.author?.display_name} size="md" />
                <div className="min-w-0 flex-1">
                    <p className="truncate text-[15px] font-semibold text-white">{post.author?.display_name ?? 'Usuario'}</p>
                    <p className="flex items-center gap-1.5 truncate text-xs text-gray-500">
                        {post.author?.username ? <span className="truncate">@{post.author.username}</span> : null}
                        {post.author?.username ? <span>·</span> : null}
                        <time dateTime={post.created_at} className="shrink-0">{formatRelative(post.created_at)}</time>
                        {post.visibility === 'group' ? (
                            <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-white/[0.06] px-2 py-0.5 text-[11px] text-gray-400">
                                <Users className="h-3 w-3" />
                                {post.group?.name ?? 'Grupo'}
                            </span>
                        ) : null}
                    </p>
                </div>
                <button type="button" onClick={onMenu} className="icon-btn -mr-2 -mt-2 text-gray-500" aria-label="Opciones de la publicación">
                    <MoreHorizontal className="h-5 w-5" />
                </button>
            </header>

            <p onDoubleClick={likeFromDoubleTap} className="mt-3 whitespace-pre-wrap break-words text-[15px] leading-relaxed text-gray-100">
                {post.content}
            </p>

            <AnimatePresence>
                {burst ? (
                    <motion.span
                        initial={{ opacity: 0, scale: 0.4 }}
                        animate={{ opacity: 1, scale: 1.1 }}
                        exit={{ opacity: 0, scale: 1.4 }}
                        transition={{ duration: 0.35 }}
                        className="pointer-events-none absolute inset-0 grid place-items-center"
                    >
                        <Heart className="h-20 w-20 fill-pink-500 text-pink-500 drop-shadow-[0_6px_20px_rgba(236,72,153,0.5)]" />
                    </motion.span>
                ) : null}
            </AnimatePresence>

            <footer className="mt-2 flex items-center">
                <button
                    type="button"
                    onClick={onLike}
                    aria-pressed={!!post.liked_by_me}
                    aria-label={post.liked_by_me ? 'Quitar me gusta' : 'Me gusta'}
                    className={cn(
                        '-ml-2 inline-flex min-h-[2.75rem] items-center gap-1.5 rounded-full px-2.5 text-sm font-medium transition-colors active:scale-95',
                        post.liked_by_me ? 'text-pink-400' : 'text-gray-400'
                    )}
                >
                    <Heart className={cn('h-5 w-5 transition-transform', post.liked_by_me && 'scale-110 fill-current')} />
                    <span className="tabular">{post.like_count ? post.like_count : 'Me gusta'}</span>
                </button>
            </footer>
        </motion.article>
    )
}

export default SocialPage
