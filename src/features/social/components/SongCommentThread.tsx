import React from 'react'
import { Heart, Pencil, Reply, Save, Send, Trash2, X } from 'lucide-react'
import { Avatar } from '@components/common/Avatar'
import { formatRelative } from '@lib/utils'
import { MentionSuggestions } from '@features/social/components/MentionSuggestions'
import type { MentionOption } from '@features/social/types'
import type { SongComment } from '@/types'
import { buildMentionToken } from '@features/social/utils/comment-utils'

type SongCommentThreadProps = {
    comment: SongComment
    depth?: number
    repliesByParent: Map<string, SongComment[]>
    userId: string
    likedCommentIds: string[]
    commentLikeCounts: Record<string, number>
    onToggleCommentLike: (commentId: string) => void
    onDeleteComment: (commentId: string) => void
    onStartReply: (commentId: string, seed: string) => void
    onSubmitReply: (parentId: string) => void
    onCancelReply: () => void
    replyingTo: string | null
    replyDraft: string
    onReplyDraftChange: (value: string) => void
    replyMentionOptions: MentionOption[]
    onSelectReplyMention: (option: MentionOption) => void
    onInsertReplyTimestamp: () => void
    liveTimestamp: string
    onJumpToTimestamp: (seconds: number) => void
    renderCommentBody: (body: string, onJumpToTimestamp: (seconds: number) => void) => React.ReactNode
    editingCommentId: string | null
    editingDraft: string
    onStartEditing: (commentId: string, body: string) => void
    onEditingDraftChange: (value: string) => void
    onSaveEdit: (commentId: string) => void
    onCancelEdit: () => void
    isSubmittingComment: boolean
    isUpdatingComment: boolean
}

export const SongCommentThread: React.FC<SongCommentThreadProps> = ({
    comment,
    depth = 0,
    repliesByParent,
    userId,
    likedCommentIds,
    commentLikeCounts,
    onToggleCommentLike,
    onDeleteComment,
    onStartReply,
    onSubmitReply,
    onCancelReply,
    replyingTo,
    replyDraft,
    onReplyDraftChange,
    replyMentionOptions,
    onSelectReplyMention,
    onInsertReplyTimestamp,
    liveTimestamp,
    onJumpToTimestamp,
    renderCommentBody,
    editingCommentId,
    editingDraft,
    onStartEditing,
    onEditingDraftChange,
    onSaveEdit,
    onCancelEdit,
    isSubmittingComment,
    isUpdatingComment,
}) => {
    const children = repliesByParent.get(comment.id) ?? []
    const ownComment = comment.user_id === userId
    const likedComment = likedCommentIds.includes(comment.id)
    const commentLikeCount = commentLikeCounts[comment.id] ?? 0
    const canReply = depth < 2
    const isEditing = editingCommentId === comment.id

    return (
        <article
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

                    {isEditing ? (
                        <div className="mt-2 space-y-2">
                            <textarea
                                value={editingDraft}
                                onChange={(event) => onEditingDraftChange(event.target.value)}
                                rows={2}
                                maxLength={500}
                                className="input w-full resize-none"
                            />
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => onSaveEdit(comment.id)}
                                    disabled={isUpdatingComment || !editingDraft.trim()}
                                    className="btn-primary px-3 py-1.5 text-xs"
                                >
                                    <Save className="w-3.5 h-3.5" /> Guardar
                                </button>
                                <button
                                    type="button"
                                    onClick={onCancelEdit}
                                    className="btn-ghost px-3 py-1.5 text-xs"
                                >
                                    <X className="w-3.5 h-3.5" /> Cancelar
                                </button>
                            </div>
                        </div>
                    ) : (
                        <p className="text-sm text-gray-200 mt-1 whitespace-pre-wrap break-words leading-relaxed">
                            {renderCommentBody(comment.body, onJumpToTimestamp)}
                        </p>
                    )}

                    <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                        <button
                            type="button"
                            onClick={() => onToggleCommentLike(comment.id)}
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
                                onClick={() =>
                                    onStartReply(
                                        comment.id,
                                        `@${buildMentionToken(comment.profile?.display_name ?? 'usuario')} `
                                    )
                                }
                                className="inline-flex items-center gap-1 rounded-full px-2 py-1 border border-surface-400 text-gray-300 bg-surface-600/40"
                            >
                                <Reply className="w-3.5 h-3.5" /> Responder
                            </button>
                        ) : null}

                        {ownComment ? (
                            <button
                                type="button"
                                onClick={() => onStartEditing(comment.id, comment.body)}
                                className="inline-flex items-center gap-1 rounded-full px-2 py-1 border border-surface-400 text-gray-300 bg-surface-600/40"
                            >
                                <Pencil className="w-3.5 h-3.5" /> Editar
                            </button>
                        ) : null}

                        {ownComment ? (
                            <button
                                type="button"
                                onClick={() => onDeleteComment(comment.id)}
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
                                    onChange={(event) => onReplyDraftChange(event.target.value)}
                                    rows={2}
                                    maxLength={500}
                                    className="input flex-1 resize-none"
                                    placeholder="Escribe una respuesta..."
                                />
                                <button
                                    type="button"
                                    onClick={() => onSubmitReply(comment.id)}
                                    disabled={isSubmittingComment || !replyDraft.trim()}
                                    className="btn-primary px-3 py-2"
                                    aria-label="Enviar respuesta"
                                >
                                    <Send className="w-4 h-4" />
                                </button>
                            </div>

                            <div className="flex flex-wrap items-center gap-2 text-xs">
                                <button
                                    type="button"
                                    onClick={onInsertReplyTimestamp}
                                    className="btn-secondary px-2.5 py-1.5"
                                >
                                    Insertar [{liveTimestamp}]
                                </button>
                                <button
                                    type="button"
                                    onClick={onCancelReply}
                                    className="btn-ghost px-2.5 py-1.5"
                                >
                                    Cancelar
                                </button>
                            </div>

                            <MentionSuggestions
                                options={replyMentionOptions}
                                onSelect={onSelectReplyMention}
                            />
                        </div>
                    ) : null}
                </div>
            </div>

            {children.length > 0 ? (
                <div className="mt-3 space-y-2">
                    {children.map((child) => (
                        <SongCommentThread
                            key={child.id}
                            comment={child}
                            depth={depth + 1}
                            repliesByParent={repliesByParent}
                            userId={userId}
                            likedCommentIds={likedCommentIds}
                            commentLikeCounts={commentLikeCounts}
                            onToggleCommentLike={onToggleCommentLike}
                            onDeleteComment={onDeleteComment}
                            onStartReply={onStartReply}
                            onSubmitReply={onSubmitReply}
                            onCancelReply={onCancelReply}
                            replyingTo={replyingTo}
                            replyDraft={replyDraft}
                            onReplyDraftChange={onReplyDraftChange}
                            replyMentionOptions={replyMentionOptions}
                            onSelectReplyMention={onSelectReplyMention}
                            onInsertReplyTimestamp={onInsertReplyTimestamp}
                            liveTimestamp={liveTimestamp}
                            onJumpToTimestamp={onJumpToTimestamp}
                            renderCommentBody={renderCommentBody}
                            editingCommentId={editingCommentId}
                            editingDraft={editingDraft}
                            onStartEditing={onStartEditing}
                            onEditingDraftChange={onEditingDraftChange}
                            onSaveEdit={onSaveEdit}
                            onCancelEdit={onCancelEdit}
                            isSubmittingComment={isSubmittingComment}
                            isUpdatingComment={isUpdatingComment}
                        />
                    ))}
                </div>
            ) : null}
        </article>
    )
}

