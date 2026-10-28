import type { GroupMember, Profile, Song } from '@/types'
import type { AlbumRow, ArtistRef, MusicAlbum, MusicArtist } from '@features/music/types'

type MemberProfile = Pick<Profile, 'id' | 'display_name' | 'username' | 'avatar_url'>

export type MemberIndex = {
    byId: Map<string, MemberProfile>
    byName: Map<string, MemberProfile>
}

/** Lowercase, trimmed and accent-insensitive key ("Lucía" === "lucia"). */
export function normalizeName(value: string): string {
    return value
        .trim()
        .toLocaleLowerCase('es')
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .replace(/\s+/g, ' ')
}

export function buildMemberIndex(members: GroupMember[] | null | undefined): MemberIndex {
    const byId = new Map<string, MemberProfile>()
    const byName = new Map<string, MemberProfile>()

    for (const member of members ?? []) {
        const profile = member.profile
        if (!profile) continue
        byId.set(member.user_id, profile)
        if (profile.display_name) byName.set(normalizeName(profile.display_name), profile)
        if (profile.username) byName.set(normalizeName(profile.username), profile)
    }

    return { byId, byName }
}

const ARTIST_SPLIT = /\s*,\s*|\s*&\s*|\s+(?:feat\.?|ft\.?)\s+/i

function nameRef(raw: string, index?: MemberIndex): ArtistRef | null {
    const name = raw.trim()
    if (!name) return null

    const member = index?.byName.get(normalizeName(name))
    if (member) {
        return { key: `p:${member.id}`, profileId: member.id, name: member.display_name, avatarUrl: member.avatar_url }
    }

    return { key: `n:${normalizeName(name)}`, profileId: null, name, avatarUrl: null }
}

/**
 * Artists of a song. Uses the normalized credits (migration 012) when present;
 * for older songs it splits the `artist_name` summary and matches group members by name.
 */
export function getSongArtistRefs(song: Song, index?: MemberIndex): ArtistRef[] {
    const refs: ArtistRef[] = []
    const seen = new Set<string>()
    const push = (ref: ArtistRef | null) => {
        if (!ref || seen.has(ref.key)) return
        seen.add(ref.key)
        refs.push(ref)
    }

    for (const credit of song.artist_credits ?? []) {
        if (credit.profile_id) {
            const profile = credit.profile ?? index?.byId.get(credit.profile_id)
            push({
                key: `p:${credit.profile_id}`,
                profileId: credit.profile_id,
                name: profile?.display_name ?? credit.artist_name ?? 'Artista',
                avatarUrl: profile?.avatar_url ?? null,
            })
        } else if (credit.artist_name) {
            push(nameRef(credit.artist_name, index))
        }
    }

    if (refs.length > 0) return refs

    for (const piece of (song.artist_name ?? '').split(ARTIST_SPLIT)) {
        push(nameRef(piece, index))
    }

    return refs
}

/** Credits that point to a group member, in credit order (for "Ver artista"). */
export function getSongMemberCredits(song: Song): ArtistRef[] {
    const seen = new Set<string>()
    const refs: ArtistRef[] = []

    for (const credit of song.artist_credits ?? []) {
        if (!credit.profile_id || seen.has(credit.profile_id)) continue
        seen.add(credit.profile_id)
        refs.push({
            key: `p:${credit.profile_id}`,
            profileId: credit.profile_id,
            name: credit.profile?.display_name ?? credit.artist_name ?? 'Artista',
            avatarUrl: credit.profile?.avatar_url ?? null,
        })
    }

    return refs
}

/** Id used to route to the album of a song (album row id, or its title in legacy mode). */
export function getSongAlbumRouteId(song: Pick<Song, 'album_id' | 'album_name'>): string | null {
    if (song.album_id) return song.album_id
    const name = song.album_name?.trim()
    return name ? name : null
}

function byCreatedAsc(a: Song, b: Song): number {
    return a.created_at.localeCompare(b.created_at)
}

/**
 * Groups songs into albums. With album rows (migration 016) songs are linked by `album_id`
 * (or by title when an old client left it empty); without them, by `album_name`.
 * Albums without songs are left out.
 */
