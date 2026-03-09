import { supabase } from '@lib/supabase/client'
import type { Favorite, Song } from '@/types'

export const favoritesService = {
    /**
     * Fetch all favorite songs for a user.
     */
    async getFavorites(userId: string): Promise<Song[]> {
        const { data, error } = await supabase
            .from('favorites')
            .select('song:songs(*, uploader:profiles!songs_uploaded_by_fkey(id, display_name, avatar_url))')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })

        if (error) throw error
        return (data?.map((f: { song: Song }) => ({ ...f.song, is_favorite: true })) ?? []) as Song[]
    },

    /**
     * Add a song to favorites.
     */
    async addFavorite(userId: string, songId: string): Promise<void> {
        const { error } = await supabase
            .from('favorites')
            .insert({ user_id: userId, song_id: songId })

        if (error) throw error
    },

    /**
     * Remove a song from favorites.
     */
    async removeFavorite(userId: string, songId: string): Promise<void> {
        const { error } = await supabase
            .from('favorites')
            .delete()
            .eq('user_id', userId)
            .eq('song_id', songId)

        if (error) throw error
    },

    /**
     * Check if a song is favorited by the user.
     */
    async isFavorite(userId: string, songId: string): Promise<boolean> {
        const { count, error } = await supabase
            .from('favorites')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', userId)
            .eq('song_id', songId)

        if (error) throw error
        return (count ?? 0) > 0
    },
}
