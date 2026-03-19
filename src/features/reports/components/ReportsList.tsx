import React from 'react'
import { BadgeCheck, Clock3, ListChecks } from 'lucide-react'
import { Link } from 'react-router-dom'
import { EmptyState } from '@components/ui/EmptyState'
import { ListSkeleton } from '@components/ui/LoadingSkeleton'
import type { ReportItem, ReportStatus } from '@features/reports/types'
import { ROUTES } from '@lib/constants'

type ReportsListProps = {
    reports: ReportItem[]
    isLoading: boolean
    canManageStatus?: boolean
    onChangeStatus?: (reportId: string, status: ReportStatus) => void
}

export const ReportsList: React.FC<ReportsListProps> = ({
    reports,
    isLoading,
    canManageStatus = false,
    onChangeStatus,
}) => {
    if (isLoading) {
        return <ListSkeleton count={3} item={<div className="card h-24" />} />
    }

    if (reports.length === 0) {
        return (
            <EmptyState
                icon={<ListChecks className="w-7 h-7" />}
                title="No hay reportes todavia"
                description="Cuando alguien envie un bug, error o mejora aparecera aqui."
            />
        )
    }

    return (
        <div className="space-y-2.5">
            {reports.map((report) => (
                <article key={report.id} className="card p-4">
                    <div className="flex items-center justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2">
                            <span className={badgeClass(report.type)}>
                                {labelType(report.type)}
                            </span>
                            {report.severity ? (
                                <span className={severityClass(report.severity)}>{labelSeverity(report.severity)}</span>
                            ) : null}
                        </div>
                        <span className="inline-flex items-center gap-1 text-xs text-gray-400">
                            <Clock3 className="w-3.5 h-3.5" />
                            {new Date(report.created_at).toLocaleDateString('es-ES')}
                        </span>
                    </div>

                    <Link to={ROUTES.REPORT_DETAIL(report.id)} className="block group">
                        <h3 className="text-sm font-semibold text-white group-hover:text-brand-300 transition-colors">
                            {report.title}
                        </h3>
                        <p className="text-sm text-gray-200 mt-1 line-clamp-2">{report.description}</p>
                    </Link>

                    <div className="mt-2 flex items-center justify-between gap-2">
                        <div className="text-xs text-gray-400 inline-flex items-center gap-1">
                            <BadgeCheck className="w-3.5 h-3.5" />
                            Estado: {labelStatus(report.status)}
                            {report.author?.display_name ? ` • ${report.author.display_name}` : ''}
                        </div>

                        {canManageStatus && onChangeStatus ? (
                            <select
                                value={report.status}
                                className="px-2 py-1 rounded bg-surface-700 border border-surface-500 text-xs text-gray-200"
                                onChange={(event) => onChangeStatus(report.id, event.target.value as ReportStatus)}
                                aria-label="Cambiar estado"
                            >
                                <option value="open">Open</option>
                                <option value="in_review">In review</option>
                                <option value="resolved">Resolved</option>
                                <option value="closed">Closed</option>
                            </select>
                        ) : null}
                    </div>
                </article>
            ))}
        </div>
    )
}

function labelType(type: ReportItem['type']): string {
    switch (type) {
        case 'bug':
            return 'Bug'
        case 'error':
            return 'Error'
        case 'improvement':
            return 'Mejora'
        default:
            return 'Reporte'
    }
}

function labelStatus(status: ReportStatus): string {
    switch (status) {
        case 'open':
            return 'open'
        case 'in_review':
            return 'in_review'
        case 'resolved':
            return 'resolved'
        case 'closed':
            return 'closed'
        default:
            return status
    }
}

function badgeClass(type: ReportItem['type']): string {
    if (type === 'bug') return 'badge badge-red'
    if (type === 'error') return 'badge bg-orange-500/20 text-orange-300 border border-orange-400/30'
    return 'badge badge-brand'
}

function severityClass(severity: NonNullable<ReportItem['severity']>): string {
    switch (severity) {
        case 'critical':
            return 'badge bg-red-500/20 text-red-200 border border-red-400/40'
        case 'high':
            return 'badge bg-orange-500/20 text-orange-200 border border-orange-400/40'
        case 'medium':
            return 'badge bg-amber-500/20 text-amber-200 border border-amber-400/40'
        case 'low':
        default:
            return 'badge bg-emerald-500/20 text-emerald-200 border border-emerald-400/40'
    }
}

function labelSeverity(severity: NonNullable<ReportItem['severity']>): string {
    switch (severity) {
        case 'critical':
            return 'Critica'
        case 'high':
            return 'Alta'
        case 'medium':
            return 'Media'
        case 'low':
        default:
            return 'Baja'
    }
}

