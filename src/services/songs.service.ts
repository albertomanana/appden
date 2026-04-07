import { supabase, STORAGE_BUCKETS, getStorageUrl } from '@lib/supabase/client'
import { generateStoragePath, extractAudioDuration } from '@lib/utils'
import type { Profile, Song, SongArtistCredit } from '@/types'
import type { SongFormData } from '@lib/validators'
import {
    buildArtistSummary,
    normalizeArtistCreditsInput,
    type SongArtistCreditDraft,
} from '@features/music/utils/artistCredits'

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

            if (pathname.includes(signedPrefix)) return pathname.split(signedPrefix)[1] ?? null
            if (pathname.includes(publicPrefix)) return pathname.split(publicPrefix)[1] ?? null
            if (pathname.includes(objectPrefix)) return pathname.split(objectPrefix)[1] ?? null
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

type SupabaseLikeError = {
    code?: string
    message?: string
    details?: string
    hint?: string
    statusCode?: string | number
}

type SongRow = Omit<Song, 'uploader' | 'owners' | 'artist_credits' | 'is_favorite'>

type SongOwnerRow = {
    song_id: string
    user_id: string
    role: 'owner' | 'contributor'
    profile?: Profile | Profile[]
}

function buildSongStoragePath(
    kind: 'audio' | 'cover',
    groupId: string,
    userId: string,
    filename: string
): string {
    return generateStoragePath(`${groupId}/${kind}`, userId, filename)
}

function formatSongUploadError(
    stage: 'audio' | 'cover' | 'metadata',
    error: SupabaseLikeError
): Error {
    const raw = `${error.code ?? ''} ${error.message ?? ''} ${error.details ?? ''} ${error.hint ?? ''}`.toLowerCase()

    if (raw.includes('bucket not found')) {
        return new Error('El bucket de Storage no existe en Supabase. Ejecuta la migracion 011 o el setup de buckets antes de subir musica.')
    }

    if (raw.includes('row-level security') || raw.includes('permission denied') || raw.includes('42501')) {
        if (stage === 'metadata') {
            return new Error('Supabase esta bloqueando la insercion en songs por permisos. Revisa RLS y confirma que el usuario pertenece al grupo.')
        }

        return new Error('Supabase Storage esta bloqueando la subida del archivo. Revisa las policies del bucket songs/covers antes de relanzar.')
    }

    if (raw.includes('payload too large') || raw.includes('entity too large')) {
        return new Error('El archivo es demasiado grande para subirse correctamente.')
    }

    if (raw.includes('mime') || raw.includes('content-type')) {
        return new Error('El formato del archivo no es compatible con la subida actual.')
    }

    if (raw.includes('relation') && raw.includes('does not exist')) {
        return new Error('La tabla o relacion necesaria para subir canciones no existe en Supabase. Revisa las migraciones pendientes.')
    }

    if (stage === 'audio') {
        return new Error(error.message || 'No se pudo subir el audio a Supabase Storage.')
    }

    if (stage === 'cover') {
        return new Error(error.message || 'No se pudo subir la portada a Supabase Storage.')
    }

    return new Error(error.message || 'No se pudo guardar la cancion en la base de datos.')
}

function isMissingRelationError(error: unknown): boolean {
    if (!error || typeof error !== 'object') return false
    const anyError = error as SupabaseLikeError
    const raw = `${anyError.code ?? ''} ${anyError.message ?? ''} ${anyError.details ?? ''} ${anyError.hint ?? ''}`.toLowerCase()

    return (
        raw.includes('42p01') ||
        raw.includes('pgrst200') ||
        raw.includes('pgrst205') ||
        (raw.includes('relation') && raw.includes('does not exist')) ||
        (raw.includes('could not find') && raw.includes('relationship'))
    )
}

async function cleanupUploadedAssets(paths: Array<{ bucket: string; path: string | null }>): Promise<void> {
    await Promise.all(
        paths
            .filter((entry): entry is { bucket: string; path: string } => !!entry.path)
            .map(async ({ bucket, path }) => {
                try {
                    await supabase.storage.from(bucket).remove([path])
                } catch {
                    // Best-effort cleanup only.
                }
            })
    )
}

