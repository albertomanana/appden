import { supabase } from '@lib/supabase/client'
import { groupActivityService } from '@services/group-activity.service'
import type { SongComment, SongReactionType } from '@/types'

const FALLBACK_STORAGE_KEY = 'appden:song-social:fallback:v2'

type SongSocialState = {
    likesCount: number
    likedByMe: boolean
    comments: SongComment[]
    likedCommentIds: string[]
    commentLikeCounts: Record<string, number>
    reactionCounts: Record<SongReactionType, number>
    reactionByMe: SongReactionType | null
}

type SocialFallbackStore = {
    likesBySong: Record<string, string[]>
    comments: SongComment[]
    commentLikesByComment: Record<string, string[]>
    reactionsBySong: Record<string, Record<string, SongReactionType>>
}

const EMPTY_REACTIONS: Record<SongReactionType, number> = {
    fire: 0,
    heart: 0,
    headphones: 0,
}

export const songSocialService = {
    async getSongSocial(songId: string, userId: string): Promise<SongSocialState> {
        const fallback = readFallbackStore()
        let likesCount = fallback.likesBySong[songId]?.length ?? 0
        let likedByMe = (fallback.likesBySong[songId] ?? []).includes(userId)
        let comments = fallback.comments
            .filter((comment) => comment.song_id === songId)
            .sort((a, b) => a.created_at.localeCompare(b.created_at))

        let commentLikeCounts: Record<string, number> = {}
        let likedCommentIds: string[] = []
        let reactionCounts = computeFallbackReactionCounts(fallback, songId)
        let reactionByMe: SongReactionType | null = fallback.reactionsBySong[songId]?.[userId] ?? null

        const likesCountPromise = supabase
            .from('song_likes')
            .select('*', { count: 'exact', head: true })
            .eq('song_id', songId)

        const likedByMePromise = supabase
            .from('song_likes')
            .select('id')
            .eq('song_id', songId)
            .eq('user_id', userId)
            .maybeSingle()

        const commentsPromise = supabase
            .from('song_comments')
            .select('*, profile:profiles(id, display_name, avatar_url)')
            .eq('song_id', songId)
            .order('created_at', { ascending: true })

        const reactionPromise = supabase
            .from('song_reactions')
            .select('song_id, user_id, reaction')
            .eq('song_id', songId)

        const [likesCountResult, likedByMeResult, commentsResult, reactionsResult] = await Promise.all([
            likesCountPromise,
            likedByMePromise,
            commentsPromise,
            reactionPromise,
        ])

        if (likesCountResult.error && !isMissingRelationError(likesCountResult.error)) {
            throw likesCountResult.error
        }
        if (!likesCountResult.error) {
            likesCount = likesCountResult.count ?? 0
        }

        if (likedByMeResult.error && !isMissingRelationError(likedByMeResult.error)) {
            throw likedByMeResult.error
        }
        if (!likedByMeResult.error) {
            likedByMe = !!likedByMeResult.data
        }

        if (commentsResult.error && !isMissingRelationError(commentsResult.error)) {
            throw commentsResult.error
        }
        if (!commentsResult.error) {
            comments = (commentsResult.data ?? []) as SongComment[]
        }

        const commentIds = comments.map((item) => item.id)
        if (commentIds.length > 0) {
            const { data: commentLikesRows, error: commentLikesError } = await supabase
                .from('song_comment_likes')
                .select('comment_id, user_id')
                .in('comment_id', commentIds)

            if (commentLikesError && !isMissingRelationError(commentLikesError)) {
                throw commentLikesError
            }

            if (!commentLikesError) {
                for (const row of commentLikesRows ?? []) {
                    const key = String(row.comment_id)
                    commentLikeCounts[key] = (commentLikeCounts[key] ?? 0) + 1
                    if (row.user_id === userId) likedCommentIds.push(key)
                }
            } else {
                const fallbackLikes = fallback.commentLikesByComment
                commentLikeCounts = commentIds.reduce<Record<string, number>>((acc, id) => {
                    acc[id] = fallbackLikes[id]?.length ?? 0
                    return acc
                }, {})
                likedCommentIds = commentIds.filter((id) => (fallbackLikes[id] ?? []).includes(userId))
            }
        }

        if (reactionsResult.error && !isMissingRelationError(reactionsResult.error)) {
            throw reactionsResult.error
        }
        if (!reactionsResult.error) {
            reactionCounts = { ...EMPTY_REACTIONS }
            reactionByMe = null
            for (const row of reactionsResult.data ?? []) {
                const reaction = row.reaction as SongReactionType
                reactionCounts[reaction] = (reactionCounts[reaction] ?? 0) + 1
                if (row.user_id === userId) reactionByMe = reaction
            }
        }

        return {
            likesCount,
            likedByMe,
            comments,
            likedCommentIds,
            commentLikeCounts,
            reactionCounts,
            reactionByMe,
        }
    },

    async toggleLike(songId: string, userId: string): Promise<boolean> {
        const { data: existing, error: existingError } = await supabase
            .from('song_likes')
            .select('id')
            .eq('song_id', songId)
            .eq('user_id', userId)
            .maybeSingle()

        if (existingError) {
            if (isMissingRelationError(existingError)) {
                const liked = toggleLikeFallback(songId, userId)
                await logActivity(songId, userId, 'song_liked', { liked })
                return liked
            }
            throw existingError
        }

        if (existing?.id) {
            const { error: deleteError } = await supabase
                .from('song_likes')
                .delete()
                .eq('song_id', songId)
                .eq('user_id', userId)

            if (deleteError) throw deleteError
            await logActivity(songId, userId, 'song_liked', { liked: false })
            return false
        }

        const { error: insertError } = await supabase
            .from('song_likes')
            .insert({ song_id: songId, user_id: userId })

        if (insertError) throw insertError
        await logActivity(songId, userId, 'song_liked', { liked: true })
        return true
    },

    async setReaction(songId: string, userId: string, reaction: SongReactionType | null): Promise<void> {
        if (reaction == null) {
            const { error } = await supabase
                .from('song_reactions')
                .delete()
                .eq('song_id', songId)
                .eq('user_id', userId)

            if (error) {
                if (isMissingRelationError(error)) {
                    setReactionFallback(songId, userId, null)
                    return
                }
                throw error
            }
            await logActivity(songId, userId, 'song_reacted', { reaction: null })
            return
        }

        const payload = { song_id: songId, user_id: userId, reaction }
        const { error } = await supabase
            .from('song_reactions')
            .upsert(payload, { onConflict: 'song_id,user_id' })

        if (error) {
            if (isMissingRelationError(error)) {
                setReactionFallback(songId, userId, reaction)
                await logActivity(songId, userId, 'song_reacted', { reaction })
                return
            }
            throw error
        }

        await logActivity(songId, userId, 'song_reacted', { reaction })
    },

    async addComment(
        songId: string,
        userId: string,
        body: string,
        parentId?: string | null
    ): Promise<SongComment> {
        const cleanBody = body.trim()
        if (!cleanBody) {
            throw new Error('empty-comment')
        }

        const payload = {
            song_id: songId,
            user_id: userId,
            body: cleanBody.slice(0, 500),
            parent_id: parentId ?? null,
        }

        const { data, error } = await supabase
            .from('song_comments')
            .insert(payload)
            .select('*, profile:profiles(id, display_name, avatar_url)')
            .single()

        if (error) {
            if (isMissingRelationError(error)) {
                const fallbackComment = addCommentFallback(payload)
                await logActivity(songId, userId, 'song_commented', { parentId: parentId ?? null })
                return fallbackComment
            }
            throw error
        }

        await logActivity(songId, userId, 'song_commented', { parentId: parentId ?? null })
        return data as SongComment
    },

    async toggleCommentLike(commentId: string, userId: string): Promise<boolean> {
        const { data: existing, error: existingError } = await supabase
            .from('song_comment_likes')
            .select('id')
            .eq('comment_id', commentId)
            .eq('user_id', userId)
            .maybeSingle()

        if (existingError) {
            if (isMissingRelationError(existingError)) {
                return toggleCommentLikeFallback(commentId, userId)
            }
            throw existingError
        }

        if (existing?.id) {
            const { error: deleteError } = await supabase
                .from('song_comment_likes')
                .delete()
                .eq('comment_id', commentId)
                .eq('user_id', userId)

            if (deleteError) throw deleteError
            return false
        }

        const { error: insertError } = await supabase
            .from('song_comment_likes')
            .insert({ comment_id: commentId, user_id: userId })

        if (insertError) throw insertError
        return true
    },

    async deleteComment(commentId: string, userId: string): Promise<void> {
        const { error } = await supabase
            .from('song_comments')
            .delete()
            .eq('id', commentId)
            .eq('user_id', userId)

        if (error) {
            if (isMissingRelationError(error)) {
                deleteCommentFallback(commentId, userId)
                return
            }
            throw error
        }
    },
}

