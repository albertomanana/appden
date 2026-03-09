import { supabase, STORAGE_BUCKETS, getStorageUrl } from '@lib/supabase/client'
import { generateStoragePath, extractAudioDuration } from '@lib/utils'
import type { Song } from '@/types'
import type { SongFormData } from '@lib/validators'

export const songsService = {
    /**
     * Fetch all songs for a group, joining uploader profile and favorite status for a user.
     */
    async getSongs(groupId: string, userId: string): Promise<Song[]> {
        const { data, error } = await supabase
            .from('songs')
            .select(`
        *,
        uploader:profiles!songs_uploaded_by_fkey(id, display_name, avatar_url),
        favorites!left(id, user_id)
      `)
            .eq('group_id', groupId)
            .order('created_at', { ascending: false })

        if (error) throw error

        return (data ?? []).map((song: Song & { favorites?: { user_id: string }[] }) => ({
            ...song,
            is_favorite: song.favorites?.some((f) => f.user_id === userId) ?? false,
        }))
    },

    /**
     * Fetch a single song by ID.
     */
    async getSong(songId: string, userId: string): Promise<Song> {
        const { data, error } = await supabase
            .from('songs')
            .select(`
        *,
        uploader:profiles!songs_uploaded_by_fkey(id, display_name, avatar_url),
        favorites!left(id, user_id)
      `)
            .eq('id', songId)
            .single()

        if (error) throw error

        return {
            ...data,
            is_favorite: (data.favorites as { user_id: string }[])?.some((f) => f.user_id === userId) ?? false,
        } as Song
    },

    /**
     * Upload a song audio file + optional cover image.
     * Saves metadata and returns the new song record.
     * Automatically extracts audio duration.
     */
    async uploadSong(
        userId: string,
        groupId: string,
        audioFile: File,
        coverFile: File | null,
        metadata: SongFormData
    ): Promise<Song> {
        // Extract audio duration
        let duration: number | null = null
        try {
            duration = await extractAudioDuration(audioFile)
        } catch {
            console.warn('Failed to extract audio duration')
        }

        // Upload audio
        const audioPath = generateStoragePath('audio', groupId, audioFile.name)
        const { error: audioError } = await supabase.storage
            .from(STORAGE_BUCKETS.SONGS)
            .upload(audioPath, audioFile, { cacheControl: '3600', upsert: false })

        if (audioError) throw audioError

        const audioUrl = getStorageUrl(STORAGE_BUCKETS.SONGS, audioPath)!

        // Upload cover (optional)
        let coverUrl: string | null = null
        if (coverFile) {
            const coverPath = generateStoragePath('covers', groupId, coverFile.name)
            const { error: coverError } = await supabase.storage
                .from(STORAGE_BUCKETS.SONG_COVERS)
                .upload(coverPath, coverFile, { cacheControl: '3600', upsert: false })

            if (!coverError) {
                coverUrl = getStorageUrl(STORAGE_BUCKETS.SONG_COVERS, coverPath)
            }
        }

        // Save metadata
        const { data, error } = await supabase
            .from('songs')
            .insert({
                group_id: groupId,
                uploaded_by: userId,
                title: metadata.title,
                artist_name: metadata.artist_name,
                album_name: metadata.album_name || null,
                cover_url: coverUrl,
                audio_url: audioUrl,
                duration_seconds: duration,
                file_size: audioFile.size,
                mime_type: audioFile.type,
            })
            .select()
            .single()

        if (error) throw error
        return data as Song
    },

    /**
     * Delete a song (storage cleanup + DB row).
     * Only the uploader or group owner should call this.
     */
    async deleteSong(songId: string): Promise<void> {
        const { error } = await supabase.from('songs').delete().eq('id', songId)
        if (error) throw error
        // Storage cleanup is handled by a DB trigger or bucket lifecycle policy
    },
}
