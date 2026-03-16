import { useEffect } from 'react'
import { useAdvancedPlayerStore } from '@features/player/player.store'
import type { PlayerSong } from '@features/player/player.types'
import { extractDynamicPalette } from '@features/player/utils/colorExtraction'

type UsePlayerOptions = {
    catalog?: PlayerSong[]
    userId?: string
}

export function usePlayer(options?: UsePlayerOptions) {
    const hasInitialized = useAdvancedPlayerStore((state) => state.hasInitialized)
    const initialize = useAdvancedPlayerStore((state) => state.initialize)
    const setCatalog = useAdvancedPlayerStore((state) => state.setCatalog)
    const currentSongId = useAdvancedPlayerStore((state) => state.currentSong?.id)
    const currentSongCover = useAdvancedPlayerStore((state) => state.currentSong?.cover_url)
    const setDynamicPalette = useAdvancedPlayerStore((state) => state.setDynamicPalette)
    const playSong = useAdvancedPlayerStore((state) => state.playSong)
    const addToQueue = useAdvancedPlayerStore((state) => state.addToQueue)
    const startRadioFromSong = useAdvancedPlayerStore((state) => state.startRadioFromSong)
    const theme = useAdvancedPlayerStore((state) => state.theme)

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

    useEffect(() => {
        let cancelled = false
        const cover = currentSongCover
        void (async () => {
            const palette = await extractDynamicPalette(cover)
            if (!cancelled) {
                setDynamicPalette(palette)
            }
        })()
        return () => {
            cancelled = true
        }
    }, [currentSongId, currentSongCover, setDynamicPalette])

    useEffect(() => {
        if (typeof document === 'undefined') return
        document.documentElement.setAttribute('data-app-theme', theme)
    }, [theme])

    return {
        playSong,
        addToQueue,
        startRadioFromSong,
    }
}
