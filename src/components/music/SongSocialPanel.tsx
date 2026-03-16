import React, { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Flame, Heart, MessageCircle, Reply, Send, Trash2 } from 'lucide-react'
import { Avatar } from '@components/common/Avatar'
import { useToast } from '@components/ui/Toast'
import { usePlayerStore } from '@app/store/player.store'
import { formatRelative } from '@lib/utils'
import { groupsService } from '@services/groups.service'
import { songSocialService } from '@services/song-social.service'
import type { GroupMember, Song, SongComment, SongReactionType } from '@/types'

interface SongSocialPanelProps {
    song: Song
    userId: string
    groupId?: string | null
}

type MentionOption = {
    id: string
    label: string
    token: string
}

const REACTIONS: Array<{ type: SongReactionType; label: string; emoji: string }> = [
    { type: 'fire', label: 'Fuego', emoji: '??' },
    { type: 'heart', label: 'Corazon', emoji: '??' },
    { type: 'headphones', label: 'Music', emoji: '??' },
]

export const SongSocialPanel: React.FC<SongSocialPanelProps> = ({ song, userId, groupId }) => {
    const { success, error: toastError } = useToast()
    const queryClient = useQueryClient()
    const currentSong = usePlayerStore((state) => state.currentSong)
    const currentTime = usePlayerStore((state) => state.currentTime)
    const setQueue = usePlayerStore((state) => state.setQueue)
    const setCurrentTime = usePlayerStore((state) => state.setCurrentTime)
    const setPlaying = usePlayerStore((state) => state.setPlaying)

    const [commentDraft, setCommentDraft] = useState('')
    const [replyingTo, setReplyingTo] = useState<string | null>(null)
    const [replyDraft, setReplyDraft] = useState('')

    const { data: socialData, isLoading } = useQuery({
        queryKey: ['song-social', song.id, userId],
        queryFn: () => songSocialService.getSongSocial(song.id, userId),
        enabled: !!song.id && !!userId,
    })

    const { data: members } = useQuery({
        queryKey: ['group-members', groupId],
        queryFn: () => groupsService.getGroupMembers(groupId!),
        enabled: !!groupId,
        staleTime: 60_000,
    })

    const refreshSocial = () => {
        void queryClient.invalidateQueries({ queryKey: ['song-social', song.id, userId] })
        void queryClient.invalidateQueries({ queryKey: ['song-social-player', song.id, userId] })
    }

    const toggleLikeMutation = useMutation({
        mutationFn: () => songSocialService.toggleLike(song.id, userId),
        onSuccess: refreshSocial,
        onError: () => toastError('Error', 'No se pudo actualizar el like.'),
    })

    const reactionMutation = useMutation({
        mutationFn: (reaction: SongReactionType | null) => songSocialService.setReaction(song.id, userId, reaction),
        onSuccess: refreshSocial,
        onError: () => toastError('Error', 'No se pudo actualizar la reaccion.'),
    })

    const addCommentMutation = useMutation({
        mutationFn: (payload: { body: string; parentId?: string | null }) =>
            songSocialService.addComment(song.id, userId, payload.body, payload.parentId),
        onSuccess: (_, payload) => {
            if (payload.parentId) {
                setReplyingTo(null)
                setReplyDraft('')
            } else {
                setCommentDraft('')
            }
            refreshSocial()
            success('Comentario publicado')
        },
        onError: (err) => {
            if (err instanceof Error && err.message === 'empty-comment') {
                toastError('Error', 'Escribe un comentario antes de enviarlo.')
                return
            }
            toastError('Error', 'No se pudo publicar el comentario.')
        },
    })

    const deleteCommentMutation = useMutation({
        mutationFn: (commentId: string) => songSocialService.deleteComment(commentId, userId),
        onSuccess: refreshSocial,
        onError: () => toastError('Error', 'No se pudo eliminar el comentario.'),
    })

    const commentLikeMutation = useMutation({
        mutationFn: (commentId: string) => songSocialService.toggleCommentLike(commentId, userId),
        onSuccess: refreshSocial,
        onError: () => toastError('Error', 'No se pudo actualizar el like del comentario.'),
    })

    const likesCount = socialData?.likesCount ?? 0
    const likedByMe = !!socialData?.likedByMe
    const reactionCounts = socialData?.reactionCounts ?? { fire: 0, heart: 0, headphones: 0 }
    const reactionByMe = socialData?.reactionByMe ?? null
    const comments = socialData?.comments ?? []

    const repliesByParent = useMemo(() => {
        const map = new Map<string, SongComment[]>()
        for (const comment of comments) {
            if (!comment.parent_id) continue
            const existing = map.get(comment.parent_id) ?? []
            existing.push(comment)
            map.set(comment.parent_id, existing)
        }
        return map
    }, [comments])

    const rootComments = useMemo(
        () => comments.filter((comment) => !comment.parent_id),
        [comments]
    )

    const memberMentions = useMemo(() => buildMentionOptions(members ?? []), [members])

    const mainMentionOptions = useMemo(
        () => filterMentionOptions(memberMentions, extractMentionQuery(commentDraft)),
        [commentDraft, memberMentions]
    )

    const replyMentionOptions = useMemo(
        () => filterMentionOptions(memberMentions, extractMentionQuery(replyDraft)),
        [replyDraft, memberMentions]
    )

    const liveTimestamp = formatTimestamp(currentSong?.id === song.id ? currentTime : 0)

    const insertCurrentTimestamp = (target: 'main' | 'reply') => {
        const token = `[${liveTimestamp}]`
        if (target === 'main') {
            setCommentDraft((prev) => `${prev.trimEnd()} ${token} `.trimStart())
            return
        }
        setReplyDraft((prev) => `${prev.trimEnd()} ${token} `.trimStart())
    }

    const jumpToTimestamp = (seconds: number) => {
        if (!Number.isFinite(seconds)) return

        if (currentSong?.id !== song.id) {
            setQueue([song], 0)
            window.setTimeout(() => {
                setCurrentTime(seconds)
                setPlaying(true)
            }, 180)
            return
        }

        setCurrentTime(seconds)
        setPlaying(true)
    }

    const submitMainComment = () => {
        const clean = commentDraft.trim()
        if (!clean) return
        addCommentMutation.mutate({ body: clean })
    }

    const submitReply = (parentId: string) => {
        const clean = replyDraft.trim()
        if (!clean) return
        addCommentMutation.mutate({ body: clean, parentId })
    }

    const renderCommentBody = (body: string) => {
        const tokens = body.split(/(\[\d{1,2}:\d{2}\]|\b\d{1,2}:\d{2}\b|@[A-Za-z0-9_.-]+)/g)
        return (
            <>
                {tokens.map((token, index) => {
                    const parsedTime = parseTimestampToken(token)
                    if (parsedTime != null) {
                        return (
                            <button
                                key={`${token}-${index}`}
                                type="button"
                                onClick={() => jumpToTimestamp(parsedTime)}
                                className="inline-flex rounded-md px-1.5 py-0.5 text-xs text-brand-200 bg-brand-500/20 border border-brand-400/40 mr-1"
                            >
                                {normalizeTimestampLabel(token)}
                            </button>
                        )
                    }

                    if (token.startsWith('@')) {
                        return (
                            <span key={`${token}-${index}`} className="text-brand-200 font-medium mr-1">
                                {token}
                            </span>
                        )
                    }

                    return <span key={`${token}-${index}`}>{token}</span>
                })}
            </>
        )
    }

    const renderThread = (comment: SongComment, depth = 0): React.ReactNode => {
        const children = repliesByParent.get(comment.id) ?? []
        const ownComment = comment.user_id === userId
        const likedComment = !!socialData?.likedCommentIds.includes(comment.id)
        const commentLikeCount = socialData?.commentLikeCounts[comment.id] ?? 0
        const canReply = depth < 2

        return (
            <article
                key={comment.id}
                className="rounded-xl border border-surface-500 bg-surface-700/60 p-3"
                style={{ marginLeft: `${depth * 12}px` }}
            >
                <div className="flex items-start gap-2">
                    <Avatar src={comment.profile?.avatar_url} name={comment.profile?.display_name} size="sm" />
                    <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                            <p className="text-sm font-medium text-white truncate">
                                {comment.profile?.display_name ?? 'Usuario'}
                            </p>
                            <p className="text-[11px] text-gray-500 whitespace-nowrap">
                                {formatRelative(comment.created_at)}
                            </p>
                        </div>
                        <p className="text-sm text-gray-200 mt-1 whitespace-pre-wrap break-words leading-relaxed">
                            {renderCommentBody(comment.body)}
                        </p>

                        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                            <button
                                type="button"
                                onClick={() => commentLikeMutation.mutate(comment.id)}
                                className={`inline-flex items-center gap-1 rounded-full px-2 py-1 border transition-colors ${
                                    likedComment
                                        ? 'border-pink-400/60 text-pink-300 bg-pink-500/10'
                                        : 'border-surface-400 text-gray-300 bg-surface-600/40'
                                }`}
                            >
                                <Heart className={`w-3.5 h-3.5 ${likedComment ? 'fill-current' : ''}`} />
                                {commentLikeCount}
                            </button>

                            {canReply ? (
                                <button
                                    type="button"
                                    onClick={() => {
                                        setReplyingTo(comment.id)
                                        setReplyDraft(`@${buildMentionToken(comment.profile?.display_name ?? 'usuario')} `)
                                    }}
                                    className="inline-flex items-center gap-1 rounded-full px-2 py-1 border border-surface-400 text-gray-300 bg-surface-600/40"
                                >
                                    <Reply className="w-3.5 h-3.5" /> Responder
                                </button>
                            ) : null}

                            {ownComment ? (
                                <button
                                    type="button"
                                    onClick={() => deleteCommentMutation.mutate(comment.id)}
                                    className="inline-flex items-center gap-1 rounded-full px-2 py-1 border border-red-500/30 text-red-300 bg-red-500/10"
                                >
                                    <Trash2 className="w-3.5 h-3.5" /> Eliminar
                                </button>
                            ) : null}
                        </div>

                        {replyingTo === comment.id ? (
                            <div className="mt-3 space-y-2">
                                <div className="flex items-start gap-2">
                                    <textarea
                                        value={replyDraft}
                                        onChange={(event) => setReplyDraft(event.target.value)}
                                        rows={2}
                                        maxLength={500}
                                        className="input flex-1 resize-none"
                                        placeholder="Escribe una respuesta..."
                                    />
                                    <button
                                        type="button"
                                        onClick={() => submitReply(comment.id)}
                                        disabled={addCommentMutation.isPending || !replyDraft.trim()}
                                        className="btn-primary px-3 py-2"
                                        aria-label="Enviar respuesta"
                                    >
                                        <Send className="w-4 h-4" />
                                    </button>
                                </div>

                                <div className="flex flex-wrap items-center gap-2 text-xs">
                                    <button
                                        type="button"
                                        onClick={() => insertCurrentTimestamp('reply')}
                                        className="btn-secondary px-2.5 py-1.5"
                                    >
                                        Insertar [{liveTimestamp}]
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setReplyingTo(null)
                                            setReplyDraft('')
                                        }}
                                        className="btn-ghost px-2.5 py-1.5"
                                    >
                                        Cancelar
                                    </button>
                                </div>

                                {replyMentionOptions.length > 0 ? (
                                    <MentionSuggestions
                                        options={replyMentionOptions}
                                        onSelect={(option) => setReplyDraft((prev) => applyMention(prev, option.token))}
                                    />
                                ) : null}
                            </div>
                        ) : null}
                    </div>
                </div>

                {children.length > 0 ? (
                    <div className="mt-3 space-y-2">
                        {children.map((child) => renderThread(child, depth + 1))}
                    </div>
                ) : null}
            </article>
        )
    }

    return (
        <section className="card p-4 space-y-4">
            <div className="flex items-center justify-between gap-3">
                <h2 className="text-base font-semibold text-white">Comunidad</h2>
                <div className="flex items-center gap-3 text-xs text-gray-300">
                    <span className="inline-flex items-center gap-1">
                        <Heart className="w-3.5 h-3.5" /> {likesCount}
                    </span>
                    <span className="inline-flex items-center gap-1">
                        <MessageCircle className="w-3.5 h-3.5" /> {comments.length}
                    </span>
                </div>
            </div>

            <div className="rounded-2xl border border-surface-500 bg-surface-700/50 p-3 space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                    <button
                        type="button"
                        onClick={() => toggleLikeMutation.mutate()}
                        className={`btn-secondary px-3 py-2 text-xs ${
                            likedByMe ? 'border-pink-400/60 text-pink-300 bg-pink-500/10' : ''
                        }`}
                        disabled={toggleLikeMutation.isPending}
                    >
                        <Heart className={`w-3.5 h-3.5 ${likedByMe ? 'fill-current' : ''}`} />
                        {likedByMe ? 'Te gusta' : 'Me gusta'}
                    </button>

                    {REACTIONS.map((reaction) => {
                        const active = reactionByMe === reaction.type
                        const count = reactionCounts[reaction.type] ?? 0
                        return (
                            <button
                                key={reaction.type}
                                type="button"
                                onClick={() => reactionMutation.mutate(active ? null : reaction.type)}
                                className={`rounded-full px-2.5 py-1.5 text-xs border transition-colors ${
                                    active
                                        ? 'border-brand-400/50 bg-brand-500/20 text-brand-100'
                                        : 'border-surface-400 bg-surface-600/40 text-gray-200'
                                }`}
                            >
                                <span className="mr-1">{reaction.emoji}</span>
                                {count}
                            </button>
                        )
                    })}
                </div>

                <div className="space-y-2">
                    <label className="label mb-1">Comentario</label>
                    <div className="flex items-start gap-2">
                        <textarea
                            value={commentDraft}
                            onChange={(event) => setCommentDraft(event.target.value)}
                            rows={3}
                            maxLength={500}
                            className="input flex-1 resize-none"
                            placeholder="Escribe algo sobre la cancion... Usa @usuario o [01:23]"
                        />
                        <button
                            type="button"
                            onClick={submitMainComment}
                            disabled={addCommentMutation.isPending || !commentDraft.trim()}
                            className="btn-primary px-3 py-2"
                            aria-label="Enviar comentario"
                        >
                            <Send className="w-4 h-4" />
                        </button>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 text-xs text-gray-300">
                        <button
                            type="button"
                            onClick={() => insertCurrentTimestamp('main')}
                            className="btn-secondary px-2.5 py-1.5"
                        >
                            Insertar [{liveTimestamp}]
                        </button>
                        <span className="inline-flex items-center gap-1 rounded-full bg-surface-600/60 border border-surface-400 px-2 py-1">
                            <Flame className="w-3.5 h-3.5 text-amber-300" />
                            Marca un momento exacto para compartirlo
                        </span>
                    </div>

                    {mainMentionOptions.length > 0 ? (
                        <MentionSuggestions
                            options={mainMentionOptions}
                            onSelect={(option) => setCommentDraft((prev) => applyMention(prev, option.token))}
                        />
                    ) : null}
                </div>
            </div>

            {isLoading ? (
                <p className="text-sm text-gray-400">Cargando comentarios...</p>
            ) : rootComments.length === 0 ? (
                <div className="relative overflow-hidden rounded-2xl border border-dashed border-surface-400 p-6 text-center">
                    <div className="absolute -top-8 -right-10 w-24 h-24 rounded-full bg-brand-500/20 blur-2xl" />
                    <div className="absolute -bottom-8 -left-10 w-24 h-24 rounded-full bg-cyan-500/20 blur-2xl" />
                    <p className="relative text-sm text-gray-300">Inicia la conversacion de esta cancion.</p>
                </div>
            ) : (
                <div className="space-y-2.5 max-h-[460px] overflow-y-auto no-scrollbar pr-1">
                    {rootComments.map((comment) => renderThread(comment))}
                </div>
            )}
        </section>
    )
}

