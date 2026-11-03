// ============================================================
// The Appden — media storage on Cloudflare R2 (zero egress fees).
//
// Supabase keeps the database and auth; every file (audio, covers,
// avatars, documents, receipts) lives in one R2 bucket under the key
// `<supabase bucket>/<original path>`, so database rows don't change.
//
//   POST   /sign            {keys: string[]}  (Bearer <supabase jwt>) → signed GET URLs
//   GET    /f/<key>?e=&s=   signed download, supports Range (audio seeking on iOS)
//   PUT    /f/<key>         upload            (Bearer <supabase jwt>)
//   DELETE /f/<key>         delete            (Bearer <supabase jwt>)
//   PUT    /admin/f/<key>   migration upload  (x-admin-secret)
//   HEAD   /admin/f/<key>   migration exists  (x-admin-secret)
// ============================================================

interface R2Range {
    offset?: number
    length?: number
    suffix?: number
}

interface R2ObjectLike {
    key: string
    size: number
    httpEtag: string
    range?: R2Range
    body?: ReadableStream
    writeHttpMetadata(headers: Headers): void
}

interface R2BucketLike {
    get(key: string, options?: { range?: Headers | R2Range; onlyIf?: Headers }): Promise<R2ObjectLike | null>
    head(key: string): Promise<R2ObjectLike | null>
    put(key: string, value: ReadableStream | ArrayBuffer | null, options?: { httpMetadata?: { contentType?: string; cacheControl?: string } }): Promise<unknown>
    delete(keys: string | string[]): Promise<void>
}

interface Env {
    BUCKET: R2BucketLike
    SUPABASE_URL: string
    SUPABASE_ANON_KEY: string
    /** HMAC secret for signed download URLs (any long random string). */
    SIGNING_SECRET: string
    /** Secret for the one-off migration script. */
    ADMIN_SECRET: string
    /** Optional: legacy HS256 JWT secret (Supabase → Settings → API). Avoids a call to Supabase per new session. */
    SUPABASE_JWT_SECRET?: string
    /** Comma separated list of allowed origins, or "*". */
    ALLOWED_ORIGINS?: string
    /** Max upload size in MB (default 60). */
    MAX_UPLOAD_MB?: string
}

const GROUP_BUCKETS = new Set(['songs', 'covers', 'files'])
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const DAY = 86_400

// Per-isolate caches (Workers reuse isolates between requests).
const tokenCache = new Map<string, { userId: string; until: number }>()
const memberCache = new Map<string, { ok: boolean; until: number }>()
let jwksCache: { keys: JsonWebKey[]; until: number } | null = null

export default {
    async fetch(request: Request, env: Env): Promise<Response> {
        const url = new URL(request.url)
        const cors = corsHeaders(request, env)

        if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors })

        try {
            if (url.pathname === '/health') return json({ ok: true }, 200, cors)

            if (url.pathname === '/sign' && request.method === 'POST') return await handleSign(request, env, cors)

            if (url.pathname.startsWith('/admin/f/')) return await handleAdmin(request, env, cors, decodeKey(url.pathname.slice('/admin/f/'.length)))

            if (url.pathname.startsWith('/f/')) {
                const key = decodeKey(url.pathname.slice(3))
                if (!key) return json({ error: 'Clave no válida' }, 400, cors)
                if (request.method === 'GET' || request.method === 'HEAD') return await handleGet(request, env, cors, key, url)
                if (request.method === 'PUT') return await handleUpload(request, env, cors, key)
                if (request.method === 'DELETE') return await handleDelete(request, env, cors, key)
            }

            return json({ error: 'No encontrado' }, 404, cors)
        } catch (error) {
            if (error instanceof HttpError) return json({ error: error.message }, error.status, cors)
            console.error(error)
            return json({ error: 'Error interno' }, 500, cors)
        }
    },
}

// ------------------------------------------------------------
// Handlers
// ------------------------------------------------------------

async function handleSign(request: Request, env: Env, cors: Headers): Promise<Response> {
    const userId = await authenticate(request, env)
    const body = (await request.json().catch(() => null)) as { keys?: unknown } | null
    const keys = Array.isArray(body?.keys) ? (body!.keys as unknown[]).filter((key): key is string => typeof key === 'string').slice(0, 300) : []

    const token = bearer(request)!
    const exp = stableExpiry()
    const origin = new URL(request.url).origin
    const urls: Record<string, string | null> = {}

    await Promise.all(
        keys.map(async (raw) => {
            const key = sanitizeKey(raw)
            if (!key || !(await canRead(key, userId, token, env))) {
                urls[raw] = null
                return
            }
            urls[raw] = `${origin}/f/${encodeKey(key)}?e=${exp}&s=${await sign(env, key, exp)}`
        })
    )

    return json({ urls, expiresAt: exp }, 200, cors)
}

