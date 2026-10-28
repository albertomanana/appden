import React, { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowRight, Check, Plus, Trash2 } from 'lucide-react'
import { Avatar } from '@components/common/Avatar'
import { Modal } from '@components/ui/Modal'
import { Tabs } from '@components/ui/Tabs'
import { useToast } from '@components/ui/Toast'
import { useAuth } from '@hooks/useAuth'
import { useActiveGroup } from '@hooks/useActiveGroup'
import {
    centsToAmount,
    computeSplit,
    parseCents,
    parseDecimal,
    type SplitIssue,
    type SplitItem,
    type SplitMode,
} from '@features/debts/split'
import { debtsService } from '@services/debts.service'
import { groupsService } from '@services/groups.service'
import { cn, formatMoney } from '@lib/utils'
import type { GroupMember } from '@/types'

interface DebtSplitCalculatorProps {
    onClose: () => void
}

type Step = 1 | 2 | 3

const TIP_OPTIONS = [0, 5, 10, 15]

const modeLabels: Record<SplitMode, string> = {
    equal: 'A partes iguales',
    shares: 'Por partes',
    exact: 'Importes exactos',
    items: 'Por consumiciones',
}

function issueText(issue: SplitIssue, items: SplitItem[]): string {
    switch (issue.code) {
        case 'bill_missing':
            return 'Escribe el importe de la cuenta.'
        case 'no_payers':
            return 'Marca quién pagó.'
        case 'no_participants':
            return 'Elige quién participa.'
        case 'paid_mismatch':
            return issue.diffCents > 0
                ? `Falta repartir ${formatMoney(centsToAmount(issue.diffCents))} de lo pagado.`
                : `Lo pagado supera el total en ${formatMoney(centsToAmount(-issue.diffCents))}.`
        case 'percent_sum':
            return `Los porcentajes suman ${issue.sumPercent} % (deben sumar 100 %).`
        case 'weights_empty':
            return 'Pon al menos una parte a alguien.'
        case 'exact_mismatch':
            return issue.diffCents > 0
                ? `Quedan ${formatMoney(centsToAmount(issue.diffCents))} sin asignar.`
                : `Los importes superan la cuenta en ${formatMoney(centsToAmount(-issue.diffCents))}.`
        case 'items_over_bill':
            return `Las consumiciones superan la cuenta en ${formatMoney(centsToAmount(issue.diffCents))}.`
        case 'item_without_price':
            return `Ponle precio a "${items.find((item) => item.id === issue.itemId)?.name || 'una consumición'}".`
        case 'item_without_people':
            return `Elige quién tomó "${items.find((item) => item.id === issue.itemId)?.name || 'una consumición'}".`
        default:
            return ''
    }
}

