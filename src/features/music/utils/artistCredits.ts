import type { GroupMember, Song, SongArtistCredit } from '@/types'

export type SongArtistCreditDraft = {
    source: 'profile' | 'manual'
    profile_id?: string
    artist_name?: string
}

type ArtistCreditLike = {
    source?: 'profile' | 'manual' | null
    profile_id?: string | null
    artist_name?: string | null
    profile?: SongArtistCredit['profile']
}

export function createEmptyArtistCredit(
    source: SongArtistCreditDraft['source'] = 'manual'
): SongArtistCreditDraft {
    return {
        source,
        profile_id: '',
        artist_name: '',
    }
}

export function buildMemberLookup(
    members: GroupMember[]
): Map<string, GroupMember> {
    return new Map(members.map((member) => [member.user_id, member]))
}

export function resolveArtistCreditLabel(
    credit: ArtistCreditLike,
    membersById?: Map<string, GroupMember>
): string {
    const profileName =
        credit.profile?.display_name ??
        (credit.profile_id
            ? membersById?.get(credit.profile_id)?.profile?.display_name
            : null)

    return (
        profileName?.trim() ||
        credit.artist_name?.trim() ||
        ''
    )
}

export function normalizeArtistCreditsInput(
    credits: Array<Partial<SongArtistCreditDraft>> | null | undefined,
    membersById?: Map<string, GroupMember>
): SongArtistCreditDraft[] {
    const seen = new Set<string>()
    const normalized: SongArtistCreditDraft[] = []

    for (const credit of credits ?? []) {
        const source = credit.source === 'profile' ? 'profile' : 'manual'
        const profileId = credit.profile_id?.trim() || ''
        const artistName = resolveArtistCreditLabel(
            {
                source,
                profile_id: profileId,
                artist_name: credit.artist_name?.trim() || '',
            },
            membersById
        )

        if (source === 'profile' && !profileId) continue
        if (!artistName) continue

        const dedupeKey =
            source === 'profile'
                ? `profile:${profileId}`
                : `manual:${artistName.toLowerCase()}`

        if (seen.has(dedupeKey)) continue
        seen.add(dedupeKey)

        normalized.push({
            source,
            profile_id: profileId,
            artist_name: artistName,
        })
    }

    return normalized
}

export function buildArtistSummary(
    credits: ArtistCreditLike[] | null | undefined,
    membersById?: Map<string, GroupMember>
): string {
    const labels = (credits ?? [])
        .map((credit) => resolveArtistCreditLabel(credit, membersById))
        .filter(Boolean)

    if (labels.length === 0) return ''
    if (labels.length === 1) return labels[0]
    if (labels.length === 2) return `${labels[0]} & ${labels[1]}`

    return `${labels.slice(0, -1).join(', ')} & ${labels[labels.length - 1]}`
}

export function getSongArtistCreditDrafts(song: Song): SongArtistCreditDraft[] {
    if (song.artist_credits && song.artist_credits.length > 0) {
        return song.artist_credits.map((credit) => ({
            source: credit.profile_id ? 'profile' : 'manual',
            profile_id: credit.profile_id ?? '',
            artist_name: resolveArtistCreditLabel(credit),
        }))
    }

    return [
        {
            source: 'manual',
            profile_id: '',
            artist_name: song.artist_name ?? '',
        },
    ]
}
