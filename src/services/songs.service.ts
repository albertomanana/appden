import { supabase, STORAGE_BUCKETS, getStorageUrl } from '@lib/supabase/client'
import { generateStoragePath, extractAudioDuration } from '@lib/utils'
import type { Song } from '@/types'
import type { SongFormData } from '@lib/validators'

function normalizeStoragePath(
    rawValue: string | null | undefined,
    bucket: string
): string | null {
    if (!rawValue) return null

    const trimmed = rawValue.trim()
    if (!trimmed) return null

    if (/^https?:\/\//i.test(trimmed)) {
        try {
            const url = new URL(trimmed)
            const pathname = decodeURIComponent(url.pathname)

            const signedPrefix = `/storage/v1/object/sign/${bucket}/`
            const publicPrefix = `/storage/v1/object/public/${bucket}/`
            const objectPrefix = `/storage/v1/object/${bucket}/`

            if (pathname.includes(signedPrefix)) {
                return pathname.split(signedPrefix)[1] ?? null
            }
            if (pathname.includes(publicPrefix)) {
                return pathname.split(publicPrefix)[1] ?? null
            }
            if (pathname.includes(objectPrefix)) {
                return pathname.split(objectPrefix)[1] ?? null
            }

            return null
        } catch {
            return null
        }
    }

    return trimmed.replace(/^\/+/, '')
}

function normalizeCoverPath(rawValue: string | null | undefined): string | null {
    return normalizeStoragePath(rawValue, STORAGE_BUCKETS.COVERS)
}

async function signCoverUrl(path: string): Promise<string | null> {
    return getStorageUrl(STORAGE_BUCKETS.COVERS, path)
}

