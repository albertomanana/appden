import { supabase } from '@lib/supabase/client'
import type { Playlist, PlaylistSong } from '@/types'
import type { PlaylistFormData } from '@lib/validators'

export const playlistsService = {
    /**
     * Get all playlists for a group.
     */
    async getPlaylists(groupId: string): Promise<Playlist[]> {
        const { data, error } = await supabase
            .from('playlists')
            .select('*, creator:profiles!playlists_created_by_fkey(id, display_name, avatar_url)')
            .eq('group_id', groupId)
            .order('created_at', { ascending: false })

        if (error) throw error
        return data as Playlist[]
    },

    /**
     * Get a playlist with its songs (ordered by position).
     */
    async getPlaylist(playlistId: string): Promise<Playlist> {
        const { data, error } = await supabase
            .from('playlists')
            .select(`
        *,
        creator:profiles!playlists_created_by_fkey(id, display_name, avatar_url),
        songs:playlist_songs(
          *,
          song:songs(
            *,
            uploader:profiles!songs_uploaded_by_fkey(id, display_name, avatar_url)
          )
        )
      `)
            .eq('id', playlistId)
            .order('position', { referencedTable: 'playlist_songs', ascending: true })
            .single()

        if (error) throw error
        return data as Playlist
    },

    /**
     * Create a new playlist.
     */
    async createPlaylist(
        userId: string,
        groupId: string,
        form: PlaylistFormData
    ): Promise<Playlist> {
        const { data, error } = await supabase
            .from('playlists')
            .insert({
                group_id: groupId,
                created_by: userId,
                name: form.name,
                description: form.description || null,
            })
            .select()
            .single()

        if (error) throw error
        return data as Playlist
    },

    /**
     * Update playlist metadata.
     */
    async updatePlaylist(
        playlistId: string,
        form: PlaylistFormData
    ): Promise<Playlist> {
        const { data, error } = await supabase
            .from('playlists')
            .update({
                name: form.name,
                description: form.description || null,
                updated_at: new Date().toISOString(),
            })
            .eq('id', playlistId)
            .select()
            .single()

        if (error) throw error
        return data as Playlist
    },

    /**
     * Delete a playlist and its song entries.
     */
    async deletePlaylist(playlistId: string): Promise<void> {
        const { error } = await supabase
            .from('playlists')
            .delete()
            .eq('id', playlistId)

        if (error) throw error
    },

    /**
     * Add a song to a playlist at the end.
     */
    async addSong(
        playlistId: string,
        songId: string,
        userId: string
    ): Promise<void> {
        // Get current max position
        const { data: existing } = await supabase
            .from('playlist_songs')
            .select('position')
            .eq('playlist_id', playlistId)
            .order('position', { ascending: false })
            .limit(1)

        const nextPosition = ((existing?.[0] as { position: number } | undefined)?.position ?? -1) + 1

        const { error } = await supabase.from('playlist_songs').insert({
            playlist_id: playlistId,
            song_id: songId,
            position: nextPosition,
            added_by: userId,
        })

        if (error) throw error
    },

    /**
     * Remove a song from a playlist.
     */
    async removeSong(playlistId: string, songId: string): Promise<void> {
        const { error } = await supabase
            .from('playlist_songs')
            .delete()
            .eq('playlist_id', playlistId)
            .eq('song_id', songId)

        if (error) throw error
    },

    /**
     * Reorder songs in a playlist by updating positions.
     */
    async reorderSongs(
        playlistSongs: { id: string; position: number }[]
    ): Promise<void> {
        const updates = playlistSongs.map(({ id, position }) =>
            supabase
                .from('playlist_songs')
                .update({ position })
                .eq('id', id)
        )

        const results = await Promise.all(updates)
        const failed = results.find((r) => r.error)
        if (failed?.error) throw failed.error
    },
}
