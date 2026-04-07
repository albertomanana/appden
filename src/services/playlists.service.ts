import { supabase } from '@lib/supabase/client'
import { songsService } from '@services/songs.service'
import type { Playlist, PlaylistSong, Profile } from '@/types'
import type { PlaylistFormData } from '@lib/validators'

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

async function fetchPlaylistSongCounts(playlistIds: string[]): Promise<Map<string, number>> {
    const uniqueIds = Array.from(new Set(playlistIds.filter(Boolean)))
    if (uniqueIds.length === 0) return new Map()

    const { data, error } = await supabase
        .from('playlist_songs')
        .select('playlist_id')
        .in('playlist_id', uniqueIds)

    if (error) {
        console.warn('[Playlists] Failed to load playlist counts:', error)
        return new Map()
    }

    const counts = new Map<string, number>()
    for (const row of data ?? []) {
        counts.set(row.playlist_id, (counts.get(row.playlist_id) ?? 0) + 1)
    }

    return counts
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
        const [creatorMap, countMap] = await Promise.all([
            fetchProfilesMap(playlists.map((playlist) => playlist.created_by)),
            fetchPlaylistSongCounts(playlists.map((playlist) => playlist.id)),
        ])

        return playlists.map((playlist) => ({
            ...playlist,
            creator: creatorMap.get(playlist.created_by),
            song_count: countMap.get(playlist.id) ?? 0,
        }))
    },

    async getPlaylist(playlistId: string, userId: string): Promise<Playlist> {
        const { data, error } = await supabase
            .from('playlists')
            .select('*')
            .eq('id', playlistId)
            .single()

        if (error) throw error

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

        const playlistSongs = (playlistSongsResult.data ?? []) as PlaylistSong[]
        const songs = await songsService.getSongsByIds(
            playlistSongs.map((entry) => entry.song_id),
            userId
        )
        const songMap = new Map(songs.map((song) => [song.id, song]))

        return {
            ...playlist,
            creator: creatorMap.get(playlist.created_by),
            song_count: playlistSongs.length,
            songs: playlistSongs.map((entry) => ({
                ...entry,
                song: songMap.get(entry.song_id),
            })),
        }
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
            .single()

        if (error) throw error
        return data as Playlist
    },

    async deletePlaylist(playlistId: string): Promise<void> {
        const { error } = await supabase
            .from('playlists')
            .delete()
            .eq('id', playlistId)

        if (error) throw error
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

        if (error) throw error
    },

    async removeSong(playlistId: string, songId: string): Promise<void> {
        const { error } = await supabase
            .from('playlist_songs')
            .delete()
            .eq('playlist_id', playlistId)
            .eq('song_id', songId)

        if (error) throw error
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
