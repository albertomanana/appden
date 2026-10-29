import React from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Flag, ShieldCheck } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@hooks/useAuth'
import { useActiveGroup } from '@hooks/useActiveGroup'
import { useToast } from '@components/ui/Toast'
import { PageHeader } from '@components/ui/PageHeader'
import { ReportForm } from '@features/reports/components/ReportForm'
import { ReportsList } from '@features/reports/components/ReportsList'
import {
    useReports,
    useReportsViewerAccess,
    useUnreadAdminReportsCount,
} from '@features/reports/hooks/useReports'
import { reportsService } from '@features/reports/services/reports.service'
import { ROUTES } from '@lib/constants'
import type { ReportStatus, ReportType } from '@features/reports/types'

const statusOptions: Array<{ value: ReportStatus | 'all'; label: string }> = [
    { value: 'all', label: 'Todos' },
    { value: 'open', label: 'Abiertos' },
    { value: 'in_review', label: 'En revisión' },
    { value: 'resolved', label: 'Resueltos' },
    { value: 'closed', label: 'Cerrados' },
]

const typeOptions: Array<{ value: ReportType | 'all'; label: string }> = [
    { value: 'all', label: 'Todos' },
    { value: 'bug', label: 'Fallo' },
    { value: 'error', label: 'Error' },
    { value: 'improvement', label: 'Mejora' },
]

export default function ReportsPage() {
    const { userId } = useAuth()
    const { groupId } = useActiveGroup()
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
        <div className="page-shell animate-fade-in">
            <PageHeader
                back={ROUTES.PROFILE}
                title="Reportes"
                description="Cuéntanos fallos o ideas para mejorar la app."
                meta={
                    <>
                        <span className="hero-meta-pill">{reports.length} resultados</span>
                        <span className="hero-meta-pill">{isAdmin ? `${unreadAdminCount} por revisar` : 'Vista autenticada'}</span>
                    </>
                }
                actions={
                    isAdmin ? (
                        <button
                            className="btn-secondary"
                            onClick={() => markAdminReadMutation.mutate()}
                            disabled={markAdminReadMutation.isPending || unreadAdminCount === 0}
                        >
                            <ShieldCheck className="w-4 h-4" />
                            Marcar leidas
                        </button>
                    ) : (
                        <span className="hero-meta-pill">
                            <Flag className="w-3.5 h-3.5 text-brand-300" />
                            Usuario autenticado
                        </span>
                    )
                }
            />

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

            <section className="card p-5 space-y-4">
                <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
                    <div>
                        
                        <h2 className="mt-2 text-2xl font-headline font-extrabold text-white">Listado de reportes</h2>
                    </div>
                    <div className="grid w-full gap-2 sm:grid-cols-3 xl:w-auto xl:min-w-[620px]">
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

            <section className="flex justify-end">
                <button className="btn-ghost" onClick={() => navigate('/notifications')}>
                    Ver centro de notificaciones
                </button>
            </section>
        </div>
    )
}