function computeFallbackReactionCounts(
    fallback: SocialFallbackStore,
    songId: string
): Record<SongReactionType, number> {
    const map = fallback.reactionsBySong[songId] ?? {}
    const counts = { ...EMPTY_REACTIONS }
    for (const reaction of Object.values(map)) {
        counts[reaction] = (counts[reaction] ?? 0) + 1
    }
    return counts
}

async function logActivity(
    songId: string,
    actorId: string,
    actionType: 'song_liked' | 'song_reacted' | 'song_commented',
    payload?: Record<string, unknown>
): Promise<void> {
    const groupId = await groupActivityService.resolveSongGroupId(songId)
    if (!groupId) return
    await groupActivityService.create({
        groupId,
        actorId,
        actionType,
        songId,
        payload,
    })
}

function toggleLikeFallback(songId: string, userId: string): boolean {
    const store = readFallbackStore()
    const current = new Set(store.likesBySong[songId] ?? [])
    if (current.has(userId)) {
        current.delete(userId)
        store.likesBySong[songId] = Array.from(current)
        writeFallbackStore(store)
        return false
    }
    current.add(userId)
    store.likesBySong[songId] = Array.from(current)
    writeFallbackStore(store)
    return true
}

function setReactionFallback(songId: string, userId: string, reaction: SongReactionType | null): void {
    const store = readFallbackStore()
    const songMap = { ...(store.reactionsBySong[songId] ?? {}) }
    if (reaction == null) {
        delete songMap[userId]
    } else {
        songMap[userId] = reaction
    }
    store.reactionsBySong[songId] = songMap
    writeFallbackStore(store)
}

