// ============================================================
// Cloudflare R2 storage client (through the appden-storage Worker).
//
// Mirrors the subset of `supabase.storage.from(bucket)` the app uses,
// so services only swap `supabase.storage` for `storage`.
// Objects live under `<bucket>/<path>` — the same paths stored in the DB.
// ============================================================

export const STORAGE_URL = ((import.meta.env.VITE_STORAGE_URL as string | undefined) ?? '').trim().replace(/\/+$/, '')
export const isR2Storage = STORAGE_URL.length > 0

type StorageError = { message: string; statusCode?: string | number }
type StorageResult<T> = { data: T | null; error: StorageError | null }

export interface StorageBucketApi {
    upload(
        path: string,
        file: Blob | File,
        options?: { contentType?: string; upsert?: boolean; cacheControl?: string }
    ): Promise<StorageResult<{ path: string }>>
    remove(paths: string[]): Promise<StorageResult<unknown>>
    createSignedUrl(path: string, expiresIn: number): Promise<StorageResult<{ signedUrl: string }>>
}

let getAccessToken: () => Promise<string | null> = async () => null

/** Called once by the Supabase client module (avoids an import cycle). */
export function configureR2Auth(tokenGetter: () => Promise<string | null>): void {
    getAccessToken = tokenGetter
}

function objectUrl(key: string): string {
    return `${STORAGE_URL}/f/${key.split('/').map(encodeURIComponent).join('/')}`
}

async function authHeaders(): Promise<Record<string, string>> {
    const token = await getAccessToken()
    if (!token) throw new Error('Necesitas iniciar sesión.')
    return { authorization: `Bearer ${token}` }
}

async function readError(response: Response): Promise<StorageError> {
    const body = (await response.json().catch(() => null)) as { error?: string } | null
    return { message: body?.error ?? `Error ${response.status} del almacenamiento`, statusCode: response.status }
}

// ------------------------------------------------------------
// Batched signing: every key requested in the same tick goes in one POST /sign.
// ------------------------------------------------------------

type Pending = { resolve: (url: string | null) => void }
const queue = new Map<string, Pending[]>()
let flushTimer: ReturnType<typeof setTimeout> | null = null

async function flush(): Promise<void> {
    flushTimer = null
    const batch = new Map(queue)
    queue.clear()
    const keys = Array.from(batch.keys())
    const resolveAll = (urls: Record<string, string | null>) => {
        for (const [key, waiters] of batch) waiters.forEach((waiter) => waiter.resolve(urls[key] ?? null))
    }

    try {
        const headers = { ...(await authHeaders()), 'content-type': 'application/json' }
        const urls: Record<string, string | null> = {}
        for (let i = 0; i < keys.length; i += 300) {
            const response = await fetch(`${STORAGE_URL}/sign`, {
                method: 'POST',
                headers,
                body: JSON.stringify({ keys: keys.slice(i, i + 300) }),
            })
            if (!response.ok) throw await readError(response)
            Object.assign(urls, ((await response.json()) as { urls: Record<string, string | null> }).urls)
        }
        resolveAll(urls)
    } catch (error) {
        console.warn('[Storage] No se pudieron firmar los archivos:', error)
        resolveAll({})
    }
}

/** Signed GET URL for `<bucket>/<path>` (null when not allowed or not signed in). */
export function signR2Key(key: string): Promise<string | null> {
    return new Promise((resolve) => {
        const waiters = queue.get(key) ?? []
        waiters.push({ resolve })
        queue.set(key, waiters)
        if (!flushTimer) flushTimer = setTimeout(() => void flush(), 0)
    })
}

/** Extracts the `<bucket>/<path>` key from a URL previously signed by the Worker. */
export function keyFromR2Url(value: string, bucket: string): string | null {
    if (!isR2Storage || !value.startsWith(`${STORAGE_URL}/f/`)) return null
    try {
        const key = new URL(value).pathname.replace(/^\/f\//, '').split('/').map(decodeURIComponent).join('/')
        const prefix = `${bucket}/`
        return key.startsWith(prefix) ? key.slice(prefix.length) : null
    } catch {
        return null
    }
}

// ------------------------------------------------------------
// Bucket API
// ------------------------------------------------------------

export function r2Bucket(bucket: string): StorageBucketApi {
    return {
        async upload(path, file, options) {
            try {
                const response = await fetch(objectUrl(`${bucket}/${path}`), {
                    method: 'PUT',
                    headers: {
                        ...(await authHeaders()),
                        'content-type': options?.contentType || file.type || 'application/octet-stream',
                    },
                    body: file,
                })
                if (!response.ok) return { data: null, error: await readError(response) }
                return { data: { path }, error: null }
            } catch (error) {
                return { data: null, error: { message: error instanceof Error ? error.message : 'No se pudo subir el archivo.' } }
            }
        },

        async remove(paths) {
            try {
                const headers = await authHeaders()
                const results = await Promise.all(paths.map((path) => fetch(objectUrl(`${bucket}/${path}`), { method: 'DELETE', headers })))
                const failed = results.find((response) => !response.ok)
                return failed ? { data: null, error: await readError(failed) } : { data: paths, error: null }
            } catch (error) {
                return { data: null, error: { message: error instanceof Error ? error.message : 'No se pudo borrar el archivo.' } }
            }
        },

        async createSignedUrl(path) {
            const signedUrl = await signR2Key(`${bucket}/${path}`)
            return signedUrl ? { data: { signedUrl }, error: null } : { data: null, error: { message: 'No se pudo firmar el archivo.' } }
        },
    }
}
