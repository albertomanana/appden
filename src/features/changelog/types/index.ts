export type ChangelogItemType = 'feature' | 'fix' | 'improvement' | 'update'

export interface ChangelogItem {
    id: string
    version: string
    title: string
    description: string
    type: ChangelogItemType
    release_date: string
    created_at: string
    commit_sha?: string | null
    author?: string | null
}

export interface GeneratedChangelogPayload {
    generated_at: string
    source_branch: string
    current_version: string
    entries: ChangelogItem[]
}

