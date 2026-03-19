import { supabase } from '@lib/supabase/client'
import type { ChangelogItem } from '@features/changelog/types'

const FALLBACK_STORAGE_KEY = 'appden:changelog:fallback:v1'

export const changelogService = {
    async list(groupId: string): Promise<ChangelogItem[]> {
        const fallback = readFallback(groupId)

        const { data, error } = await supabase
            .from('changelog_entries')
            .select('*')
            .eq('group_id', groupId)
            .order('release_date', { ascending: false })
            .order('created_at', { ascending: false })

        if (error) {
            if (isMissingRelationError(error)) return fallback
            throw error
        }

        return (data ?? []) as ChangelogItem[]
    },

    getCurrentVersion(entries: ChangelogItem[]): string {
        if (entries.length === 0) return '1.0.0'
        return entries[0].version || '1.0.0'
    },
}

function readFallback(groupId: string): ChangelogItem[] {
    if (typeof window === 'undefined') return []

    try {
        const raw = window.localStorage.getItem(FALLBACK_STORAGE_KEY)
        if (!raw) return []
        const parsed = JSON.parse(raw) as ChangelogItem[]
        return parsed.filter((item) => item.group_id === groupId)
    } catch {
        return []
    }
}

function isMissingRelationError(error: unknown): boolean {
    if (!error || typeof error !== 'object') return false
    const anyError = error as { code?: string; message?: string; details?: string }
    const raw = `${anyError.code ?? ''} ${anyError.message ?? ''} ${anyError.details ?? ''}`.toLowerCase()
    return raw.includes('42p01') || raw.includes('pgrst205') || raw.includes('does not exist')
}

