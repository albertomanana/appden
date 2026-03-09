// ============================================================
// CORE DATABASE TYPES (mirrors Supabase schema)
// ============================================================

// -- Enums --

export type GroupRole = 'owner' | 'member'
export type DebtStatus = 'pending' | 'partial' | 'paid'
export type DebtCurrency = 'EUR' | 'USD' | 'GBP' | 'MXN'
export type FileCategory = 'image' | 'document'
export type SharedLinkVisibility = 'private' | 'limited'
export type SharedLinkResourceType = 'song' | 'playlist' | 'debt' | 'file'
export type NotificationType = 'song_added' | 'debt_created' | 'debt_paid' | 'playlist_created' | 'file_uploaded'

// -- Profile --

export interface Profile {
    id: string // = auth.user.id
    display_name: string
    username: string | null
    avatar_url: string | null
    bio: string | null
    created_at: string
    updated_at: string
}

// -- Group --

export interface Group {
    id: string
    name: string
    description: string | null
    avatar_url: string | null
    created_by: string
    created_at: string
    updated_at: string
}

export interface GroupMember {
    id: string
    group_id: string
    user_id: string
    role: GroupRole
    joined_at: string
    // Joined
    profile?: Profile
}

// -- Song --

export interface Song {
    id: string
    group_id: string
    uploaded_by: string
    title: string
    artist_name: string
    album_name: string | null
    cover_url: string | null
    audio_url: string
    duration_seconds: number | null
    file_size: number | null
    mime_type: string | null
    created_at: string
    // Joined
    uploader?: Profile
    is_favorite?: boolean
}

// -- Favorite --

export interface Favorite {
    id: string
    user_id: string
    song_id: string
    created_at: string
    // Joined
    song?: Song
}

// -- Playlist --

export interface Playlist {
    id: string
    group_id: string
    created_by: string
    name: string
    description: string | null
    cover_url: string | null
    created_at: string
    updated_at: string
    // Joined
    creator?: Profile
    song_count?: number
    songs?: PlaylistSong[]
}

export interface PlaylistSong {
    id: string
    playlist_id: string
    song_id: string
    position: number
    added_by: string
    added_at: string
    // Joined
    song?: Song
}

// -- Debt --

export interface Debt {
    id: string
    group_id: string
    creditor_id: string
    debtor_id: string
    amount: number
    currency: DebtCurrency
    concept: string
    status: DebtStatus
    amount_paid: number
    created_at: string
    updated_at: string
    // Joined
    creditor?: Profile
    debtor?: Profile
    payments?: DebtPayment[]
}

export interface DebtPayment {
    id: string
    debt_id: string
    amount: number
    note: string | null
    paid_by: string
    created_at: string
    // Joined
    payer?: Profile
}

// -- File --

export interface SharedFile {
    id: string
    group_id: string
    uploaded_by: string
    name: string
    file_url: string
    file_size: number | null
    mime_type: string | null
    category: FileCategory
    created_at: string
    // Joined
    uploader?: Profile
}

// -- Shared Link --

export interface SharedLink {
    id: string
    token: string
    resource_type: SharedLinkResourceType
    resource_id: string
    created_by: string
    visibility: SharedLinkVisibility
    expires_at: string | null
    created_at: string
}

// -- In-App Notification --

export interface AppNotification {
    id: string
    user_id: string
    group_id: string
    type: NotificationType
    title: string
    body: string
    read: boolean
    resource_type: SharedLinkResourceType | null
    resource_id: string | null
    created_at: string
}

// ============================================================
// UI / HELPER TYPES
// ============================================================

export interface SelectOption<T = string> {
    label: string
    value: T
}

export interface PaginationParams {
    page: number
    pageSize: number
}

export interface ApiError {
    message: string
    code?: string
}

// Auth state
export interface AuthUser {
    id: string
    email: string | null
    profile: Profile | null
}

// Debt summary per user
export interface DebtUserSummary {
    user_id: string
    profile: Profile
    total_owed: number   // what this user owes others
    total_lent: number   // what others owe this user
    balance: number      // net (lent - owed)
    currency: DebtCurrency
}
