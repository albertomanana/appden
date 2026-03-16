import type { DynamicPalette } from '@features/player/player.types'
import { clamp } from '@features/player/utils/audioUtils'

const FALLBACK_PALETTE: DynamicPalette = {
    dominant: 'rgb(41, 45, 62)',
    accent: 'rgb(93, 106, 180)',
    gradient: 'linear-gradient(135deg, rgba(41,45,62,0.92) 0%, rgba(18,20,28,0.96) 55%, rgba(11,13,20,1) 100%)',
    blurOverlay: 'radial-gradient(circle at 20% 20%, rgba(93,106,180,0.22) 0%, rgba(10,10,14,0) 65%)',
}

export async function extractDynamicPalette(imageUrl: string | null | undefined): Promise<DynamicPalette> {
    if (!imageUrl) return FALLBACK_PALETTE

    try {
        const color = await extractDominantColor(imageUrl)
        const accent = shiftColor(color, 26)
        return {
            dominant: toRgb(color),
            accent: toRgb(accent),
            gradient: `linear-gradient(135deg, ${toRgba(color, 0.92)} 0%, ${toRgba(accent, 0.62)} 52%, rgba(9,10,14,0.98) 100%)`,
            blurOverlay: `radial-gradient(circle at 20% 20%, ${toRgba(accent, 0.32)} 0%, rgba(9,10,14,0) 68%)`,
        }
    } catch {
        return FALLBACK_PALETTE
    }
}

async function extractDominantColor(imageUrl: string): Promise<[number, number, number]> {
    const img = await loadImage(imageUrl)
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    if (!ctx) throw new Error('Canvas 2D context unavailable')

    const width = 48
    const height = 48
    canvas.width = width
    canvas.height = height
    ctx.drawImage(img, 0, 0, width, height)

    const data = ctx.getImageData(0, 0, width, height).data
    let r = 0
    let g = 0
    let b = 0
    let count = 0

    for (let i = 0; i < data.length; i += 4) {
        const alpha = data[i + 3]
        if (alpha < 128) continue
        const red = data[i]
        const green = data[i + 1]
        const blue = data[i + 2]
        const luma = 0.2126 * red + 0.7152 * green + 0.0722 * blue
        if (luma < 20) continue
        r += red
        g += green
        b += blue
        count += 1
    }

    if (count === 0) return [41, 45, 62]
    return [Math.round(r / count), Math.round(g / count), Math.round(b / count)]
}

function loadImage(src: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
        const img = new Image()
        img.crossOrigin = 'anonymous'
        img.onload = () => resolve(img)
        img.onerror = () => reject(new Error('Image load failed'))
        img.src = src
    })
}

function shiftColor(color: [number, number, number], offset: number): [number, number, number] {
    return [
        clamp(color[0] + offset, 0, 255),
        clamp(color[1] + offset, 0, 255),
        clamp(color[2] + offset, 0, 255),
    ]
}

function toRgb(color: [number, number, number]): string {
    return `rgb(${color[0]}, ${color[1]}, ${color[2]})`
}

function toRgba(color: [number, number, number], alpha: number): string {
    return `rgba(${color[0]}, ${color[1]}, ${color[2]}, ${alpha})`
}
