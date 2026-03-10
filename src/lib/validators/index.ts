import { z } from 'zod'
import {
    MAX_AUDIO_SIZE,
    MAX_AVATAR_SIZE,
    MAX_DOCUMENT_SIZE,
    MAX_IMAGE_SIZE,
    ALLOWED_AUDIO_TYPES,
    ALLOWED_IMAGE_TYPES,
    ALLOWED_DOCUMENT_TYPES,
} from '@lib/constants'

// ── Auth validators ──────────────────────────────────────────

export const loginSchema = z.object({
    email: z.string().email('Email inválido'),
    password: z.string().min(6, 'Mínimo 6 caracteres'),
})

export const registerSchema = z
    .object({
        display_name: z
            .string()
            .min(2, 'Mínimo 2 caracteres')
            .max(60, 'Máximo 60 caracteres'),
        email: z.string().email('Email inválido'),
        password: z.string().min(8, 'Mínimo 8 caracteres'),
        confirmPassword: z.string(),
    })
    .refine((d) => d.password === d.confirmPassword, {
        path: ['confirmPassword'],
        message: 'Las contraseñas no coinciden',
    })

export const resetPasswordSchema = z.object({
    email: z.string().email('Email inválido'),
})

// ── Profile validators ───────────────────────────────────────

export const profileSchema = z.object({
    display_name: z
        .string()
        .min(2, 'Mínimo 2 caracteres')
        .max(60, 'Máximo 60 caracteres'),
    username: z
        .string()
        .min(3, 'Mínimo 3 caracteres')
        .max(30, 'Máximo 30 caracteres')
        .regex(
            /^[a-z0-9_]+$/,
            'Solo letras minúsculas, números y guión bajo'
        )
        .optional()
        .or(z.literal('')),
    bio: z.string().max(200, 'Máximo 200 caracteres').optional().or(z.literal('')),
})

// ── Song validators ──────────────────────────────────────────

export const songSchema = z.object({
    title: z.string().min(1, 'El título es obligatorio').max(100),
    artist_name: z.string().min(1, 'El artista es obligatorio').max(100),
    album_name: z.string().max(100).optional().or(z.literal('')),
})

// ── Playlist validators ──────────────────────────────────────

export const playlistSchema = z.object({
    name: z.string().min(1, 'El nombre es obligatorio').max(80),
    description: z.string().max(300).optional().or(z.literal('')),
})

// ── Debt validators ──────────────────────────────────────────

export const debtSchema = z.object({
    debtor_id: z.string().uuid('Deudor inválido'),
    amount: z
        .number({ invalid_type_error: 'Introduce un importe' })
        .positive('El importe debe ser positivo')
        .max(999_999, 'Importe demasiado alto'),
    currency: z.enum(['EUR', 'USD', 'GBP', 'MXN']),
    concept: z.string().min(1, 'El concepto es obligatorio').max(200),
})

export const paymentSchema = z.object({
    amount: z
        .number({ invalid_type_error: 'Introduce un importe' })
        .positive('El importe debe ser positivo'),
    note: z.string().max(200).optional().or(z.literal('')),
})

// ── File validators ──────────────────────────────────────────

export const fileSchema = z.object({
    name: z.string().min(1, 'El nombre es obligatorio').max(200),
})

// ── File input validation helpers ────────────────────────────

export function validateAudioFile(file: File): string | null {
    // Be flexible with MIME types - some files detected incorrectly by browser
    const isAudioLike = file.type.startsWith('audio/') ||
                        file.type.startsWith('video/') ||
                        ALLOWED_AUDIO_TYPES.includes(file.type)

    if (!isAudioLike) {
        return 'Formato de audio no permitido. Usa MP3, MP4, OGG, WAV, FLAC, WebM o AAC.'
    }
    if (file.size > MAX_AUDIO_SIZE) {
        return 'El archivo supera el límite de 50 MB.'
    }
    return null
}

export function validateImageFile(file: File): string | null {
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
        return 'Formato de imagen no permitido. Usa JPEG, PNG, WebP o AVIF.'
    }
    if (file.size > MAX_IMAGE_SIZE) {
        return 'La imagen supera el límite de 10 MB.'
    }
    return null
}

export function validateAvatarFile(file: File): string | null {
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
        return 'Formato de imagen no válido.'
    }
    if (file.size > MAX_AVATAR_SIZE) {
        return 'La imagen supera el límite de 5 MB.'
    }
    return null
}

export function validateDocumentFile(file: File): string | null {
    const allowed = [...ALLOWED_IMAGE_TYPES, ...ALLOWED_DOCUMENT_TYPES]
    if (!allowed.includes(file.type)) {
        return 'Tipo de archivo no permitido.'
    }
    if (file.size > MAX_DOCUMENT_SIZE) {
        return 'El archivo supera el límite de 20 MB.'
    }
    return null
}

// Derived types from Zod schemas
export type LoginFormData = z.infer<typeof loginSchema>
export type RegisterFormData = z.infer<typeof registerSchema>
export type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>
export type ProfileFormData = z.infer<typeof profileSchema>
export type SongFormData = z.infer<typeof songSchema>
export type PlaylistFormData = z.infer<typeof playlistSchema>
export type DebtFormData = z.infer<typeof debtSchema>
export type PaymentFormData = z.infer<typeof paymentSchema>
export type FileFormData = z.infer<typeof fileSchema>
