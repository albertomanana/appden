// ============================================================
// CORE DATABASE TYPES (mirrors Supabase schema)
// ============================================================

// -- Enums --

export type GroupRole = 'owner' | 'admin' | 'member'
export type DebtStatus = 'pending' | 'partial' | 'paid'
export type DebtCurrency = 'EUR' | 'USD' | 'GBP' | 'MXN'
export type DebtSplitMode = 'equal' | 'percentage' | 'exact'
export type DebtReminderFrequency = 'suave' | 'normal' | 'estricto'
export type DebtInstallmentStatus = 'pending' | 'paid' | 'overdue'
export type GroupGoalStatus = 'active' | 'completed' | 'archived'
export type GroupGoalType = 'debt_reduction' | 'zero_overdue' | 'custom'
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
    // If present and false, the user must be approved by an admin before using the app
    is_approved?: boolean
}

// -- Group --

export interface Group {
    id: string
    name: string
    description: string | null
    avatar_url: string | null
    created_by: string
    is_private?: boolean
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
    owners?: Array<{
        user_id: string
        role: 'owner' | 'contributor'
        profile?: Profile
    }>
    artist_credits?: SongArtistCredit[]
    is_favorite?: boolean
}

export interface SongArtistCredit {
    id: string
    song_id: string
    position: number
    profile_id: string | null
    artist_name: string | null
    added_by: string | null
    created_at: string
    // Joined
    profile?: Pick<Profile, 'id' | 'display_name' | 'username' | 'avatar_url'>
}

export type GroupFriendRequestStatus = 'pending' | 'accepted' | 'rejected' | 'cancelled'

export interface GroupFriendRequest {
    id: string
    group_id: string
    from_user_id: string
    to_user_id: string
    status: GroupFriendRequestStatus
    created_at: string
    responded_at: string | null
}

export type FriendRequestStatus = 'pending' | 'accepted' | 'rejected' | 'cancelled'

export interface FriendRequest {
    id: string
    from_user_id: string
    to_user_id: string
    status: FriendRequestStatus
    message: string | null
    created_at: string
    responded_at: string | null
    from_profile?: Pick<Profile, 'id' | 'display_name' | 'username' | 'avatar_url'>
    to_profile?: Pick<Profile, 'id' | 'display_name' | 'username' | 'avatar_url'>
}

export interface Friendship {
    id: string
    user_a: string
    user_b: string
    created_from_request: string | null
    created_at: string
    friend_profile?: Pick<Profile, 'id' | 'display_name' | 'username' | 'avatar_url'>
}

export type GroupInvitationStatus = 'pending' | 'accepted' | 'rejected' | 'cancelled'

export interface GroupInvitation {
    id: string
    group_id: string
    invited_by: string
    invited_user_id: string
    status: GroupInvitationStatus
    message: string | null
    created_at: string
    responded_at: string | null
    group?: Pick<Group, 'id' | 'name' | 'description' | 'avatar_url'>
    inviter?: Pick<Profile, 'id' | 'display_name' | 'avatar_url'>
    invited?: Pick<Profile, 'id' | 'display_name' | 'avatar_url'>
}

export type LyricsSource = 'manual' | 'auto'
export type LyricsProposalStatus = 'pending' | 'approved' | 'rejected'
export type TranslationLanguage = 'es' | 'en'
export type SongReactionType = 'fire' | 'heart' | 'headphones'
export type GroupActivityAction =
    | 'song_uploaded'
    | 'song_liked'
    | 'song_reacted'
    | 'song_commented'
    | 'lyrics_updated'
    | 'lyrics_proposed'
    | 'lyrics_verified'

export interface SongLyricLine {
    id?: string
    song_id: string
    line_index: number
    content: string
    start_seconds: number | null
    end_seconds: number | null
}

export interface SongLyrics {
    id: string
    song_id: string
    raw_text: string
    language: string
    source: LyricsSource
    is_auto_generated: boolean
    confidence: number | null
    is_verified?: boolean
    verified_by?: string | null
    verified_at?: string | null
    updated_by: string
    created_at: string
    updated_at: string
    lines?: SongLyricLine[]
}

export interface SongLyricsVersion {
    id: string
    song_id: string
    version_number: number
    raw_text: string
    language: string
    source: LyricsSource
    is_auto_generated: boolean
    confidence: number | null
    created_by: string
    created_at: string
}

