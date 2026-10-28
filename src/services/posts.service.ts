import { supabase } from '@lib/supabase/client'
import type { Post } from '@/types'

export const POST_MAX_LENGTH = 280

type PostRow = Post & { likes?: Array<{ user_id: string }> | null }

type ListFeedOptions = {
    limit?: number
    /** Cursor: only posts created strictly before this ISO timestamp. */
    before?: string
    viewerId: string
}

const POST_SELECT =
    '*, author:profiles!posts_user_id_fkey(id, display_name, username, avatar_url), group:groups(id, name), likes:post_likes(user_id)'

function hydrate(row: PostRow, viewerId: string): Post {
    const likes = row.likes ?? []
    const { likes: _likes, ...post } = row
    return {
        ...post,
        like_count: likes.length,
        liked_by_me: likes.some((like) => like.user_id === viewerId),
    }
}

export const postsService = {
    /**
     * Feed visible to the viewer (RLS decides: public posts, own private posts and posts of the viewer's groups).
     */
    async listFeed({ limit = 20, before, viewerId }: ListFeedOptions): Promise<Post[]> {
        let query = supabase.from('posts').select(POST_SELECT).order('created_at', { ascending: false }).limit(limit)

        if (before) {
            query = query.lt('created_at', before)
        }

        const { data, error } = await query
        if (error) throw error
        return ((data ?? []) as unknown as PostRow[]).map((row) => hydrate(row, viewerId))
    },

    async createPost(
        userId: string,
        content: string,
        visibility: 'public' | 'private' | 'group' = 'public',
        groupId?: string | null
    ): Promise<Post> {
        const text = content.trim().slice(0, POST_MAX_LENGTH)
        if (!text) throw new Error('La publicación está vacía.')
        if (visibility === 'group' && !groupId) throw new Error('Elige un grupo para publicar solo en él.')

        const { data, error } = await supabase
            .from('posts')
            .insert({
                user_id: userId,
                content: text,
                visibility,
                group_id: visibility === 'group' ? groupId : null,
            })
            .select(POST_SELECT)
            .single()

        if (error) throw error
        return hydrate(data as unknown as PostRow, userId)
    },

    async deletePost(postId: string): Promise<void> {
        const { error } = await supabase.from('posts').delete().eq('id', postId)
        if (error) throw error
    },

    async likePost(postId: string, userId: string): Promise<void> {
        const { error } = await supabase.from('post_likes').insert({ post_id: postId, user_id: userId })
        if (error) {
            const raw = `${error.code ?? ''} ${error.message ?? ''}`.toLowerCase()
            // Already liked (double tap / second device): treat as success.
            if (raw.includes('23505') || raw.includes('duplicate')) return
            throw error
        }
    },

    async unlikePost(postId: string, userId: string): Promise<void> {
        const { error } = await supabase.from('post_likes').delete().match({ post_id: postId, user_id: userId })
        if (error) throw error
    },
}

export default postsService
