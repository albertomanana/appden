import { createClient } from '@supabase/supabase-js'
import { configureR2Auth, isR2Storage, keyFromR2Url, r2Bucket, signR2Key, type StorageBucketApi } from '@lib/storage/r2'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string
const projectRef = (() => {
    try {
        const url = new URL(supabaseUrl || 'https://placeholder.supabase.co')
        return url.host.split('.')[0] || 'local'
    } catch {
        return 'local'
    }
})()
export const LEGACY_AUTH_STORAGE_KEY = 'the-appden-auth'
export const AUTH_STORAGE_KEY = `the-appden-auth:${projectRef}:v2`


// Create client even if missing - we'll handle the error in AuthProvider
export const supabase = createClient(
    supabaseUrl || 'https://placeholder.supabase.co',
    supabaseAnonKey || 'placeholder-key',
    {
        auth: {
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: true,
            storageKey: AUTH_STORAGE_KEY,
        },
        global: {
            headers: {
                'x-app-name': 'the-appden',
            },
        },
    }
)

configureR2Auth(async () => (await supabase.auth.getSession()).data.session?.access_token ?? null)

/**
 * File storage. With `VITE_STORAGE_URL` set, files live in Cloudflare R2 (no egress fees)
 * behind the appden-storage Worker; otherwise the legacy Supabase Storage buckets are used.
 */
export const storage = {
    from(bucket: string): StorageBucketApi {
        return isR2Storage ? r2Bucket(bucket) : (supabase.storage.from(bucket) as unknown as StorageBucketApi)
    },
}

// Storage bucket names - keep in sync with Supabase dashboard
export const STORAGE_BUCKETS = {
    AVATARS: 'avatars',
    COVERS: 'covers',
    SONGS: 'songs',
    FILES: 'files',
    REPORTS: 'reports',
} as const

const SIGNED_URL_TTL_SECONDS = 3600
// Re-sign 10 minutes before expiry so cached URLs never reach the player already expired.
const SIGNED_URL_CACHE_MS = (SIGNED_URL_TTL_SECONDS - 600) * 1000
const signedUrlCache = new Map<string, { url: string; expiresAt: number }>()
const signedUrlInflight = new Map<string, Promise<string | null>>()

/** Drops cached signed URLs (e.g. after logout or when a file is replaced). */
export function clearSignedUrlCache(bucket?: string, path?: string): void {
    if (!bucket) {
        signedUrlCache.clear()
        return
    }
    for (const key of Array.from(signedUrlCache.keys())) {
        if (key.startsWith(`${bucket}:`) && (!path || key.includes(path))) signedUrlCache.delete(key)
    }
}

/**
 * Get a signed URL for a file in a Supabase Storage bucket.
 * Signed URLs are valid for 1 hour and work even with restricted access.
 * Results are cached in memory and concurrent requests for the same object are de-duplicated.
 */
export async function getStorageUrl(
    bucket: string,
    path: string | null | undefined
): Promise<string | null> {
    if (!path) return null

    const raw = path.trim()
    if (!raw) return null

    const normalizePathForBucket = (value: string): string | null => {
        // URL signed earlier by the R2 Worker (e.g. a persisted player queue): re-sign its key.
        const r2Key = keyFromR2Url(value, bucket)
        if (r2Key) return r2Key
        if (/^https?:\/\//i.test(value)) {
            try {
                const url = new URL(value)
                const projectHost = supabaseUrl ? new URL(supabaseUrl).host : null
                if (!projectHost || url.host !== projectHost) {
                    // External URL, not managed by this Supabase storage bucket.
                    return value
                }

                const pathname = decodeURIComponent(url.pathname)
                const signedPrefix = `/storage/v1/object/sign/${bucket}/`
                const publicPrefix = `/storage/v1/object/public/${bucket}/`
                const objectPrefix = `/storage/v1/object/${bucket}/`

                if (pathname.includes(signedPrefix)) return pathname.split(signedPrefix)[1] ?? null
                if (pathname.includes(publicPrefix)) return pathname.split(publicPrefix)[1] ?? null
                if (pathname.includes(objectPrefix)) return pathname.split(objectPrefix)[1] ?? null
                return null
            } catch {
                return null
            }
        }

        return value.replace(/^\/+/, '')
    }

    const normalized = normalizePathForBucket(raw)
    if (!normalized) return null
    if (/^https?:\/\//i.test(normalized)) return normalized

    const cacheKey = `${bucket}:${normalized}`
    const cached = signedUrlCache.get(cacheKey)
    if (cached && cached.expiresAt > Date.now()) return cached.url

    const inflight = signedUrlInflight.get(cacheKey)
    if (inflight) return inflight

    const request = signStoragePath(bucket, normalized)
        .then((url) => {
            if (url) signedUrlCache.set(cacheKey, { url, expiresAt: Date.now() + SIGNED_URL_CACHE_MS })
            return url
        })
        .finally(() => {
            signedUrlInflight.delete(cacheKey)
        })
    signedUrlInflight.set(cacheKey, request)
    return request
}

async function signStoragePath(bucket: string, normalized: string): Promise<string | null> {
    // The Worker resolves legacy "<bucket>/<bucket>/…" paths itself, so one key is enough.
    if (isR2Storage) return signR2Key(`${bucket}/${normalized}`)

    const candidates = Array.from(
        new Set(
            normalized.startsWith(`${bucket}/`)
                ? [normalized, normalized.slice(bucket.length + 1)]
                : [normalized, `${bucket}/${normalized}`]
        )
    )

    for (const candidate of candidates) {
        try {
            const { data, error } = await supabase.storage
                .from(bucket)
                .createSignedUrl(candidate, SIGNED_URL_TTL_SECONDS)

            if (error) continue
            return data.signedUrl
        } catch {
            // Try next candidate path.
        }
    }

    return null
}
