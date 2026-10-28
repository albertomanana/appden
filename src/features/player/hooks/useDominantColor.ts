import { useEffect, useState } from 'react'

const cache = new Map<string, string | null>()

/**
 * Extracts a vivid average colour from an image (used for the full player backdrop).
 * Returns null when the image cannot be read (CORS, network) so callers keep a default.
 */
export function useDominantColor(src: string | null | undefined): string | null {
    const key = src ? src.split('?')[0] : null
    const [color, setColor] = useState<string | null>(() => (key ? cache.get(key) ?? null : null))

    useEffect(() => {
        if (!src || !key) {
            setColor(null)
            return
        }
        if (cache.has(key)) {
            setColor(cache.get(key) ?? null)
            return
        }

        let cancelled = false
        const img = new Image()
        img.crossOrigin = 'anonymous'
        img.decoding = 'async'
        img.onload = () => {
            if (cancelled) return
            const value = extract(img)
            cache.set(key, value)
            setColor(value)
        }
        img.onerror = () => {
            if (cancelled) return
            cache.set(key, null)
            setColor(null)
        }
        img.src = src

        return () => {
            cancelled = true
        }
    }, [key, src])

    return color
}

function extract(img: HTMLImageElement): string | null {
    try {
        const size = 24
        const canvas = document.createElement('canvas')
        canvas.width = size
        canvas.height = size
        const ctx = canvas.getContext('2d', { willReadFrequently: true })
        if (!ctx) return null
        ctx.drawImage(img, 0, 0, size, size)
        const { data } = ctx.getImageData(0, 0, size, size)

        let r = 0
        let g = 0
        let b = 0
        let weightSum = 0
        for (let i = 0; i < data.length; i += 4) {
            const pr = data[i]
            const pg = data[i + 1]
            const pb = data[i + 2]
            const max = Math.max(pr, pg, pb)
            const min = Math.min(pr, pg, pb)
            // Favour saturated, mid-bright pixels so the result is not a muddy grey.
            const saturation = max === 0 ? 0 : (max - min) / max
            const brightness = max / 255
            const weight = 0.15 + saturation * 2 * (brightness > 0.15 ? 1 : 0.2)
            r += pr * weight
            g += pg * weight
            b += pb * weight
            weightSum += weight
        }
        if (weightSum === 0) return null
        return normalize(r / weightSum, g / weightSum, b / weightSum)
    } catch {
        // Tainted canvas (no CORS headers) - keep the default backdrop.
        return null
    }
}

/** Clamp lightness so white text always stays readable on top. */
function normalize(r: number, g: number, b: number): string {
    const max = Math.max(r, g, b)
    const target = Math.min(Math.max(max, 90), 170)
    const factor = max > 0 ? target / max : 1
    const c = (v: number) => Math.round(Math.min(255, v * factor))
    return `rgb(${c(r)}, ${c(g)}, ${c(b)})`
}
