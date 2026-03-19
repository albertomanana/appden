import type { SongComment, SongReactionType } from '@/types'

export type SongSocialState = {
    likesCount: number
    likedByMe: boolean
    comments: SongComment[]
    likedCommentIds: string[]
    commentLikeCounts: Record<string, number>
    reactionCounts: Record<SongReactionType, number>
    reactionByMe: SongReactionType | null
}

export type MentionOption = {
    id: string
    label: string
    token: string
}

