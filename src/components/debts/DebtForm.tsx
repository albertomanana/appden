import React from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { X, CreditCard } from 'lucide-react'
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query'
import { debtsService } from '@services/debts.service'
import { groupsService } from '@services/groups.service'
import { debtSchema, type DebtFormData } from '@lib/validators'
import { useAuth } from '@hooks/useAuth'
import { useActiveGroup } from '@hooks/useActiveGroup'
import { useToast } from '@components/ui/Toast'
import { CURRENCIES } from '@lib/constants'

interface DebtFormProps {
    onClose: () => void
}

export const DebtForm: React.FC<DebtFormProps> = ({ onClose }) => {
    const { userId } = useAuth()
    const { groupId, activeGroup } = useActiveGroup()
    const { success, error: toastError } = useToast()
    const queryClient = useQueryClient()

    const { data: members } = useQuery({
        queryKey: ['members', groupId],
        queryFn: () => groupsService.getGroupMembers(groupId!),
        enabled: !!groupId,
    })

    // Filter out the current user from debtors (can't owe myself)
    const otherMembers = members?.filter((m) => m.user_id !== userId) ?? []

    const { register, handleSubmit, formState: { errors } } = useForm<DebtFormData>({
        resolver: zodResolver(debtSchema),
        defaultValues: { currency: 'EUR' },
    })

    const { mutate: create, isPending } = useMutation({
        mutationFn: (data: DebtFormData) => debtsService.createDebt(groupId!, userId!, data),
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: ['debts', groupId] })
            void queryClient.invalidateQueries({ queryKey: ['debts-summary', groupId] })
            success('Deuda registrada', 'Se ha añadido al historial del grupo.')
            onClose()
        },
        onError: (err) => {
            toastError('Error', err instanceof Error ? err.message : 'Error al crear deuda')
        },
    })

    return (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
            <div className="relative w-full sm:max-w-md card rounded-t-2xl sm:rounded-2xl p-6 animate-slide-up">
                <div className="flex items-center justify-between mb-5">
                    <div className="flex items-center gap-2">
                        <CreditCard className="w-5 h-5 text-brand-400" />
                        <h2 className="text-lg font-bold text-white">Nueva deuda</h2>
                    </div>
                    <button onClick={onClose} className="btn-ghost p-2 rounded-xl"><X className="w-4 h-4" /></button>
                </div>

                <form onSubmit={handleSubmit((d) => create(d))} className="space-y-4">
                    {/* Concept */}
                    <div>
                        <label className="label" htmlFor="concept">Concepto *</label>
                        <input id="concept" type="text" placeholder="Ej: Cena del viernes" className={`input ${errors.concept ? 'border-red-500' : ''}`} {...register('concept')} />
                        {errors.concept && <p className="text-xs text-red-400 mt-1">{errors.concept.message}</p>}
                    </div>

                    {/* Amount + Currency */}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="label" htmlFor="amount">Importe *</label>
                            <input
                                id="amount"
                                type="number"
                                step="0.01"
                                min="0.01"
                                placeholder="0.00"
                                className={`input ${errors.amount ? 'border-red-500' : ''}`}
                                {...register('amount', { valueAsNumber: true })}
                            />
                            {errors.amount && <p className="text-xs text-red-400 mt-1">{errors.amount.message}</p>}
                        </div>
                        <div>
                            <label className="label" htmlFor="currency">Moneda</label>
                            <select id="currency" className="input" {...register('currency')}>
                                {CURRENCIES.map((c) => (
                                    <option key={c.value} value={c.value}>{c.label}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Debtor */}
                    <div>
                        <label className="label" htmlFor="debtor_id">Deudor (quién debe) *</label>
                        <select
                            id="debtor_id"
                            className={`input ${errors.debtor_id ? 'border-red-500' : ''}`}
                            {...register('debtor_id')}
                            defaultValue=""
                        >
                            <option value="" disabled>Selecciona un miembro</option>
                            {otherMembers.map((m) => (
                                <option key={m.user_id} value={m.user_id}>
                                    {m.profile?.display_name ?? m.user_id}
                                </option>
                            ))}
                        </select>
                        {errors.debtor_id && <p className="text-xs text-red-400 mt-1">{errors.debtor_id.message}</p>}
                        <p className="text-xs text-gray-500 mt-1">Tú eres el acreedor (quien prestó).</p>
                    </div>

                    <button type="submit" disabled={isPending} className="btn-primary w-full py-3 font-semibold">
                        {isPending ? (
                            <span className="flex items-center gap-2 justify-center">
                                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                Guardando...
                            </span>
                        ) : 'Registrar deuda'}
                    </button>
                </form>
            </div>
        </div>
    )
}
