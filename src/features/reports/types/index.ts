export type ReportType = 'bug' | 'error' | 'improvement'
export type ReportStatus = 'open' | 'in_review' | 'resolved' | 'closed'
export type ReportSeverity = 'low' | 'medium' | 'high' | 'critical'

export interface ReportItem {
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
    author?: {
        id: string
        display_name: string
        username: string | null
        avatar_url: string | null
    }
}

export interface ReportNotification {
    id: string
    report_id: string
    admin_user_id: string
    read: boolean
    created_at: string
    read_at: string | null
}

