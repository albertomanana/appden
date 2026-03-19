import React from 'react'
import { BadgeCheck, Clock3, ListChecks } from 'lucide-react'
import { EmptyState } from '@components/ui/EmptyState'
import { ListSkeleton } from '@components/ui/LoadingSkeleton'
import type { ReportItem } from '@features/reports/types'

type ReportsListProps = {
    reports: ReportItem[]
    isLoading: boolean
}

export const ReportsList: React.FC<ReportsListProps> = ({ reports, isLoading }) => {
    if (isLoading) {
        return <ListSkeleton count={3} item={<div className="card h-20" />} />
    }

    if (reports.length === 0) {
        return (
            <EmptyState
                icon={<ListChecks className="w-7 h-7" />}
                title="No hay reportes en este grupo"
                description="Cuando alguien envie un bug o mejora aparecera aqui."
            />
        )
    }

    return (
        <div className="space-y-2.5">
            {reports.slice(0, 10).map((report) => (
                <article key={report.id} className="card p-4">
                    <div className="flex items-center justify-between gap-2 mb-2">
                        <span className={report.type === 'bug' ? 'badge badge-red' : 'badge badge-brand'}>
                            {report.type === 'bug' ? 'Bug' : 'Mejora'}
                        </span>
                        <span className="inline-flex items-center gap-1 text-xs text-gray-400">
                            <Clock3 className="w-3.5 h-3.5" />
                            {new Date(report.created_at).toLocaleDateString('es-ES')}
                        </span>
                    </div>
                    <p className="text-sm text-gray-200 truncate-2">{report.description}</p>
                    <div className="mt-2 text-xs text-gray-400 inline-flex items-center gap-1">
                        <BadgeCheck className="w-3.5 h-3.5" />
                        Estado: {report.status}
                    </div>
                </article>
            ))}
        </div>
    )
}

