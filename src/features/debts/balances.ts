// ============================================================
// Viewer-centric balances, computed from the same debt list the UI shows
// (single source of truth, integer cents, never mixing currencies).
// ============================================================

import { amountToCents } from '@features/debts/split'
import type { Debt, DebtCurrency, Profile } from '@/types'

type DebtLike = Pick<Debt, 'creditor_id' | 'debtor_id' | 'amount' | 'amount_paid' | 'status' | 'currency'> & {
    creditor?: Pick<Profile, 'id' | 'display_name' | 'avatar_url'> | null
    debtor?: Pick<Profile, 'id' | 'display_name' | 'avatar_url'> | null
}

export interface CounterpartBalance {
    personId: string
    profile: Pick<Profile, 'id' | 'display_name' | 'avatar_url'> | null
    /** Positive: they owe me. Negative: I owe them. */
    netCents: number
    openDebts: number
}

export interface MyBalance {
    currency: DebtCurrency
    /** Open amount other people owe me. */
    owedToMeCents: number
    /** Open amount I owe other people. */
    iOweCents: number
    /** owedToMe - iOwe. Positive = in my favour. */
    netCents: number
    /** Net per person, largest absolute amount first. */
    people: CounterpartBalance[]
}

export function remainingCents(debt: Pick<Debt, 'amount' | 'amount_paid' | 'status'>): number {
    if (debt.status === 'paid') return 0
    return Math.max(0, amountToCents(Number(debt.amount)) - amountToCents(Number(debt.amount_paid)))
}

/**
 * Balances of `userId` against everyone else, one entry per currency with open debts
 * (EUR first). Debts between two other members are ignored.
 */
export function computeMyBalances(debts: DebtLike[], userId: string | null | undefined): MyBalance[] {
    if (!userId) return []
    const byCurrency = new Map<DebtCurrency, MyBalance & { map: Map<string, CounterpartBalance> }>()

    for (const debt of debts) {
        const cents = remainingCents(debt)
        if (cents <= 0) continue
        const iAmCreditor = debt.creditor_id === userId
        const iAmDebtor = debt.debtor_id === userId
        if (iAmCreditor === iAmDebtor) continue // not mine (or malformed self-debt)

        let entry = byCurrency.get(debt.currency)
        if (!entry) {
            entry = { currency: debt.currency, owedToMeCents: 0, iOweCents: 0, netCents: 0, people: [], map: new Map() }
            byCurrency.set(debt.currency, entry)
        }

        const otherId = iAmCreditor ? debt.debtor_id : debt.creditor_id
        const otherProfile = (iAmCreditor ? debt.debtor : debt.creditor) ?? null
        const person = entry.map.get(otherId) ?? { personId: otherId, profile: otherProfile, netCents: 0, openDebts: 0 }
        person.openDebts += 1
        if (iAmCreditor) {
            entry.owedToMeCents += cents
            person.netCents += cents
        } else {
            entry.iOweCents += cents
            person.netCents -= cents
        }
        if (!person.profile && otherProfile) person.profile = otherProfile
        entry.map.set(otherId, person)
    }

    return Array.from(byCurrency.values())
        .map(({ map, ...balance }) => ({
            ...balance,
            netCents: balance.owedToMeCents - balance.iOweCents,
            people: Array.from(map.values())
                .filter((person) => person.netCents !== 0)
                .sort((a, b) => Math.abs(b.netCents) - Math.abs(a.netCents)),
        }))
        .sort((a, b) => (a.currency === 'EUR' ? -1 : b.currency === 'EUR' ? 1 : a.currency.localeCompare(b.currency)))
}
