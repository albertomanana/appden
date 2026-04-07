import React, { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Calculator, Equal, Percent, X } from 'lucide-react'
import { CURRENCIES } from '@lib/constants'
import { groupsService } from '@services/groups.service'
import { debtProService } from '@services/debt-pro.service'
import { useAuth } from '@hooks/useAuth'
import { useActiveGroup } from '@hooks/useActiveGroup'
import { useToast } from '@components/ui/Toast'
import type { DebtCurrency, DebtSplitMode, GroupMember } from '@/types'

interface DebtSplitCalculatorProps {
    onClose: () => void
}

type ParticipantDraft = {
    userId: string
    percentage: number
    exactAmount: number
}

export const DebtSplitCalculator: React.FC<DebtSplitCalculatorProps> = ({ onClose }) => {
    const { userId } = useAuth()
    const { groupId } = useActiveGroup()
    const { success, error: toastError } = useToast()
    const queryClient = useQueryClient()

    const [concept, setConcept] = useState('')
    const [totalAmount, setTotalAmount] = useState<number>(0)
    const [currency, setCurrency] = useState<DebtCurrency>('EUR')
    const [mode, setMode] = useState<DebtSplitMode>('equal')
    const [participants, setParticipants] = useState<ParticipantDraft[]>([])

    const { data: members } = useQuery({
        queryKey: ['members', groupId],
        queryFn: () => groupsService.getGroupMembers(groupId!),
        enabled: !!groupId,
    })

    const eligibleMembers = useMemo(
        () => (members ?? []).filter((member) => member.user_id !== userId),
        [members, userId]
    )

    const selectedParticipants = useMemo(
        () => participants.filter((item) => item.userId),
        [participants]
    )

    const previewShares = useMemo(
        () => debtProService.calculateSplitShares(
            totalAmount,
            mode,
            selectedParticipants.map((item) => ({
                debtorId: item.userId,
                percentage: item.percentage,
                exactAmount: item.exactAmount,
            }))
        ),
        [mode, selectedParticipants, totalAmount]
    )

    const createSplitMutation = useMutation({
        mutationFn: () => debtProService.createSplitDebts({
            groupId: groupId!,
            creditorId: userId!,
            concept: concept.trim() || 'Reparto',
            totalAmount,
            currency,
            mode,
            participants: selectedParticipants.map((item) => ({
                debtorId: item.userId,
                percentage: item.percentage,
                exactAmount: item.exactAmount,
            })),
        }),
        onSuccess: (result) => {
            void queryClient.invalidateQueries({ queryKey: ['debts', groupId] })
            void queryClient.invalidateQueries({ queryKey: ['debts-summary', groupId] })
            success('Reparto creado', `Se generaron ${result.length} deudas.`)
            onClose()
        },
        onError: () => toastError('Error', 'No se pudo crear el reparto.'),
    })

    const addParticipant = () => {
        setParticipants((prev) => [...prev, { userId: '', percentage: 0, exactAmount: 0 }])
    }

    const removeParticipant = (index: number) => {
        setParticipants((prev) => prev.filter((_, idx) => idx !== index))
    }

    const updateParticipant = (index: number, patch: Partial<ParticipantDraft>) => {
        setParticipants((prev) =>
            prev.map((item, idx) => (idx === index ? { ...item, ...patch } : item))
        )
    }

    return (
        <div className="fixed inset-0 z-50 flex items-end justify-center overflow-y-auto p-0 sm:items-center sm:p-4">
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
            <div className="relative my-auto w-full sm:max-w-2xl card rounded-t-2xl sm:rounded-2xl p-6 animate-slide-up max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between mb-5">
                    <div className="flex items-center gap-2">
                        <Calculator className="w-5 h-5 text-brand-300" />
                        <h2 className="text-lg font-bold text-white">Calculadora de reparto</h2>
                    </div>
                    <button onClick={onClose} className="btn-ghost p-2 rounded-xl">
                        <X className="w-4 h-4" />
                    </button>
                </div>

                <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div className="md:col-span-2">
                            <label className="label">Concepto</label>
                            <input
                                value={concept}
                                onChange={(event) => setConcept(event.target.value)}
                                className="input"
                                placeholder="Ej: Cena del grupo"
                            />
                        </div>
                        <div>
                            <label className="label">Moneda</label>
                            <select
                                value={currency}
                                onChange={(event) => setCurrency(event.target.value as DebtCurrency)}
                                className="input"
                            >
                                {CURRENCIES.map((option) => (
                                    <option key={option.value} value={option.value}>
                                        {option.label}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                            <label className="label">Total</label>
                            <input
                                type="number"
                                min="0.01"
                                step="0.01"
                                value={totalAmount || ''}
                                onChange={(event) => setTotalAmount(Number(event.target.value || 0))}
                                className="input"
                                placeholder="0.00"
                            />
                        </div>
                        <div>
                            <label className="label">Modo de reparto</label>
                            <div className="grid grid-cols-3 gap-2">
                                <ModeButton
                                    active={mode === 'equal'}
                                    label="Igual"
                                    icon={<Equal className="w-3.5 h-3.5" />}
                                    onClick={() => setMode('equal')}
                                />
                                <ModeButton
                                    active={mode === 'percentage'}
                                    label="%"
                                    icon={<Percent className="w-3.5 h-3.5" />}
                                    onClick={() => setMode('percentage')}
                                />
                                <ModeButton
                                    active={mode === 'exact'}
                                    label="Exacto"
                                    icon={<Calculator className="w-3.5 h-3.5" />}
                                    onClick={() => setMode('exact')}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="rounded-xl border border-surface-500 bg-surface-700/40 p-3 space-y-3">
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-semibold text-white">Participantes</p>
                            <button type="button" onClick={addParticipant} className="btn-secondary px-3 py-1.5 text-xs">
                                Anadir
                            </button>
                        </div>

                        {participants.length === 0 ? (
                            <p className="text-sm text-gray-400">Anade miembros para repartir la deuda.</p>
                        ) : (
                            <div className="space-y-2">
                                {participants.map((item, index) => (
                                    <div key={`participant-${index}`} className="grid grid-cols-12 gap-2">
                                        <select
                                            value={item.userId}
                                            onChange={(event) => updateParticipant(index, { userId: event.target.value })}
                                            className="input col-span-6"
                                        >
                                            <option value="">Selecciona miembro</option>
                                            {eligibleMembers.map((member) => (
                                                <option key={member.user_id} value={member.user_id}>
                                                    {member.profile?.display_name ?? member.user_id}
                                                </option>
                                            ))}
                                        </select>

                                        {mode === 'percentage' ? (
                                            <input
                                                type="number"
                                                min="0"
                                                max="100"
                                                step="0.1"
                                                value={item.percentage || ''}
                                                onChange={(event) => updateParticipant(index, { percentage: Number(event.target.value || 0) })}
                                                className="input col-span-4"
                                                placeholder="%"
                                            />
                                        ) : mode === 'exact' ? (
                                            <input
                                                type="number"
                                                min="0"
                                                step="0.01"
                                                value={item.exactAmount || ''}
                                                onChange={(event) => updateParticipant(index, { exactAmount: Number(event.target.value || 0) })}
                                                className="input col-span-4"
                                                placeholder="Importe"
                                            />
                                        ) : (
                                            <div className="col-span-4 rounded-xl border border-surface-500 bg-surface-800 px-3 py-2 text-sm text-gray-300">
                                                Auto
                                            </div>
                                        )}

                                        <button
                                            type="button"
                                            onClick={() => removeParticipant(index)}
                                            className="btn-ghost col-span-2"
                                        >
                                            Quitar
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <PreviewShares
                        members={eligibleMembers}
                        shares={previewShares}
                        currency={currency}
                    />

                    <button
                        type="button"
                        onClick={() => createSplitMutation.mutate()}
                        className="btn-primary w-full py-3"
                        disabled={
                            createSplitMutation.isPending ||
                            !groupId ||
                            !userId ||
                            totalAmount <= 0 ||
                            selectedParticipants.length === 0
                        }
                    >
                        {createSplitMutation.isPending ? 'Creando reparto...' : 'Crear deudas de reparto'}
                    </button>
                </div>
            </div>
        </div>
    )
}

const PreviewShares: React.FC<{
    members: GroupMember[]
    shares: Array<{ debtorId: string; amount: number }>
    currency: DebtCurrency
}> = ({ members, shares, currency }) => {
    if (shares.length === 0) return null

    return (
        <div className="rounded-xl border border-surface-500 bg-surface-700/50 p-3">
            <p className="text-sm font-semibold text-white mb-2">Vista previa</p>
            <div className="space-y-1.5 text-sm">
                {shares.map((share) => (
                    <div key={share.debtorId} className="flex items-center justify-between text-gray-200">
                        <span>{members.find((member) => member.user_id === share.debtorId)?.profile?.display_name ?? share.debtorId}</span>
                        <span>{share.amount.toFixed(2)} {currency}</span>
                    </div>
                ))}
            </div>
        </div>
    )
}

const ModeButton: React.FC<{
    active: boolean
    label: string
    icon: React.ReactNode
    onClick: () => void
}> = ({ active, label, icon, onClick }) => (
    <button
        type="button"
        onClick={onClick}
        className={`inline-flex items-center justify-center gap-1.5 rounded-xl border px-2 py-2 text-xs transition-colors ${
            active
                ? 'bg-brand-500/20 border-brand-400/50 text-brand-100'
                : 'bg-surface-700 border-surface-500 text-gray-300'
        }`}
    >
        {icon}
        {label}
    </button>
)
