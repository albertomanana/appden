import React from 'react'
import { AlertTriangle, X } from 'lucide-react'
import { cn } from '@lib/utils'
import { Button } from '@components/ui/Button'
import { Modal } from '@components/ui/Modal'

interface ConfirmDialogProps {
    isOpen: boolean
    title: string
    description: string
    confirmLabel?: string
    cancelLabel?: string
    variant?: 'danger' | 'default'
    isLoading?: boolean
    onConfirm: () => void
    onCancel: () => void
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
    isOpen,
    title,
    description,
    confirmLabel = 'Confirmar',
    cancelLabel = 'Cancelar',
    variant = 'danger',
    isLoading = false,
    onConfirm,
    onCancel,
}) => {
    return (
        <Modal open={isOpen} onClose={onCancel} className="max-w-md" >
            <div role="dialog" aria-modal="true" aria-labelledby="confirm-title">
                <button
                    onClick={onCancel}
                    className="absolute right-4 top-4 btn-ghost !min-h-0 !rounded-full p-1.5"
                    aria-label="Cerrar"
                >
                    <X className="w-4 h-4" />
                </button>

                <div className="flex items-start gap-4 pr-10">
                    {variant === 'danger' ? (
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-500/12 text-red-300 shadow-[0_0_24px_rgba(255,113,108,0.14)]">
                            <AlertTriangle className="w-5 h-5" />
                        </div>
                    ) : null}

                    <div className="min-w-0">
                        <p className="page-kicker">Action Check</p>
                        <h3 id="confirm-title" className="mt-2 font-headline text-2xl font-extrabold tracking-tight text-white">
                            {title}
                        </h3>
                        <p className="mt-2 text-sm leading-relaxed text-gray-400">{description}</p>
                    </div>
                </div>

                <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                    <Button onClick={onCancel} disabled={isLoading} variant="secondary">
                        {cancelLabel}
                    </Button>
                    <Button
                        onClick={onConfirm}
                        disabled={isLoading}
                        variant={variant === 'danger' ? 'danger' : 'primary'}
                        className={cn(variant === 'danger' ? 'btn-danger' : 'btn-primary')}
                    >
                        {isLoading ? (
                            <span className="inline-flex items-center gap-2">
                                <span className="w-4 h-4 rounded-full border-2 border-current border-t-transparent animate-spin" />
                                Procesando...
                            </span>
                        ) : (
                            confirmLabel
                        )}
                    </Button>
                </div>
            </div>
        </Modal>
    )
}
