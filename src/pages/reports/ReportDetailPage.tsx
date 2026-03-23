import { Link, useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Clock3, Flag, Image as ImageIcon, ShieldCheck } from 'lucide-react'
import { useAuth } from '@hooks/useAuth'
import { useToast } from '@components/ui/Toast'
import { LoadingSkeleton } from '@components/ui/LoadingSkeleton'
import { PageHeader } from '@components/ui/PageHeader'
import { useReportDetail, useReportsViewerAccess } from '@features/reports/hooks/useReports'
import { reportsService } from '@features/reports/services/reports.service'
import type { ReportStatus } from '@features/reports/types'
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
            <div className="page-shell">
                <LoadingSkeleton count={4} />
            </div>
        )
    }

    if (!report) {
        return (
            <div className="page-shell space-y-4">
                <button onClick={() => navigate(-1)} className="btn-ghost -ml-2 w-fit gap-2">
                    <ArrowLeft className="w-4 h-4" />
                    Volver
                </button>
                <section className="card p-5">
                    <p className="text-gray-300">No encontramos el reporte solicitado.</p>
                    <Link to={ROUTES.REPORTS} className="mt-3 inline-flex text-sm text-brand-300 hover:text-brand-200">
                        Volver a reportes
                    </Link>
                </section>
            </div>
        )
    }

    return (
        <div className="page-shell animate-fade-in">
            <button onClick={() => navigate(-1)} className="btn-ghost -ml-2 w-fit gap-2">
                <ArrowLeft className="w-4 h-4" />
                Volver
            </button>

            <PageHeader
                kicker="Issue Detail"
                title={report.title}
                description={report.description}
                meta={
                    <>
                        <span className="hero-meta-pill">
                            <Flag className="w-3.5 h-3.5 text-brand-300" />
                            {report.type}
                        </span>
                        <span className="hero-meta-pill">
                            <Clock3 className="w-3.5 h-3.5 text-brand-300" />
                            {new Date(report.created_at).toLocaleDateString('es-ES')}
                        </span>
                        <span className="hero-meta-pill">Estado: {report.status}</span>
                    </>
                }
                actions={
                    canManage ? (
                        <span className="hero-meta-pill">
                            <ShieldCheck className="w-3.5 h-3.5 text-brand-300" />
                            Gestion habilitada
                        </span>
                    ) : undefined
                }
            />

            <section className="card p-5 space-y-5">
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                    <div className="rounded-[1.35rem] border border-white/8 bg-black/15 p-4 text-sm text-gray-300">
                        <p className="label">Autor</p>
                        <p className="text-white">{report.author?.display_name ?? report.user_id}</p>
                    </div>
                    <div className="rounded-[1.35rem] border border-white/8 bg-black/15 p-4 text-sm text-gray-300">
                        <p className="label">Severidad</p>
                        <p className="text-white">{report.severity ?? 'sin definir'}</p>
                    </div>
                    <div className="rounded-[1.35rem] border border-white/8 bg-black/15 p-4 text-sm text-gray-300">
                        <p className="label">Estado</p>
                        <p className="text-white">{report.status}</p>
                    </div>
                    <div className="rounded-[1.35rem] border border-white/8 bg-black/15 p-4 text-sm text-gray-300">
                        <p className="label">Actualizado</p>
                        <p className="text-white">{new Date(report.updated_at).toLocaleString('es-ES')}</p>
                    </div>
                </div>

                {report.reproduction_steps || report.steps ? (
                    <div className="rounded-[1.6rem] border border-white/8 bg-black/15 p-4">
                        <p className="page-kicker">Reproduction</p>
                        <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-gray-300">
                            {report.reproduction_steps ?? report.steps}
                        </p>
                    </div>
                ) : null}

                {report.image_url ? (
                    <div className="rounded-[1.6rem] border border-white/8 bg-black/15 p-4">
                        <h2 className="inline-flex items-center gap-2 text-sm font-semibold text-white">
                            <ImageIcon className="w-4 h-4 text-brand-300" />
                            Captura adjunta
                        </h2>
                        <a href={report.image_url} target="_blank" rel="noopener noreferrer" className="mt-3 block overflow-hidden rounded-[1.4rem] border border-white/8">
                            <img src={report.image_url} alt="Captura del reporte" className="max-h-[420px] w-full object-cover" />
                        </a>
                    </div>
                ) : null}

                {canManage ? (
                    <div className="rounded-[1.6rem] border border-white/8 bg-black/15 p-4">
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