async function handleGet(request: Request, env: Env, cors: Headers, key: string, url: URL): Promise<Response> {
    const exp = Number(url.searchParams.get('e'))
    const sig = url.searchParams.get('s') ?? ''
    if (!Number.isFinite(exp) || exp < Math.floor(Date.now() / 1000)) throw new HttpError(403, 'Enlace caducado')
    if (!(await verifySignature(env, key, exp, sig))) throw new HttpError(403, 'Firma no válida')

    let object: R2ObjectLike | null = null
    for (const candidate of keyCandidates(key)) {
        object = await env.BUCKET.get(candidate, { range: request.headers, onlyIf: request.headers })
        if (object) break
    }
    if (!object) return json({ error: 'No encontrado' }, 404, cors)

    const headers = new Headers(cors)
    object.writeHttpMetadata(headers)
    headers.set('etag', object.httpEtag)
    headers.set('accept-ranges', 'bytes')
    headers.set('cache-control', `private, max-age=${Math.max(60, exp - Math.floor(Date.now() / 1000))}`)

    // Conditional request satisfied (If-None-Match etc.): no body.
    if (!object.body) return new Response(null, { status: 304, headers })

    const range = object.range
    if (range && request.headers.has('range')) {
        const start = range.suffix != null ? object.size - range.suffix : range.offset ?? 0
        const length = range.suffix != null ? range.suffix : range.length ?? object.size - start
        headers.set('content-range', `bytes ${start}-${start + length - 1}/${object.size}`)
        headers.set('content-length', String(length))
        return new Response(request.method === 'HEAD' ? null : object.body, { status: 206, headers })
    }

    headers.set('content-length', String(object.size))
    return new Response(request.method === 'HEAD' ? null : object.body, { status: 200, headers })
}

async function handleUpload(request: Request, env: Env, cors: Headers, key: string): Promise<Response> {
    const userId = await authenticate(request, env)
    if (!(await canWrite(key, userId, bearer(request)!, env))) throw new HttpError(403, 'No puedes subir archivos aquí')

    const maxBytes = Number(env.MAX_UPLOAD_MB ?? '60') * 1024 * 1024
    const length = Number(request.headers.get('content-length') ?? '0')
    if (length > maxBytes) throw new HttpError(413, 'El archivo es demasiado grande')

    await env.BUCKET.put(key, request.body, {
        httpMetadata: {
            contentType: request.headers.get('content-type') || 'application/octet-stream',
            cacheControl: 'private, max-age=31536000, immutable',
        },
    })
    return json({ key }, 200, cors)
}

async function handleDelete(request: Request, env: Env, cors: Headers, key: string): Promise<Response> {
    const userId = await authenticate(request, env)
    if (!ownsKey(key, userId)) throw new HttpError(403, 'Solo puedes borrar tus archivos')
    await env.BUCKET.delete(keyCandidates(key))
    return json({ key }, 200, cors)
}

async function handleAdmin(request: Request, env: Env, cors: Headers, key: string | null): Promise<Response> {
    if (!env.ADMIN_SECRET || request.headers.get('x-admin-secret') !== env.ADMIN_SECRET) throw new HttpError(401, 'No autorizado')
    if (!key) throw new HttpError(400, 'Clave no válida')

    if (request.method === 'HEAD') {
        const object = await env.BUCKET.head(key)
        return new Response(null, { status: object ? 200 : 404, headers: cors })
    }
    if (request.method === 'PUT') {
        await env.BUCKET.put(key, request.body, {
            httpMetadata: {
                contentType: request.headers.get('content-type') || 'application/octet-stream',
                cacheControl: 'private, max-age=31536000, immutable',
            },
        })
        return json({ key }, 200, cors)
    }
    throw new HttpError(405, 'Método no permitido')
}

// ------------------------------------------------------------
// Authorization
// ------------------------------------------------------------

