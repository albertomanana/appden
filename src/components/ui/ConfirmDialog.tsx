import React from 'react'
import { AlertTriangle, X } from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'
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
        <AnimatePresence>
            {isOpen ? (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[110] flex items-center justify-center p-4"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="confirm-title"
                >
                    <motion.button
                        type="button"
                        aria-label="Cerrar"
                        className="absolute inset-0 bg-black/75 backdrop-blur-md"
                        onClick={onCancel}
                    />

                    <motion.div
                        initial={{ opacity: 0, y: 18, scale: 0.96 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 12, scale: 0.97 }}
                        transition={{ duration: 0.24, ease: 'easeOut' }}
                        className="relative w-full max-w-md overflow-hidden rounded-[1.8rem] border border-white/10 bg-[linear-gradient(180deg,rgba(26,25,25,0.94)_0%,rgba(14,14,14,0.96)_100%)] p-6 shadow-card"
                    >
                        <div className="absolute inset-x-0 top-0 h-px bg-white/10" />

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
                            <button
                                onClick={onCancel}
                                disabled={isLoading}
                                className="btn-secondary"
                            >
                                {cancelLabel}
                            </button>
                            <button
                                onClick={onConfirm}
                                disabled={isLoading}
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
                            </button>
                        </div>
                    </motion.div>
                </motion.div>
            ) : null}
        </AnimatePresence>
    )
}
