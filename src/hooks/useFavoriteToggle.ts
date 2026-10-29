import { useEffect, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@hooks/useAuth'
import { useToast } from '@components/ui/Toast'
import { favoritesService } from '@services/favorites.service'

/**
 * Optimistic favourite toggle shared by song rows, the song page and the full player.
 */
export function useFavoriteToggle(songId: string | null | undefined, initial: boolean | undefined) {
    const { userId } = useAuth()
    const queryClient = useQueryClient()
    const { error: toastError } = useToast()
    const [isFavorite, setIsFavorite] = useState(!!initial)

    useEffect(() => {
        setIsFavorite(!!initial)
    }, [songId, initial])

    const mutation = useMutation({
        mutationFn: async (next: boolean) => {
            if (!userId || !songId) return
            if (next) await favoritesService.addFavorite(userId, songId)
            else await favoritesService.removeFavorite(userId, songId)
        },
        onMutate: (next) => {
            setIsFavorite(next)
        },
        onError: (_error, next) => {
            setIsFavorite(!next)
            toastError('No se pudo actualizar favoritos', 'Inténtalo de nuevo en unos segundos.')
        },
        onSettled: () => {
            void queryClient.invalidateQueries({ queryKey: ['songs'] })
            void queryClient.invalidateQueries({ queryKey: ['favorites'] })
            if (songId) void queryClient.invalidateQueries({ queryKey: ['song', songId] })
        },
    })

    return {
        isFavorite,
        toggle: () => {
            if (!songId || mutation.isPending) return
            if (!isFavorite && typeof navigator !== 'undefined' && 'vibrate' in navigator) {
                try {
                    navigator.vibrate(10)
                } catch {
                    // Vibration not allowed.
                }
            }
            mutation.mutate(!isFavorite)
        },
        isPending: mutation.isPending,
    }
}
