#!/usr/bin/env node
import { execSync } from 'node:child_process'
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const rootDir = join(__dirname, '..')
const outputPath = join(rootDir, 'public', 'changelog.generated.json')
const packageJsonPath = join(rootDir, 'package.json')

const branch = process.env.CHANGELOG_BRANCH || 'develop'
const commitLimit = Number(process.env.CHANGELOG_LIMIT || 120)

function run(command) {
    return execSync(command, {
        cwd: rootDir,
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe'],
    }).trim()
}

function safeGitLog(targetBranch) {
    const format = '%H%x1f%h%x1f%ad%x1f%an%x1f%s%x1e'
    try {
        return run(`git log ${targetBranch} --date=iso-strict --pretty=format:${format} -n ${commitLimit}`)
    } catch {
        return run(`git log HEAD --date=iso-strict --pretty=format:${format} -n ${commitLimit}`)
    }
}

function classifyCommit(subject) {
    const normalized = subject.trim().toLowerCase()
    if (/^(feat|feature)(\(.+\))?:/.test(normalized)) return 'feature'
    if (/^(fix|hotfix|bugfix)(\(.+\))?:/.test(normalized)) return 'fix'
    if (/^(refactor|perf|style|chore|build|ci|docs|test)(\(.+\))?:/.test(normalized)) return 'improvement'
    return 'update'
}

function cleanTitle(subject) {
    return subject
        .replace(/^(feat|feature|fix|hotfix|bugfix|refactor|perf|style|chore|build|ci|docs|test)(\(.+\))?:\s*/i, '')
        .trim()
}

function inferVersion(packageVersion, subjects) {
    for (const subject of subjects) {
        const match = subject.match(/\bv?(\d+\.\d+\.\d+)\b/)
        if (match?.[1]) return match[1]
    }
    return packageVersion
}

function toDateOnly(isoString) {
    const date = new Date(isoString)
    if (Number.isNaN(date.getTime())) return new Date().toISOString().slice(0, 10)
    return date.toISOString().slice(0, 10)
}

function parseLog(raw) {
    if (!raw) return []
    const rows = raw
        .split('\x1e')
        .map((chunk) => chunk.trim())
        .filter(Boolean)

    return rows.map((row) => {
        const [sha, shortSha, authoredAt, author, subject] = row.split('\x1f')
        const type = classifyCommit(subject || '')
        const title = cleanTitle(subject || '') || subject || shortSha

        return {
            id: sha,
            version: '',
            title,
            description: subject || title,
            type,
            release_date: toDateOnly(authoredAt),
            created_at: authoredAt,
            commit_sha: shortSha,
            author: author || null,
        }
    })
}

function main() {
    const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'))
    const packageVersion = packageJson.version || '1.0.0'

    const rawLog = safeGitLog(branch)
    const entries = parseLog(rawLog)
    const version = inferVersion(packageVersion, entries.map((entry) => entry.description))

    const payload = {
        generated_at: new Date().toISOString(),
        source_branch: branch,
        current_version: version,
        entries: entries.map((entry) => ({ ...entry, version })),
    }

    mkdirSync(dirname(outputPath), { recursive: true })
    writeFileSync(outputPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8')
    process.stdout.write(`Generated changelog with ${payload.entries.length} entries at ${outputPath}\n`)
}

main()

