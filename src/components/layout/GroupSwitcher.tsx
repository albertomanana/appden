import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Check, ChevronDown, ChevronsUpDown, Plus, Settings2, Users } from 'lucide-react'
import { Modal } from '@components/ui/Modal'
import { useActiveGroup } from '@hooks/useActiveGroup'
import { ROUTES } from '@lib/constants'
import { cn, getInitials } from '@lib/utils'

type GroupSwitcherProps = {
    className?: string
    /** `pill` for the header, `card` for the desktop sidebar, `icon` for the collapsed rail. */
    variant?: 'pill' | 'card' | 'icon'
    /** Header compact state (scrolled): hides the "Grupo" caption. */
    compact?: boolean
}

/** Shows the active group; opens a sheet to switch or manage groups. */
export const GroupSwitcher: React.FC<GroupSwitcherProps> = ({ className, variant = 'pill', compact = false }) => {
    const navigate = useNavigate()
    const { activeGroup, myGroups, setActiveGroup } = useActiveGroup()
    const [open, setOpen] = useState(false)

    const go = (path: string) => {
        setOpen(false)
        navigate(path)
    }

    const initials = activeGroup ? getInitials(activeGroup.name) : <Users className="h-4 w-4" />
    const ariaLabel = activeGroup ? `Grupo activo: ${activeGroup.name}. Cambiar grupo` : 'Elegir grupo'

    return (
        <>
            {variant === 'card' ? (
                <button
                    type="button"
                    onClick={() => setOpen(true)}
                    className={cn(
                        'group flex w-full min-w-0 items-center gap-3 rounded-2xl border border-white/[0.07] bg-white/[0.035] p-2 pr-2.5 text-left transition-[background-color,border-color,transform] duration-150 hover:border-white/[0.12] hover:bg-white/[0.06] active:scale-[0.98]',
                        className
                    )}
                    aria-haspopup="dialog"
                    aria-label={ariaLabel}
                >
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-brand-400 to-violet-500 text-[13px] font-bold text-white shadow-[0_8px_22px_rgba(110,159,255,0.28)]">
                        {initials}
                    </span>
                    <span className="min-w-0 flex-1">
                        <span className="block text-[11px] font-medium leading-tight text-gray-500">Grupo activo</span>
                        <span className="block truncate text-[14px] font-semibold leading-snug text-white">{activeGroup?.name ?? 'Sin grupo'}</span>
                    </span>
                    <ChevronsUpDown className="h-4 w-4 shrink-0 text-gray-500 transition-colors group-hover:text-gray-300" />
                </button>
            ) : variant === 'icon' ? (
                <button
                    type="button"
                    onClick={() => setOpen(true)}
                    className={cn(
                        'grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br from-brand-400 to-violet-500 text-[13px] font-bold text-white shadow-[0_8px_22px_rgba(110,159,255,0.25)] transition-transform duration-150 hover:scale-105 active:scale-95',
                        className
                    )}
                    aria-haspopup="dialog"
                    aria-label={ariaLabel}
                >
                    {initials}
                </button>
            ) : (
                <button
                    type="button"
                    onClick={() => setOpen(true)}
                    className={cn(
                        'flex min-h-[2.75rem] min-w-0 max-w-[15rem] items-center gap-2.5 rounded-full py-1 pl-1 pr-3 text-left transition-colors active:bg-white/[0.06] hover:bg-white/[0.04]',
                        className
                    )}
                    aria-haspopup="dialog"
                    aria-label={ariaLabel}
                >
                    <span
                        className={cn(
                            'grid shrink-0 place-items-center rounded-xl bg-gradient-to-br from-brand-400 to-violet-500 text-xs font-bold text-white shadow-[0_6px_18px_rgba(110,159,255,0.25)] transition-[width,height] duration-200',
                            compact ? 'h-8 w-8' : 'h-9 w-9'
                        )}
                    >
                        {initials}
                    </span>
                    <span className="min-w-0">
                        <span
                            className={cn(
                                'block overflow-hidden text-[11px] font-medium leading-tight text-gray-500 transition-[max-height,opacity] duration-200',
                                compact ? 'max-h-0 opacity-0' : 'max-h-4 opacity-100'
                            )}
                        >
                            Grupo
                        </span>
                        <span className="flex items-center gap-1">
                            <span className="truncate text-[15px] font-semibold leading-tight text-white">
                                {activeGroup?.name ?? 'Sin grupo'}
                            </span>
                            <ChevronDown className="h-4 w-4 shrink-0 text-gray-400" />
                        </span>
                    </span>
                </button>
            )}

            <Modal open={open} onClose={() => setOpen(false)} title="Tus grupos" size="sm">
                {myGroups.length === 0 ? (
                    <p className="mb-4 text-sm text-gray-400">
                        Todavía no perteneces a ningún grupo. Crea uno o acepta una invitación para compartir música y cuentas.
                    </p>
                ) : (
                    <div className="-mx-2 mb-4 space-y-0.5">
                        {myGroups.map((group) => {
                            const isActive = group.id === activeGroup?.id
                            return (
                                <button
                                    key={group.id}
                                    type="button"
                                    onClick={() => {
                                        setActiveGroup(group)
                                        setOpen(false)
                                    }}
                                    className={cn(
                                        'flex min-h-[3.5rem] w-full items-center gap-3 rounded-2xl px-2 text-left transition-colors active:bg-white/[0.06]',
                                        isActive ? 'bg-white/[0.06]' : 'hover:bg-white/[0.04]'
                                    )}
                                >
                                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white/[0.08] text-sm font-bold text-white">
                                        {getInitials(group.name)}
                                    </span>
                                    <span className="min-w-0 flex-1">
                                        <span className="block truncate text-[15px] font-semibold text-white">{group.name}</span>
                                        {group.description ? <span className="block truncate text-xs text-gray-400">{group.description}</span> : null}
                                    </span>
                                    {isActive ? <Check className="h-5 w-5 shrink-0 text-brand-300" /> : null}
                                </button>
                            )
                        })}
                    </div>
                )}

                <div className="grid grid-cols-2 gap-2">
                    <button type="button" onClick={() => go(`${ROUTES.GROUPS}?nuevo=1`)} className="btn-primary">
                        <Plus className="h-4 w-4" />
                        Crear grupo
                    </button>
                    <button
                        type="button"
                        onClick={() => go(activeGroup ? ROUTES.GROUP(activeGroup.id) : ROUTES.GROUPS)}
                        className="btn-secondary"
                    >
                        <Settings2 className="h-4 w-4" />
                        Gestionar
                    </button>
                </div>
            </Modal>
        </>
    )
}
