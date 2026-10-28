import React from 'react'
import { AlertTriangle } from 'lucide-react'
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
        <Modal open={isOpen} onClose={isLoading ? () => undefined : onCancel} size="sm">
            <div className="flex flex-col items-center text-center sm:items-start sm:text-left">
                {variant === 'danger' ? (
                    <div className="mb-4 grid h-12 w-12 place-items-center rounded-2xl bg-red-500/12 text-red-300">
                        <AlertTriangle className="h-5 w-5" />
                    </div>
                ) : null}
                <h3 className="font-headline text-xl font-extrabold tracking-tight text-white">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-gray-400">{description}</p>
            </div>

            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <Button onClick={onCancel} disabled={isLoading} variant="secondary" className="w-full sm:w-auto">
                    {cancelLabel}
                </Button>
                <Button
                    onClick={onConfirm}
                    disabled={isLoading}
                    variant={variant === 'danger' ? 'danger' : 'primary'}
                    className="w-full sm:w-auto"
                >
                    {isLoading ? (
                        <span className="inline-flex items-center gap-2">
                            <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                            Procesando...
                        </span>
                    ) : (
                        confirmLabel
                    )}
                </Button>
            </div>
        </Modal>
    )
}
