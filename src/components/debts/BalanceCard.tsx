import React from 'react'
import { motion } from 'framer-motion'
import { ArrowDownLeft, ArrowUpRight, Calculator, Scale } from 'lucide-react'
import { Avatar } from '@components/common/Avatar'
import { Skeleton } from '@components/ui/LoadingSkeleton'
import { centsToAmount } from '@features/debts/split'
import type { MyBalance } from '@features/debts/balances'
import { cn, formatMoney } from '@lib/utils'

interface BalanceCardProps {
    balances: MyBalance[]
    isLoading?: boolean
    onSplit?: () => void
    /** Show the per-person breakdown (Cuentas page). */
    showPeople?: boolean
}

const money = (cents: number, currency: string) => formatMoney(centsToAmount(cents), currency)

function firstName(name: string | null | undefined): string {
    return name?.split(' ')[0] ?? 'Alguien'
}

/** "Tu balance" card: net amount explained in words, owed/owing tiles and net per person. */
export const BalanceCard: React.FC<BalanceCardProps> = ({ balances, isLoading = false, onSplit, showPeople = true }) => {
    const main = balances[0]
    const others = balances.slice(1)
    const net = main?.netCents ?? 0
    const currency = main?.currency ?? 'EUR'

    const sentence =
        !main || (main.owedToMeCents === 0 && main.iOweCents === 0)
            ? 'Estás en paz con todo el grupo.'
            : net > 0
              ? `En total te deben ${money(net, currency)} más de lo que debes.`
              : net < 0
                ? `En total debes ${money(-net, currency)} más de lo que te deben.`
                : 'Lo que debes y lo que te deben se compensa.'

    return (
        <section className="card overflow-hidden">
            <div className="relative p-5">
                <div
                    className={cn(
                        'pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full blur-3xl transition-colors duration-700',
                        net > 0 ? 'bg-emerald-400/15' : net < 0 ? 'bg-red-400/15' : 'bg-brand-400/10'
                    )}
                />
                <p className="relative flex items-center gap-1.5 text-sm font-medium text-gray-400">
                    <Scale className="h-4 w-4" />
                    Tu balance
                </p>
                {isLoading ? (
                    <Skeleton className="mt-2 h-10 w-44" />
                ) : (
                    <motion.p
                        key={`${currency}-${net}`}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={cn(
                            'relative mt-1 font-headline text-4xl font-extrabold tabular leading-tight',
                            net > 0 ? 'text-emerald-300' : net < 0 ? 'text-red-300' : 'text-white'
                        )}
                    >
                        {net > 0 ? '+' : net < 0 ? '−' : ''}
                        {money(Math.abs(net), currency)}
                    </motion.p>
                )}
                <p className="relative mt-1 text-sm text-gray-400">{isLoading ? ' ' : sentence}</p>

                <div className="relative mt-4 grid grid-cols-2 gap-2">
                    <div className="rounded-2xl bg-emerald-400/[0.08] px-3.5 py-3">
                        <p className="flex items-center gap-1 text-xs font-medium text-emerald-200/80">
                            <ArrowDownLeft className="h-3.5 w-3.5" />
                            Te deben
                        </p>
                        <p className="mt-0.5 text-lg font-bold tabular text-emerald-200">{money(main?.owedToMeCents ?? 0, currency)}</p>
                    </div>
                    <div className="rounded-2xl bg-red-400/[0.08] px-3.5 py-3">
                        <p className="flex items-center gap-1 text-xs font-medium text-red-200/80">
                            <ArrowUpRight className="h-3.5 w-3.5" />
                            Debes
                        </p>
                        <p className="mt-0.5 text-lg font-bold tabular text-red-200">{money(main?.iOweCents ?? 0, currency)}</p>
                    </div>
                </div>

                {others.length > 0 ? (
                    <p className="relative mt-3 text-xs text-gray-500">
                        Otras monedas:{' '}
                        {others.map((balance) => `${balance.netCents > 0 ? '+' : balance.netCents < 0 ? '−' : ''}${money(Math.abs(balance.netCents), balance.currency)}`).join(' · ')}
                    </p>
                ) : null}

                {onSplit ? (
                    <button type="button" onClick={onSplit} className="btn-secondary relative mt-3 w-full">
                        <Calculator className="h-4 w-4" />
                        Repartir un gasto entre varios
                    </button>
                ) : null}
            </div>

            {showPeople && main && main.people.length > 0 ? (
                <div className="border-t border-white/[0.06]">
                    <p className="px-5 pb-1 pt-3 text-xs font-semibold uppercase tracking-[0.14em] text-gray-500">Con cada persona</p>
                    <ul className="pb-2">
                        {main.people.map((person) => (
                            <li key={person.personId} className="flex items-center gap-3 px-5 py-2.5">
                                <Avatar src={person.profile?.avatar_url} name={person.profile?.display_name} size="sm" />
                                <span className="min-w-0 flex-1 truncate text-[15px] text-gray-200">
                                    {person.netCents > 0
                                        ? `${firstName(person.profile?.display_name)} te debe`
                                        : `Le debes a ${firstName(person.profile?.display_name)}`}
                                </span>
                                <span className={cn('shrink-0 font-bold tabular', person.netCents > 0 ? 'text-emerald-300' : 'text-red-300')}>
                                    {money(Math.abs(person.netCents), currency)}
                                </span>
                            </li>
                        ))}
                    </ul>
                </div>
            ) : null}
        </section>
    )
}
