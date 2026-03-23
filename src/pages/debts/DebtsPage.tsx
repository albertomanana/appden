import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Calculator, CreditCard, Plus, Sparkles } from 'lucide-react'
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
import { PageHeader } from '@components/ui/PageHeader'

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
        <div className="page-shell animate-fade-in">
            <PageHeader
                kicker="Shared Finance"
                title="Deudas"
                description="Control de balance, reparto y seguimiento entre miembros del grupo sin perder el contexto social de la app."
                meta={
                    <>
                        <span className="hero-meta-pill">{debts?.length ?? 0} registros</span>
                        <span className="hero-meta-pill">{hasGroup ? 'Grupo activo' : 'Sin grupo activo'}</span>
                    </>
                }
                actions={
                    <>
                        <button
                            type="button"
                            onClick={() => setShowSplitCalculator(true)}
                            className="btn-secondary"
                            disabled={!hasGroup}
                        >
                            <Calculator className="w-4 h-4" />
                            Reparto
                        </button>
                        <button onClick={() => setShowForm(true)} className="btn-primary" disabled={!hasGroup} aria-label="Nueva deuda">
                            <Plus className="w-4 h-4" />
                            Nueva deuda
                        </button>
                    </>
                }
            />

            {summary && userId ? <DebtSummary summary={summary} currentUserId={userId} /> : null}

            {isLoading ? (
                <ListSkeleton count={3} item={<DebtCardSkeleton />} />
            ) : !debts || debts.length === 0 ? (
                <EmptyState
                    icon={<CreditCard className="w-7 h-7" />}
                    title="Sin deudas registradas"
                    description="Cuando registres movimientos dentro del grupo apareceran aqui con mejor contexto y progreso visual."
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
                <section className="space-y-3">
                    <div className="flex items-center justify-between gap-3">
                        <div>
                            <p className="page-kicker">Open Ledger</p>
                            <h2 className="mt-2 text-2xl font-headline font-extrabold text-white">Movimientos del grupo</h2>
                        </div>
                        <span className="hero-meta-pill">
                            <Sparkles className="w-3.5 h-3.5 text-brand-400" />
                            Seguimiento premium
                        </span>
                    </div>
                    <div className="space-y-3">
                        {debts.map((debt) => (
                            <DebtCard key={debt.id} debt={debt} />
                        ))}
                    </div>
                </section>
            )}

            {groupId && members ? <DebtInsightsPanel groupId={groupId} members={members} /> : null}
            {groupId && members ? <DebtGoalsAndBadgesPanel groupId={groupId} members={members} /> : null}

            {showForm ? <DebtForm onClose={() => setShowForm(false)} /> : null}
            {showSplitCalculator ? <DebtSplitCalculator onClose={() => setShowSplitCalculator(false)} /> : null}
        </div>
    )
}

export default DebtsPage