const MentionSuggestions: React.FC<{
    options: MentionOption[]
    onSelect: (option: MentionOption) => void
}> = ({ options, onSelect }) => {
    return (
        <div className="rounded-xl border border-surface-500 bg-surface-800/70 p-2 flex flex-wrap gap-2">
            {options.slice(0, 6).map((option) => (
                <button
                    key={option.id}
                    type="button"
                    onClick={() => onSelect(option)}
                    className="rounded-full border border-surface-400 bg-surface-700 px-2.5 py-1 text-xs text-gray-200 hover:text-white"
                >
                    @{option.token}
                </button>
            ))}
        </div>
    )
}

function buildMentionOptions(members: GroupMember[]): MentionOption[] {
    return members.map((member) => {
        const displayName = member.profile?.display_name?.trim() || 'usuario'
        const username = member.profile?.username?.replace(/^@/, '') || buildMentionToken(displayName)
        return {
            id: member.user_id,
            label: displayName,
            token: username,
        }
    })
}

function filterMentionOptions(options: MentionOption[], query: string | null): MentionOption[] {
    if (options.length === 0) return []
    if (!query) return []
    const clean = query.toLowerCase()
    return options.filter((option) =>
        option.label.toLowerCase().includes(clean) || option.token.toLowerCase().includes(clean)
    )
}

