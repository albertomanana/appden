import { supabase } from '@lib/supabase/client'
import type { Post } from '@/types'

export const postsService = {
    async listFeed(limit = 20, since?: string): Promise<Post[]> {
        let q = supabase
            .from('posts')
            .select('*, author:profiles!posts_user_id_fkey(id, display_name, username, avatar_url)')
            .order('created_at', { ascending: false })
            .limit(limit)

        if (since) {
            q = q.lt('created_at', since)
        }

        const { data, error } = await q
        if (error) throw error
        return (data ?? []) as Post[]
    },

    async createPost(userId: string, content: string, visibility: 'public' | 'private' | 'group' = 'public', groupId?: string) {
        const payload: any = {
            user_id: userId,
            content: content.slice(0, 280),
            visibility,
            group_id: groupId || null,
        }

        const { data, error } = await supabase.from('posts').insert(payload).select().single()
        if (error) throw error
        return data as Post
    },

    async likePost(postId: string, userId: string) {
        const { data, error } = await supabase.from('post_likes').insert({ post_id: postId, user_id: userId }).select().single()
        if (error) throw error
        return data
    },

    async unlikePost(postId: string, userId: string) {
        const { error } = await supabase.from('post_likes').delete().match({ post_id: postId, user_id: userId })
        if (error) throw error
    },
}

export default postsService
