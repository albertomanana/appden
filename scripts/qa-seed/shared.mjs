#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js'
import { existsSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

export const ROOT_DIR = join(__dirname, '..', '..')
export const QA_GROUP_PREFIX = 'QA Seed:'

function parseEnvFile(content) {
    const entries = {}

    for (const line of content.split(/\r?\n/)) {
        const trimmed = line.trim()
        if (!trimmed || trimmed.startsWith('#')) continue

        const separatorIndex = trimmed.indexOf('=')
        if (separatorIndex === -1) continue

        const key = trimmed.slice(0, separatorIndex).trim()
        let value = trimmed.slice(separatorIndex + 1).trim()

        if (
            (value.startsWith('"') && value.endsWith('"')) ||
            (value.startsWith("'") && value.endsWith("'"))
        ) {
            value = value.slice(1, -1)
        }

        if (key) entries[key] = value
    }

    return entries
}

function loadEnvFile(pathname) {
    if (!existsSync(pathname)) return

    const raw = readFileSync(pathname, 'utf8')
    const entries = parseEnvFile(raw)

    for (const [key, value] of Object.entries(entries)) {
        if (!process.env[key]) {
            process.env[key] = value
        }
    }
}

export function loadLocalEnv() {
    loadEnvFile(join(ROOT_DIR, '.env'))
    loadEnvFile(join(ROOT_DIR, '.env.local'))
}

export function getSeedConfig() {
    loadLocalEnv()

    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl) {
        throw new Error('Falta SUPABASE_URL o VITE_SUPABASE_URL para ejecutar el seed QA.')
    }

    if (!serviceRoleKey) {
        throw new Error('Falta SUPABASE_SERVICE_ROLE_KEY para ejecutar el seed QA.')
    }

    return {
        supabaseUrl,
        serviceRoleKey,
        emailDomain: (process.env.QA_SEED_EMAIL_DOMAIN || 'qa.theappden.local').trim().toLowerCase(),
        defaultPassword: (process.env.QA_SEED_DEFAULT_PASSWORD || 'Launch2026!').trim(),
    }
}

export function createServiceClient() {
    const config = getSeedConfig()

    return createClient(config.supabaseUrl, config.serviceRoleKey, {
        auth: {
            persistSession: false,
            autoRefreshToken: false,
        },
        global: {
            headers: {
                'x-app-name': 'the-appden-qa-seed',
            },
        },
    })
}

export function qaEmail(localPart, emailDomain) {
    return `${localPart}@${emailDomain}`.toLowerCase()
}

export function isoDaysAgo(daysAgo, hour = 12, minute = 0) {
    const date = new Date()
    date.setUTCDate(date.getUTCDate() - daysAgo)
    date.setUTCHours(hour, minute, 0, 0)
    return date.toISOString()
}

export function chunk(values, size = 100) {
    const rows = []
    for (let index = 0; index < values.length; index += size) {
        rows.push(values.slice(index, index + size))
    }
    return rows
}

export function logStep(label) {
    process.stdout.write(`\n[qa-seed] ${label}\n`)
}

export function isMissingRelationError(error) {
    if (!error || typeof error !== 'object') return false
    const anyError = /** @type {{ code?: string, message?: string, details?: string }} */ (error)
    const raw = `${anyError.code ?? ''} ${anyError.message ?? ''} ${anyError.details ?? ''}`.toLowerCase()
    return raw.includes('42p01') || raw.includes('pgrst205') || raw.includes('does not exist')
}

export async function listAllAuthUsers(client) {
    const users = []
    let page = 1
    const perPage = 200

    while (true) {
        const { data, error } = await client.auth.admin.listUsers({ page, perPage })
        if (error) throw error

        const batch = data?.users ?? []
        users.push(...batch)

        if (batch.length < perPage) break
        page += 1
    }

    return users
}

export async function findQaAuthUsers(client, emailDomain) {
    const users = await listAllAuthUsers(client)
    return users.filter((user) => user.email?.toLowerCase().endsWith(`@${emailDomain}`))
}

async function deleteByIds(client, table, column, ids) {
    for (const batch of chunk(ids, 100)) {
        const { error } = await client.from(table).delete().in(column, batch)
        if (error && !isMissingRelationError(error)) throw error
    }
}

async function deleteByOrFilter(client, table, filter) {
    const { error } = await client.from(table).delete().or(filter)
    if (error && !isMissingRelationError(error)) throw error
}

export async function resetQaSeed(client, emailDomain) {
    const qaUsers = await findQaAuthUsers(client, emailDomain)
    const userIds = qaUsers.map((user) => user.id)

    const { data: groups, error: groupsError } = await client
        .from('groups')
        .select('id, name')
        .ilike('name', `${QA_GROUP_PREFIX}%`)

    if (groupsError && !isMissingRelationError(groupsError)) {
        throw groupsError
    }

    const groupIds = (groups ?? []).map((group) => group.id)

    if (userIds.length === 0 && groupIds.length === 0) {
        logStep('No QA seed data found. Nothing to reset.')
        return {
            deletedUsers: 0,
            deletedGroups: 0,
        }
    }

    logStep(`Resetting QA namespace (${userIds.length} users, ${groupIds.length} groups).`)

    if (userIds.length > 0) {
        await deleteByIds(client, 'user_roles', 'user_id', userIds)
        await deleteByIds(client, 'push_subscriptions', 'user_id', userIds)
        await deleteByIds(client, 'notifications', 'user_id', userIds)
        await deleteByIds(client, 'shared_links', 'created_by', userIds)
        await deleteByIds(client, 'report_notifications', 'admin_user_id', userIds)
        await deleteByIds(client, 'reports', 'user_id', userIds)
        await deleteByIds(client, 'group_friend_requests', 'from_user_id', userIds)
        await deleteByIds(client, 'group_friend_requests', 'to_user_id', userIds)
        await deleteByIds(client, 'friend_requests', 'from_user_id', userIds)
        await deleteByIds(client, 'friend_requests', 'to_user_id', userIds)

        const friendshipFilter = userIds
            .flatMap((id) => [`user_a.eq.${id}`, `user_b.eq.${id}`])
            .join(',')
        await deleteByOrFilter(client, 'friendships', friendshipFilter)
    }

    if (groupIds.length > 0) {
        await deleteByIds(client, 'notifications', 'group_id', groupIds)
        await deleteByIds(client, 'reports', 'group_id', groupIds)
        await deleteByIds(client, 'groups', 'id', groupIds)
    }

    for (const userId of userIds) {
        const { error } = await client.auth.admin.deleteUser(userId)
        if (error) throw error
    }

    logStep('QA seed namespace removed successfully.')

    return {
        deletedUsers: userIds.length,
        deletedGroups: groupIds.length,
    }
}
