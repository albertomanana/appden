import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string

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
            storageKey: 'the-appden-auth',
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
    SONG_COVERS: 'song-covers',
    SONGS: 'songs',
    FILES: 'files',
} as const

/**
 * Get a public URL for a file in a Supabase Storage bucket.
 * Returns null if the path is null/undefined.
 */
export function getStorageUrl(
    bucket: string,
    path: string | null | undefined
): string | null {
    if (!path) return null
    const { data } = supabase.storage.from(bucket).getPublicUrl(path)
    return data.publicUrl
}
