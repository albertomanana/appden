const warnedFallbacks = new Set<string>()

export function reportLocalFallback(moduleName: string, reason: unknown): void {
    if (!import.meta.env.DEV) return

    const key = moduleName
    if (warnedFallbacks.has(key)) return
    warnedFallbacks.add(key)

    const message = reason instanceof Error ? reason.message : String(reason ?? 'unknown backend error')
    console.warn(
        `[The Appden] ${moduleName} is using local fallback data. ` +
            'Check Supabase migrations and environment readiness.',
        message
    )
}
