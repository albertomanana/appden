import type { GroupMember } from '@/types'
import type { MentionOption } from '@features/social/types'

export function buildMentionOptions(members: GroupMember[]): MentionOption[] {
    return members.map((member) => {
        const displayName = member.profile?.display_name?.trim() || 'usuario'
        const username = member.profile?.username?.replace(/^@/, '') || buildMentionToken(displayName)
        return {
            id: member.user_id,
            label: displayName,
            token: username,
        }
    })
}

export function filterMentionOptions(options: MentionOption[], query: string | null): MentionOption[] {
    if (options.length === 0) return []
    if (!query) return []
    const clean = query.toLowerCase()
    return options.filter((option) =>
        option.label.toLowerCase().includes(clean) || option.token.toLowerCase().includes(clean)
    )
}

export function extractMentionQuery(text: string): string | null {
    const match = text.match(/(?:^|\s)@([A-Za-z0-9_.-]{1,24})$/)
    return match?.[1] ?? null
}

export function applyMention(text: string, token: string): string {
    return text.replace(/@([A-Za-z0-9_.-]{1,24})$/, `@${token} `)
}

export function buildMentionToken(value: string): string {
    return value
        .trim()
        .toLowerCase()
        .replace(/\s+/g, '_')
        .replace(/[^a-z0-9_.-]/g, '')
        .slice(0, 24) || 'usuario'
}

export function parseTimestampToken(token: string): number | null {
    const clean = token.replace(/\[|\]/g, '')
    const match = clean.match(/^(\d{1,2}):(\d{2})$/)
    if (!match) return null
    const minutes = Number(match[1])
    const seconds = Number(match[2])
    if (!Number.isFinite(minutes) || !Number.isFinite(seconds)) return null
    return minutes * 60 + seconds
}

export function formatTimestamp(seconds: number): string {
    const safe = Number.isFinite(seconds) ? Math.max(0, Math.floor(seconds)) : 0
    const minutes = Math.floor(safe / 60)
    const secs = safe % 60
    return `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
}

export function normalizeTimestampLabel(token: string): string {
    const clean = token.replace(/\[|\]/g, '')
    const parsed = parseTimestampToken(clean)
    if (parsed == null) return token
    return `[${formatTimestamp(parsed)}]`
}

