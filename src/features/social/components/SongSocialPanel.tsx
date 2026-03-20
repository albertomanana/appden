import React, { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Flame, Heart, MessageCircle, Send } from 'lucide-react'
import { useToast } from '@components/ui/Toast'
import { usePlayerStore } from '@app/store/player.store'
import { groupsService } from '@services/groups.service'
import { Skeleton } from '@components/ui/LoadingSkeleton'
import { useSongSocial } from '@features/social/hooks/useSongSocial'
import { MentionSuggestions } from '@features/social/components/MentionSuggestions'
import { SongCommentThread } from '@features/social/components/SongCommentThread'
import {
    applyMention,
    buildMentionOptions,
    extractMentionQuery,
    filterMentionOptions,
    formatTimestamp,
    normalizeTimestampLabel,
    parseTimestampToken,
} from '@features/social/utils/comment-utils'
import type { Song, SongComment, SongReactionType } from '@/types'

interface SongSocialPanelProps {
    song: Song
    userId: string
    groupId?: string | null
}

const REACTIONS: Array<{ type: SongReactionType; label: string; emoji: string }> = [
    { type: 'fire', label: 'Fuego', emoji: '??' },
    { type: 'heart', label: 'Corazon', emoji: '??' },
    { type: 'headphones', label: 'Escucha', emoji: '??' },
]

