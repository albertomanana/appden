import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { songSocialService } from '@features/social/services/social.service'
import type { SongReactionType } from '@/types'

type UseSongSocialInput = {
    songId: string
    userId: string
}

export function useSongSocial({ songId, userId }: UseSongSocialInput) {
    const queryClient = useQueryClient()

    const socialQuery = useQuery({
        queryKey: ['song-social', songId, userId],
        queryFn: () => songSocialService.getSongSocial(songId, userId),
        enabled: !!songId && !!userId,
    })

    const refreshSocial = () => {
        void queryClient.invalidateQueries({ queryKey: ['song-social', songId, userId] })
        void queryClient.invalidateQueries({ queryKey: ['song-social-player', songId, userId] })
        void queryClient.invalidateQueries({ queryKey: ['group-activity'] })
    }

    const toggleLikeMutation = useMutation({
        mutationFn: () => songSocialService.toggleLike(songId, userId),
        onSuccess: refreshSocial,
    })

    const setReactionMutation = useMutation({
        mutationFn: (reaction: SongReactionType | null) => songSocialService.setReaction(songId, userId, reaction),
        onSuccess: refreshSocial,
    })

    const addCommentMutation = useMutation({
        mutationFn: (payload: { body: string; parentId?: string | null }) =>
            songSocialService.addComment(songId, userId, payload.body, payload.parentId),
        onSuccess: refreshSocial,
    })

    const updateCommentMutation = useMutation({
        mutationFn: (payload: { commentId: string; body: string }) =>
            songSocialService.updateComment(payload.commentId, userId, payload.body),
        onSuccess: refreshSocial,
    })

    const deleteCommentMutation = useMutation({
        mutationFn: (commentId: string) => songSocialService.deleteComment(commentId, userId),
        onSuccess: refreshSocial,
    })

    const toggleCommentLikeMutation = useMutation({
        mutationFn: (commentId: string) => songSocialService.toggleCommentLike(commentId, userId),
        onSuccess: refreshSocial,
    })

    return {
        socialData: socialQuery.data,
        isLoading: socialQuery.isLoading,
        refreshSocial,
        toggleLikeMutation,
        setReactionMutation,
        addCommentMutation,
        updateCommentMutation,
        deleteCommentMutation,
        toggleCommentLikeMutation,
    }
}

