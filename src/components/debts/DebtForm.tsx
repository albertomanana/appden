import React, { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowDownLeft, ArrowUpRight } from 'lucide-react'
import { debtsService } from '@services/debts.service'
import { groupsService } from '@services/groups.service'
import { centsToAmount, parseCents } from '@features/debts/split'
import { useAuth } from '@hooks/useAuth'
import { useActiveGroup } from '@hooks/useActiveGroup'
import { useToast } from '@components/ui/Toast'
import { Avatar } from '@components/common/Avatar'
import { Modal } from '@components/ui/Modal'
import { CURRENCIES } from '@lib/constants'
import { cn } from '@lib/utils'
import type { DebtCurrency } from '@/types'

interface DebtFormProps {
    onClose: () => void
}

type Direction = 'owed_to_me' | 'i_owe'

const CONCEPT_SUGGESTIONS = ['Cena', 'Entradas', 'Gasolina', 'Compra', 'Bizum']

export const DebtForm: React.FC<DebtFormProps> = ({ onClose }) => {
    const { userId } = useAuth()
    const { groupId } = useActiveGroup()
    const { success, error: toastError } = useToast()
    const queryClient = useQueryClient()

    const [direction, setDirection] = useState<Direction>('owed_to_me')
    const [otherId, setOtherId] = useState<string | null>(null)
    const [concept, setConcept] = useState('')
    const [amountText, setAmountText] = useState('')
    const [currency, setCurrency] = useState<DebtCurrency>('EUR')
    const [dueDate, setDueDate] = useState('')
    const [touched, setTouched] = useState(false)

    const { data: members = [] } = useQuery({
        queryKey: ['members', groupId],
        queryFn: () => groupsService.getGroupMembers(groupId!),
        enabled: !!groupId,
    })
    const others = useMemo(() => members.filter((member) => member.user_id !== userId), [members, userId])

    const cents = parseCents(amountText)
    const errors = {
        other: !otherId ? 'Elige con quién es la deuda.' : null,
        amount: cents == null || cents <= 0 ? 'Escribe un importe válido, p. ej. 12,50.' : null,
        concept: !concept.trim() ? 'Escribe un concepto.' : null,
    }
    const valid = !errors.other && !errors.amount && !errors.concept

    const { mutate: create, isPending } = useMutation({
        mutationFn: () =>
            debtsService.createDebt(groupId!, {
                creditorId: direction === 'owed_to_me' ? userId! : otherId!,
                debtorId: direction === 'owed_to_me' ? otherId! : userId!,
                amount: centsToAmount(cents ?? 0),
                currency,
                concept: concept.trim(),
                dueDate: dueDate || null,
            }),
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: ['debts', groupId] })
            void queryClient.invalidateQueries({ queryKey: ['debts-summary', groupId] })
            success('Deuda apuntada')
            onClose()
        },
        onError: (err) => toastError('No se pudo apuntar la deuda', err instanceof Error ? err.message : undefined),
    })

    const submit = (event: React.FormEvent) => {
        event.preventDefault()
        setTouched(true)
        if (valid && !isPending) create()
    }

    const otherName = others.find((member) => member.user_id === otherId)?.profile?.display_name

    return (
        <Modal open onClose={onClose} title="Nueva deuda" size="sm">
            <form onSubmit={submit} className="space-y-5" noValidate>
                <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Dirección de la deuda">
                    {(
                        [
                            { value: 'owed_to_me', label: 'Me deben', icon: ArrowDownLeft, tone: 'border-emerald-400/40 bg-emerald-400/12 text-emerald-200' },
                            { value: 'i_owe', label: 'Debo yo', icon: ArrowUpRight, tone: 'border-red-400/40 bg-red-400/12 text-red-200' },
                        ] as const
                    ).map(({ value, label, icon: Icon, tone }) => (
                        <button
                            key={value}
                            type="button"
                            role="radio"
                            aria-checked={direction === value}
                            onClick={() => setDirection(value)}
                            className={cn(
                                'flex min-h-[3rem] items-center justify-center gap-2 rounded-2xl border text-sm font-semibold transition-colors',
                                direction === value ? tone : 'border-white/10 text-gray-400'
                            )}
                        >
                            <Icon className="h-4 w-4" />
                            {label}
                        </button>
                    ))}
                </div>

                <div>
                    <p className="label">{direction === 'owed_to_me' ? '¿Quién te debe?' : '¿A quién le debes?'}</p>
                    {others.length === 0 ? (
                        <p className="text-sm text-gray-400">Todavía no hay más miembros en este grupo. Invita a alguien primero.</p>
                    ) : (
                        <div className="scroller-x !pb-0">
                            {others.map((member) => {
                                const selected = member.user_id === otherId
                                return (
                                    <button
                                        key={member.user_id}
                                        type="button"
                                        onClick={() => setOtherId(member.user_id)}
                                        aria-pressed={selected}
                                        className="flex w-[4.5rem] shrink-0 flex-col items-center gap-1.5 py-1"
                                    >
                                        <span className={cn('rounded-full p-0.5 ring-2 transition', selected ? 'ring-brand-300' : 'ring-transparent')}>
                                            <Avatar src={member.profile?.avatar_url} name={member.profile?.display_name} size="lg" />
                                        </span>
                                        <span className={cn('w-full truncate text-center text-xs', selected ? 'font-semibold text-white' : 'text-gray-400')}>
                                            {member.profile?.display_name?.split(' ')[0] ?? 'Miembro'}
                                        </span>
                                    </button>
                                )
                            })}
                        </div>
                    )}
                    {touched && errors.other ? <p className="field-error">{errors.other}</p> : null}
                </div>

                <div className="grid grid-cols-[1fr,auto] gap-2">
                    <div>
                        <label className="label" htmlFor="debt-amount">Importe</label>
                        <input
                            id="debt-amount"
                            inputMode="decimal"
                            autoComplete="off"
                            placeholder="0,00"
                            value={amountText}
                            onChange={(event) => setAmountText(event.target.value)}
                            className="input text-lg font-semibold tabular"
                        />
                    </div>
                    <div>
                        <label className="label" htmlFor="debt-currency">Moneda</label>
                        <select id="debt-currency" value={currency} onChange={(event) => setCurrency(event.target.value as DebtCurrency)} className="input w-28">
                            {CURRENCIES.map((option) => (
                                <option key={option.value} value={option.value}>
                                    {option.label}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>
                {touched && errors.amount ? <p className="field-error -mt-3">{errors.amount}</p> : null}

                <div>
                    <label className="label" htmlFor="debt-concept">Concepto</label>
                    <input
                        id="debt-concept"
                        placeholder="Ej. Cena del viernes"
                        value={concept}
                        maxLength={200}
                        onChange={(event) => setConcept(event.target.value)}
                        className="input"
                    />
                    <div className="mt-2 flex flex-wrap gap-1.5">
                        {CONCEPT_SUGGESTIONS.map((suggestion) => (
                            <button
                                key={suggestion}
                                type="button"
                                onClick={() => setConcept(suggestion)}
                                className="min-h-[2rem] rounded-full border border-white/10 px-3 text-xs text-gray-300 active:bg-white/5"
                            >
                                {suggestion}
                            </button>
                        ))}
                    </div>
                    {touched && errors.concept ? <p className="field-error">{errors.concept}</p> : null}
                </div>

                <div>
                    <label className="label" htmlFor="debt-due">
                        Fecha límite <span className="font-normal text-gray-500">(opcional)</span>
                    </label>
                    <input id="debt-due" type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} className="input" />
                </div>

                <button type="submit" disabled={isPending} className="btn-primary w-full !min-h-[3.25rem]">
                    {isPending
                        ? 'Guardando…'
                        : otherName && cents
                          ? direction === 'owed_to_me'
                              ? `${otherName.split(' ')[0]} te debe ${amountText} ${currency === 'EUR' ? '€' : currency}`
                              : `Debes ${amountText} ${currency === 'EUR' ? '€' : currency} a ${otherName.split(' ')[0]}`
                          : 'Apuntar deuda'}
                </button>
            </form>
        </Modal>
    )
}
