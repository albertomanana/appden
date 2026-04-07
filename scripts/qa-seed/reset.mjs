#!/usr/bin/env node
import { createServiceClient, getSeedConfig, logStep, resetQaSeed } from './shared.mjs'

async function main() {
    const config = getSeedConfig()
    const client = createServiceClient()

    logStep(`Using Supabase project at ${config.supabaseUrl}`)
    const result = await resetQaSeed(client, config.emailDomain)

    process.stdout.write(
        `[qa-seed] Reset complete. Deleted ${result.deletedUsers} users and ${result.deletedGroups} groups.\n`
    )
}

main().catch((error) => {
    process.stderr.write(`[qa-seed] Reset failed: ${error instanceof Error ? error.message : String(error)}\n`)
    process.exitCode = 1
})
