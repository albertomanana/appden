import React from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { Avatar } from '@components/common/Avatar'
import { DEBT_STATUS_LABELS, ROUTES } from '@lib/constants'
import { formatMoney, formatRelative, getDebtProgress } from '@lib/utils'
import type { Debt } from '@/types'

interface DebtCardProps {
    debt: Debt
}

const statusClasses = {
    pending: 'badge bg-red-400/14 text-red-200 border border-red-300/20',
    partial: 'badge bg-amber-400/14 text-amber-200 border border-amber-300/20',
    paid: 'badge bg-emerald-400/14 text-emerald-200 border border-emerald-300/20',
}

export const DebtCard: React.FC<DebtCardProps> = ({ debt }) => {
    const progress = getDebtProgress(debt.amount, debt.amount_paid)

    return (
        <Link to={ROUTES.DEBT(debt.id)} className="card-interactive block p-5">
            <div className="flex items-start gap-4">
                <Avatar src={debt.debtor?.avatar_url} name={debt.debtor?.display_name} size="sm" />

                <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                            <p className="truncate text-base font-semibold text-white">{debt.concept}</p>
                            <div className="mt-1 flex items-center gap-1.5 text-xs uppercase tracking-[0.18em] text-gray-500">
                                <span className="truncate">{debt.debtor?.display_name}</span>
                                <ArrowRight className="h-3 w-3 shrink-0" />
                                <span className="truncate">{debt.creditor?.display_name}</span>
                            </div>
                        </div>

                        <div className="shrink-0 text-right">
                            <p className="text-lg font-headline font-extrabold text-white">{formatMoney(debt.amount, debt.currency)}</p>
                            <span className={statusClasses[debt.status]}>{DEBT_STATUS_LABELS[debt.status]}</span>
                        </div>
                    </div>

                    {debt.status !== 'paid' && debt.amount_paid > 0 ? (
                        <div className="mt-4">
                            <div className="progress-bar h-2 bg-white/8">
                                <div className="progress-fill h-full rounded-full" style={{ width: `${progress}%` }} />
                            </div>
                            <p className="mt-2 text-xs text-gray-500">
                                Pagado {formatMoney(debt.amount_paid, debt.currency)} ({progress}%)
                            </p>
                        </div>
                    ) : null}

                    <div className="mt-4 flex items-center justify-between gap-3">
                        <span className="hero-meta-pill !px-3 !py-1">{formatRelative(debt.created_at)}</span>
                        <span className="text-[11px] uppercase tracking-[0.22em] text-gray-500">Open detail</span>
                    </div>
                </div>
            </div>
        </Link>
    )
}