export const DebtSplitCalculator: React.FC<DebtSplitCalculatorProps> = ({ onClose }) => {
    const { userId } = useAuth()
    const { groupId, activeGroup } = useActiveGroup()
    const queryClient = useQueryClient()
    const toast = useToast()

    const { data: members = [] } = useQuery({
        queryKey: ['members', groupId],
        queryFn: () => groupsService.getGroupMembers(groupId!),
        enabled: !!groupId,
    })

    const [step, setStep] = useState<Step>(1)
    const [concept, setConcept] = useState('')
    const [billText, setBillText] = useState('')
    const [tipPercent, setTipPercent] = useState(0)
    const [roundEuros, setRoundEuros] = useState(false)
    // Payers: personId → typed amount ('' = shares "the rest" equally with other blank payers).
    const [payers, setPayers] = useState<Record<string, string>>(() => (userId ? { [userId]: '' } : {}))
    const [participants, setParticipants] = useState<string[] | null>(null)
    const [mode, setMode] = useState<SplitMode>('equal')
    const [weights, setWeights] = useState<Record<string, string>>({})
    const [exact, setExact] = useState<Record<string, string>>({})
    const [items, setItems] = useState<SplitItem[]>([])
    const [itemPrices, setItemPrices] = useState<Record<string, string>>({})

    const memberIds = useMemo(() => members.map((member) => member.user_id), [members])
    const participantIds = participants ?? memberIds
    const byId = useMemo(() => new Map<string, GroupMember>(members.map((member) => [member.user_id, member])), [members])
    const name = (id: string) => (id === userId ? 'Tú' : byId.get(id)?.profile?.display_name?.split(' ')[0] ?? 'Alguien')

    const result = useMemo(
        () =>
            computeSplit({
                billCents: parseCents(billText) ?? 0,
                tipPercent,
                roundStepCents: roundEuros ? 100 : 0,
                payments: Object.entries(payers).map(([personId, text]) => ({ personId, cents: text.trim() ? parseCents(text) ?? 0 : null })),
                participantIds,
                mode,
                weightUnit: 'parts',
                weights: Object.fromEntries(participantIds.map((id) => [id, weights[id]?.trim() ? parseDecimal(weights[id]) : 1])),
                exactCents: Object.fromEntries(participantIds.map((id) => [id, exact[id]?.trim() ? parseCents(exact[id]) : null])),
                items: items.map((item) => ({ ...item, priceCents: parseCents(itemPrices[item.id]) ?? 0 })),
            }),
        [billText, tipPercent, roundEuros, payers, participantIds, mode, weights, exact, items, itemPrices]
    )

    const step1Issues = result.issues.filter((issue) => ['bill_missing', 'no_payers', 'paid_mismatch'].includes(issue.code))
    const step2Issues = result.issues.filter((issue) => !['bill_missing', 'no_payers', 'paid_mismatch'].includes(issue.code))

    const createDebts = useMutation({
        mutationFn: () =>
            debtsService.createDebts(
                groupId!,
                result.transfers.map((transfer) => ({
                    creditorId: transfer.toId,
                    debtorId: transfer.fromId,
                    amount: centsToAmount(transfer.cents),
                    currency: 'EUR' as const,
                    concept: concept.trim() || 'Gasto compartido',
                }))
            ),
        onSuccess: ({ created, failed }) => {
            void queryClient.invalidateQueries({ queryKey: ['debts', groupId] })
            void queryClient.invalidateQueries({ queryKey: ['debts-summary', groupId] })
            if (failed.length === 0) {
                toast.success(created.length === 1 ? 'Deuda creada' : `${created.length} deudas creadas`)
                onClose()
                return
            }
            toast.error(
                created.length > 0 ? `Se crearon ${created.length} de ${created.length + failed.length} deudas` : 'No se pudieron crear las deudas',
                failed[0]?.message
            )
        },
        onError: (err) => toast.error('No se pudieron crear las deudas', err instanceof Error ? err.message : undefined),
    })

    const togglePayer = (id: string) =>
        setPayers((current) => {
            const next = { ...current }
            if (id in next) delete next[id]
            else next[id] = ''
            return next
        })

    const toggleParticipant = (id: string) =>
        setParticipants((current) => {
            const list = current ?? memberIds
            return list.includes(id) ? list.filter((value) => value !== id) : [...list, id]
        })

    const addItem = () => {
        const id = `item-${Date.now()}`
        setItems((current) => [...current, { id, name: '', priceCents: 0, consumerIds: [] }])
    }

    const footer =
        step === 1 ? (
            <button type="button" className="btn-primary w-full !min-h-[3rem]" disabled={step1Issues.length > 0} onClick={() => setStep(2)}>
                Siguiente: cómo se reparte
            </button>
        ) : step === 2 ? (
            <div className="grid grid-cols-[auto,1fr] gap-2">
                <button type="button" className="btn-secondary !min-h-[3rem]" onClick={() => setStep(1)}>
                    Atrás
                </button>
                <button type="button" className="btn-primary !min-h-[3rem]" disabled={!result.ok} onClick={() => setStep(3)}>
                    Ver resultado
                </button>
            </div>
        ) : (
            <div className="grid grid-cols-[auto,1fr] gap-2">
                <button type="button" className="btn-secondary !min-h-[3rem]" onClick={() => setStep(2)}>
                    Atrás
                </button>
                <button
                    type="button"
                    className="btn-primary !min-h-[3rem]"
                    disabled={result.transfers.length === 0 || createDebts.isPending}
                    onClick={() => createDebts.mutate()}
                >
                    {createDebts.isPending
                        ? 'Creando…'
                        : result.transfers.length === 0
                          ? 'Nadie debe nada'
                          : `Crear ${result.transfers.length} ${result.transfers.length === 1 ? 'deuda' : 'deudas'}`}
                </button>
            </div>
        )

    return (
        <Modal
            open
            onClose={onClose}
            size="lg"
            title="Repartir un gasto"
            description={`Paso ${step} de 3 · ${step === 1 ? 'Cuánto y quién pagó' : step === 2 ? 'Quién participa' : 'Resultado'}`}
            footer={footer}
        >
            {step === 1 ? (
                <div className="space-y-5">
                    <div>
                        <label className="label" htmlFor="split-concept">Concepto</label>
                        <input
                            id="split-concept"
                            className="input"
                            placeholder={`Ej. Cena con ${activeGroup?.name ?? 'el grupo'}`}
                            value={concept}
                            maxLength={200}
                            onChange={(event) => setConcept(event.target.value)}
                        />
                    </div>
                    <div>
                        <label className="label" htmlFor="split-bill">Importe de la cuenta</label>
                        <input
                            id="split-bill"
                            className="input text-2xl font-bold tabular"
                            inputMode="decimal"
                            placeholder="0,00 €"
                            value={billText}
                            onChange={(event) => setBillText(event.target.value)}
                        />
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-semibold text-gray-400">Propina</span>
                        {TIP_OPTIONS.map((option) => (
                            <Pill key={option} active={tipPercent === option} onClick={() => setTipPercent(option)}>
                                {option === 0 ? 'Sin' : `${option} %`}
                            </Pill>
                        ))}
                        <Pill active={roundEuros} onClick={() => setRoundEuros((value) => !value)} className="ml-auto">
                            Redondear a euros
                        </Pill>
                    </div>

                    <div>
                        <p className="label">¿Quién pagó?</p>
                        <p className="-mt-1 mb-3 text-xs text-gray-500">Deja el importe vacío y se reparte a partes iguales entre quienes pagaron.</p>
                        <div className="list-group">
                            {members.map((member) => {
                                const isPayer = member.user_id in payers
                                return (
                                    <div key={member.user_id} className="list-row !py-2">
                                        <button type="button" onClick={() => togglePayer(member.user_id)} className="flex min-w-0 flex-1 items-center gap-3 text-left" aria-pressed={isPayer}>
                                            <CheckDot checked={isPayer} />
                                            <Avatar src={member.profile?.avatar_url} name={member.profile?.display_name} size="sm" />
                                            <span className="truncate text-[15px] text-white">{name(member.user_id)}</span>
                                        </button>
                                        {isPayer ? (
                                            <input
                                                inputMode="decimal"
                                                placeholder={result.totalCents > 0 ? 'Parte igual' : '0,00'}
                                                aria-label={`Lo que pagó ${name(member.user_id)}`}
                                                value={payers[member.user_id]}
                                                onChange={(event) => setPayers((current) => ({ ...current, [member.user_id]: event.target.value }))}
                                                className="input !min-h-[2.5rem] w-32 !py-2 text-right tabular"
                                            />
                                        ) : null}
                                    </div>
                                )
                            })}
                        </div>
                    </div>

                    {result.totalCents > 0 ? (
                        <p className="text-sm text-gray-400">
                            Total a repartir: <span className="font-semibold text-white">{formatMoney(centsToAmount(result.totalCents))}</span>
                            {result.tipCents > 0 ? ` (incluye ${formatMoney(centsToAmount(result.tipCents))} de propina)` : ''}
                        </p>
                    ) : null}
                    <IssueList issues={step1Issues.filter((issue) => issue.code !== 'bill_missing' || billText.trim() !== '')} render={(issue) => issueText(issue, items)} />
                </div>
            ) : null}

            {step === 2 ? (
                <div className="space-y-5">
                    <div>
                        <p className="label">¿Quién participa?</p>
                        <div className="flex flex-wrap gap-2">
                            {members.map((member) => (
                                <Pill key={member.user_id} active={participantIds.includes(member.user_id)} onClick={() => toggleParticipant(member.user_id)}>
                                    {name(member.user_id)}
                                </Pill>
                            ))}
                        </div>
                    </div>

                    <Tabs
                        active={mode}
                        onChange={(value) => setMode(value as SplitMode)}
                        items={(Object.keys(modeLabels) as SplitMode[]).map((value) => ({ value, label: modeLabels[value] }))}
                    />

                    {mode === 'equal' ? (
                        <p className="text-sm text-gray-400">
                            Cada persona paga {participantIds.length > 0 ? formatMoney(centsToAmount(Math.round(result.totalCents / participantIds.length))) : '—'}.
                        </p>
                    ) : null}

                    {mode === 'shares' || mode === 'exact' ? (
                        <div className="list-group">
                            {participantIds.map((id) => (
                                <div key={id} className="list-row !py-2">
                                    <Avatar src={byId.get(id)?.profile?.avatar_url} name={byId.get(id)?.profile?.display_name} size="sm" />
                                    <span className="min-w-0 flex-1 truncate text-[15px] text-white">{name(id)}</span>
                                    <input
                                        inputMode="decimal"
                                        aria-label={mode === 'shares' ? `Partes de ${name(id)}` : `Importe de ${name(id)}`}
                                        placeholder={mode === 'shares' ? '1' : 'Resto'}
                                        value={(mode === 'shares' ? weights : exact)[id] ?? ''}
                                        onChange={(event) =>
                                            (mode === 'shares' ? setWeights : setExact)((current) => ({ ...current, [id]: event.target.value }))
                                        }
                                        className="input !min-h-[2.5rem] w-28 !py-2 text-right tabular"
                                    />
                                    {mode === 'shares' ? <span className="w-12 text-xs text-gray-500">partes</span> : null}
                                </div>
                            ))}
                        </div>
                    ) : null}

                    {mode === 'items' ? (
                        <div className="space-y-3">
                            <p className="text-xs text-gray-500">Lo que no esté en ninguna consumición se reparte entre todos como «común».</p>
                            {items.map((item) => (
                                <div key={item.id} className="card space-y-3 p-3">
                                    <div className="flex gap-2">
                                        <input
                                            className="input !min-h-[2.75rem] flex-1 !py-2"
                                            placeholder="Plato o bebida"
                                            aria-label="Nombre de la consumición"
                                            value={item.name}
                                            onChange={(event) =>
                                                setItems((current) => current.map((entry) => (entry.id === item.id ? { ...entry, name: event.target.value } : entry)))
                                            }
                                        />
                                        <input
                                            className="input !min-h-[2.75rem] w-24 !py-2 text-right tabular"
                                            inputMode="decimal"
                                            placeholder="0,00"
                                            aria-label="Precio"
                                            value={itemPrices[item.id] ?? ''}
                                            onChange={(event) => setItemPrices((current) => ({ ...current, [item.id]: event.target.value }))}
                                        />
                                        <button
                                            type="button"
                                            className="icon-btn text-gray-500"
                                            aria-label="Quitar consumición"
                                            onClick={() => setItems((current) => current.filter((entry) => entry.id !== item.id))}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    </div>
                                    <div className="flex flex-wrap gap-1.5">
                                        {participantIds.map((id) => (
                                            <Pill
                                                key={id}
                                                small
                                                active={item.consumerIds.includes(id)}
                                                onClick={() =>
                                                    setItems((current) =>
                                                        current.map((entry) =>
                                                            entry.id === item.id
                                                                ? {
                                                                      ...entry,
                                                                      consumerIds: entry.consumerIds.includes(id)
                                                                          ? entry.consumerIds.filter((value) => value !== id)
                                                                          : [...entry.consumerIds, id],
                                                                  }
                                                                : entry
                                                        )
                                                    )
                                                }
                                            >
                                                {name(id)}
                                            </Pill>
                                        ))}
                                    </div>
                                </div>
                            ))}
                            <button type="button" className="btn-secondary w-full" onClick={addItem}>
                                <Plus className="h-4 w-4" />
                                Añadir consumición
                            </button>
                            {result.commonCents > 0 && result.ok ? (
                                <p className="text-sm text-gray-400">Común a repartir entre todos: {formatMoney(centsToAmount(result.commonCents))}</p>
                            ) : null}
                        </div>
                    ) : null}

                    <IssueList issues={step2Issues} render={(issue) => issueText(issue, items)} />
                </div>
            ) : null}

            {step === 3 ? (
                <div className="space-y-5">
                    <div className="list-group">
                        {result.people.map((person) => (
                            <div key={person.personId} className="list-row !py-2.5">
                                <Avatar src={byId.get(person.personId)?.profile?.avatar_url} name={byId.get(person.personId)?.profile?.display_name} size="sm" />
                                <div className="min-w-0 flex-1">
                                    <p className="truncate text-[15px] font-medium text-white">{name(person.personId)}</p>
                                    <p className="text-xs text-gray-500">
                                        Le toca {formatMoney(centsToAmount(person.shareCents))} · pagó {formatMoney(centsToAmount(person.paidCents))}
                                    </p>
                                </div>
                                <span
                                    className={cn(
                                        'text-sm font-bold tabular',
                                        person.balanceCents > 0 ? 'text-emerald-300' : person.balanceCents < 0 ? 'text-red-300' : 'text-gray-500'
                                    )}
                                >
                                    {person.balanceCents > 0 ? '+' : ''}
                                    {formatMoney(centsToAmount(person.balanceCents))}
                                </span>
                            </div>
                        ))}
                    </div>

                    <div>
                        <p className="label">Para quedar en paz</p>
                        {result.transfers.length === 0 ? (
                            <p className="flex items-center gap-2 text-sm text-gray-300">
                                <Check className="h-4 w-4 text-emerald-300" />
                                Cada uno pagó justo lo suyo.
                            </p>
                        ) : (
                            <div className="space-y-2">
                                {result.transfers.map((transfer) => (
                                    <div key={`${transfer.fromId}-${transfer.toId}`} className="card flex items-center gap-2 p-3">
                                        <span className="min-w-0 flex-1 truncate text-[15px] text-white">{name(transfer.fromId)}</span>
                                        <ArrowRight className="h-4 w-4 shrink-0 text-gray-500" />
                                        <span className="min-w-0 flex-1 truncate text-[15px] text-white">{name(transfer.toId)}</span>
                                        <span className="shrink-0 font-bold tabular text-white">{formatMoney(centsToAmount(transfer.cents))}</span>
                                    </div>
                                ))}
                                <p className="text-xs text-gray-500">Es el número mínimo de pagos. Al crearlas, cada deuda aparecerá en Cuentas.</p>
                            </div>
                        )}
                    </div>
                </div>
            ) : null}
        </Modal>
    )
}

