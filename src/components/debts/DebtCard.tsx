import React from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { Avatar } from '@components/common/Avatar'
import { formatMoney, formatRelative, cn } from '@lib/utils'
import { DEBT_STATUS_LABELS } from '@lib/constants'
import { ROUTES } from '@lib/constants'
import type { Debt } from '@/types'
import { getDebtProgress } from '@lib/utils'

interface DebtCardProps {
    debt: Debt
}

const statusColors = {
    pending: 'badge-red',
    partial: 'badge-amber',
    paid: 'badge-green',
}

export const DebtCard: React.FC<DebtCardProps> = ({ debt }) => {
    const progress = getDebtProgress(debt.amount, debt.amount_paid)

    return (
        <Link to={ROUTES.DEBT(debt.id)} className="card-interactive block p-4">
            <div className="flex items-start gap-3">
                {/* Debtor avatar */}
                <Avatar src={debt.debtor?.avatar_url} name={debt.debtor?.display_name} size="sm" />

                <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                            <p className="text-sm font-semibold text-white truncate">{debt.concept}</p>
                            <div className="flex items-center gap-1.5 mt-0.5 text-xs text-gray-400">
                                <span>{debt.debtor?.display_name}</span>
                                <ArrowRight className="w-3 h-3" />
                                <span>{debt.creditor?.display_name}</span>
                            </div>
                        </div>
                        <div className="flex flex-col items-end gap-1 flex-shrink-0">
                            <p className="text-sm font-bold text-white">
                                {formatMoney(debt.amount, debt.currency)}
                            </p>
                            <span className={statusColors[debt.status]}>
                                {DEBT_STATUS_LABELS[debt.status]}
                            </span>
                        </div>
                    </div>

                    {/* Progress bar */}
                    {debt.status !== 'paid' && debt.amount_paid > 0 && (
                        <div className="mt-2.5">
                            <div className="progress-bar">
                                <div className="progress-fill" style={{ width: `${progress}%` }} />
                            </div>
                            <p className="text-xs text-gray-500 mt-1">
                                Pagado {formatMoney(debt.amount_paid, debt.currency)} ({progress}%)
                            </p>
                        </div>
                    )}

                    <p className="text-xs text-gray-500 mt-1.5">{formatRelative(debt.created_at)}</p>
                </div>
            </div>
        </Link>
    )
}
