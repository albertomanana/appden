import React, { useMemo } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Activity, ArrowRightLeft, Download, ShieldCheck, Target } from 'lucide-react'
import { useToast } from '@components/ui/Toast'
import { debtProService } from '@services/debt-pro.service'
import { formatMoney } from '@lib/utils'
import type { GroupMember } from '@/types'

interface DebtInsightsPanelProps {
    groupId: string
    members: GroupMember[]
}

export const DebtInsightsPanel: React.FC<DebtInsightsPanelProps> = ({ groupId, members }) => {
    const { success, error: toastError } = useToast()

    const { data: settlement } = useQuery({
        queryKey: ['debt-settlement', groupId],
        queryFn: () => debtProService.getSettlementPlan(groupId),
        enabled: !!groupId,
    })

    const { data: monthly } = useQuery({
        queryKey: ['debt-monthly-summary', groupId],
        queryFn: () => debtProService.getMonthlySummary(groupId),
        enabled: !!groupId,
    })

    const { data: health } = useQuery({
        queryKey: ['debt-health-score', groupId],
        queryFn: () => debtProService.getFinancialHealth(groupId),
        enabled: !!groupId,
    })

    const exportMutation = useMutation({
        mutationFn: (format: 'csv' | 'json') => debtProService.exportGroupData(groupId, format),
        onSuccess: (result) => {
            downloadText(result.filename, result.content, result.mime)
            success('Export listo', `Descarga generada en formato ${result.filename.endsWith('.csv') ? 'CSV' : 'JSON'}.`)
        },
        onError: () => toastError('Error', 'No se pudo exportar el backup.'),
    })

    const settlementTotal = useMemo(
        () => (settlement ?? []).reduce((sum, transfer) => sum + transfer.amount, 0),
        [settlement]
    )

    const memberName = (userId: string) => members.find((member) => member.user_id === userId)?.profile?.display_name ?? userId

    return (
        <section className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <article className="card p-3">
                    <p className="text-xs text-gray-400 mb-1 inline-flex items-center gap-1">
                        <Activity className="w-3.5 h-3.5" /> Resumen mensual
                    </p>
                    <p className="text-sm text-gray-200">Creado: {formatMoney(monthly?.total_created ?? 0)}</p>
                    <p className="text-sm text-gray-200">Pagado: {formatMoney(monthly?.total_paid ?? 0)}</p>
                    <p className="text-sm text-gray-200">Pendiente: {formatMoney(monthly?.pending_amount ?? 0)}</p>
                </article>

                <article className="card p-3">
                    <p className="text-xs text-gray-400 mb-1 inline-flex items-center gap-1">
                        <ShieldCheck className="w-3.5 h-3.5" /> Salud financiera
                    </p>
                    <p className="text-2xl font-bold text-white">{health?.score ?? 0}/100</p>
                    <p className="text-sm text-gray-300 capitalize">{health?.status ?? 'sin datos'}</p>
                </article>

                <article className="card p-3">
                    <p className="text-xs text-gray-400 mb-1 inline-flex items-center gap-1">
                        <ArrowRightLeft className="w-3.5 h-3.5" /> Liquidacion inteligente
                    </p>
                    <p className="text-sm text-gray-200">{(settlement ?? []).length} transferencias sugeridas</p>
                    <p className="text-sm text-gray-200">Total a mover: {formatMoney(settlementTotal)}</p>
                </article>
            </div>

            {(settlement ?? []).length > 0 ? (
                <div className="card p-3">
                    <p className="text-sm font-semibold text-white mb-2 inline-flex items-center gap-2">
                        <Target className="w-4 h-4 text-brand-300" /> Plan de liquidacion
                    </p>
                    <div className="space-y-1.5">
                        {(settlement ?? []).map((transfer, index) => (
                            <div key={`${transfer.from_user_id}-${transfer.to_user_id}-${index}`} className="text-sm text-gray-200 flex items-center gap-2">
                                <span>{memberName(transfer.from_user_id)}</span>
                                <ArrowRightLeft className="w-3.5 h-3.5 text-gray-500" />
                                <span>{memberName(transfer.to_user_id)}</span>
                                <span className="ml-auto">{transfer.amount.toFixed(2)} {transfer.currency}</span>
                            </div>
                        ))}
                    </div>
                </div>
            ) : null}

            <div className="card p-3 flex flex-wrap items-center gap-2">
                <button
                    type="button"
                    onClick={() => exportMutation.mutate('csv')}
                    className="btn-secondary px-3 py-2 text-xs"
                    disabled={exportMutation.isPending}
                >
                    <Download className="w-3.5 h-3.5" /> Export CSV
                </button>
                <button
                    type="button"
                    onClick={() => exportMutation.mutate('json')}
                    className="btn-secondary px-3 py-2 text-xs"
                    disabled={exportMutation.isPending}
                >
                    <Download className="w-3.5 h-3.5" /> Export JSON
                </button>
            </div>
        </section>
    )
}

function downloadText(filename: string, content: string, mime: string): void {
    if (typeof window === 'undefined') return
    const blob = new Blob([content], { type: mime })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    link.click()
    URL.revokeObjectURL(url)
}
