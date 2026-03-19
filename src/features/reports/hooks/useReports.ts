import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { reportsService } from '@features/reports/services/reports.service'
import type { ReportType } from '@features/reports/types'

type CreateReportPayload = {
    userId: string
    groupId: string
    type: ReportType
    description: string
    steps?: string
    imageFile?: File | null
}

export function useReports(groupId: string | null) {
    const queryClient = useQueryClient()

    const reportsQuery = useQuery({
        queryKey: ['reports', groupId],
        queryFn: () => reportsService.listByGroup(groupId!),
        enabled: !!groupId,
    })

    const createReportMutation = useMutation({
        mutationFn: (payload: CreateReportPayload) => reportsService.create(payload),
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: ['reports', groupId] })
        },
    })

    return {
        reports: reportsQuery.data ?? [],
        isLoading: reportsQuery.isLoading,
        createReportMutation,
    }
}