function extractMentionQuery(text: string): string | null {
    const match = text.match(/(?:^|\s)@([A-Za-z0-9_.-]{1,24})$/)
    return match?.[1] ?? null
}

function applyMention(text: string, token: string): string {
    return text.replace(/@([A-Za-z0-9_.-]{1,24})$/, `@${token} `)
}

function buildMentionToken(value: string): string {
    return value
        .trim()
        .toLowerCase()
        .replace(/\s+/g, '_')
        .replace(/[^a-z0-9_.-]/g, '')
        .slice(0, 24) || 'usuario'
}

function parseTimestampToken(token: string): number | null {
    const clean = token.replace(/\[|\]/g, '')
    const match = clean.match(/^(\d{1,2}):(\d{2})$/)
    if (!match) return null
    const minutes = Number(match[1])
    const seconds = Number(match[2])
    if (!Number.isFinite(minutes) || !Number.isFinite(seconds)) return null
    return minutes * 60 + seconds
}

function formatTimestamp(seconds: number): string {
    const safe = Number.isFinite(seconds) ? Math.max(0, Math.floor(seconds)) : 0
    const minutes = Math.floor(safe / 60)
    const secs = safe % 60
    return `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
}

function normalizeTimestampLabel(token: string): string {
    const clean = token.replace(/\[|\]/g, '')
    const parsed = parseTimestampToken(clean)
    if (parsed == null) return token
    return `[${formatTimestamp(parsed)}]`
}
