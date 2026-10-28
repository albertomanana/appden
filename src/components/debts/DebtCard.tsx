import React from 'react'
import { Link } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import { Avatar } from '@components/common/Avatar'
import { useAuth } from '@hooks/useAuth'
import { DEBT_STATUS_LABELS, ROUTES } from '@lib/constants'
import { cn, formatMoney, formatRelative, getDebtProgress } from '@lib/utils'
import type { Debt } from '@/types'

interface DebtCardProps {
    debt: Debt
}

const statusClasses = {
    pending: 'badge-red',
    partial: 'badge-amber',
    paid: 'badge-green',
}

/** Debt row written from the viewer's perspective ("Debes a…" / "… te debe"). */
export const DebtCard: React.FC<DebtCardProps> = ({ debt }) => {
    const { userId } = useAuth()
    const progress = getDebtProgress(debt.amount, debt.amount_paid)
    const remaining = Math.max(debt.amount - debt.amount_paid, 0)
    const iOwe = debt.debtor_id === userId
    const owedToMe = debt.creditor_id === userId
    const counterpart = iOwe ? debt.creditor : debt.debtor
    const isPaid = debt.status === 'paid'

    const headline = iOwe
        ? `Debes a ${debt.creditor?.display_name ?? 'alguien'}`
        : owedToMe
          ? `${debt.debtor?.display_name ?? 'Alguien'} te debe`
          : `${debt.debtor?.display_name ?? '?'} → ${debt.creditor?.display_name ?? '?'}`

    return (
        <Link to={ROUTES.DEBT(debt.id)} className="card-interactive flex items-center gap-3 p-3.5">
            <Avatar src={counterpart?.avatar_url} name={counterpart?.display_name} size="md" />

            <div className="min-w-0 flex-1">
                <p className="truncate text-[15px] font-semibold text-white">{debt.concept}</p>
                <p className="truncate text-[13px] text-gray-400">
                    {headline}
                    <span className="text-gray-600"> · {formatRelative(debt.created_at)}</span>
                </p>
                {!isPaid && debt.amount_paid > 0 ? (
                    <div className="mt-2 h-1 overflow-hidden rounded-full bg-white/[0.08]">
                        <div className="h-full rounded-full bg-amber-300" style={{ width: `${progress}%` }} />
                    </div>
                ) : null}
            </div>

            <div className="shrink-0 text-right">
                <p
                    className={cn(
                        'font-headline text-[17px] font-extrabold tabular',
                        isPaid ? 'text-gray-500 line-through decoration-1' : iOwe ? 'text-red-300' : owedToMe ? 'text-emerald-300' : 'text-white'
                    )}
                >
                    {formatMoney(isPaid ? debt.amount : remaining, debt.currency)}
                </p>
                <span className={cn(statusClasses[debt.status], '!px-2 !py-0.5 text-[11px]')}>{DEBT_STATUS_LABELS[debt.status]}</span>
            </div>
            <ChevronRight className="-mr-1 h-4 w-4 shrink-0 text-gray-600" />
        </Link>
    )
}
