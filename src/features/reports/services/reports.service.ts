import { supabase, STORAGE_BUCKETS } from '@lib/supabase/client'
import { generateStoragePath } from '@lib/utils'
import type { ReportItem, ReportType } from '@features/reports/types'

const FALLBACK_STORAGE_KEY = 'appden:reports:fallback:v1'

type CreateReportInput = {
    userId: string
    groupId: string
    type: ReportType
    description: string
    steps?: string
    imageFile?: File | null
}

export const reportsService = {
    async create(input: CreateReportInput): Promise<ReportItem> {
        let imageUrl: string | null = null

        if (input.imageFile) {
            const path = generateStoragePath(input.groupId, input.userId, input.imageFile.name)
            imageUrl = await uploadReportImage(path, input.imageFile)
        }

        const payload = {
            group_id: input.groupId,
            user_id: input.userId,
            type: input.type,
            description: input.description.trim().slice(0, 3000),
            steps: input.steps?.trim() ? input.steps.trim().slice(0, 3000) : null,
            image_url: imageUrl,
            status: 'open' as const,
        }

        const { data, error } = await supabase
            .from('reports')
            .insert(payload)
            .select('*')
            .single()

        if (error) {
            if (isMissingRelationError(error)) {
                const fallback = writeFallback(payload)
                return fallback
            }
            throw error
        }

        return data as ReportItem
    },

    async listByGroup(groupId: string): Promise<ReportItem[]> {
        const fallback = readFallback().filter((item) => item.group_id === groupId)

        const { data, error } = await supabase
            .from('reports')
            .select('*')
            .eq('group_id', groupId)
            .order('created_at', { ascending: false })

        if (error) {
            if (isMissingRelationError(error)) return fallback
            throw error
        }

        return (data ?? []) as ReportItem[]
    },
}

async function uploadReportImage(path: string, imageFile: File): Promise<string | null> {
    const preferredBucket = STORAGE_BUCKETS.REPORTS
    const fallbackBucket = STORAGE_BUCKETS.FILES

    const tryUpload = async (bucket: string): Promise<string | null> => {
        const { error } = await supabase.storage
            .from(bucket)
            .upload(path, imageFile, { cacheControl: '3600', upsert: false })

        if (error) return null
        return `${bucket}/${path}`
    }

    const uploadedPreferred = await tryUpload(preferredBucket)
    if (uploadedPreferred) return uploadedPreferred

    return tryUpload(fallbackBucket)
}

function readFallback(): ReportItem[] {
    if (typeof window === 'undefined') return []

    try {
        const raw = window.localStorage.getItem(FALLBACK_STORAGE_KEY)
        if (!raw) return []
        return JSON.parse(raw) as ReportItem[]
    } catch {
        return []
    }
}

function writeFallback(payload: {
    group_id: string
    user_id: string
    type: ReportType
    description: string
    steps: string | null
    image_url: string | null
    status: 'open'
}): ReportItem {
    const current = readFallback()
    const item: ReportItem = {
        id: crypto.randomUUID(),
        group_id: payload.group_id,
        user_id: payload.user_id,
        type: payload.type,
        description: payload.description,
        steps: payload.steps,
        image_url: payload.image_url,
        status: payload.status,
        created_at: new Date().toISOString(),
    }

    const next = [item, ...current].slice(0, 200)
    if (typeof window !== 'undefined') {
        try {
            window.localStorage.setItem(FALLBACK_STORAGE_KEY, JSON.stringify(next))
        } catch {
            // Ignore quota limits.
        }
    }

    return item
}

function isMissingRelationError(error: unknown): boolean {
    if (!error || typeof error !== 'object') return false
    const anyError = error as { code?: string; message?: string; details?: string }
    const raw = `${anyError.code ?? ''} ${anyError.message ?? ''} ${anyError.details ?? ''}`.toLowerCase()
    return raw.includes('42p01') || raw.includes('pgrst205') || raw.includes('does not exist')
}

