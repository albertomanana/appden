export type ChangelogItemType = 'feature' | 'fix' | 'improvement'

export interface ChangelogItem {
    id: string
    group_id: string
    version: string
    title: string
    description: string
    type: ChangelogItemType
    created_by: string | null
    release_date: string
    created_at: string
}

