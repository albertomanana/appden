import React from 'react'
import { formatMoney } from '@lib/utils'

interface DebtSummaryProps {
    summary: Record<string, { owed: number; lent: number }>
    currentUserId: string
}

export const DebtSummary: React.FC<DebtSummaryProps> = ({ summary, currentUserId }) => {
    const me = summary[currentUserId]
    if (!me) return null

    const balance = me.lent - me.owed

    return (
        <div className="grid grid-cols-3 gap-3">
            <div className="card p-3 text-center">
                <p className="text-xs text-gray-400 mb-1">Debes</p>
                <p className="text-lg font-bold text-red-400">{formatMoney(me.owed)}</p>
            </div>
            <div className="card p-3 text-center border-surface-400">
                <p className="text-xs text-gray-400 mb-1">Balance</p>
                <p className={`text-lg font-bold ${balance >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {balance >= 0 ? '+' : ''}{formatMoney(balance)}
                </p>
            </div>
            <div className="card p-3 text-center">
                <p className="text-xs text-gray-400 mb-1">Te deben</p>
                <p className="text-lg font-bold text-emerald-400">{formatMoney(me.lent)}</p>
            </div>
        </div>
    )
}
