import React, { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, CheckCircle, PlusCircle, Trash2 } from 'lucide-react'
import { debtsService } from '@services/debts.service'
import { useAuth } from '@hooks/useAuth'
import { useActiveGroup } from '@hooks/useActiveGroup'
import { useToast } from '@components/ui/Toast'
import { Avatar } from '@components/common/Avatar'
import { ConfirmDialog } from '@components/ui/ConfirmDialog'
import { formatMoney, formatDate, formatRelative, getDebtProgress } from '@lib/utils'
import { DEBT_STATUS_LABELS } from '@lib/constants'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { paymentSchema, type PaymentFormData } from '@lib/validators'

const DebtDetailPage: React.FC = () => {
    const { debtId } = useParams<{ debtId: string }>()
    const navigate = useNavigate()
    const { userId } = useAuth()
    const { groupId } = useActiveGroup()
    const { success, error: toastError } = useToast()
    const queryClient = useQueryClient()
    const [showPaymentForm, setShowPaymentForm] = useState(false)
    const [showMarkPaid, setShowMarkPaid] = useState(false)

    const { data: debt, isLoading } = useQuery({
        queryKey: ['debt', debtId],
        queryFn: () => debtsService.getDebt(debtId!),
        enabled: !!debtId,
    })

    const { register, handleSubmit, reset, formState: { errors } } = useForm<PaymentFormData>({
        resolver: zodResolver(paymentSchema),
    })

    const { mutate: registerPayment, isPending: isPaymentPending } = useMutation({
        mutationFn: (data: PaymentFormData) => debtsService.registerPayment(
            debtId!, userId!, data, debt!.amount, debt!.amount_paid
        ),
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: ['debt', debtId] })
            void queryClient.invalidateQueries({ queryKey: ['debts', groupId] })
            void queryClient.invalidateQueries({ queryKey: ['debts-summary', groupId] })
            success('Pago registrado', 'El progreso se ha actualizado.')
            setShowPaymentForm(false)
            reset()
        },
        onError: (err) => toastError('Error', err instanceof Error ? err.message : 'Error'),
    })

    const { mutate: markAsPaid, isPending: isMarkingPaid } = useMutation({
        mutationFn: () => debtsService.markAsPaid(debtId!, debt!.amount),
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: ['debt', debtId] })
            void queryClient.invalidateQueries({ queryKey: ['debts', groupId] })
            success('Deuda saldada', 'Marcada como completamente pagada.')
            setShowMarkPaid(false)
        },
        onError: (err) => toastError('Error', err instanceof Error ? err.message : 'Error'),
    })

    if (isLoading) {
        return (
            <div className="p-4 flex items-center justify-center min-h-screen">
                <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
            </div>
        )
    }

    if (!debt) {
        return (
            <div className="p-4">
                <p className="text-gray-400">Deuda no encontrada.</p>
            </div>
        )
    }

    const progress = getDebtProgress(debt.amount, debt.amount_paid)
    const isPaid = debt.status === 'paid'
    const canRegisterPayment = userId === debt.debtor_id && !isPaid

    return (
        <div className="p-4 md:p-6 max-w-xl mx-auto space-y-5 animate-fade-in">
            {/* Back button */}
            <button onClick={() => navigate(-1)} className="btn-ghost gap-2 -ml-1">
                <ArrowLeft className="w-4 h-4" /> Volver
            </button>

            {/* Debt header */}
            <div className="card p-5 space-y-4">
                <div className="flex items-start justify-between">
                    <div>
                        <h1 className="text-xl font-bold text-white">{debt.concept}</h1>
                        <p className="text-sm text-gray-400 mt-0.5">{formatDate(debt.created_at)}</p>
                    </div>
                    <span className={`badge ${debt.status === 'paid' ? 'badge-green' : debt.status === 'partial' ? 'badge-amber' : 'badge-red'}`}>
                        {DEBT_STATUS_LABELS[debt.status]}
                    </span>
                </div>

                {/* Amount */}
                <div className="text-3xl font-extrabold text-white">
                    {formatMoney(debt.amount, debt.currency)}
                </div>

                {/* Progress */}
                {debt.amount_paid > 0 && (
                    <div>
                        <div className="progress-bar h-2">
                            <div className="progress-fill" style={{ width: `${progress}%` }} />
                        </div>
                        <div className="flex justify-between text-xs text-gray-400 mt-1">
                            <span>Pagado: {formatMoney(debt.amount_paid, debt.currency)}</span>
                            <span>{progress}%</span>
                        </div>
                    </div>
                )}

                {/* Parties */}
                <div className="flex items-center gap-4 pt-2 border-t border-surface-500">
                    <div className="flex items-center gap-2">
                        <Avatar src={debt.debtor?.avatar_url} name={debt.debtor?.display_name} size="sm" />
                        <div>
                            <p className="text-xs text-gray-400">Deudor</p>
                            <p className="text-sm font-medium text-white">{debt.debtor?.display_name}</p>
                        </div>
                    </div>
                    <div className="flex-1 border-t border-dashed border-surface-400" />
                    <div className="flex items-center gap-2">
                        <div className="text-right">
                            <p className="text-xs text-gray-400">Acreedor</p>
                            <p className="text-sm font-medium text-white">{debt.creditor?.display_name}</p>
                        </div>
                        <Avatar src={debt.creditor?.avatar_url} name={debt.creditor?.display_name} size="sm" />
                    </div>
                </div>
            </div>

            {/* Actions */}
            {!isPaid && (
                <div className="flex gap-3">
                    {canRegisterPayment && (
                        <button onClick={() => setShowPaymentForm((p) => !p)} className="btn-secondary flex-1">
                            <PlusCircle className="w-4 h-4" />
                            Registrar pago
                        </button>
                    )}
                    {(userId === debt.creditor_id || userId === debt.debtor_id) && (
                        <button onClick={() => setShowMarkPaid(true)} className="btn-primary flex-1">
                            <CheckCircle className="w-4 h-4" />
                            Marcar como pagada
                        </button>
                    )}
                </div>
            )}

            {/* Payment form */}
            {showPaymentForm && (
                <form onSubmit={handleSubmit((d) => registerPayment(d))} className="card p-4 space-y-3">
                    <h3 className="text-sm font-semibold text-white">Registrar pago parcial</h3>
                    <div>
                        <label className="label" htmlFor="pay-amount">Importe *</label>
                        <input
                            id="pay-amount"
                            type="number"
                            step="0.01"
                            min="0.01"
                            max={debt.amount - debt.amount_paid}
                            className={`input ${errors.amount ? 'border-red-500' : ''}`}
                            placeholder={`Máximo: ${(debt.amount - debt.amount_paid).toFixed(2)}`}
                            {...register('amount', { valueAsNumber: true })}
                        />
                        {errors.amount && <p className="text-xs text-red-400 mt-1">{errors.amount.message}</p>}
                    </div>
                    <div>
                        <label className="label" htmlFor="pay-note">Nota (opcional)</label>
                        <input id="pay-note" type="text" className="input" placeholder="Ej: Bizum" {...register('note')} />
                    </div>
                    <button type="submit" disabled={isPaymentPending} className="btn-primary w-full py-2.5">
                        {isPaymentPending ? 'Guardando...' : 'Confirmar pago'}
                    </button>
                </form>
            )}

            {/* Payment history */}
            {debt.payments && debt.payments.length > 0 && (
                <section>
                    <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Historial de pagos</h2>
                    <div className="space-y-2">
                        {debt.payments.map((p) => (
                            <div key={p.id} className="card p-3 flex items-center gap-3">
                                <Avatar src={p.payer?.avatar_url} name={p.payer?.display_name} size="xs" />
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm text-white font-medium">{formatMoney(p.amount, debt.currency)}</p>
                                    {p.note && <p className="text-xs text-gray-400">{p.note}</p>}
                                </div>
                                <span className="text-xs text-gray-500">{formatRelative(p.created_at)}</span>
                            </div>
                        ))}
                    </div>
                </section>
            )}

            {/* Confirm mark as paid */}
            <ConfirmDialog
                isOpen={showMarkPaid}
                title="Marcar como pagada"
                description={`¿Confirmas que la deuda de ${formatMoney(debt.amount, debt.currency)} ha sido saldada por completo?`}
                confirmLabel="Sí, marcar como pagada"
                variant="default"
                isLoading={isMarkingPaid}
                onConfirm={() => markAsPaid()}
                onCancel={() => setShowMarkPaid(false)}
            />
        </div>
    )
}

export default DebtDetailPage
