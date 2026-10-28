import React from 'react'
import { useQuery } from '@tanstack/react-query'
import { Tabs } from '@components/ui/Tabs'
import { useAuth } from '@hooks/useAuth'
import { useFriendRequestsCount } from '@hooks/useFriends'
import { groupInvitationsService } from '@features/social/services/group-invitations.service'
import { ROUTES } from '@lib/constants'

/** Pending group invitations addressed to me (shares the cache with GroupsPage). */
function useGroupInvitationsCount(): number {
    const { userId } = useAuth()
    const { data } = useQuery({
        queryKey: ['group-invitations', 'incoming', userId],
        queryFn: () => groupInvitationsService.listIncoming(userId!),
        enabled: !!userId,
        staleTime: 30_000,
    })
    return data?.length ?? 0
}

/**
 * Secondary navigation for the "Social" section of the bottom bar.
 * Badges: pending group invitations on "Grupos" and pending friend requests on "Amigos".
 * `requests` overrides the friend-request count when the page already has it.
 */
export const SocialTabs: React.FC<{ active: 'feed' | 'groups' | 'connections'; requests?: number }> = ({ active, requests }) => {
    const friendRequests = useFriendRequestsCount()
    const groupInvitations = useGroupInvitationsCount()

    return (
        <Tabs
            active={active}
            stretch
            items={[
                { label: 'Feed', value: 'feed', href: ROUTES.SOCIAL },
                { label: 'Grupos', value: 'groups', href: ROUTES.GROUPS, badge: groupInvitations },
                { label: 'Amigos', value: 'connections', href: ROUTES.CONNECTIONS, badge: requests ?? friendRequests },
            ]}
        />
    )
}
