import React, { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Award, Plus, Trophy } from 'lucide-react'
import { debtProService } from '@services/debt-pro.service'
import { useAuth } from '@hooks/useAuth'
import { useToast } from '@components/ui/Toast'
import type { GroupGoalType, GroupMember } from '@/types'

interface DebtGoalsAndBadgesPanelProps {
    groupId: string
    members: GroupMember[]
}

export const DebtGoalsAndBadgesPanel: React.FC<DebtGoalsAndBadgesPanelProps> = ({ groupId, members }) => {
    const { userId } = useAuth()
    const { success, error: toastError } = useToast()
    const queryClient = useQueryClient()

    const [goalTitle, setGoalTitle] = useState('')
    const [targetValue, setTargetValue] = useState<number>(0)
    const [targetType, setTargetType] = useState<GroupGoalType>('debt_reduction')

    const { data: goals } = useQuery({
        queryKey: ['debt-goals', groupId],
        queryFn: () => debtProService.listGoals(groupId),
        enabled: !!groupId,
    })

    const { data: badges } = useQuery({
        queryKey: ['debt-badges', groupId],
        queryFn: () => debtProService.listBadges(groupId),
        enabled: !!groupId,
    })

    const createGoalMutation = useMutation({
        mutationFn: () => debtProService.createGoal({
            groupId,
            createdBy: userId!,
            title: goalTitle,
            targetType,
            targetValue,
        }),
        onSuccess: () => {
            setGoalTitle('')
            setTargetValue(0)
            void queryClient.invalidateQueries({ queryKey: ['debt-goals', groupId] })
            success('Objetivo creado')
        },
        onError: () => toastError('Error', 'No se pudo crear el objetivo.'),
    })

    const recomputeBadgesMutation = useMutation({
        mutationFn: () => debtProService.recomputeBadges(groupId),
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: ['debt-badges', groupId] })
            success('Insignias actualizadas')
        },
        onError: () => toastError('Error', 'No se pudieron calcular insignias.'),
    })

    const badgesByUser = useMemo(() => {
        const map = new Map<string, string[]>()
        for (const badge of badges ?? []) {
            const current = map.get(badge.user_id) ?? []
            current.push(badge.badge_label)
            map.set(badge.user_id, current)
        }
        return map
    }, [badges])

    return (
        <section className="space-y-3">
            <div className="card p-3 space-y-3">
                <p className="text-sm font-semibold text-white inline-flex items-center gap-2">
                    <Trophy className="w-4 h-4 text-amber-300" /> Objetivos grupales
                </p>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
                    <input
                        value={goalTitle}
                        onChange={(event) => setGoalTitle(event.target.value)}
                        className="input md:col-span-2"
                        placeholder='Ej: Cerrar deudas del mes'
                    />
                    <select
                        value={targetType}
                        onChange={(event) => setTargetType(event.target.value as GroupGoalType)}
                        className="input"
                    >
                        <option value="debt_reduction">Reducir deuda</option>
                        <option value="zero_overdue">Cero vencidas</option>
                        <option value="custom">Custom</option>
                    </select>
                    <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={targetValue || ''}
                        onChange={(event) => setTargetValue(Number(event.target.value || 0))}
                        className="input"
                        placeholder="Meta"
                    />
                </div>

                <button
                    type="button"
                    onClick={() => createGoalMutation.mutate()}
                    className="btn-secondary px-3 py-2 text-xs"
                    disabled={!userId || !goalTitle.trim() || targetValue <= 0 || createGoalMutation.isPending}
                >
                    <Plus className="w-3.5 h-3.5" /> Crear objetivo
                </button>

                {(goals ?? []).length > 0 ? (
                    <div className="space-y-2">
                        {(goals ?? []).map((goal) => {
                            const progress = goal.target_value > 0
                                ? Math.min(100, Math.round((goal.current_value / goal.target_value) * 100))
                                : 0

                            return (
                                <div key={goal.id} className="rounded-xl border border-surface-500 bg-surface-700/40 p-2.5">
                                    <div className="flex items-center justify-between gap-2">
                                        <p className="text-sm text-white">{goal.title}</p>
                                        <span className="text-xs text-gray-400">{progress}%</span>
                                    </div>
                                    <div className="progress-bar mt-2">
                                        <div className="progress-fill" style={{ width: `${progress}%` }} />
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                ) : (
                    <p className="text-sm text-gray-400">Aun no hay objetivos activos.</p>
                )}
            </div>

            <div className="card p-3 space-y-3">
                <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-white inline-flex items-center gap-2">
                        <Award className="w-4 h-4 text-brand-300" /> Insignias
                    </p>
                    <button
                        type="button"
                        onClick={() => recomputeBadgesMutation.mutate()}
                        className="btn-secondary px-3 py-1.5 text-xs"
                        disabled={recomputeBadgesMutation.isPending}
                    >
                        Recalcular
                    </button>
                </div>

                <div className="space-y-2">
                    {members.map((member) => {
                        const labels = badgesByUser.get(member.user_id) ?? []
                        return (
                            <div key={member.user_id} className="rounded-xl border border-surface-500 bg-surface-700/40 p-2.5">
                                <p className="text-sm text-white">{member.profile?.display_name ?? member.user_id}</p>
                                <p className="text-xs text-gray-400 mt-1">
                                    {labels.length > 0 ? labels.join(' · ') : 'Sin insignias aun'}
                                </p>
                            </div>
                        )
                    })}
                </div>
            </div>
        </section>
    )
}
