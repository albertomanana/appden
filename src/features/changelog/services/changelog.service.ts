import { supabase } from '@lib/supabase/client'
import type { ChangelogItem, GeneratedChangelogPayload } from '@features/changelog/types'

const FALLBACK_STORAGE_KEY = 'appden:changelog:fallback:v2'
const GENERATED_CHANGELOG_PATH = '/changelog.generated.json'

export const changelogService = {
    async list(): Promise<{ entries: ChangelogItem[]; currentVersion: string; source: 'generated' | 'supabase' | 'fallback' }> {
        const generated = await this.readGeneratedFile()
        if (generated) {
            return {
                entries: generated.entries,
                currentVersion: generated.current_version || this.getCurrentVersion(generated.entries),
                source: 'generated',
            }
        }

        const fallback = readFallback()
        const { data, error } = await supabase
            .from('changelog_entries')
            .select('*')
            .order('release_date', { ascending: false })
            .order('created_at', { ascending: false })
            .limit(100)

        if (error) {
            if (isMissingRelationError(error)) {
                return {
                    entries: fallback,
                    currentVersion: this.getCurrentVersion(fallback),
                    source: 'fallback',
                }
            }
            throw error
        }

        const entries = (data ?? []) as ChangelogItem[]
        return {
            entries,
            currentVersion: this.getCurrentVersion(entries),
            source: 'supabase',
        }
    },

    getCurrentVersion(entries: ChangelogItem[]): string {
        if (entries.length === 0) return '1.0.0'
        return entries[0].version || '1.0.0'
    },

    async readGeneratedFile(): Promise<GeneratedChangelogPayload | null> {
        if (typeof window === 'undefined') return null

        try {
            const response = await fetch(`${GENERATED_CHANGELOG_PATH}?t=${Date.now()}`, {
                cache: 'no-store',
            })
            if (!response.ok) return null

            const payload = (await response.json()) as GeneratedChangelogPayload
            if (!payload || !Array.isArray(payload.entries)) return null
            return payload
        } catch {
            return null
        }
    },
}

function readFallback(): ChangelogItem[] {
    if (typeof window === 'undefined') return []

    try {
        const raw = window.localStorage.getItem(FALLBACK_STORAGE_KEY)
        if (!raw) return []
        return JSON.parse(raw) as ChangelogItem[]
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

