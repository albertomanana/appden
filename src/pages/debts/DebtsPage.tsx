import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Plus, CreditCard } from 'lucide-react'
import { useAuth } from '@hooks/useAuth'
import { useActiveGroup } from '@hooks/useActiveGroup'
import { debtsService } from '@services/debts.service'
import { groupsService } from '@services/groups.service'
import { DebtCard } from '@components/debts/DebtCard'
import { DebtForm } from '@components/debts/DebtForm'
import { DebtSummary } from '@components/debts/DebtSummary'
import { DebtSplitCalculator } from '@components/debts/DebtSplitCalculator'
import { DebtInsightsPanel } from '@components/debts/DebtInsightsPanel'
import { DebtGoalsAndBadgesPanel } from '@components/debts/DebtGoalsAndBadgesPanel'
import { EmptyState } from '@components/ui/EmptyState'
import { DebtCardSkeleton, ListSkeleton } from '@components/ui/LoadingSkeleton'

const DebtsPage: React.FC = () => {
    const { userId } = useAuth()
    const { groupId, hasGroup } = useActiveGroup()
    const [showForm, setShowForm] = useState(false)
    const [showSplitCalculator, setShowSplitCalculator] = useState(false)

    const { data: debts, isLoading } = useQuery({
        queryKey: ['debts', groupId],
        queryFn: () => debtsService.getDebts(groupId!),
        enabled: !!groupId,
    })

    const { data: summary } = useQuery({
        queryKey: ['debts-summary', groupId],
        queryFn: () => debtsService.getGroupSummary(groupId!),
        enabled: !!groupId,
    })

    const { data: members } = useQuery({
        queryKey: ['members', groupId],
        queryFn: () => groupsService.getGroupMembers(groupId!),
        enabled: !!groupId,
    })

    return (
        <div className="p-4 md:p-6 space-y-5 animate-fade-in">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="section-title">Deudas</h1>
                    {debts && <p className="text-sm text-muted mt-0.5">{debts.length} registros</p>}
                </div>
                <button
                    onClick={() => setShowForm(true)}
                    className="btn-primary"
                    disabled={!hasGroup}
                    aria-label="Nueva deuda"
                >
                    <Plus className="w-4 h-4" />
                    <span className="hidden sm:inline">Nueva</span>
                </button>
            </div>

            <div className="flex flex-wrap items-center gap-2">
                <button
                    type="button"
                    onClick={() => setShowSplitCalculator(true)}
                    className="btn-secondary px-3 py-2 text-xs"
                    disabled={!hasGroup}
                >
                    Calculadora reparto
                </button>
            </div>

            {/* Summary */}
            {summary && userId && (
                <DebtSummary summary={summary} currentUserId={userId} />
            )}

            {/* Debt list */}
            {isLoading ? (
                <ListSkeleton count={3} item={<DebtCardSkeleton />} />
            ) : !debts || debts.length === 0 ? (
                <EmptyState
                    icon={<CreditCard className="w-7 h-7" />}
                    title="Sin deudas registradas"
                    description="Registra deudas entre el grupo para llevar un control claro."
                    action={
                        hasGroup ? (
                            <button onClick={() => setShowForm(true)} className="btn-primary">
                                <Plus className="w-4 h-4" />
                                Crear primera deuda
                            </button>
                        ) : undefined
                    }
                />
            ) : (
                <div className="space-y-3">
                    {debts.map((debt) => (
                        <DebtCard key={debt.id} debt={debt} />
                    ))}
                </div>
            )}

            {groupId && members ? (
                <DebtInsightsPanel groupId={groupId} members={members} />
            ) : null}

            {groupId && members ? (
                <DebtGoalsAndBadgesPanel groupId={groupId} members={members} />
            ) : null}

            {/* Create debt modal */}
            {showForm && <DebtForm onClose={() => setShowForm(false)} />}
            {showSplitCalculator && <DebtSplitCalculator onClose={() => setShowSplitCalculator(false)} />}
        </div>
    )
}

export default DebtsPage
