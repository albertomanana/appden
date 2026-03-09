import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { formatDistanceToNow, format } from 'date-fns'
import { es } from 'date-fns/locale'

/**
 * Merge Tailwind classes safely, resolving conflicts.
 */
export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs))
}

/**
 * Format bytes to human-readable string.
 */
export function formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}

/**
 * Format seconds to MM:SS string.
 */
export function formatDuration(seconds: number | null | undefined): string {
    if (!seconds || seconds <= 0) return '0:00'
    const m = Math.floor(seconds / 60)
    const s = Math.floor(seconds % 60)
    return `${m}:${s.toString().padStart(2, '0')}`
}

/**
 * Format a date relative to now (e.g. "hace 3 días").
 */
export function formatRelative(date: string | Date): string {
    return formatDistanceToNow(new Date(date), { addSuffix: true, locale: es })
}

/**
 * Format a date as a short string (e.g. "6 mar 2025").
 */
export function formatDate(date: string | Date): string {
    return format(new Date(date), 'd MMM yyyy', { locale: es })
}

/**
 * Format a monetary amount with currency.
 */
export function formatMoney(amount: number, currency = 'EUR'): string {
    return new Intl.NumberFormat('es-ES', {
        style: 'currency',
        currency,
        minimumFractionDigits: 2,
    }).format(amount)
}

/**
 * Generate a safe filename by sanitizing special characters.
 */
export function sanitizeFilename(name: string): string {
    return name
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9._-]/g, '-')
        .replace(/-+/g, '-')
}

/**
 * Generate a unique storage path for uploaded files.
 * Pattern: {prefix}/{userId}/{timestamp}-{randomSuffix}.{ext}
 */
export function generateStoragePath(
    prefix: string,
    userId: string,
    filename: string
): string {
    const ext = filename.split('.').pop() ?? 'bin'
    const ts = Date.now()
    const rand = Math.random().toString(36).slice(2, 8)
    return `${prefix}/${userId}/${ts}-${rand}.${ext}`
}

/**
 * Get initials from a display name (max 2 chars).
 */
export function getInitials(name: string): string {
    const parts = name.trim().split(/\s+/)
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

/**
 * Calculate debt payment progress as a percentage.
 */
export function getDebtProgress(total: number, paid: number): number {
    if (total <= 0) return 0
    return Math.min(100, Math.round((paid / total) * 100))
}

/**
 * Build a WhatsApp share URL.
 */
export function buildWhatsAppUrl(text: string): string {
    return `https://wa.me/?text=${encodeURIComponent(text)}`
}

/**
 * Attempt to use native Web Share API, falling back to clipboard.
 */
export async function shareOrCopy(
    title: string,
    url: string
): Promise<'shared' | 'copied'> {
    if (navigator.share) {
        try {
            await navigator.share({ title, url })
            return 'shared'
        } catch {
            // User cancelled or not supported
        }
    }
    await navigator.clipboard.writeText(url)
    return 'copied'
}

/**
 * Sleep for a given number of milliseconds.
 */
export function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Debounce a function call.
 */
export function debounce<T extends (...args: unknown[]) => void>(
    fn: T,
    delay: number
): (...args: Parameters<T>) => void {
    let timer: ReturnType<typeof setTimeout>
    return (...args: Parameters<T>) => {
        clearTimeout(timer)
        timer = setTimeout(() => fn(...args), delay)
    }
}

/**
 * Extract audio duration from an audio file (in seconds).
 * Uses Web Audio API to read the file's duration metadata.
 */
export async function extractAudioDuration(file: File): Promise<number> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = (event) => {
            const arrayBuffer = event.target?.result as ArrayBuffer
            if (!arrayBuffer) {
                reject(new Error('Failed to read file'))
                return
            }

            // Create an audio context to decode the audio file
            const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
            audioContext.decodeAudioData(
                arrayBuffer,
                (audioBuffer) => {
                    resolve(audioBuffer.duration)
                },
                (error) => {
                    reject(error)
                }
            )
        }
        reader.onerror = () => {
            reject(new Error('Failed to read file'))
        }
        reader.readAsArrayBuffer(file)
    })
}