async function fetchProfilesMap(userIds: string[]): Promise<Map<string, Profile>> {
    const uniqueIds = Array.from(new Set(userIds.filter(Boolean)))
    if (uniqueIds.length === 0) return new Map()

    const { data, error } = await supabase
        .from('profiles')
        .select('id, display_name, username, avatar_url, bio, created_at, updated_at')
        .in('id', uniqueIds)

    if (error) {
        console.warn('[Songs] Failed to load uploader profiles:', error)
        return new Map()
    }

    return new Map((data ?? []).map((profile) => [profile.id, profile]))
}

function normalizeProfileRecord(
    profile: Profile | Profile[] | null | undefined
): Profile | undefined {
    if (Array.isArray(profile)) {
        return (profile[0] as Profile | undefined) ?? undefined
    }

    return profile ?? undefined
}

async function fetchSongOwnersMap(songIds: string[]): Promise<Map<string, Song['owners']>> {
    const uniqueIds = Array.from(new Set(songIds.filter(Boolean)))
    if (uniqueIds.length === 0) return new Map()

    const { data, error } = await supabase
        .from('song_owners')
        .select('song_id, user_id, role, profile:profiles(id, display_name, username, avatar_url, bio, created_at, updated_at)')
        .in('song_id', uniqueIds)

    if (error) {
        if (!isMissingRelationError(error)) {
            console.warn('[Songs] Failed to load song owners:', error)
        }
        return new Map()
    }

    const ownersMap = new Map<string, Song['owners']>()
    for (const row of (data ?? []) as unknown as SongOwnerRow[]) {
        const current = ownersMap.get(row.song_id) ?? []
        current.push({
            user_id: row.user_id,
            role: row.role,
            profile: normalizeProfileRecord(row.profile),
        })
        ownersMap.set(row.song_id, current)
    }

    return ownersMap
}

async function fetchSongArtistCreditsMap(songIds: string[]): Promise<Map<string, SongArtistCredit[]>> {
    const uniqueIds = Array.from(new Set(songIds.filter(Boolean)))
    if (uniqueIds.length === 0) return new Map()

    const { data, error } = await supabase
        .from('song_artist_credits')
        .select('id, song_id, position, profile_id, artist_name, added_by, created_at, profile:profiles(id, display_name, username, avatar_url, bio, created_at, updated_at)')
        .in('song_id', uniqueIds)
        .order('position', { ascending: true })

    if (error) {
        if (!isMissingRelationError(error)) {
            console.warn('[Songs] Failed to load artist credits:', error)
        }
        return new Map()
    }

    const creditsMap = new Map<string, SongArtistCredit[]>()
    for (const row of (data ?? []) as unknown as SongArtistCredit[]) {
        const current = creditsMap.get(row.song_id) ?? []
        current.push({
            ...row,
            profile: normalizeProfileRecord(row.profile as Profile | Profile[] | null | undefined),
        })
        creditsMap.set(row.song_id, current)
    }

    return creditsMap
}

async function fetchFavoritesSet(songIds: string[], userId: string): Promise<Set<string>> {
    const uniqueIds = Array.from(new Set(songIds.filter(Boolean)))
    if (uniqueIds.length === 0 || !userId) return new Set()

    const { data, error } = await supabase
        .from('favorites')
        .select('song_id')
        .eq('user_id', userId)
        .in('song_id', uniqueIds)

    if (error) {
        console.warn('[Songs] Failed to load favorites:', error)
        return new Set()
    }

    return new Set((data ?? []).map((favorite) => favorite.song_id))
}

async function signSongMedia(song: SongRow): Promise<Pick<Song, 'audio_url' | 'cover_url'>> {
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
        } catch (error) {
            console.warn('[Songs] Failed to sign audio URL:', error)
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
        } catch (error) {
            console.warn('[Songs] Failed to sign cover URL:', error)
        }
    }

    return {
        audio_url: audioUrl,
        cover_url: coverUrl,
    }
}