export const songsService = {
    /**
     * Fetch all songs for a group, joining uploader profile and favorite status.
     * Generates fresh signed URLs for each song on fetch.
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

        // Generate fresh signed URLs for all songs
        const songsWithUrls = await Promise.all(
            (data ?? []).map(async (song: any) => {
                let audioUrl = song.audio_url
                let coverUrl = song.cover_url

                // Re-generate signed URL for audio
                if (audioUrl) {
                    try {
                        const path = normalizeStoragePath(audioUrl, STORAGE_BUCKETS.SONGS)
                        if (!path) {
                            console.warn('[Songs] Invalid audio path format, using original value')
                        } else {
                            console.log('[Songs] Signing audio URL, path:', path)
                            const signed = await getStorageUrl(STORAGE_BUCKETS.SONGS, path)
                            if (signed) audioUrl = signed
                        }
                    } catch (err) {
                        console.warn('[Songs] Failed to sign audio URL:', err)
                    }
                }

                // Re-generate signed URL for cover
                if (coverUrl) {
                    try {
                        const path = normalizeCoverPath(coverUrl)
                        if (!path) {
                            console.warn('[Songs] Invalid cover path format, using original value')
                        } else {
                            console.log('[Songs] Signing cover URL, path:', path)
                            const signed = await signCoverUrl(path)
                            if (signed) coverUrl = signed
                        }
                    } catch (err) {
                        console.warn('[Songs] Failed to sign cover URL:', err)
                    }
                }

                return {
                    ...song,
                    audio_url: audioUrl,
                    cover_url: coverUrl,
                    is_favorite: song.favorites?.some((f: any) => f.user_id === userId) ?? false,
                }
            })
        )

        return songsWithUrls as Song[]
    },

    /**
     * Get all songs by a specific artist/user
     */
    async getSongsByArtist(artistId: string, userId: string): Promise<Song[]> {
        const { data, error } = await supabase
            .from('songs')
            .select(`
        *,
        uploader:profiles!songs_uploaded_by_fkey(id, display_name, avatar_url),
        favorites!left(id, user_id)
      `)
            .eq('uploaded_by', artistId)
            .order('created_at', { ascending: false })

        if (error) throw error

        const songsWithUrls = await Promise.all(
            (data ?? []).map(async (song: any) => {
                let audioUrl = song.audio_url
                let coverUrl = song.cover_url

                if (audioUrl) {
                    try {
                        const path = normalizeStoragePath(audioUrl, STORAGE_BUCKETS.SONGS)
                        if (!path) {
                            console.warn('[Songs] Invalid audio path format, using original value')
                        } else {
                            const signed = await getStorageUrl(STORAGE_BUCKETS.SONGS, path)
                            if (signed) audioUrl = signed
                        }
                    } catch (err) {
                        console.warn('[Songs] Failed to sign audio URL:', err)
                    }
                }

                if (coverUrl) {
                    try {
                        const path = normalizeCoverPath(coverUrl)
                        if (!path) {
                            console.warn('[Songs] Invalid cover path format, using original value')
                        } else {
                            const signed = await signCoverUrl(path)
                            if (signed) coverUrl = signed
                        }
                    } catch (err) {
                        console.warn('[Songs] Failed to sign cover URL:', err)
                    }
                }

                return {
                    ...song,
                    audio_url: audioUrl,
                    cover_url: coverUrl,
                    is_favorite: song.favorites?.some((f: any) => f.user_id === userId) ?? false,
                }
            })
        )

        return songsWithUrls as Song[]
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

        let audioUrl = data.audio_url
        let coverUrl = data.cover_url

        if (audioUrl) {
            try {
                const path = normalizeStoragePath(audioUrl, STORAGE_BUCKETS.SONGS)
                if (!path) {
                    console.warn('[Songs] Invalid audio path format, using original value')
                } else {
                    const signed = await getStorageUrl(STORAGE_BUCKETS.SONGS, path)
                    if (signed) audioUrl = signed
                }
            } catch (err) {
                console.warn('[Songs] Failed to sign audio URL:', err)
            }
        }

        if (coverUrl) {
            try {
                const path = normalizeCoverPath(coverUrl)
                if (!path) {
                    console.warn('[Songs] Invalid cover path format, using original value')
                } else {
                    const signed = await signCoverUrl(path)
                    if (signed) coverUrl = signed
                }
            } catch (err) {
                console.warn('[Songs] Failed to sign cover URL:', err)
            }
        }

        return {
            ...data,
            audio_url: audioUrl,
            cover_url: coverUrl,
            is_favorite: (data.favorites as { user_id: string }[])?.some((f) => f.user_id === userId) ?? false,
        } as Song
    },

    /**
     * Upload a song audio file + optional cover image.
     * Saves metadata with storage paths only (not signed URLs).
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
        const audioPath = generateStoragePath('audio', userId, audioFile.name)
        const { error: audioError } = await supabase.storage
            .from(STORAGE_BUCKETS.SONGS)
            .upload(audioPath, audioFile, { cacheControl: '3600', upsert: false })

        if (audioError) throw audioError

        // Upload cover (optional)
        let coverPath: string | null = null
        if (coverFile) {
            coverPath = generateStoragePath('covers', userId, coverFile.name)
            const { error: coverError } = await supabase.storage
                .from(STORAGE_BUCKETS.COVERS)
                .upload(coverPath, coverFile, { cacheControl: '3600', upsert: false })

            if (coverError) {
                console.warn('Failed to upload cover:', coverError)
                coverPath = null
            }
        }

        // Save metadata with storage paths (not signed URLs)
        const { data, error } = await supabase
            .from('songs')
            .insert({
                group_id: groupId,
                uploaded_by: userId,
                title: metadata.title,
                artist_name: metadata.artist_name,
                album_name: metadata.album_name || null,
                cover_url: coverPath, // Store path, not signed URL
                audio_url: audioPath, // Store path, not signed URL
                duration_seconds: duration,
                file_size: audioFile.size,
                mime_type: audioFile.type,
            })
            .select()
            .single()

        if (error) throw error

        // Generate signed URLs for response
        let responseAudioUrl = data.audio_url
        let responseCoverUrl = data.cover_url

        try {
            const signed = await getStorageUrl(STORAGE_BUCKETS.SONGS, audioPath)
            if (signed) responseAudioUrl = signed
        } catch (err) {
            console.warn('Failed to sign audio URL:', err)
        }

        if (responseCoverUrl) {
            try {
                const signed = await signCoverUrl(coverPath!)
                if (signed) responseCoverUrl = signed
            } catch (err) {
                console.warn('Failed to sign cover URL:', err)
            }
        }

        return {
            ...data,
            audio_url: responseAudioUrl,
            cover_url: responseCoverUrl,
        } as Song
    },

    /**
     * Delete a song (storage cleanup + DB row).
     * Only the uploader or group owner should call this.
     */
    async deleteSong(songId: string): Promise<void> {
        const { error } = await supabase.from('songs').delete().eq('id', songId)
        if (error) throw error
    },

    /**
     * Update song metadata (title, artist, album).
     * Only the uploader can update.
     */
    async updateSong(
        songId: string,
        data: Partial<{ title: string; artist_name: string; album_name: string | null }>
    ): Promise<Song> {
        const { data: updated, error } = await supabase
            .from('songs')
            .update(data)
            .eq('id', songId)
            .select()
            .single()

        if (error) throw error
        return updated as Song
    },
}
