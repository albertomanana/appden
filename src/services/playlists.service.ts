import { supabase } from '@lib/supabase/client'
import { songsService } from '@services/songs.service'
import type { Playlist, PlaylistSong, Profile } from '@/types'
import type { PlaylistFormData } from '@lib/validators'

const PREVIEW_SIZE = 4

async function fetchProfilesMap(userIds: string[]): Promise<Map<string, Profile>> {
    const uniqueIds = Array.from(new Set(userIds.filter(Boolean)))
    if (uniqueIds.length === 0) return new Map()

    const { data, error } = await supabase
        .from('profiles')
        .select('id, display_name, username, avatar_url, bio, created_at, updated_at')
        .in('id', uniqueIds)

    if (error) {
        console.warn('[Playlists] Failed to load creator profiles:', error)
        return new Map()
    }

    return new Map((data ?? []).map((profile) => [profile.id, profile]))
}

/** Song count + the first song ids (by position) of each playlist, in one query. */
async function fetchPlaylistSongSummary(
    playlistIds: string[]
): Promise<Map<string, { count: number; previewIds: string[] }>> {
    const uniqueIds = Array.from(new Set(playlistIds.filter(Boolean)))
    if (uniqueIds.length === 0) return new Map()

    const { data, error } = await supabase
        .from('playlist_songs')
        .select('playlist_id, song_id, position')
        .in('playlist_id', uniqueIds)
        .order('position', { ascending: true })

    if (error) {
        console.warn('[Playlists] Failed to load playlist songs:', error)
        return new Map()
    }

    const summary = new Map<string, { count: number; previewIds: string[] }>()
    const rows = [...((data ?? []) as Array<{ playlist_id: string; song_id: string; position: number }>)].sort(
        (a, b) => a.position - b.position
    )
    for (const row of rows) {
        const current = summary.get(row.playlist_id) ?? { count: 0, previewIds: [] }
        current.count += 1
        if (current.previewIds.length < PREVIEW_SIZE) current.previewIds.push(row.song_id)
        summary.set(row.playlist_id, current)
    }

    return summary
}

export const playlistsService = {
    async getPlaylists(groupId: string): Promise<Playlist[]> {
        const { data, error } = await supabase
            .from('playlists')
            .select('*')
            .eq('group_id', groupId)
            .order('created_at', { ascending: false })

        if (error) throw error

        const playlists = (data ?? []) as Playlist[]
        const [creatorMap, summaryMap] = await Promise.all([
            fetchProfilesMap(playlists.map((playlist) => playlist.created_by)),
            fetchPlaylistSongSummary(playlists.map((playlist) => playlist.id)),
        ])

        return playlists.map((playlist) => ({
            ...playlist,
            creator: creatorMap.get(playlist.created_by),
            song_count: summaryMap.get(playlist.id)?.count ?? 0,
            preview_song_ids: summaryMap.get(playlist.id)?.previewIds ?? [],
        }))
    },

    async getPlaylist(playlistId: string, userId: string): Promise<Playlist> {
        const { data, error } = await supabase
            .from('playlists')
            .select('*')
            .eq('id', playlistId)
            .maybeSingle()

        if (error) throw error
        if (!data) throw new Error('No encontramos esta playlist. Puede que se haya eliminado.')

        const playlist = data as Playlist
        const [creatorMap, playlistSongsResult] = await Promise.all([
            fetchProfilesMap([playlist.created_by]),
            supabase
                .from('playlist_songs')
                .select('*')
                .eq('playlist_id', playlistId)
                .order('position', { ascending: true }),
        ])

        if (playlistSongsResult.error) throw playlistSongsResult.error

        const playlistSongs = [...((playlistSongsResult.data ?? []) as PlaylistSong[])].sort(
            (a, b) => a.position - b.position
        )
        const songs = await songsService.getSongsByIds(
            playlistSongs.map((entry) => entry.song_id),
            userId
        )
        const songMap = new Map(songs.map((song) => [song.id, song]))

        return {
            ...playlist,
            creator: creatorMap.get(playlist.created_by),
            song_count: playlistSongs.length,
            preview_song_ids: playlistSongs.slice(0, PREVIEW_SIZE).map((entry) => entry.song_id),
            songs: playlistSongs.map((entry) => ({
                ...entry,
                song: songMap.get(entry.song_id),
            })),
        }
    },

    /** Ids of the playlists that already contain a song. */
    async getPlaylistIdsWithSong(songId: string): Promise<string[]> {
        const { data, error } = await supabase
            .from('playlist_songs')
            .select('playlist_id')
            .eq('song_id', songId)

        if (error) throw error
        return ((data ?? []) as Array<{ playlist_id: string }>).map((row) => row.playlist_id)
    },

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
                name: form.name.trim(),
                description: form.description?.trim() || null,
            })
            .select('*')
            .single()

        if (error) throw error

        return {
            ...(data as Playlist),
            song_count: 0,
            preview_song_ids: [],
        }
    },

    async updatePlaylist(
        playlistId: string,
        form: PlaylistFormData
    ): Promise<Playlist> {
        const { data, error } = await supabase
            .from('playlists')
            .update({
                name: form.name.trim(),
                description: form.description?.trim() || null,
                updated_at: new Date().toISOString(),
            })
            .eq('id', playlistId)
            .select('*')

        if (error) throw error
        const [updated] = (data ?? []) as Playlist[]
        if (!updated) throw new Error('Solo quien creó la playlist puede editarla.')
        return updated
    },

    async deletePlaylist(playlistId: string): Promise<void> {
        const { data, error } = await supabase
            .from('playlists')
            .delete()
            .eq('id', playlistId)
            .select('id')

        if (error) throw error
        if (!data || data.length === 0) throw new Error('Solo quien creó la playlist puede eliminarla.')
    },

    async addSong(
        playlistId: string,
        songId: string,
        userId: string
    ): Promise<void> {
        const { data: existing, error: existingError } = await supabase
            .from('playlist_songs')
            .select('position')
            .eq('playlist_id', playlistId)
            .order('position', { ascending: false })
            .limit(1)

        if (existingError) throw existingError

        const nextPosition = ((existing?.[0] as { position: number } | undefined)?.position ?? -1) + 1

        const { error } = await supabase.from('playlist_songs').insert({
            playlist_id: playlistId,
            song_id: songId,
            position: nextPosition,
            added_by: userId,
        })

        if (error) {
            if (error.code === '23505') throw new Error('Esta canción ya está en la playlist.')
            throw error
        }
    },

    async removeSong(playlistId: string, songId: string): Promise<void> {
        const { data, error } = await supabase
            .from('playlist_songs')
            .delete()
            .eq('playlist_id', playlistId)
            .eq('song_id', songId)
            .select('id')

        if (error) throw error
        if (!data || data.length === 0) {
            throw new Error('Solo quien creó la playlist (o quien añadió la canción) puede quitarla.')
        }
    },

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
        const failed = results.find((result) => result.error)
        if (failed?.error) throw failed.error
    },
}
