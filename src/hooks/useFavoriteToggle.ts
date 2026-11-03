import { useEffect, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@hooks/useAuth'
import { useToast } from '@components/ui/Toast'
import { favoritesService } from '@services/favorites.service'
import { useAdvancedPlayerStore } from '@features/player/player.store'
import type { Song } from '@/types'

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
        onSuccess: (_data, next) => {
            // Patch cached lists in place instead of re-downloading the whole library.
            const patch = (song: Song) => (song.id === songId ? { ...song, is_favorite: next } : song)
            queryClient.setQueriesData<Song[]>({ queryKey: ['songs'] }, (songs) => (Array.isArray(songs) ? songs.map(patch) : songs))
            queryClient.setQueriesData<Song>({ queryKey: ['song', songId] }, (song) => (song && !Array.isArray(song) ? patch(song) : song))
            const player = useAdvancedPlayerStore.getState()
            if (player.currentSong?.id === songId || player.queue.some((song) => song.id === songId)) {
                useAdvancedPlayerStore.setState({
                    currentSong: player.currentSong ? patch(player.currentSong) : null,
                    queue: player.queue.map(patch),
                })
            }
        },
        onSettled: () => {
            void queryClient.invalidateQueries({ queryKey: ['favorites'] })
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
