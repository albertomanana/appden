import React from 'react'
import { Modal } from '@components/ui/Modal'
import { cn } from '@lib/utils'

export type ActionSheetItem = {
    label: string
    icon?: React.ComponentType<{ className?: string }>
    onSelect: () => void
    tone?: 'default' | 'danger'
    disabled?: boolean
    hidden?: boolean
}

interface ActionSheetProps {
    open: boolean
    onClose: () => void
    title?: React.ReactNode
    /** Optional content above the actions (e.g. the song being acted on). */
    header?: React.ReactNode
    items: ActionSheetItem[]
}

/** Contextual menu presented as a bottom sheet on phones. */
export const ActionSheet: React.FC<ActionSheetProps> = ({ open, onClose, title, header, items }) => (
    <Modal open={open} onClose={onClose} size="sm" title={title}>
        {header ? <div className="mb-3">{header}</div> : null}
        <div className="-mx-2 space-y-0.5">
            {items
                .filter((item) => !item.hidden)
                .map(({ label, icon: Icon, onSelect, tone = 'default', disabled }) => (
                    <button
                        key={label}
                        type="button"
                        disabled={disabled}
                        onClick={() => {
                            onClose()
                            onSelect()
                        }}
                        className={cn(
                            'flex min-h-[3.25rem] w-full items-center gap-4 rounded-2xl px-3 text-left text-[15px] font-medium transition-colors active:bg-white/[0.06] disabled:opacity-40',
                            tone === 'danger' ? 'text-red-300' : 'text-white',
                            'hover:bg-white/[0.04]'
                        )}
                    >
                        {Icon ? <Icon className={cn('h-5 w-5 shrink-0', tone === 'danger' ? 'text-red-300' : 'text-gray-400')} /> : null}
                        <span className="min-w-0 flex-1 truncate">{label}</span>
                    </button>
                ))}
        </div>
    </Modal>
)
