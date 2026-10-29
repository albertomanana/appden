import type { Song } from '@/types'

/**
 * Who may edit a song's metadata and credits: the uploader, its co-owners and every
 * group member credited as an artist (mirrors `can_edit_song()` in migration 018).
 * Deleting stays with the uploader.
 */
export function canEditSong(song: Pick<Song, 'uploaded_by' | 'owners' | 'artist_credits'>, userId: string | null | undefined): boolean {
    if (!userId) return false
    if (song.uploaded_by === userId) return true
    if (song.owners?.some((owner) => owner.user_id === userId)) return true
    return !!song.artist_credits?.some((credit) => credit.profile_id === userId)
}

export function canDeleteSong(song: Pick<Song, 'uploaded_by'>, userId: string | null | undefined): boolean {
    return !!userId && song.uploaded_by === userId
}
