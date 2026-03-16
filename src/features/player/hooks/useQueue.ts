import { useAdvancedPlayerStore } from '@features/player/player.store'

export function useQueue() {
    const queue = useAdvancedPlayerStore((state) => state.queue)
    const queueIndex = useAdvancedPlayerStore((state) => state.queueIndex)
    const addToQueue = useAdvancedPlayerStore((state) => state.addToQueue)
    const removeFromQueue = useAdvancedPlayerStore((state) => state.removeFromQueue)
    const reorderQueue = useAdvancedPlayerStore((state) => state.reorderQueue)
    const toggleQueuePanel = useAdvancedPlayerStore((state) => state.toggleQueuePanel)
    const isQueueOpen = useAdvancedPlayerStore((state) => state.isQueueOpen)

    return {
        queue,
        queueIndex,
        addToQueue,
        removeFromQueue,
        reorderQueue,
        toggleQueuePanel,
        isQueueOpen,
    }
}
