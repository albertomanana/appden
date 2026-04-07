import { useEffect } from 'react'
import { useAdvancedPlayerStore } from '@features/player/player.store'
import type { PlayerSong } from '@features/player/player.types'

type UsePlayerOptions = {
    catalog?: PlayerSong[]
    userId?: string
}

export function usePlayer(options?: UsePlayerOptions) {
    const hasInitialized = useAdvancedPlayerStore((state) => state.hasInitialized)
    const initialize = useAdvancedPlayerStore((state) => state.initialize)
    const setCatalog = useAdvancedPlayerStore((state) => state.setCatalog)
    const playSong = useAdvancedPlayerStore((state) => state.playSong)
    const addToQueue = useAdvancedPlayerStore((state) => state.addToQueue)

    useEffect(() => {
        if (hasInitialized) return
        void initialize(options?.catalog ?? [], options?.userId ?? 'local-user')
    }, [hasInitialized, initialize, options?.catalog, options?.userId])

    useEffect(() => {
        const nextUserId = options?.userId ?? 'local-user'
        if (useAdvancedPlayerStore.getState().userId !== nextUserId) {
            useAdvancedPlayerStore.setState({ userId: nextUserId })
        }
    }, [options?.userId])

    useEffect(() => {
        if (!options?.catalog || options.catalog.length === 0) return
        setCatalog(options.catalog)
    }, [options?.catalog, setCatalog])

    return {
        playSong,
        addToQueue,
    }
}
