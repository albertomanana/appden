// ============================================================
// APP CONSTANTS
// ============================================================

export const APP_NAME = 'The Appden'

// File size limits (bytes)
export const MAX_AUDIO_SIZE = 50 * 1024 * 1024   // 50 MB
export const MAX_IMAGE_SIZE = 10 * 1024 * 1024   // 10 MB
export const MAX_DOCUMENT_SIZE = 20 * 1024 * 1024 // 20 MB
export const MAX_AVATAR_SIZE = 5 * 1024 * 1024   // 5 MB

// Allowed MIME types
export const ALLOWED_AUDIO_TYPES = [
    'audio/mpeg',
    'audio/mp4',
    'audio/ogg',
    'audio/wav',
    'audio/webm',
    'audio/flac',
    'audio/aac',
]

export const ALLOWED_IMAGE_TYPES = [
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'image/avif',
]

export const ALLOWED_DOCUMENT_TYPES = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain',
    'text/csv',
]

// Currencies
export const CURRENCIES = [
    { label: '€ EUR', value: 'EUR' },
    { label: '$ USD', value: 'USD' },
    { label: '£ GBP', value: 'GBP' },
    { label: '$ MXN', value: 'MXN' },
] as const

// Debt status labels
export const DEBT_STATUS_LABELS = {
    pending: 'Pendiente',
    partial: 'Parcial',
    paid: 'Pagado',
} as const

// Pagination
export const DEFAULT_PAGE_SIZE = 20

// Local storage keys
export const STORAGE_KEYS = {
    ACTIVE_GROUP: 'appden:active-group',
    PLAYER_VOLUME: 'appden:player-volume',
} as const

// Routes
export const ROUTES = {
    LOGIN: '/login',
    REGISTER: '/register',
    RESET_PASSWORD: '/reset-password',
    DASHBOARD: '/',
    PROFILE: '/profile',
    PROFILE_ID: (id: string) => `/profile/${id}`,
    GROUPS: '/groups',
    GROUP: (id: string) => `/groups/${id}`,
    NOTIFICATIONS: '/notifications',
    MUSIC: '/music',
    SONG: (id: string) => `/music/${id}`,
    PLAYLISTS: '/playlists',
    PLAYLIST: (id: string) => `/playlists/${id}`,
    FAVORITES: '/favorites',
    DEBTS: '/debts',
    DEBT: (id: string) => `/debts/${id}`,
    FILES: '/files',
    SHARED: (token: string) => `/shared/${token}`,
} as const
