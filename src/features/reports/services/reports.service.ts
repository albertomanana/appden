import { supabase, STORAGE_BUCKETS } from '@lib/supabase/client'
import { generateStoragePath } from '@lib/utils'
import type {
    ReportItem,
    ReportNotification,
    ReportSeverity,
    ReportStatus,
    ReportType,
} from '@features/reports/types'

const FALLBACK_STORAGE_KEY = 'appden:reports:fallback:v2'

type CreateReportInput = {
    userId: string
    groupId?: string | null
    type: ReportType
    title: string
    description: string
    reproductionSteps?: string
    severity?: ReportSeverity | null
    imageFile?: File | null
}

type ListReportsFilters = {
    groupId?: string | null
    status?: ReportStatus | 'all'
    type?: ReportType | 'all'
    search?: string
    limit?: number
}

export const reportsService = {
    async create(input: CreateReportInput): Promise<ReportItem> {
        let imageUrl: string | null = null

        if (input.imageFile) {
            const path = generateStoragePath(
                input.groupId ?? 'global',
                input.userId,
                input.imageFile.name
            )
            imageUrl = await uploadReportImage(path, input.imageFile)
        }

        const payload = {
            group_id: input.groupId ?? null,
            user_id: input.userId,
            type: input.type,
            title: input.title.trim().slice(0, 140),
            description: input.description.trim().slice(0, 3000),
            reproduction_steps: input.reproductionSteps?.trim()
                ? input.reproductionSteps.trim().slice(0, 3000)
                : null,
            // Backward compatibility while old column still exists.
            steps: input.reproductionSteps?.trim()
                ? input.reproductionSteps.trim().slice(0, 3000)
                : null,
            severity: input.severity ?? null,
            image_url: imageUrl,
            status: 'open' as const,
        }

        const { data, error } = await supabase
            .from('reports')
            .insert(payload)
            .select('*, author:profiles!reports_user_id_fkey(id, display_name, username, avatar_url)')
            .single()

        if (error) {
            if (isMissingRelationError(error)) {
                return writeFallback(payload)
            }
            throw error
        }

        return data as ReportItem
    },

    async list(filters: ListReportsFilters = {}): Promise<ReportItem[]> {
        const fallback = readFallback()
        let query = supabase
            .from('reports')
            .select('*, author:profiles!reports_user_id_fkey(id, display_name, username, avatar_url)')
            .order('created_at', { ascending: false })
            .limit(filters.limit ?? 50)

        if (filters.groupId) {
            query = query.eq('group_id', filters.groupId)
        }

        if (filters.status && filters.status !== 'all') {
            query = query.eq('status', filters.status)
        }

        if (filters.type && filters.type !== 'all') {
            query = query.eq('type', filters.type)
        }

        if (filters.search?.trim()) {
            const search = filters.search.trim()
            query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%`)
        }

        const { data, error } = await query

        if (error) {
            if (isMissingRelationError(error)) {
                return fallback
                    .filter((row) => !filters.groupId || row.group_id === filters.groupId)
                    .filter((row) => !filters.status || filters.status === 'all' || row.status === filters.status)
                    .filter((row) => !filters.type || filters.type === 'all' || row.type === filters.type)
            }
            throw error
        }

        return (data ?? []) as ReportItem[]
    },

    async getById(reportId: string): Promise<ReportItem | null> {
        const fallback = readFallback().find((item) => item.id === reportId) ?? null

        const { data, error } = await supabase
            .from('reports')
            .select('*, author:profiles!reports_user_id_fkey(id, display_name, username, avatar_url)')
            .eq('id', reportId)
            .maybeSingle()

        if (error) {
            if (isMissingRelationError(error)) return fallback
            throw error
        }

        return (data as ReportItem | null) ?? fallback
    },

    async updateStatus(reportId: string, status: ReportStatus): Promise<ReportItem> {
        const { data, error } = await supabase
            .from('reports')
            .update({ status, updated_at: new Date().toISOString() })
            .eq('id', reportId)
            .select('*, author:profiles!reports_user_id_fkey(id, display_name, username, avatar_url)')
            .single()

        if (error) throw error
        return data as ReportItem
    },

    async updateContent(
        reportId: string,
        patch: {
            title?: string
            description?: string
            reproductionSteps?: string | null
            severity?: ReportSeverity | null
            type?: ReportType
        }
    ): Promise<ReportItem> {
        const payload = {
            ...(patch.title ? { title: patch.title.trim().slice(0, 140) } : {}),
            ...(patch.description ? { description: patch.description.trim().slice(0, 3000) } : {}),
            ...(patch.reproductionSteps !== undefined ? {
                reproduction_steps: patch.reproductionSteps?.trim()
                    ? patch.reproductionSteps.trim().slice(0, 3000)
                    : null,
                steps: patch.reproductionSteps?.trim()
                    ? patch.reproductionSteps.trim().slice(0, 3000)
                    : null,
            } : {}),
            ...(patch.severity !== undefined ? { severity: patch.severity } : {}),
            ...(patch.type ? { type: patch.type } : {}),
            updated_at: new Date().toISOString(),
        }

        const { data, error } = await supabase
            .from('reports')
            .update(payload)
            .eq('id', reportId)
            .select('*, author:profiles!reports_user_id_fkey(id, display_name, username, avatar_url)')
            .single()

        if (error) throw error
        return data as ReportItem
    },

    async getViewerAccess(userId: string): Promise<{ isAdmin: boolean }> {
        const { data, error } = await supabase.rpc('is_app_admin', { p_user_id: userId })
        if (error) return { isAdmin: false }
        return { isAdmin: !!data }
    },

    async listMyAdminNotifications(userId: string): Promise<ReportNotification[]> {
        const { data, error } = await supabase
            .from('report_notifications')
            .select('*')
            .eq('admin_user_id', userId)
            .order('created_at', { ascending: false })

        if (error) {
            if (isMissingRelationError(error)) return []
            throw error
        }

        return (data ?? []) as ReportNotification[]
    },

    async getUnreadAdminNotificationsCount(userId: string): Promise<number> {
        const { count, error } = await supabase
            .from('report_notifications')
            .select('id', { count: 'exact', head: true })
            .eq('admin_user_id', userId)
            .eq('read', false)

        if (error) {
            if (isMissingRelationError(error)) return 0
            throw error
        }

        return count ?? 0
    },

    async markAllAdminNotificationsRead(userId: string): Promise<void> {
        const { error } = await supabase
            .from('report_notifications')
            .update({ read: true, read_at: new Date().toISOString() })
            .eq('admin_user_id', userId)
            .eq('read', false)

        if (error && !isMissingRelationError(error)) throw error
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
    group_id: string | null
    user_id: string
    type: ReportType
    title: string
    description: string
    reproduction_steps: string | null
    steps: string | null
    severity: ReportSeverity | null
    image_url: string | null
    status: 'open'
}): ReportItem {
    const current = readFallback()
    const now = new Date().toISOString()
    const item: ReportItem = {
        id: crypto.randomUUID(),
        group_id: payload.group_id,
        user_id: payload.user_id,
        type: payload.type,
        title: payload.title,
        description: payload.description,
        reproduction_steps: payload.reproduction_steps,
        steps: payload.steps,
        severity: payload.severity,
        image_url: payload.image_url,
        status: payload.status,
        created_at: now,
        updated_at: now,
    }

    const next = [item, ...current].slice(0, 300)
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

