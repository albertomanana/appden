import { supabase, STORAGE_BUCKETS, getStorageUrl } from '@lib/supabase/client'
import { generateStoragePath } from '@lib/utils'
import type { AlbumRow } from '@features/music/types'

type SupabaseLikeError = { code?: string; message?: string; details?: string; hint?: string }

/** True when the `albums` table (migration 016) is not in the database yet. */
export function isAlbumsUnavailableError(error: unknown): boolean {
    if (!error || typeof error !== 'object') return false
    const anyError = error as SupabaseLikeError
    const raw = `${anyError.code ?? ''} ${anyError.message ?? ''} ${anyError.details ?? ''} ${anyError.hint ?? ''}`.toLowerCase()

    return (
        raw.includes('42p01') ||
        raw.includes('pgrst205') ||
        (raw.includes('relation') && raw.includes('does not exist')) ||
        (raw.includes('could not find') && raw.includes('albums'))
    )
}

type RawAlbumRow = Omit<AlbumRow, 'cover_path'>

export type AlbumRowsResult = {
    /** False when migration 016 is missing: albums are then derived from `songs.album_name`. */
    available: boolean
    rows: AlbumRow[]
}

async function signCover(path: string | null): Promise<string | null> {
    if (!path) return null
    try {
        return await getStorageUrl(STORAGE_BUCKETS.COVERS, path)
    } catch (error) {
        console.warn('[Albums] Failed to sign cover URL:', error)
        return null
    }
}

export const albumsService = {
    async listRows(groupId: string): Promise<AlbumRowsResult> {
        const { data, error } = await supabase
            .from('albums')
            .select('id, group_id, title, cover_url, created_by, created_at')
            .eq('group_id', groupId)
            .order('created_at', { ascending: false })

        if (error) {
            if (isAlbumsUnavailableError(error)) {
                return { available: false, rows: [] }
            }
            throw error
        }

        const rows = await Promise.all(
            ((data ?? []) as RawAlbumRow[]).map(async (row) => ({
                ...row,
                cover_path: row.cover_url,
                cover_url: await signCover(row.cover_url),
            }))
        )

        return { available: true, rows }
    },

    /** Renames an album and/or replaces its cover. Songs follow the new title via trigger. */
    async updateAlbum(
        album: AlbumRow,
        userId: string,
        input: { title: string; coverFile?: File | null; removeCover?: boolean }
    ): Promise<void> {
        const title = input.title.trim()
        if (!title) throw new Error('Ponle un nombre al álbum.')
        if (title.length > 100) throw new Error('El nombre del álbum es demasiado largo.')

        let coverPath: string | null | undefined
        if (input.coverFile) {
            coverPath = generateStoragePath(`${album.group_id}/cover`, userId, input.coverFile.name)
            const { error: uploadError } = await supabase.storage
                .from(STORAGE_BUCKETS.COVERS)
                .upload(coverPath, input.coverFile, {
                    cacheControl: '3600',
                    upsert: false,
                    contentType: input.coverFile.type || undefined,
                })
            if (uploadError) throw new Error('No se pudo subir la portada. Inténtalo de nuevo.')
        } else if (input.removeCover) {
            coverPath = null
        }

        const update: Record<string, string | null> = { title }
        if (coverPath !== undefined) update.cover_url = coverPath

        const { data, error } = await supabase
            .from('albums')
            .update(update)
            .eq('id', album.id)
            .select('id')

        if (error) {
            if (coverPath) await supabase.storage.from(STORAGE_BUCKETS.COVERS).remove([coverPath]).catch(() => undefined)
            if (error.code === '23505') throw new Error('Ya hay otro álbum con ese nombre en el grupo.')
            throw error
        }

        if (!data || data.length === 0) {
            if (coverPath) await supabase.storage.from(STORAGE_BUCKETS.COVERS).remove([coverPath]).catch(() => undefined)
            throw new Error('Solo quien creó el álbum o un admin del grupo puede editarlo.')
        }

        if (coverPath !== undefined && album.cover_path && album.cover_path !== coverPath) {
            // Best effort: the old file may belong to someone else (storage only lets owners delete).
            await supabase.storage.from(STORAGE_BUCKETS.COVERS).remove([album.cover_path]).catch(() => undefined)
        }
    },
}
