import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Group } from '@/types'
import { STORAGE_KEYS } from '@lib/constants'

interface GroupState {
    activeGroup: Group | null
    myGroups: Group[]
    isLoading: boolean
    setActiveGroup: (group: Group | null) => void
    setMyGroups: (groups: Group[]) => void
    setLoading: (loading: boolean) => void
}

/**
 * Active group store.
 * Persists the active group selection across page reloads.
 * All feature queries filter by activeGroup.id.
 */
export const useGroupStore = create<GroupState>()(
    persist(
        (set) => ({
            activeGroup: null,
            myGroups: [],
            isLoading: false,

            setActiveGroup: (group) => set({ activeGroup: group }),
            setMyGroups: (groups) => set({ myGroups: groups }),
            setLoading: (isLoading) => set({ isLoading }),
        }),
        {
            name: STORAGE_KEYS.ACTIVE_GROUP,
            partialize: (state) => ({ activeGroup: state.activeGroup }),
        }
    )
)