async function hydrateSongs(rows: SongRow[], userId: string): Promise<Song[]> {
    if (rows.length === 0) return []

    const songIds = rows.map((row) => row.id)
    const uploaderIds = rows.map((row) => row.uploaded_by)

    const [uploaderMap, ownersMap, creditsMap, favoritesSet] = await Promise.all([
        fetchProfilesMap(uploaderIds),
        fetchSongOwnersMap(songIds),
        fetchSongArtistCreditsMap(songIds),
        fetchFavoritesSet(songIds, userId),
    ])

    return Promise.all(
        rows.map(async (row) => {
            const media = await signSongMedia(row)
            const artistCredits = creditsMap.get(row.id) ?? []
            const artistSummary = buildArtistSummary(artistCredits) || row.artist_name

            return {
                ...row,
                ...media,
                uploader: uploaderMap.get(row.uploaded_by),
                owners: ownersMap.get(row.id) ?? [],
                artist_credits: artistCredits,
                artist_name: artistSummary,
                is_favorite: favoritesSet.has(row.id),
            } satisfies Song
        })
    )
}

async function fetchSongsRaw(filters?: {
    groupId?: string
    uploadedBy?: string
    songIds?: string[]
    songId?: string
}): Promise<SongRow[]> {
    let query = supabase
        .from('songs')
        .select('*')
        .order('created_at', { ascending: false })

    if (filters?.groupId) {
        query = query.eq('group_id', filters.groupId)
    }

    if (filters?.uploadedBy) {
        query = query.eq('uploaded_by', filters.uploadedBy)
    }

    if (filters?.songId) {
        query = query.eq('id', filters.songId)
    }

    if (filters?.songIds && filters.songIds.length > 0) {
        query = query.in('id', filters.songIds)
    }

    const { data, error } = await query

    if (error) throw error
    return (data ?? []) as SongRow[]
}

async function syncSongArtistCredits(
    songId: string,
    userId: string,
    credits: SongArtistCreditDraft[]
): Promise<void> {
    const { error: deleteError } = await supabase
        .from('song_artist_credits')
        .delete()
        .eq('song_id', songId)

    if (deleteError && !isMissingRelationError(deleteError)) {
        throw deleteError
    }

    if (deleteError && isMissingRelationError(deleteError)) {
        return
    }

    if (credits.length === 0) return

    const { error: insertError } = await supabase
        .from('song_artist_credits')
        .insert(
            credits.map((credit, index) => ({
                song_id: songId,
                position: index,
                profile_id: credit.source === 'profile' ? credit.profile_id : null,
                artist_name: credit.source === 'manual' ? credit.artist_name : null,
                added_by: userId,
            }))
        )

    if (insertError && !isMissingRelationError(insertError)) {
        throw insertError
    }
}

function normalizeSongInput(metadata: SongFormData): {
    title: string
    album_name: string | null
    artist_credits: SongArtistCreditDraft[]
    artist_name: string
} {
    const artistCredits = normalizeArtistCreditsInput(metadata.artist_credits)
    const artistSummary = buildArtistSummary(artistCredits)

    if (!artistSummary) {
        throw new Error('Anade al menos un artista valido antes de guardar la cancion.')
    }

    if (artistSummary.length > 200) {
        throw new Error('La combinacion de artistas es demasiado larga. Reduce nombres o numero de artistas.')
    }

    return {
        title: metadata.title.trim(),
        album_name: metadata.album_name?.trim() || null,
        artist_credits: artistCredits,
        artist_name: artistSummary,
    }
}

