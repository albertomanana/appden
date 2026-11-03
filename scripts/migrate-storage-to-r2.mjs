// ============================================================
// One-off copy of every Supabase Storage object to Cloudflare R2.
//
//   node scripts/migrate-storage-to-r2.mjs            # copy everything
//   node scripts/migrate-storage-to-r2.mjs --dry-run  # only list and count
//
// Needs (in .env.local, .env or the shell):
//   VITE_SUPABASE_URL           project URL
//   SUPABASE_SERVICE_ROLE_KEY   service role key (Settings → API). Never ship it to the browser.
//   VITE_STORAGE_URL            URL of the deployed appden-storage Worker
//   STORAGE_ADMIN_SECRET        the Worker's ADMIN_SECRET
//
// Objects keep their path: Supabase `<bucket>/<path>` → R2 key `<bucket>/<path>`,
// so no database row changes. Safe to re-run: existing keys are skipped.
// Downloading from Supabase counts as egress ONE time; run it when the quota allows.
// ============================================================

import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { createClient } from '@supabase/supabase-js'

const BUCKETS = ['songs', 'covers', 'avatars', 'files', 'reports']
const DRY_RUN = process.argv.includes('--dry-run')
const CONCURRENCY = 4

for (const file of ['.env.local', '.env']) {
    const path = join(process.cwd(), file)
    if (!existsSync(path)) continue
    for (const line of readFileSync(path, 'utf8').split(/\r?\n/)) {
        const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
        if (!match || process.env[match[1]]) continue
        process.env[match[1]] = match[2].replace(/^['"]|['"]$/g, '')
    }
}

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const STORAGE_URL = (process.env.STORAGE_URL || process.env.VITE_STORAGE_URL || '').replace(/\/+$/, '')
const ADMIN_SECRET = process.env.STORAGE_ADMIN_SECRET

const missing = [
    ['VITE_SUPABASE_URL', SUPABASE_URL],
    ['SUPABASE_SERVICE_ROLE_KEY', SERVICE_KEY],
    ['VITE_STORAGE_URL', STORAGE_URL],
    ['STORAGE_ADMIN_SECRET', ADMIN_SECRET],
].filter(([, value]) => !value)
if (missing.length > 0) {
    console.error(`Faltan variables: ${missing.map(([name]) => name).join(', ')}`)
    process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } })

async function listAll(bucket, prefix = '') {
    const files = []
    for (let offset = 0; ; offset += 1000) {
        const { data, error } = await supabase.storage.from(bucket).list(prefix, { limit: 1000, offset, sortBy: { column: 'name', order: 'asc' } })
        if (error) {
            if (/not found/i.test(error.message)) return files
            throw new Error(`${bucket}/${prefix}: ${error.message}`)
        }
        for (const entry of data ?? []) {
            const path = prefix ? `${prefix}/${entry.name}` : entry.name
            if (entry.id === null) files.push(...(await listAll(bucket, path)))
            else files.push({ path, size: entry.metadata?.size ?? 0, type: entry.metadata?.mimetype })
        }
        if (!data || data.length < 1000) return files
    }
}

const adminUrl = (key) => `${STORAGE_URL}/admin/f/${key.split('/').map(encodeURIComponent).join('/')}`

async function copy(bucket, file) {
    const key = `${bucket}/${file.path}`
    const head = await fetch(adminUrl(key), { method: 'HEAD', headers: { 'x-admin-secret': ADMIN_SECRET } })
    if (head.status === 401) throw new Error('STORAGE_ADMIN_SECRET no coincide con el ADMIN_SECRET del Worker')
    if (head.ok) return 'skipped'

    const { data, error } = await supabase.storage.from(bucket).download(file.path)
    if (error) throw new Error(`${key}: ${error.message}`)

    const response = await fetch(adminUrl(key), {
        method: 'PUT',
        headers: { 'x-admin-secret': ADMIN_SECRET, 'content-type': file.type || data.type || 'application/octet-stream' },
        body: data,
    })
    if (!response.ok) throw new Error(`${key}: subida a R2 fallida (${response.status})`)
    return 'copied'
}

const totals = { files: 0, bytes: 0, copied: 0, skipped: 0, failed: 0 }

for (const bucket of BUCKETS) {
    const files = await listAll(bucket)
    const bytes = files.reduce((sum, file) => sum + file.size, 0)
    totals.files += files.length
    totals.bytes += bytes
    console.log(`\n${bucket}: ${files.length} archivos (${(bytes / 1024 / 1024).toFixed(1)} MB)`)
    if (DRY_RUN) continue

    let index = 0
    const worker = async () => {
        while (index < files.length) {
            const file = files[index++]
            try {
                const result = await copy(bucket, file)
                totals[result] += 1
                process.stdout.write(result === 'copied' ? '.' : 's')
            } catch (error) {
                totals.failed += 1
                console.error(`\n  ✗ ${error.message}`)
            }
        }
    }
    await Promise.all(Array.from({ length: CONCURRENCY }, worker))
}

console.log(`\n\nTotal: ${totals.files} archivos, ${(totals.bytes / 1024 / 1024).toFixed(1)} MB`)
if (!DRY_RUN) console.log(`Copiados: ${totals.copied} · ya estaban: ${totals.skipped} · fallidos: ${totals.failed}`)
if (totals.failed > 0) process.exitCode = 1
