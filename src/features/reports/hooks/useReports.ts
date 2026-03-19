import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { reportsService } from '@features/reports/services/reports.service'
import type { ReportSeverity, ReportStatus, ReportType } from '@features/reports/types'

type CreateReportPayload = {
    userId: string
    groupId?: string | null
    type: ReportType
    title: string
    description: string
    reproductionSteps?: string
    severity?: ReportSeverity | null
    imageFile?: File | null
}

export function useReports(filters: {
    groupId?: string | null
    status?: ReportStatus | 'all'
    type?: ReportType | 'all'
    search?: string
    limit?: number
}) {
    const queryClient = useQueryClient()

    const reportsQuery = useQuery({
        queryKey: ['reports', filters],
        queryFn: () => reportsService.list(filters),
    })

    const createReportMutation = useMutation({
        mutationFn: (payload: CreateReportPayload) => reportsService.create(payload),
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: ['reports'] })
        },
    })

    const updateStatusMutation = useMutation({
        mutationFn: ({ reportId, status }: { reportId: string; status: ReportStatus }) =>
            reportsService.updateStatus(reportId, status),
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: ['reports'] })
        },
    })

    return {
        reports: reportsQuery.data ?? [],
        isLoading: reportsQuery.isLoading,
        isFetching: reportsQuery.isFetching,
        createReportMutation,
        updateStatusMutation,
    }
}

export function useReportDetail(reportId: string | null) {
    return useQuery({
        queryKey: ['reports', 'detail', reportId],
        queryFn: () => reportsService.getById(reportId!),
        enabled: !!reportId,
    })
}

export function useReportsViewerAccess(userId: string | null) {
    return useQuery({
        queryKey: ['reports', 'viewer-access', userId],
        queryFn: () => reportsService.getViewerAccess(userId!),
        enabled: !!userId,
    })
}

export function useUnreadAdminReportsCount(userId: string | null, enabled: boolean) {
    return useQuery({
        queryKey: ['reports', 'admin-unread', userId],
        queryFn: () => reportsService.getUnreadAdminNotificationsCount(userId!),
        enabled: !!userId && enabled,
        staleTime: 30_000,
    })
}

