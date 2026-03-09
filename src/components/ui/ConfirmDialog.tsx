import React from 'react'
import { AlertTriangle, X } from 'lucide-react'
import { cn } from '@lib/utils'

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

/**
 * Modal confirmation dialog for destructive actions.
 * Uses native dialog-like overlay for accessibility.
 */
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
    if (!isOpen) return null

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="confirm-title"
        >
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/70 backdrop-blur-sm"
                onClick={onCancel}
                aria-hidden="true"
            />

            {/* Panel */}
            <div className="relative card p-6 w-full max-w-sm animate-slide-up">
                {/* Close button */}
                <button
                    onClick={onCancel}
                    className="absolute top-4 right-4 btn-ghost p-1.5 rounded-lg"
                    aria-label="Cerrar"
                >
                    <X className="w-4 h-4" />
                </button>

                <div className="flex items-start gap-4 mb-4">
                    {variant === 'danger' && (
                        <div className="w-10 h-10 rounded-full bg-red-500/20 border border-red-500/30 flex items-center justify-center flex-shrink-0">
                            <AlertTriangle className="w-5 h-5 text-red-400" />
                        </div>
                    )}
                    <div>
                        <h3 id="confirm-title" className="text-base font-semibold text-white">
                            {title}
                        </h3>
                        <p className="text-sm text-gray-400 mt-1">{description}</p>
                    </div>
                </div>

                <div className="flex gap-3 justify-end">
                    <button
                        onClick={onCancel}
                        disabled={isLoading}
                        className="btn-secondary text-sm px-4 py-2"
                    >
                        {cancelLabel}
                    </button>
                    <button
                        onClick={onConfirm}
                        disabled={isLoading}
                        className={cn(
                            'btn text-sm px-4 py-2',
                            variant === 'danger' ? 'btn-danger' : 'btn-primary'
                        )}
                    >
                        {isLoading ? (
                            <span className="flex items-center gap-2">
                                <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                                Procesando...
                            </span>
                        ) : (
                            confirmLabel
                        )}
                    </button>
                </div>
            </div>
        </div>
    )
}
