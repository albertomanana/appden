import { useGroupStore } from '@app/store/group.store'

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
