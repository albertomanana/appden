import React from 'react'
import { Flag } from 'lucide-react'
import { useAuth } from '@hooks/useAuth'
import { useActiveGroup } from '@hooks/useActiveGroup'
import { useToast } from '@components/ui/Toast'
import { EmptyState } from '@components/ui/EmptyState'
import { ReportForm } from '@features/reports/components/ReportForm'
import { ReportsList } from '@features/reports/components/ReportsList'
import { useReports } from '@features/reports/hooks/useReports'

const ReportPage: React.FC = () => {
    const { userId } = useAuth()
    const { groupId, activeGroup } = useActiveGroup()
    const { success, error: toastError } = useToast()

    const { reports, isLoading, createReportMutation } = useReports(groupId)

    if (!groupId || !userId) {
        return (
            <div className="p-4 md:p-6">
                <EmptyState
                    icon={<Flag className="w-7 h-7" />}
                    title="Selecciona un grupo"
                    description="Los reportes se guardan por grupo para mantener contexto y privacidad."
                />
            </div>
        )
    }

    return (
        <div className="p-4 md:p-6 space-y-5 animate-fade-in">
            <section className="card p-4 md:p-5">
                <h1 className="section-title">Reportes</h1>
                <p className="text-sm text-muted mt-1">Envia bugs o mejoras para {activeGroup?.name}</p>
            </section>

            <ReportForm
                isSubmitting={createReportMutation.isPending}
                onSubmit={(payload) => {
                    createReportMutation.mutate(
                        {
                            userId,
                            groupId,
                            type: payload.type,
                            description: payload.description,
                            steps: payload.steps,
                            imageFile: payload.imageFile,
                        },
                        {
                            onSuccess: () => success('Reporte enviado', 'Gracias por ayudarnos a mejorar.'),
                            onError: () => toastError('Error', 'No se pudo enviar el reporte.'),
                        }
                    )
                }}
            />

            <section className="space-y-3">
                <h2 className="text-base font-semibold text-white">Reportes recientes del grupo</h2>
                <ReportsList reports={reports} isLoading={isLoading} />
            </section>
        </div>
    )
}

export default ReportPage

