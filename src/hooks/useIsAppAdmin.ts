import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@hooks/useAuth'
import { reportsService } from '@features/reports/services/reports.service'

/** Whether the signed-in user has the global `admin` role (user_roles table). */
export function useIsAppAdmin(): { isAdmin: boolean; isLoading: boolean } {
    const { userId } = useAuth()
    const { data, isLoading } = useQuery({
        queryKey: ['app-admin', userId],
        queryFn: () => reportsService.getViewerAccess(userId!),
        enabled: !!userId,
        staleTime: 5 * 60_000,
    })
    return { isAdmin: !!data?.isAdmin, isLoading: !!userId && isLoading }
}
