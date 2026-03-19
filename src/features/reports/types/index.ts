export type ReportType = 'bug' | 'improvement'
export type ReportStatus = 'open' | 'in_review' | 'resolved' | 'closed'

export interface ReportItem {
    id: string
    group_id: string
    user_id: string
    type: ReportType
    description: string
    steps: string | null
    image_url: string | null
    status: ReportStatus
    created_at: string
}

