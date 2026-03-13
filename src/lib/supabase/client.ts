import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string
export const AUTH_STORAGE_KEY = 'the-appden-auth'

console.log('📦 Supabase URL configured:', !!supabaseUrl)
console.log('📦 Supabase Key configured:', !!supabaseAnonKey)

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

// Storage bucket names — keep in sync with Supabase dashboard
export const STORAGE_BUCKETS = {
    AVATARS: 'avatars',
    COVERS: 'covers',
    SONGS: 'songs',
    FILES: 'files',
} as const

/**
 * Get a signed URL for a file in a Supabase Storage bucket.
 * Signed URLs are valid for 1 hour and work even with restricted access.
 */
export async function getStorageUrl(
    bucket: string,
    path: string | null | undefined
): Promise<string | null> {
    if (!path) return null

    const raw = path.trim()
    if (!raw) return null

    const normalizePathForBucket = (value: string): string | null => {
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
                .createSignedUrl(candidate, 3600) // 1 hour validity

            if (error) continue
            return data.signedUrl
        } catch {
            // Try next candidate path.
        }
    }

    return null
}
