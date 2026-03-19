import { Link, useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Clock3, Flag, Image as ImageIcon } from 'lucide-react'
import { useAuth } from '@hooks/useAuth'
import { useToast } from '@components/ui/Toast'
import { useReportDetail, useReportsViewerAccess } from '@features/reports/hooks/useReports'
import { reportsService } from '@features/reports/services/reports.service'
import type { ReportStatus } from '@features/reports/types'
import { LoadingSkeleton } from '@components/ui/LoadingSkeleton'
import { ROUTES } from '@lib/constants'

export default function ReportDetailPage() {
    const { reportId } = useParams<{ reportId: string }>()
    const { userId } = useAuth()
    const { success, error } = useToast()
    const navigate = useNavigate()
    const queryClient = useQueryClient()

    const { data: report, isLoading } = useReportDetail(reportId ?? null)
    const { data: access } = useReportsViewerAccess(userId)
    const isAdmin = !!access?.isAdmin
    const canManage = !!report && !!userId && (report.user_id === userId || isAdmin)

    const updateStatusMutation = useMutation({
        mutationFn: ({ id, status }: { id: string; status: ReportStatus }) => reportsService.updateStatus(id, status),
        onSuccess: async () => {
            await Promise.all([
                queryClient.invalidateQueries({ queryKey: ['reports'] }),
                queryClient.invalidateQueries({ queryKey: ['reports', 'detail', reportId] }),
            ])
            success('Estado actualizado')
        },
        onError: () => error('No se pudo actualizar estado'),
    })

    if (isLoading) {
        return (
            <div className="max-w-3xl mx-auto p-4 md:p-6">
                <LoadingSkeleton count={4} />
            </div>
        )
    }

    if (!report) {
        return (
            <div className="max-w-3xl mx-auto p-4 md:p-6 space-y-4">
                <button
                    onClick={() => navigate(-1)}
                    className="inline-flex items-center gap-2 text-sm text-brand-300 hover:text-brand-200"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Volver
                </button>
                <div className="card p-4">
                    <p className="text-gray-300">No encontramos el reporte solicitado.</p>
                    <Link to={ROUTES.REPORTS} className="text-brand-300 hover:text-brand-200 text-sm">
                        Volver a reportes
                    </Link>
                </div>
            </div>
        )
    }

    return (
        <div className="max-w-3xl mx-auto p-4 md:p-6 space-y-4">
            <button
                onClick={() => navigate(-1)}
                className="inline-flex items-center gap-2 text-sm text-brand-300 hover:text-brand-200"
            >
                <ArrowLeft className="w-4 h-4" />
                Volver
            </button>

            <section className="card p-4 space-y-4">
                <div className="flex items-start justify-between gap-3">
                    <div>
                        <h1 className="text-xl font-bold text-white">{report.title}</h1>
                        <p className="text-sm text-gray-400 mt-1">
                            {report.author?.display_name ?? report.user_id}
                        </p>
                    </div>

                    <span className="badge badge-brand inline-flex items-center gap-1">
                        <Flag className="w-3.5 h-3.5" />
                        {report.type}
                    </span>
                </div>

                <div className="grid gap-2 sm:grid-cols-2 text-sm">
                    <p className="text-gray-300 inline-flex items-center gap-1">
                        <Clock3 className="w-3.5 h-3.5 text-gray-500" />
                        Creado: {new Date(report.created_at).toLocaleString('es-ES')}
                    </p>
                    <p className="text-gray-300">Severidad: {report.severity ?? 'sin definir'}</p>
                    <p className="text-gray-300">Estado: {report.status}</p>
                    <p className="text-gray-300">Actualizado: {new Date(report.updated_at).toLocaleString('es-ES')}</p>
                </div>

                <div>
                    <h2 className="text-sm font-semibold text-gray-200 mb-1">Descripcion</h2>
                    <p className="text-sm text-gray-300 whitespace-pre-wrap">{report.description}</p>
                </div>

                {report.reproduction_steps || report.steps ? (
                    <div>
                        <h2 className="text-sm font-semibold text-gray-200 mb-1">Pasos para reproducir</h2>
                        <p className="text-sm text-gray-300 whitespace-pre-wrap">{report.reproduction_steps ?? report.steps}</p>
                    </div>
                ) : null}

                {report.image_url ? (
                    <div>
                        <h2 className="text-sm font-semibold text-gray-200 mb-2 inline-flex items-center gap-1">
                            <ImageIcon className="w-4 h-4 text-gray-400" />
                            Captura
                        </h2>
                        <a
                            href={report.image_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block rounded-xl overflow-hidden border border-surface-500"
                        >
                            <img
                                src={report.image_url}
                                alt="Captura del reporte"
                                className="w-full max-h-[420px] object-cover"
                            />
                        </a>
                    </div>
                ) : null}

                {canManage ? (
                    <div className="pt-2 border-t border-surface-500">
                        <label className="label">Cambiar estado</label>
                        <select
                            value={report.status}
                            onChange={(event) =>
                                updateStatusMutation.mutate({
                                    id: report.id,
                                    status: event.target.value as ReportStatus,
                                })
                            }
                            className="input"
                            disabled={updateStatusMutation.isPending}
                        >
                            <option value="open">Open</option>
                            <option value="in_review">In review</option>
                            <option value="resolved">Resolved</option>
                            <option value="closed">Closed</option>
                        </select>
                    </div>
                ) : null}
            </section>
        </div>
    )
}
