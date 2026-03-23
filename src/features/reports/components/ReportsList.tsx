import React from 'react'
import { BadgeCheck, Clock3, ListChecks } from 'lucide-react'
import { Link } from 'react-router-dom'
import { EmptyState } from '@components/ui/EmptyState'
import { ListSkeleton } from '@components/ui/LoadingSkeleton'
import { ROUTES } from '@lib/constants'
import type { ReportItem, ReportStatus } from '@features/reports/types'

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
        return <ListSkeleton count={3} item={<div className="card h-32" />} />
    }

    if (reports.length === 0) {
        return (
            <EmptyState
                icon={<ListChecks className="w-7 h-7" />}
                title="No hay reportes todavia"
                description="Cuando alguien envie un bug, error o mejora aparecera aqui con estado y severidad."
            />
        )
    }

    return (
        <div className="space-y-3">
            {reports.map((report) => (
                <article key={report.id} className="card p-4 md:p-5">
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                        <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                                <span className={badgeClass(report.type)}>{labelType(report.type)}</span>
                                {report.severity ? <span className={severityClass(report.severity)}>{labelSeverity(report.severity)}</span> : null}
                            </div>

                            <Link to={ROUTES.REPORT_DETAIL(report.id)} className="group mt-4 block">
                                <h3 className="text-xl font-headline font-extrabold tracking-tight text-white group-hover:text-brand-100">
                                    {report.title}
                                </h3>
                                <p className="mt-2 truncate-2 text-sm leading-relaxed text-gray-300">{report.description}</p>
                            </Link>
                        </div>

                        <div className="shrink-0 text-xs uppercase tracking-[0.22em] text-gray-500">
                            <span className="inline-flex items-center gap-2">
                                <Clock3 className="w-3.5 h-3.5 text-brand-300" />
                                {new Date(report.created_at).toLocaleDateString('es-ES')}
                            </span>
                        </div>
                    </div>

                    <div className="mt-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                        <div className="inline-flex items-center gap-2 text-sm text-gray-400">
                            <BadgeCheck className="w-4 h-4 text-brand-300" />
                            Estado: {labelStatus(report.status)}
                            {report.author?.display_name ? ` · ${report.author.display_name}` : ''}
                        </div>

                        {canManageStatus && onChangeStatus ? (
                            <select
                                value={report.status}
                                className="input max-w-[220px] text-sm"
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
            return 'in review'
        case 'resolved':
            return 'resolved'
        case 'closed':
            return 'closed'
        default:
            return status
    }
}

function badgeClass(type: ReportItem['type']): string {
    if (type === 'bug') return 'badge bg-red-400/14 text-red-200 border border-red-300/20'
    if (type === 'error') return 'badge bg-orange-400/14 text-orange-200 border border-orange-300/20'
    return 'badge bg-brand-400/14 text-brand-100 border border-brand-300/20'
}

function severityClass(severity: NonNullable<ReportItem['severity']>): string {
    switch (severity) {
        case 'critical':
            return 'badge bg-red-400/14 text-red-200 border border-red-300/20'
        case 'high':
            return 'badge bg-orange-400/14 text-orange-200 border border-orange-300/20'
        case 'medium':
            return 'badge bg-amber-400/14 text-amber-200 border border-amber-300/20'
        case 'low':
        default:
            return 'badge bg-emerald-400/14 text-emerald-200 border border-emerald-300/20'
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