function addCommentFallback(payload: {
    song_id: string
    user_id: string
    body: string
    parent_id: string | null
}): SongComment {
    const store = readFallbackStore()
    const now = new Date().toISOString()
    const comment: SongComment = {
        id: crypto.randomUUID(),
        song_id: payload.song_id,
        user_id: payload.user_id,
        body: payload.body,
        parent_id: payload.parent_id,
        created_at: now,
        updated_at: now,
    }
    store.comments.push(comment)
    writeFallbackStore(store)
    return comment
}

function toggleCommentLikeFallback(commentId: string, userId: string): boolean {
    const store = readFallbackStore()
    const current = new Set(store.commentLikesByComment[commentId] ?? [])
    if (current.has(userId)) {
        current.delete(userId)
        store.commentLikesByComment[commentId] = Array.from(current)
        writeFallbackStore(store)
        return false
    }

    current.add(userId)
    store.commentLikesByComment[commentId] = Array.from(current)
    writeFallbackStore(store)
    return true
}

function deleteCommentFallback(commentId: string, userId: string): void {
    const store = readFallbackStore()
    store.comments = store.comments.filter(
        (comment) => !(comment.id === commentId && comment.user_id === userId)
    )
    writeFallbackStore(store)
}

function readFallbackStore(): SocialFallbackStore {
    if (typeof window === 'undefined') {
        return { likesBySong: {}, comments: [], commentLikesByComment: {}, reactionsBySong: {} }
    }

    try {
        const raw = window.localStorage.getItem(FALLBACK_STORAGE_KEY)
        if (!raw) {
            return { likesBySong: {}, comments: [], commentLikesByComment: {}, reactionsBySong: {} }
        }
        const parsed = JSON.parse(raw) as SocialFallbackStore
        return {
            likesBySong: parsed.likesBySong ?? {},
            comments: parsed.comments ?? [],
            commentLikesByComment: parsed.commentLikesByComment ?? {},
            reactionsBySong: parsed.reactionsBySong ?? {},
        }
    } catch {
        return { likesBySong: {}, comments: [], commentLikesByComment: {}, reactionsBySong: {} }
    }
}

function writeFallbackStore(store: SocialFallbackStore): void {
    if (typeof window === 'undefined') return
    try {
        window.localStorage.setItem(FALLBACK_STORAGE_KEY, JSON.stringify(store))
    } catch {
        // Ignore storage quota issues.
    }
}

function isMissingRelationError(error: unknown): boolean {
    if (!error || typeof error !== 'object') return false
    const anyError = error as { code?: string; message?: string; details?: string }
    const raw = `${anyError.code ?? ''} ${anyError.message ?? ''} ${anyError.details ?? ''}`.toLowerCase()
    return raw.includes('42p01') || raw.includes('pgrst205') || raw.includes('does not exist')
}
