import React, { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { BellRing, CalendarClock, MessageCircle } from 'lucide-react'
import { debtProService } from '@services/debt-pro.service'
import { useToast } from '@components/ui/Toast'
import type { Debt, DebtReminderFrequency } from '@/types'

interface DebtAutomationPanelProps {
    debt: Debt
    userId: string
}

const FREQUENCIES: DebtReminderFrequency[] = ['suave', 'normal', 'estricto']

export const DebtAutomationPanel: React.FC<DebtAutomationPanelProps> = ({ debt, userId }) => {
    const { success, error: toastError } = useToast()
    const queryClient = useQueryClient()

    const [frequency, setFrequency] = useState<DebtReminderFrequency>('normal')
    const [channelPush, setChannelPush] = useState(true)
    const [channelEmail, setChannelEmail] = useState(false)
    const [channelWhatsapp, setChannelWhatsapp] = useState(true)
    const [reminderActive, setReminderActive] = useState(true)
    const [installmentsCount, setInstallmentsCount] = useState<number>(3)
    const [firstDueDate, setFirstDueDate] = useState<string>(() => new Date().toISOString().slice(0, 10))

    const { data: reminder } = useQuery({
        queryKey: ['debt-reminder', debt.id],
        queryFn: () => debtProService.getReminderConfig(debt.id),
        enabled: !!debt.id,
    })

    const { data: plan } = useQuery({
        queryKey: ['debt-payment-plan', debt.id, debt.amount_paid],
        queryFn: () => debtProService.getPaymentPlan(debt.id, debt.amount_paid),
        enabled: !!debt.id,
    })

    const hasConfiguredReminder = !!reminder

    useEffect(() => {
        if (!reminder) return
        setFrequency(reminder.frequency)
        setChannelPush(reminder.channels.push)
        setChannelEmail(reminder.channels.email)
        setChannelWhatsapp(reminder.channels.whatsapp)
        setReminderActive(reminder.active)
    }, [reminder])

    const saveReminderMutation = useMutation({
        mutationFn: () => debtProService.upsertReminderConfig({
            debtId: debt.id,
            groupId: debt.group_id,
            debtorId: debt.debtor_id,
            createdBy: userId,
            frequency,
            channels: {
                push: channelPush,
                email: channelEmail,
                whatsapp: channelWhatsapp,
            },
            active: reminderActive,
        }),
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: ['debt-reminder', debt.id] })
            success('Recordatorios guardados')
        },
        onError: () => toastError('Error', 'No se pudo guardar la configuracion de recordatorios.'),
    })

    const sendReminderMutation = useMutation({
        mutationFn: async () => {
            const config = reminder ?? await debtProService.getReminderConfig(debt.id)
            if (!config) throw new Error('missing-config')
            return debtProService.sendReminderNow(debt, debt.debtor?.display_name ?? 'deudor', config)
        },
        onSuccess: ({ whatsappUrl }) => {
            if (whatsappUrl) {
                window.open(whatsappUrl, '_blank', 'noopener,noreferrer')
            }
            void queryClient.invalidateQueries({ queryKey: ['debt-reminder', debt.id] })
            success('Recordatorio enviado')
        },
        onError: (err) => {
            if (err instanceof Error && err.message === 'missing-config') {
                toastError('Configura recordatorios antes de enviar.')
                return
            }
            toastError('Error', 'No se pudo enviar el recordatorio.')
        },
    })

    const createPlanMutation = useMutation({
        mutationFn: () => debtProService.createPaymentPlan({
            debtId: debt.id,
            totalAmount: debt.amount,
            amountPaid: debt.amount_paid,
            installments: installmentsCount,
            firstDueDate,
        }),
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: ['debt-payment-plan', debt.id, debt.amount_paid] })
            success('Plan de pagos actualizado')
        },
        onError: () => toastError('Error', 'No se pudo guardar el plan de pagos.'),
    })

    return (
        <section className="space-y-3">
            <article className="card p-4 space-y-3">
                <p className="text-sm font-semibold text-white inline-flex items-center gap-2">
                    <BellRing className="w-4 h-4 text-brand-300" /> Recordatorios automaticos
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                        <label className="label">Frecuencia</label>
                        <select value={frequency} onChange={(event) => setFrequency(event.target.value as DebtReminderFrequency)} className="input">
                            {FREQUENCIES.map((item) => (
                                <option key={item} value={item}>{item}</option>
                            ))}
                        </select>
                    </div>
                    <div className="rounded-xl border border-surface-500 bg-surface-700/40 p-3 space-y-2 text-sm text-gray-300">
                        <label className="inline-flex items-center gap-2">
                            <input type="checkbox" checked={channelPush} onChange={(event) => setChannelPush(event.target.checked)} />
                            Push
                        </label>
                        <label className="inline-flex items-center gap-2">
                            <input type="checkbox" checked={channelEmail} onChange={(event) => setChannelEmail(event.target.checked)} />
                            Email
                        </label>
                        <label className="inline-flex items-center gap-2">
                            <input type="checkbox" checked={channelWhatsapp} onChange={(event) => setChannelWhatsapp(event.target.checked)} />
                            WhatsApp
                        </label>
                        <label className="inline-flex items-center gap-2">
                            <input type="checkbox" checked={reminderActive} onChange={(event) => setReminderActive(event.target.checked)} />
                            Activo
                        </label>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    <button
                        type="button"
                        onClick={() => saveReminderMutation.mutate()}
                        className="btn-secondary px-3 py-2 text-xs"
                        disabled={saveReminderMutation.isPending}
                    >
                        Guardar configuracion
                    </button>
                    <button
                        type="button"
                        onClick={() => sendReminderMutation.mutate()}
                        className="btn-primary px-3 py-2 text-xs"
                        disabled={sendReminderMutation.isPending || (!hasConfiguredReminder && saveReminderMutation.isPending)}
                    >
                        <MessageCircle className="w-3.5 h-3.5" /> Enviar ahora
                    </button>
                </div>
            </article>

            <article className="card p-4 space-y-3">
                <p className="text-sm font-semibold text-white inline-flex items-center gap-2">
                    <CalendarClock className="w-4 h-4 text-brand-300" /> Plan de pagos (cuotas)
                </p>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                    <input
                        type="number"
                        min="1"
                        max="24"
                        value={installmentsCount || ''}
                        onChange={(event) => setInstallmentsCount(Number(event.target.value || 1))}
                        className="input"
                        placeholder="Cuotas"
                    />
                    <input
                        type="date"
                        value={firstDueDate}
                        onChange={(event) => setFirstDueDate(event.target.value)}
                        className="input"
                    />
                    <button
                        type="button"
                        onClick={() => createPlanMutation.mutate()}
                        className="btn-secondary"
                        disabled={createPlanMutation.isPending}
                    >
                        Generar plan
                    </button>
                </div>

                {(plan ?? []).length > 0 ? (
                    <div className="space-y-1.5">
                        {(plan ?? []).map((item) => (
                            <div key={item.id} className="rounded-xl border border-surface-500 bg-surface-700/40 px-3 py-2 text-sm flex items-center gap-2">
                                <span className="text-gray-300">#{item.installment_number}</span>
                                <span className="text-white">{item.amount.toFixed(2)} {debt.currency}</span>
                                <span className="text-gray-400 ml-auto">{item.due_date}</span>
                                <span className={`text-xs px-2 py-0.5 rounded-full border ${
                                    item.status === 'paid'
                                        ? 'border-emerald-500/40 text-emerald-300'
                                        : item.status === 'overdue'
                                            ? 'border-red-500/40 text-red-300'
                                            : 'border-amber-500/40 text-amber-300'
                                }`}>
                                    {item.status}
                                </span>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="text-sm text-gray-400">Sin plan de pagos configurado.</p>
                )}
            </article>
        </section>
    )
}