export const SongSocialPanel: React.FC<SongSocialPanelProps> = ({ song, userId, groupId }) => {
    const { success, error: toastError } = useToast()
    const currentSong = usePlayerStore((state) => state.currentSong)
    const currentTime = usePlayerStore((state) => state.currentTime)
    const setQueue = usePlayerStore((state) => state.setQueue)
    const setCurrentTime = usePlayerStore((state) => state.setCurrentTime)
    const setPlaying = usePlayerStore((state) => state.setPlaying)

    const [commentDraft, setCommentDraft] = useState('')
    const [replyingTo, setReplyingTo] = useState<string | null>(null)
    const [replyDraft, setReplyDraft] = useState('')
    const [editingCommentId, setEditingCommentId] = useState<string | null>(null)
    const [editingDraft, setEditingDraft] = useState('')

    const {
        socialData,
        isLoading,
        toggleLikeMutation,
        setReactionMutation,
        addCommentMutation,
        updateCommentMutation,
        deleteCommentMutation,
        toggleCommentLikeMutation,
    } = useSongSocial({ songId: song.id, userId })

    const { data: members } = useQuery({
        queryKey: ['group-members', groupId],
        queryFn: () => groupsService.getGroupMembers(groupId!),
        enabled: !!groupId,
        staleTime: 60_000,
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

        addCommentMutation.mutate(
            { body: clean },
            {
                onSuccess: () => {
                    setCommentDraft('')
                    success('Comentario publicado')
                },
                onError: (err) => {
                    if (err instanceof Error && err.message === 'empty-comment') {
                        toastError('Error', 'Escribe un comentario antes de enviarlo.')
                        return
                    }
                    toastError('Error', 'No se pudo publicar el comentario.')
                },
            }
        )
    }

    const submitReply = (parentId: string) => {
        const clean = replyDraft.trim()
        if (!clean) return

        addCommentMutation.mutate(
            { body: clean, parentId },
            {
                onSuccess: () => {
                    setReplyingTo(null)
                    setReplyDraft('')
                    success('Respuesta publicada')
                },
                onError: () => toastError('Error', 'No se pudo publicar la respuesta.'),
            }
        )
    }

    const saveEditedComment = (commentId: string) => {
        const clean = editingDraft.trim()
        if (!clean) return

        updateCommentMutation.mutate(
            { commentId, body: clean },
            {
                onSuccess: () => {
                    setEditingCommentId(null)
                    setEditingDraft('')
                    success('Comentario actualizado')
                },
                onError: (err) => {
                    if (err instanceof Error && err.message === 'empty-comment') {
                        toastError('Error', 'El comentario no puede estar vacio.')
                        return
                    }
                    toastError('Error', 'No se pudo editar el comentario.')
                },
            }
        )
    }

    const renderCommentBody = (body: string, onJumpToTime: (seconds: number) => void) => {
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
                                onClick={() => onJumpToTime(parsedTime)}
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
                        onClick={() =>
                            toggleLikeMutation.mutate(undefined, {
                                onError: () => toastError('Error', 'No se pudo actualizar el like.'),
                            })
                        }
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
                                onClick={() =>
                                    setReactionMutation.mutate(active ? null : reaction.type, {
                                        onError: () => toastError('Error', 'No se pudo actualizar la reaccion.'),
                                    })
                                }
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

                    <MentionSuggestions
                        options={mainMentionOptions}
                        onSelect={(option) => setCommentDraft((prev) => applyMention(prev, option.token))}
                    />
                </div>
            </div>

            {isLoading ? (
                <div className="space-y-2">
                    <Skeleton className="h-24" />
                    <Skeleton className="h-24" />
                    <Skeleton className="h-24" />
                </div>
            ) : rootComments.length === 0 ? (
                <div className="relative overflow-hidden rounded-2xl border border-dashed border-surface-400 p-6 text-center">
                    <div className="absolute -top-8 -right-10 w-24 h-24 rounded-full bg-brand-500/20 blur-2xl" />
                    <div className="absolute -bottom-8 -left-10 w-24 h-24 rounded-full bg-cyan-500/20 blur-2xl" />
                    <p className="relative text-sm text-gray-300">Inicia la conversacion de esta cancion.</p>
                </div>
            ) : (
                <div className="space-y-2.5 max-h-[460px] overflow-y-auto no-scrollbar pr-1">
                    {rootComments.map((comment) => (
                        <SongCommentThread
                            key={comment.id}
                            comment={comment}
                            repliesByParent={repliesByParent}
                            userId={userId}
                            likedCommentIds={socialData?.likedCommentIds ?? []}
                            commentLikeCounts={socialData?.commentLikeCounts ?? {}}
                            onToggleCommentLike={(commentId) =>
                                toggleCommentLikeMutation.mutate(commentId, {
                                    onError: () =>
                                        toastError('Error', 'No se pudo actualizar el like del comentario.'),
                                })
                            }
                            onDeleteComment={(commentId) =>
                                deleteCommentMutation.mutate(commentId, {
                                    onError: () => toastError('Error', 'No se pudo eliminar el comentario.'),
                                })
                            }
                            onStartReply={(commentId, seed) => {
                                setReplyingTo(commentId)
                                setReplyDraft(seed)
                                setEditingCommentId(null)
                                setEditingDraft('')
                            }}
                            onSubmitReply={submitReply}
                            onCancelReply={() => {
                                setReplyingTo(null)
                                setReplyDraft('')
                            }}
                            replyingTo={replyingTo}
                            replyDraft={replyDraft}
                            onReplyDraftChange={setReplyDraft}
                            replyMentionOptions={replyMentionOptions}
                            onSelectReplyMention={(option) =>
                                setReplyDraft((prev) => applyMention(prev, option.token))
                            }
                            onInsertReplyTimestamp={() => insertCurrentTimestamp('reply')}
                            liveTimestamp={liveTimestamp}
                            onJumpToTimestamp={jumpToTimestamp}
                            renderCommentBody={renderCommentBody}
                            editingCommentId={editingCommentId}
                            editingDraft={editingDraft}
                            onStartEditing={(commentId, body) => {
                                setEditingCommentId(commentId)
                                setEditingDraft(body)
                                setReplyingTo(null)
                                setReplyDraft('')
                            }}
                            onEditingDraftChange={setEditingDraft}
                            onSaveEdit={saveEditedComment}
                            onCancelEdit={() => {
                                setEditingCommentId(null)
                                setEditingDraft('')
                            }}
                            isSubmittingComment={addCommentMutation.isPending}
                            isUpdatingComment={updateCommentMutation.isPending}
                        />
                    ))}
                </div>
            )}
        </section>
    )
}

