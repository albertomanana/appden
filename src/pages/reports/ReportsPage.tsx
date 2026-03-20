import React from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { Flag } from 'lucide-react'
import { useAuth } from '@hooks/useAuth'
import { useActiveGroup } from '@hooks/useActiveGroup'
import { useToast } from '@components/ui/Toast'
import { ReportForm } from '@features/reports/components/ReportForm'
import { ReportsList } from '@features/reports/components/ReportsList'
import {
    useReports,
    useReportsViewerAccess,
    useUnreadAdminReportsCount,
} from '@features/reports/hooks/useReports'
import { reportsService } from '@features/reports/services/reports.service'
import type { ReportStatus, ReportType } from '@features/reports/types'

const statusOptions: Array<{ value: ReportStatus | 'all'; label: string }> = [
    { value: 'all', label: 'Todos' },
    { value: 'open', label: 'Open' },
    { value: 'in_review', label: 'In review' },
    { value: 'resolved', label: 'Resolved' },
    { value: 'closed', label: 'Closed' },
]

const typeOptions: Array<{ value: ReportType | 'all'; label: string }> = [
    { value: 'all', label: 'Todos' },
    { value: 'bug', label: 'Bug' },
    { value: 'error', label: 'Error' },
    { value: 'improvement', label: 'Mejora' },
]

export default function ReportsPage() {
    const { userId } = useAuth()
    const { groupId, activeGroup } = useActiveGroup()
    const { success, error } = useToast()
    const navigate = useNavigate()
    const queryClient = useQueryClient()

    const [statusFilter, setStatusFilter] = React.useState<ReportStatus | 'all'>('all')
    const [typeFilter, setTypeFilter] = React.useState<ReportType | 'all'>('all')
    const [search, setSearch] = React.useState('')

    const { data: access } = useReportsViewerAccess(userId)
    const isAdmin = !!access?.isAdmin
    const { data: unreadAdminCount = 0 } = useUnreadAdminReportsCount(userId, isAdmin)
    const markAdminReadMutation = useMutation({
        mutationFn: () => reportsService.markAllAdminNotificationsRead(userId!),
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: ['reports', 'admin-unread', userId] })
            success('Notificaciones admin marcadas como leidas')
        },
    })

    const { reports, isLoading, createReportMutation, updateStatusMutation } = useReports({
        status: statusFilter,
        type: typeFilter,
        search,
        limit: 80,
    })

    if (!userId) return null

    return (
        <div className="p-4 md:p-6 space-y-5 animate-fade-in">
            <section className="card p-4 md:p-5">
                <div className="flex items-start justify-between gap-3">
                    <div>
                        <h1 className="section-title inline-flex items-center gap-2">
                            <Flag className="w-5 h-5 text-brand-300" />
                            Reportes
                        </h1>
                        <p className="text-sm text-muted mt-1">
                            Visibles para usuarios autenticados. {groupId ? `Grupo activo: ${activeGroup?.name}.` : 'Sin grupo activo (scope global).'}
                        </p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                        {isAdmin ? (
                            <>
                                <span className="badge bg-amber-500/20 text-amber-200 border border-amber-400/40">
                                    Admin • {unreadAdminCount} por revisar
                                </span>
                                <button
                                    className="btn-ghost px-3 py-1.5 text-xs"
                                    onClick={() => markAdminReadMutation.mutate()}
                                    disabled={markAdminReadMutation.isPending || unreadAdminCount === 0}
                                >
                                    Marcar leidas
                                </button>
                            </>
                        ) : (
                            <span className="badge badge-brand">Usuario</span>
                        )}
                    </div>
                </div>
            </section>

            <ReportForm
                isSubmitting={createReportMutation.isPending}
                onSubmit={(payload) => {
                    createReportMutation.mutate(
                        {
                            userId,
                            groupId,
                            type: payload.type,
                            title: payload.title,
                            description: payload.description,
                            reproductionSteps: payload.reproductionSteps,
                            severity: payload.severity ?? null,
                            imageFile: payload.imageFile,
                        },
                        {
                            onSuccess: () => success('Reporte enviado', 'Gracias por ayudarnos a mejorar.'),
                            onError: (mutationError) =>
                                error('No se pudo enviar', mutationError instanceof Error ? mutationError.message : 'Error inesperado'),
                        }
                    )
                }}
            />

            <section className="card p-4 space-y-3">
                <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                    <h2 className="text-base font-semibold text-white">Listado de reportes</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 w-full md:w-auto">
                        <input
                            value={search}
                            onChange={(event) => setSearch(event.target.value)}
                            placeholder="Buscar reporte..."
                            className="input text-sm"
                        />
                        <select
                            value={statusFilter}
                            onChange={(event) => setStatusFilter(event.target.value as ReportStatus | 'all')}
                            className="input text-sm"
                        >
                            {statusOptions.map((option) => (
                                <option key={option.value} value={option.value}>{option.label}</option>
                            ))}
                        </select>
                        <select
                            value={typeFilter}
                            onChange={(event) => setTypeFilter(event.target.value as ReportType | 'all')}
                            className="input text-sm"
                        >
                            {typeOptions.map((option) => (
                                <option key={option.value} value={option.value}>{option.label}</option>
                            ))}
                        </select>
                    </div>
                </div>

                <ReportsList
                    reports={reports}
                    isLoading={isLoading}
                    canManageStatus={isAdmin}
                    onChangeStatus={(reportId, status) => {
                        updateStatusMutation.mutate(
                            { reportId, status },
                            {
                                onSuccess: () => success('Estado actualizado'),
                                onError: () => error('No se pudo cambiar estado'),
                            }
                        )
                    }}
                />
            </section>

            <section className="text-right">
                <button
                    className="btn-ghost px-3 py-2 text-xs"
                    onClick={() => navigate('/notifications')}
                >
                    Ver centro de notificaciones
                </button>
            </section>
        </div>
    )
}