export function buildAlbums(songs: Song[], rows: AlbumRow[], index?: MemberIndex): MusicAlbum[] {
    const rowsById = new Map(rows.map((row) => [row.id, row]))
    const rowsByTitle = new Map(rows.map((row) => [normalizeName(row.title), row]))
    const buckets = new Map<string, { row: AlbumRow | null; title: string; songs: Song[] }>()

    for (const song of songs) {
        const name = song.album_name?.trim() ?? ''
        let row = song.album_id ? rowsById.get(song.album_id) ?? null : null
        if (!row && name) row = rowsByTitle.get(normalizeName(name)) ?? null
        if (!row && !name) continue

        const key = row ? `id:${row.id}` : `name:${normalizeName(name)}`
        const bucket = buckets.get(key) ?? { row, title: row?.title ?? name, songs: [] }
        bucket.songs.push(song)
        buckets.set(key, bucket)
    }

    const albums: MusicAlbum[] = []
    for (const bucket of buckets.values()) {
        const tracks = [...bucket.songs].sort(byCreatedAsc)
        const artistCounts = new Map<string, { ref: ArtistRef; count: number; first: number }>()

        tracks.forEach((song, position) => {
            for (const ref of getSongArtistRefs(song, index)) {
                const current = artistCounts.get(ref.key)
                if (current) current.count += 1
                else artistCounts.set(ref.key, { ref, count: 1, first: position })
            }
        })

        const artists = [...artistCounts.values()]
            .sort((a, b) => b.count - a.count || a.first - b.first)
            .map((entry) => entry.ref)

        const firstCover = tracks.find((song) => !!song.cover_url)
        const firstDate = tracks[0]?.created_at ?? bucket.row?.created_at ?? null
        const lastActivityAt = tracks.reduce(
            (latest, song) => (song.created_at > latest ? song.created_at : latest),
            bucket.row?.created_at ?? ''
        )

        albums.push({
            id: bucket.row?.id ?? bucket.title,
            title: bucket.title,
            isLegacy: !bucket.row,
            row: bucket.row,
            coverUrl: bucket.row?.cover_url ?? firstCover?.cover_url ?? null,
            coverSeed: bucket.row?.id ?? normalizeName(bucket.title),
            songs: tracks,
            artists,
            durationSeconds: tracks.reduce((total, song) => total + (Number(song.duration_seconds) || 0), 0),
            year: firstDate ? new Date(firstDate).getFullYear() : null,
            lastActivityAt,
        })
    }

    return albums.sort((a, b) => b.lastActivityAt.localeCompare(a.lastActivityAt))
}

/** Finds an album by route id: the row id, or the (case/accent-insensitive) title. */
export function findAlbum(albums: MusicAlbum[], routeId: string): MusicAlbum | null {
    const byId = albums.find((album) => album.id === routeId)
    if (byId) return byId
    const wanted = normalizeName(routeId)
    return albums.find((album) => normalizeName(album.title) === wanted) ?? null
}

/** Group members with songs (credited or uploaded) plus external credited names. */
export function buildArtists(songs: Song[], index: MemberIndex): MusicArtist[] {
    const artists = new Map<string, MusicArtist>()

    const ensure = (ref: ArtistRef): MusicArtist => {
        const existing = artists.get(ref.key)
        if (existing) return existing
        const profile = ref.profileId ? index.byId.get(ref.profileId) : undefined
        const created: MusicArtist = {
            ...ref,
            name: profile?.display_name ?? ref.name,
            avatarUrl: profile?.avatar_url ?? ref.avatarUrl,
            username: profile?.username ?? null,
            songs: [],
            uploadedOnly: [],
        }
        artists.set(ref.key, created)
        return created
    }

    for (const song of songs) {
        const refs = getSongArtistRefs(song, index)
        for (const ref of refs) ensure(ref).songs.push(song)

        const uploaderCredited = refs.some((ref) => ref.profileId === song.uploaded_by)
        if (!uploaderCredited && song.uploaded_by) {
            const uploader = index.byId.get(song.uploaded_by) ?? song.uploader
            ensure({
                key: `p:${song.uploaded_by}`,
                profileId: song.uploaded_by,
                name: uploader?.display_name ?? 'Miembro',
                avatarUrl: uploader?.avatar_url ?? null,
            }).uploadedOnly.push(song)
        }
    }

    return [...artists.values()].sort(
        (a, b) =>
            b.songs.length - a.songs.length ||
            b.uploadedOnly.length - a.uploadedOnly.length ||
            a.name.localeCompare(b.name, 'es')
    )
}

/** Songs of a member as an artist: credited first, then the ones they only uploaded. */
export function getArtistSongs(songs: Song[], profileId: string, index: MemberIndex): { credited: Song[]; uploadedOnly: Song[] } {
    const credited: Song[] = []
    const uploadedOnly: Song[] = []

    for (const song of songs) {
        const refs = getSongArtistRefs(song, index)
        if (refs.some((ref) => ref.profileId === profileId)) credited.push(song)
        else if (song.uploaded_by === profileId) uploadedOnly.push(song)
    }

    return { credited, uploadedOnly }
}

/** "Lucía, Marcos y Sara" / "Varios artistas". */
export function formatArtistNames(refs: Array<Pick<ArtistRef, 'name'>>, max = 3): string {
    const names = refs.map((ref) => ref.name).filter(Boolean)
    if (names.length === 0) return ''
    if (names.length > max) return 'Varios artistas'
    if (names.length === 1) return names[0]
    return `${names.slice(0, -1).join(', ')} y ${names[names.length - 1]}`
}

/** "1 h 12 min" / "18 min". */
export function formatTotalDuration(seconds: number): string {
    const total = Math.round(seconds / 60)
    if (total < 1) return seconds > 0 ? '1 min' : ''
    const hours = Math.floor(total / 60)
    const minutes = total % 60
    if (hours === 0) return `${minutes} min`
    return minutes ? `${hours} h ${minutes} min` : `${hours} h`
}

export function pluralize(count: number, singular: string, plural: string): string {
    return `${count} ${count === 1 ? singular : plural}`
}

/** Random start index used by the "Aleatorio" buttons. */
export function randomIndex(length: number): number {
    return Math.floor(Math.random() * Math.max(1, length))
}
