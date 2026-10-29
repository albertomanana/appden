import React, { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { BarChart3, ChevronDown, Plus, Trophy, Wallet } from 'lucide-react'
import { useAuth } from '@hooks/useAuth'
import { useActiveGroup } from '@hooks/useActiveGroup'
import { debtsService } from '@services/debts.service'
import { groupsService } from '@services/groups.service'
import { BalanceCard } from '@components/debts/BalanceCard'
import { DebtCard } from '@components/debts/DebtCard'
import { computeMyBalances } from '@features/debts/balances'
import { DebtForm } from '@components/debts/DebtForm'
import { DebtSplitCalculator } from '@components/debts/DebtSplitCalculator'
import { DebtInsightsPanel } from '@components/debts/DebtInsightsPanel'
import { DebtGoalsAndBadgesPanel } from '@components/debts/DebtGoalsAndBadgesPanel'
import { EmptyState } from '@components/ui/EmptyState'
import { ErrorNotice } from '@components/ui/ErrorNotice'
import { DebtCardSkeleton, ListSkeleton } from '@components/ui/LoadingSkeleton'
import { PageHeader } from '@components/ui/PageHeader'
import { Tabs } from '@components/ui/Tabs'
import { cn } from '@lib/utils'

type Filter = 'open' | 'mine' | 'paid' | 'all'

const DebtsPage: React.FC = () => {
    const { userId } = useAuth()
    const { groupId, hasGroup, activeGroup } = useActiveGroup()
    const [searchParams, setSearchParams] = useSearchParams()
    const [showForm, setShowForm] = useState(searchParams.get('nueva') === '1')
    const [showSplitCalculator, setShowSplitCalculator] = useState(false)
    const [filter, setFilter] = useState<Filter>('open')

    const { data: debts, isLoading, error, refetch } = useQuery({
        queryKey: ['debts', groupId],
        queryFn: () => debtsService.getDebts(groupId!),
        enabled: !!groupId,
    })


    const { data: members } = useQuery({
        queryKey: ['members', groupId],
        queryFn: () => groupsService.getGroupMembers(groupId!),
        enabled: !!groupId,
    })

    const counts = useMemo(() => {
        const list = debts ?? []
        return {
            open: list.filter((debt) => debt.status !== 'paid').length,
            mine: list.filter((debt) => debt.status !== 'paid' && (debt.debtor_id === userId || debt.creditor_id === userId)).length,
        }
    }, [debts, userId])

    const visible = useMemo(() => {
        const list = debts ?? []
        switch (filter) {
            case 'open':
                return list.filter((debt) => debt.status !== 'paid')
            case 'mine':
                return list.filter((debt) => debt.status !== 'paid' && (debt.debtor_id === userId || debt.creditor_id === userId))
            case 'paid':
                return list.filter((debt) => debt.status === 'paid')
            default:
                return list
        }
    }, [debts, filter, userId])

    const closeForm = () => {
        setShowForm(false)
        if (searchParams.has('nueva')) {
            searchParams.delete('nueva')
            setSearchParams(searchParams, { replace: true })
        }
    }

    // Same list as the cards below: the balance can never disagree with what is shown.
    const balances = useMemo(() => computeMyBalances(debts ?? [], userId), [debts, userId])

    return (
        <div className="page-shell animate-fade-in">
            <PageHeader
                title="Cuentas"
                description={activeGroup ? `Gastos y deudas de ${activeGroup.name}` : undefined}
                actions={
                    <button onClick={() => setShowForm(true)} className="btn-primary !px-4" disabled={!hasGroup} aria-label="Nueva deuda">
                        <Plus className="h-4 w-4" />
                        Nueva
                    </button>
                }
            />

            {!hasGroup ? (
                <EmptyState
                    icon={<Wallet className="h-6 w-6" />}
                    title="Sin grupo activo"
                    description="Las cuentas se llevan dentro de un grupo. Elige uno arriba o crea uno nuevo."
                />
            ) : (
                <>
                    <BalanceCard balances={balances} isLoading={isLoading} onSplit={() => setShowSplitCalculator(true)} />

                    <Tabs
                        active={filter}
                        onChange={(value) => setFilter(value as Filter)}
                        items={[
                            { label: 'Pendientes', value: 'open', badge: counts.open || undefined },
                            { label: 'Conmigo', value: 'mine', badge: counts.mine || undefined },
                            { label: 'Pagadas', value: 'paid' },
                            { label: 'Todas', value: 'all' },
                        ]}
                    />

                    {isLoading ? (
                        <ListSkeleton count={3} item={<DebtCardSkeleton />} />
                    ) : error ? (
                        <ErrorNotice title="No pudimos cargar las cuentas" error={error} onRetry={() => void refetch()} />
                    ) : visible.length === 0 ? (
                        <EmptyState
                            icon={<Wallet className="h-6 w-6" />}
                            title={(debts ?? []).length === 0 ? 'Sin deudas registradas' : filter === 'paid' ? 'Nada saldado todavía' : '¡Todo en orden!'}
                            description={
                                (debts ?? []).length === 0
                                    ? 'Apunta quién pagó qué y la app calculará los balances por ti.'
                                    : filter === 'paid'
                                      ? 'Cuando se salde una deuda aparecerá aquí.'
                                      : 'No hay deudas pendientes en este filtro.'
                            }
                            action={
                                (debts ?? []).length === 0 ? (
                                    <button onClick={() => setShowForm(true)} className="btn-primary">
                                        <Plus className="h-4 w-4" />
                                        Apuntar la primera
                                    </button>
                                ) : undefined
                            }
                        />
                    ) : (
                        <div className="stagger space-y-2">
                            {visible.map((debt) => (
                                <DebtCard key={debt.id} debt={debt} />
                            ))}
                        </div>
                    )}

                    {groupId && members ? (
                        <div className="space-y-3">
                            <Collapsible icon={BarChart3} title="Liquidación y estadísticas" description="Quién paga a quién para cerrar cuentas, resumen mensual y exportación.">
                                <DebtInsightsPanel groupId={groupId} members={members} />
                            </Collapsible>
                            <Collapsible icon={Trophy} title="Objetivos e insignias" description="Metas del grupo y logros de cada miembro.">
                                <DebtGoalsAndBadgesPanel groupId={groupId} members={members} />
                            </Collapsible>
                        </div>
                    ) : null}
                </>
            )}

            {showForm ? <DebtForm onClose={closeForm} /> : null}
            {showSplitCalculator ? <DebtSplitCalculator onClose={() => setShowSplitCalculator(false)} /> : null}
        </div>
    )
}

const Collapsible: React.FC<{
    icon: React.ComponentType<{ className?: string }>
    title: string
    description: string
    children: React.ReactNode
}> = ({ icon: Icon, title, description, children }) => {
    const [open, setOpen] = useState(false)
    return (
        <section className="card overflow-hidden">
            <button type="button" onClick={() => setOpen((value) => !value)} className="list-row" aria-expanded={open}>
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white/[0.06] text-gray-300">
                    <Icon className="h-5 w-5" />
                </span>
                <span className="min-w-0 flex-1">
                    <span className="block text-[15px] font-semibold text-white">{title}</span>
                    <span className="block text-xs text-gray-400">{description}</span>
                </span>
                <ChevronDown className={cn('h-5 w-5 shrink-0 text-gray-500 transition-transform', open && 'rotate-180')} />
            </button>
            {open ? <div className="border-t border-white/[0.06] p-3">{children}</div> : null}
        </section>
    )
}

export default DebtsPage