export const songsService = {
    async getSongs(groupId: string, userId: string): Promise<Song[]> {
        const rows = await fetchSongsRaw({ groupId })
        return hydrateSongs(rows, userId)
    },

    async getSongsByIds(songIds: string[], userId: string): Promise<Song[]> {
        const uniqueIds = Array.from(new Set(songIds.filter(Boolean)))
        if (uniqueIds.length === 0) return []

        const rows = await fetchSongsRaw({ songIds: uniqueIds })
        const songs = await hydrateSongs(rows, userId)
        const byId = new Map(songs.map((song) => [song.id, song]))

        return uniqueIds
            .map((id) => byId.get(id))
            .filter((song): song is Song => !!song)
    },

    async getSongsByOwner(groupId: string, ownerId: string, viewerUserId: string): Promise<Song[]> {
        const songs = await this.getSongs(groupId, viewerUserId)
        return songs.filter((song) => song.uploaded_by === ownerId || song.owners?.some((owner) => owner.user_id === ownerId))
    },

    async getSongsByArtist(artistId: string, viewerUserId: string): Promise<Song[]> {
        const rows = await fetchSongsRaw({ uploadedBy: artistId })
        return hydrateSongs(rows, viewerUserId)
    },

    async getSong(songId: string, userId: string): Promise<Song> {
        const rows = await fetchSongsRaw({ songId })
        const [song] = await hydrateSongs(rows, userId)

        if (!song) {
            throw new Error('Cancion no encontrada.')
        }

        return song
    },

    async uploadSong(
        userId: string,
        groupId: string,
        audioFile: File,
        coverFile: File | null,
        metadata: SongFormData
    ): Promise<Song> {
        const normalizedMetadata = normalizeSongInput(metadata)

        let duration: number | null = null
        try {
            duration = await extractAudioDuration(audioFile)
        } catch {
            console.warn('[Songs] Failed to extract audio duration')
        }

        const audioPath = buildSongStoragePath('audio', groupId, userId, audioFile.name)
        const { error: audioError } = await supabase.storage
            .from(STORAGE_BUCKETS.SONGS)
            .upload(audioPath, audioFile, {
                cacheControl: '3600',
                upsert: false,
                contentType: audioFile.type || undefined,
            })

        if (audioError) throw formatSongUploadError('audio', audioError)

        let coverPath: string | null = null
        if (coverFile) {
            coverPath = buildSongStoragePath('cover', groupId, userId, coverFile.name)
            const { error: coverError } = await supabase.storage
                .from(STORAGE_BUCKETS.COVERS)
                .upload(coverPath, coverFile, {
                    cacheControl: '3600',
                    upsert: false,
                    contentType: coverFile.type || undefined,
                })

            if (coverError) {
                await cleanupUploadedAssets([{ bucket: STORAGE_BUCKETS.SONGS, path: audioPath }])
                throw formatSongUploadError('cover', coverError)
            }
        }

        const { data, error } = await supabase
            .from('songs')
            .insert({
                group_id: groupId,
                uploaded_by: userId,
                title: normalizedMetadata.title,
                artist_name: normalizedMetadata.artist_name,
                album_name: normalizedMetadata.album_name,
                cover_url: coverPath,
                audio_url: audioPath,
                duration_seconds: duration,
                file_size: audioFile.size,
                mime_type: audioFile.type || null,
            })
            .select('id')
            .single()

        if (error) {
            await cleanupUploadedAssets([
                { bucket: STORAGE_BUCKETS.SONGS, path: audioPath },
                { bucket: STORAGE_BUCKETS.COVERS, path: coverPath },
            ])
            throw formatSongUploadError('metadata', error)
        }

        try {
            await syncSongArtistCredits(data.id, userId, normalizedMetadata.artist_credits)
        } catch (creditError) {
            await supabase.from('songs').delete().eq('id', data.id)
            await cleanupUploadedAssets([
                { bucket: STORAGE_BUCKETS.SONGS, path: audioPath },
                { bucket: STORAGE_BUCKETS.COVERS, path: coverPath },
            ])
            throw creditError
        }

        return this.getSong(data.id, userId)
    },

    async deleteSong(songId: string): Promise<void> {
        const { data: songData } = await supabase
            .from('songs')
            .select('audio_url, cover_url')
            .eq('id', songId)
            .maybeSingle()

        const { error } = await supabase.from('songs').delete().eq('id', songId)
        if (error) throw error

        await cleanupUploadedAssets([
            {
                bucket: STORAGE_BUCKETS.SONGS,
                path: normalizeStoragePath(songData?.audio_url, STORAGE_BUCKETS.SONGS),
            },
            {
                bucket: STORAGE_BUCKETS.COVERS,
                path: normalizeCoverPath(songData?.cover_url),
            },
        ])
    },

    async updateSong(songId: string, userId: string, data: SongFormData): Promise<Song> {
        const normalizedMetadata = normalizeSongInput(data)

        const { error } = await supabase
            .from('songs')
            .update({
                title: normalizedMetadata.title,
                artist_name: normalizedMetadata.artist_name,
                album_name: normalizedMetadata.album_name,
            })
            .eq('id', songId)

        if (error) throw error

        await syncSongArtistCredits(songId, userId, normalizedMetadata.artist_credits)
        return this.getSong(songId, userId)
    },
}