/** Group-scoped buckets use `<groupId>/...` paths: only members may read them. */
async function canRead(key: string, userId: string, token: string, env: Env): Promise<boolean> {
    const [bucket, first] = key.split('/')
    if (GROUP_BUCKETS.has(bucket) && first && UUID_RE.test(first)) {
        return isGroupMember(first, userId, token, env)
    }
    return true // avatars, report images, receipts: any signed-in user.
}

/** Uploads must live under the uploader's own folder (generateStoragePath puts the user id in the path). */
async function canWrite(key: string, userId: string, token: string, env: Env): Promise<boolean> {
    if (!ownsKey(key, userId)) return false
    return canRead(key, userId, token, env)
}

function ownsKey(key: string, userId: string): boolean {
    return key.split('/').includes(userId)
}

async function isGroupMember(groupId: string, userId: string, token: string, env: Env): Promise<boolean> {
    const cacheKey = `${userId}:${groupId}`
    const cached = memberCache.get(cacheKey)
    if (cached && cached.until > Date.now()) return cached.ok

    const response = await fetch(
        `${env.SUPABASE_URL}/rest/v1/group_members?select=user_id&group_id=eq.${groupId}&user_id=eq.${userId}&limit=1`,
        { headers: { apikey: env.SUPABASE_ANON_KEY, authorization: `Bearer ${token}` } }
    )
    const ok = response.ok && ((await response.json()) as unknown[]).length > 0
    memberCache.set(cacheKey, { ok, until: Date.now() + (ok ? 10 : 1) * 60_000 })
    return ok
}

// ------------------------------------------------------------
// Supabase session verification
// ------------------------------------------------------------

async function authenticate(request: Request, env: Env): Promise<string> {
    const token = bearer(request)
    if (!token) throw new HttpError(401, 'Falta la sesión')

    const cached = tokenCache.get(token)
    if (cached && cached.until > Date.now()) return cached.userId

    const local = await verifyJwtLocally(token, env).catch(() => null)
    if (local) {
        tokenCache.set(token, { userId: local.sub, until: Math.min(local.exp * 1000, Date.now() + 10 * 60_000) })
        return local.sub
    }

    // Fallback: ask Supabase Auth (a ~1 KB response, cached for 5 minutes).
    const response = await fetch(`${env.SUPABASE_URL}/auth/v1/user`, {
        headers: { apikey: env.SUPABASE_ANON_KEY, authorization: `Bearer ${token}` },
    })
    if (!response.ok) throw new HttpError(401, 'Sesión no válida')
    const user = (await response.json()) as { id?: string }
    if (!user.id) throw new HttpError(401, 'Sesión no válida')
    tokenCache.set(token, { userId: user.id, until: Date.now() + 5 * 60_000 })
    if (tokenCache.size > 500) tokenCache.clear()
    return user.id
}

async function verifyJwtLocally(token: string, env: Env): Promise<{ sub: string; exp: number } | null> {
    const [headerPart, payloadPart, signaturePart] = token.split('.')
    if (!headerPart || !payloadPart || !signaturePart) return null
    const header = JSON.parse(textFromBase64Url(headerPart)) as { alg?: string; kid?: string }
    const payload = JSON.parse(textFromBase64Url(payloadPart)) as { sub?: string; exp?: number; role?: string }
    if (!payload.sub || !payload.exp || payload.exp * 1000 < Date.now() || payload.role !== 'authenticated') return null

    const data = new TextEncoder().encode(`${headerPart}.${payloadPart}`)
    const signature = bytesFromBase64Url(signaturePart)

    if (header.alg === 'HS256' && env.SUPABASE_JWT_SECRET) {
        const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(env.SUPABASE_JWT_SECRET), { name: 'HMAC', hash: 'SHA-256' }, false, ['verify'])
        return (await crypto.subtle.verify('HMAC', key, signature, data)) ? { sub: payload.sub, exp: payload.exp } : null
    }

    if (header.alg === 'ES256' || header.alg === 'RS256') {
        const jwk = (await loadJwks(env)).find((candidate) => (candidate as { kid?: string }).kid === header.kid)
        if (!jwk) return null
        const algorithm = header.alg === 'ES256' ? { name: 'ECDSA', namedCurve: 'P-256' } : { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }
        const key = await crypto.subtle.importKey('jwk', jwk, algorithm, false, ['verify'])
        const verifyAlgorithm = header.alg === 'ES256' ? { name: 'ECDSA', hash: 'SHA-256' } : { name: 'RSASSA-PKCS1-v1_5' }
        return (await crypto.subtle.verify(verifyAlgorithm, key, signature, data)) ? { sub: payload.sub, exp: payload.exp } : null
    }

    return null
}

