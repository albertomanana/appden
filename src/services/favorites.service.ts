import { supabase } from '@lib/supabase/client'
import { songsService } from '@services/songs.service'
import type { Song } from '@/types'

export const favoritesService = {
    /**
     * Favorite songs of a user, most recently added first. Songs go through the
     * regular hydration (signed audio/cover URLs, credits), otherwise they could
     * not be played. When `groupId` is given only that group's songs are returned.
     */
    async getFavorites(userId: string, groupId?: string | null): Promise<Song[]> {
        const { data, error } = await supabase
            .from('favorites')
            .select('song_id, created_at')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })

        if (error) throw error

        const songIds = ((data ?? []) as Array<{ song_id: string }>).map((row) => row.song_id)
        const songs = await songsService.getSongsByIds(songIds, userId)

        return songs
            .filter((song) => !groupId || song.group_id === groupId)
            .map((song) => ({ ...song, is_favorite: true }))
    },

    /**
     * Add a song to favorites. Adding an existing favorite is not an error.
     */
    async addFavorite(userId: string, songId: string): Promise<void> {
        const { error } = await supabase
            .from('favorites')
            .insert({ user_id: userId, song_id: songId })

        if (error && error.code !== '23505') throw error
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