export interface SongLyricsProposal {
    id: string
    song_id: string
    proposed_by: string
    proposed_raw_text: string
    note: string | null
    status: LyricsProposalStatus
    reviewed_by: string | null
    reviewed_at: string | null
    created_at: string
    proposer?: Profile
}

export interface SongLyricsTranslation {
    id: string
    song_id: string
    language: TranslationLanguage
    raw_text: string
    source: 'machine' | 'manual'
    updated_by: string
    created_at: string
    updated_at: string
}

export interface SongLike {
    id: string
    song_id: string
    user_id: string
    created_at: string
}

export interface Post {
    id: string
    user_id: string
    content: string
    visibility: 'public' | 'private' | 'group'
    group_id?: string | null
    created_at: string
    author?: Pick<Profile, 'id' | 'display_name' | 'username' | 'avatar_url'>
}
export interface SongComment {
    id: string
    song_id: string
    user_id: string
    body: string
    parent_id: string | null
    created_at: string
    updated_at: string
    profile?: Profile
}

export interface SongCommentLike {
    id: string
    comment_id: string
    user_id: string
    created_at: string
}

export interface SongReaction {
    id: string
    song_id: string
    user_id: string
    reaction: SongReactionType
    created_at: string
}

export interface GroupActivity {
    id: string
    group_id: string
    actor_id: string
    action_type: GroupActivityAction
    song_id: string | null
    comment_id: string | null
    payload: Record<string, unknown>
    created_at: string
    actor?: Profile
    song?: Pick<Song, 'id' | 'title' | 'artist_name' | 'cover_url'>
}

export type ChangelogType = 'feature' | 'fix' | 'improvement'

export interface ChangelogEntry {
    id: string
    group_id: string
    version: string
    title: string
    description: string
    type: ChangelogType
    created_by: string | null
    release_date: string
    created_at: string
}

export type ReportType = 'bug' | 'error' | 'improvement'
export type ReportStatus = 'open' | 'in_review' | 'resolved' | 'closed'
export type ReportSeverity = 'low' | 'medium' | 'high' | 'critical'

export interface Report {
    id: string
    group_id: string | null
    user_id: string
    type: ReportType
    title: string
    description: string
    reproduction_steps: string | null
    steps: string | null
    severity: ReportSeverity | null
    image_url: string | null
    status: ReportStatus
    created_at: string
    updated_at: string
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
    receipt_url?: string | null
    receipt_mime_type?: string | null
    paid_by: string
    created_at: string
    // Joined
    payer?: Profile
}

export interface DebtReminder {
    id: string
    debt_id: string
    group_id: string
    debtor_id: string
    created_by: string
    frequency: DebtReminderFrequency
    channels: {
        push: boolean
        email: boolean
        whatsapp: boolean
    }
    next_run_at: string | null
    last_sent_at: string | null
    active: boolean
    created_at: string
    updated_at: string
}

export interface DebtInstallment {
    id: string
    debt_id: string
    installment_number: number
    amount: number
    due_date: string
    status: DebtInstallmentStatus
    paid_at: string | null
    created_at: string
}

export interface GroupSettlementTransfer {
    from_user_id: string
    to_user_id: string
    amount: number
    currency: DebtCurrency
}

export interface MonthlyDebtSummary {
    month: string
    total_created: number
    total_paid: number
    pending_amount: number
    overdue_amount: number
    active_debts: number
}

export interface GroupFinancialHealth {
    score: number
    status: 'excellent' | 'healthy' | 'warning' | 'critical'
    indicators: {
        overdueRatio: number
        repaymentRatio: number
        concentrationRatio: number
    }
}

export interface GroupGoal {
    id: string
    group_id: string
    created_by: string
    title: string
    target_type: GroupGoalType
    target_value: number
    current_value: number
    deadline: string | null
    status: GroupGoalStatus
    created_at: string
    updated_at: string
}

export interface UserBadge {
    id: string
    group_id: string
    user_id: string
    badge_key: string
    badge_label: string
    awarded_at: string
    payload: Record<string, unknown>
}

export interface GroupMemberPermission {
    id: string
    group_id: string
    user_id: string
    can_manage_debts: boolean
    can_manage_music: boolean
    can_manage_files: boolean
    can_manage_members: boolean
    updated_by: string | null
    updated_at: string
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
