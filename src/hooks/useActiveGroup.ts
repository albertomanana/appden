import { useCallback } from 'react'
import { useGroupStore } from '@app/store/group.store'
import { useAuthStore } from '@app/store/auth.store'
import { groupsService } from '@services/groups.service'
import type { Group } from '@/types'

/**
 * Convenience hook to access the active group.
 * All feature queries should use this hook to get the group_id.
 */
export function useActiveGroup() {
    const { activeGroup, myGroups, setActiveGroup } = useGroupStore()

    return {
        activeGroup,
        myGroups,
        groupId: activeGroup?.id ?? null,
        hasGroup: !!activeGroup,
        setActiveGroup,
    }
}

/**
 * Reloads the user's groups into the store (after creating, joining, leaving or deleting a group)
 * and keeps the active group valid. Optionally activates `preferGroupId`.
 */
export function useRefreshMyGroups() {
    return useCallback(async (preferGroupId?: string | null): Promise<Group[]> => {
        const userId = useAuthStore.getState().user?.id
        if (!userId) return []
        const groups = await groupsService.getMyGroups(userId)
        const { activeGroup, setMyGroups, setActiveGroup } = useGroupStore.getState()
        setMyGroups(groups)

        const preferred = preferGroupId ? groups.find((group) => group.id === preferGroupId) : null
        if (preferred) {
            setActiveGroup(preferred)
        } else if (!activeGroup || !groups.some((group) => group.id === activeGroup.id)) {
            setActiveGroup(groups[0] ?? null)
        } else {
            // Keep the active group but pick up renamed fields.
            const fresh = groups.find((group) => group.id === activeGroup.id)
            if (fresh) setActiveGroup(fresh)
        }
        return groups
    }, [])
}