async function loadJwks(env: Env): Promise<JsonWebKey[]> {
    if (jwksCache && jwksCache.until > Date.now()) return jwksCache.keys
    const response = await fetch(`${env.SUPABASE_URL}/auth/v1/.well-known/jwks.json`)
    const keys = response.ok ? (((await response.json()) as { keys?: JsonWebKey[] }).keys ?? []) : []
    jwksCache = { keys, until: Date.now() + 60 * 60_000 }
    return keys
}

// ------------------------------------------------------------
// Signed URLs
// ------------------------------------------------------------

/** Expiry at the end of tomorrow (UTC): the URL stays identical all day, so browsers can cache files. */
function stableExpiry(): number {
    const now = Math.floor(Date.now() / 1000)
    return (Math.floor(now / DAY) + 2) * DAY
}

async function sign(env: Env, key: string, exp: number): Promise<string> {
    const hmacKey = await crypto.subtle.importKey('raw', new TextEncoder().encode(env.SIGNING_SECRET), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
    const signature = await crypto.subtle.sign('HMAC', hmacKey, new TextEncoder().encode(`${key}\n${exp}`))
    return base64Url(new Uint8Array(signature))
}

async function verifySignature(env: Env, key: string, exp: number, provided: string): Promise<boolean> {
    const expected = await sign(env, key, exp)
    if (expected.length !== provided.length) return false
    let diff = 0
    for (let i = 0; i < expected.length; i += 1) diff |= expected.charCodeAt(i) ^ provided.charCodeAt(i)
    return diff === 0
}

// ------------------------------------------------------------
// Helpers
// ------------------------------------------------------------

/** Some legacy rows store the path with the bucket name in front (e.g. "reports/reports/…"). */
function keyCandidates(key: string): string[] {
    const [bucket, second, ...rest] = key.split('/')
    if (second === bucket && rest.length > 0) return [key, [bucket, ...rest].join('/')]
    return [key, [bucket, bucket, second, ...rest].filter(Boolean).join('/')]
}

function sanitizeKey(raw: string): string | null {
    const key = raw.replace(/^\/+/, '')
    if (!key || key.length > 512 || key.includes('..') || key.includes('\\')) return null
    return key
}

function decodeKey(encoded: string): string | null {
    try {
        return sanitizeKey(encoded.split('/').map(decodeURIComponent).join('/'))
    } catch {
        return null
    }
}

function encodeKey(key: string): string {
    return key.split('/').map(encodeURIComponent).join('/')
}

function bearer(request: Request): string | null {
    const header = request.headers.get('authorization') ?? ''
    return header.toLowerCase().startsWith('bearer ') ? header.slice(7).trim() : null
}

function corsHeaders(request: Request, env: Env): Headers {
    const allowed = (env.ALLOWED_ORIGINS ?? '*').split(',').map((value) => value.trim())
    const origin = request.headers.get('origin') ?? ''
    const headers = new Headers({
        'access-control-allow-methods': 'GET, HEAD, PUT, POST, DELETE, OPTIONS',
        'access-control-allow-headers': 'authorization, content-type, range, x-admin-secret',
        'access-control-expose-headers': 'content-range, content-length, accept-ranges, etag',
        'access-control-max-age': '86400',
        vary: 'origin',
    })
    headers.set('access-control-allow-origin', allowed.includes('*') ? '*' : allowed.includes(origin) ? origin : allowed[0] ?? '')
    return headers
}

function json(body: unknown, status: number, cors: Headers): Response {
    const headers = new Headers(cors)
    headers.set('content-type', 'application/json; charset=utf-8')
    return new Response(JSON.stringify(body), { status, headers })
}

function base64Url(bytes: Uint8Array): string {
    let binary = ''
    for (const byte of bytes) binary += String.fromCharCode(byte)
    return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function bytesFromBase64Url(value: string): Uint8Array {
    const base64 = value.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(value.length / 4) * 4, '=')
    return Uint8Array.from(atob(base64), (char) => char.charCodeAt(0))
}

function textFromBase64Url(value: string): string {
    return new TextDecoder().decode(bytesFromBase64Url(value))
}

class HttpError extends Error {
    status: number

    constructor(status: number, message: string) {
        super(message)
        this.status = status
    }
}
