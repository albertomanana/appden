import type { Song } from '@/types'

/** Row of the `albums` table (migration 016). `cover_url` comes signed. */
export interface AlbumRow {
    id: string
    group_id: string
    title: string
    cover_url: string | null
    /** Raw storage path of the cover, kept to replace or remove it. */
    cover_path: string | null
    created_by: string
    created_at: string
}

/** A person (or free-text name) credited on a song. */
export interface ArtistRef {
    /** `p:<profileId>` for group members, `n:<normalized name>` for external names. */
    key: string
    profileId: string | null
    name: string
    avatarUrl: string | null
}

/** Album as shown in the app, built from songs (+ album rows when available). */
export interface MusicAlbum {
    /** `albums.id`, or the album title when it only exists as `songs.album_name`. */
    id: string
    title: string
    /** True when there is no album row behind it (migration 016 missing or unlinked song). */
    isLegacy: boolean
    row: AlbumRow | null
    /** Album artwork, falling back to the first track with a cover. */
    coverUrl: string | null
    /** Seed for the placeholder gradient. */
    coverSeed: string
    /** Tracks in album order. */
    songs: Song[]
    /** Credited artists, most frequent first. */
    artists: ArtistRef[]
    durationSeconds: number
    year: number | null
    lastActivityAt: string
}

/** Artist as shown in the app: a group member or an external credited name. */
export interface MusicArtist extends ArtistRef {
    username: string | null
    /** Songs where the artist is credited. */
    songs: Song[]
    /** Songs the member uploaded without being credited on them. */
    uploadedOnly: Song[]
}