const Pill: React.FC<{ active: boolean; onClick: () => void; children: React.ReactNode; className?: string; small?: boolean }> = ({
    active,
    onClick,
    children,
    className,
    small = false,
}) => (
    <button
        type="button"
        onClick={onClick}
        aria-pressed={active}
        className={cn(
            'inline-flex items-center rounded-full border font-semibold transition-colors',
            small ? 'min-h-[2rem] px-3 text-xs' : 'min-h-[2.5rem] px-4 text-sm',
            active ? 'border-brand-400/40 bg-brand-400/15 text-brand-100' : 'border-white/10 text-gray-400',
            className
        )}
    >
        {children}
    </button>
)

const CheckDot: React.FC<{ checked: boolean }> = ({ checked }) => (
    <span
        className={cn(
            'grid h-6 w-6 shrink-0 place-items-center rounded-full border transition-colors',
            checked ? 'border-brand-300 bg-brand-400 text-black' : 'border-white/20'
        )}
    >
        {checked ? <Check className="h-3.5 w-3.5" /> : null}
    </span>
)

const IssueList: React.FC<{ issues: SplitIssue[]; render: (issue: SplitIssue) => string }> = ({ issues, render }) =>
    issues.length === 0 ? null : (
        <ul className="notice-warning space-y-1">
            {issues.map((issue, index) => (
                <li key={`${issue.code}-${index}`}>{render(issue)}</li>
            ))}
        </ul>
    )
