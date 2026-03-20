import { supabase } from '@lib/supabase/client'
import type { GroupActivity, GroupActivityAction } from '@/types'

const FALLBACK_STORAGE_KEY = 'appden:group-activity:fallback:v1'

type CreateActivityInput = {
    groupId: string
    actorId: string
    actionType: GroupActivityAction
    songId?: string | null
    commentId?: string | null
    payload?: Record<string, unknown>
}

export const groupActivityService = {
    async list(groupId: string, limit = 25): Promise<GroupActivity[]> {
        const fallback = readFallback().filter((item) => item.group_id === groupId)

        const { data, error } = await supabase
            .from('group_activity')
            .select('*, actor:profiles(id, display_name, avatar_url), song:songs(id, title, artist_name, cover_url)')
            .eq('group_id', groupId)
            .order('created_at', { ascending: false })
            .limit(limit)

        if (error) {
            if (isMissingRelationError(error)) return fallback.slice(0, limit)
            throw error
        }

        return (data ?? []) as GroupActivity[]
    },

    async create(input: CreateActivityInput): Promise<void> {
        const payload = {
            group_id: input.groupId,
            actor_id: input.actorId,
            action_type: input.actionType,
            song_id: input.songId ?? null,
            comment_id: input.commentId ?? null,
            payload: input.payload ?? {},
        }

        const { error } = await supabase
            .from('group_activity')
            .insert(payload)

        if (error) {
            if (isMissingRelationError(error)) {
                writeFallback(payload)
                return
            }
            throw error
        }
    },

    async resolveSongGroupId(songId: string): Promise<string | null> {
        const { data, error } = await supabase
            .from('songs')
            .select('group_id')
            .eq('id', songId)
            .maybeSingle()

        if (error) return null
        return (data?.group_id as string | undefined) ?? null
    },
}

function readFallback(): GroupActivity[] {
    if (typeof window === 'undefined') return []
    try {
        const raw = window.localStorage.getItem(FALLBACK_STORAGE_KEY)
        if (!raw) return []
        return JSON.parse(raw) as GroupActivity[]
    } catch {
        return []
    }
}

function writeFallback(input: {
    group_id: string
    actor_id: string
    action_type: GroupActivityAction
    song_id: string | null
    comment_id: string | null
    payload: Record<string, unknown>
}): void {
    if (typeof window === 'undefined') return
    const current = readFallback()
    const next: GroupActivity[] = [
        {
            id: crypto.randomUUID(),
            group_id: input.group_id,
            actor_id: input.actor_id,
            action_type: input.action_type,
            song_id: input.song_id,
            comment_id: input.comment_id,
            payload: input.payload,
            created_at: new Date().toISOString(),
        },
        ...current,
    ].slice(0, 200)

    try {
        window.localStorage.setItem(FALLBACK_STORAGE_KEY, JSON.stringify(next))
    } catch {
        // Ignore storage quota limits.
    }
}

function isMissingRelationError(error: unknown): boolean {
    if (!error || typeof error !== 'object') return false
    const anyError = error as { code?: string; message?: string; details?: string }
    const raw = `${anyError.code ?? ''} ${anyError.message ?? ''} ${anyError.details ?? ''}`.toLowerCase()
    return raw.includes('42p01') || raw.includes('pgrst205') || raw.includes('does not exist')
}

