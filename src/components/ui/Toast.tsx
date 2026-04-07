import React, { createContext, useCallback, useContext, useMemo, useState } from 'react'
import { AlertCircle, CheckCircle, Info, X, XCircle } from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'
import { cn } from '@lib/utils'

export type ToastType = 'success' | 'error' | 'warning' | 'info'

export interface Toast {
    id: string
    type: ToastType
    title: string
    description?: string
    duration?: number
}

interface ToastContextValue {
    toasts: Toast[]
    toast: (opts: Omit<Toast, 'id'>) => void
    success: (title: string, description?: string) => void
    error: (title: string, description?: string) => void
    warning: (title: string, description?: string) => void
    info: (title: string, description?: string) => void
    dismiss: (id: string) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

export function useToast(): ToastContextValue {
    const ctx = useContext(ToastContext)
    if (!ctx) throw new Error('useToast must be used inside ToastProvider')
    return ctx
}

const icons: Record<ToastType, React.ReactNode> = {
    success: <CheckCircle className="w-5 h-5 text-emerald-300 flex-shrink-0" />,
    error: <XCircle className="w-5 h-5 text-red-300 flex-shrink-0" />,
    warning: <AlertCircle className="w-5 h-5 text-amber-300 flex-shrink-0" />,
    info: <Info className="w-5 h-5 text-brand-300 flex-shrink-0" />,
}

const accentClasses: Record<ToastType, string> = {
    success: 'from-emerald-400/20 to-emerald-300/5 border-emerald-300/20',
    error: 'from-red-400/20 to-red-300/5 border-red-300/20',
    warning: 'from-amber-400/20 to-amber-300/5 border-amber-300/20',
    info: 'from-brand-400/20 to-brand-300/5 border-brand-300/20',
}

interface ToastItemProps {
    toast: Toast
    onDismiss: (id: string) => void
}

const ToastItem: React.FC<ToastItemProps> = ({ toast, onDismiss }) => {
    React.useEffect(() => {
        const timeout = window.setTimeout(() => onDismiss(toast.id), toast.duration ?? 4000)
        return () => window.clearTimeout(timeout)
    }, [onDismiss, toast.duration, toast.id])

    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 18, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.96 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            className={cn(
                'relative overflow-hidden w-full max-w-sm rounded-[1.35rem] border backdrop-blur-2xl',
                'bg-[linear-gradient(180deg,rgba(26,25,25,0.92)_0%,rgba(14,14,14,0.94)_100%)] shadow-card',
                accentClasses[toast.type]
            )}
        >
            <div className="absolute inset-x-0 top-0 h-px bg-white/10" />
            <div className="flex items-start gap-3 p-4">
                <div className="mt-0.5">{icons[toast.type]}</div>
                <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-white">{toast.title}</p>
                    {toast.description ? (
                        <p className="mt-1 text-xs leading-relaxed text-gray-400">{toast.description}</p>
                    ) : null}
                </div>
                <button
                    onClick={() => onDismiss(toast.id)}
                    className="btn-ghost !min-h-0 !rounded-full p-1 text-gray-500 hover:text-white"
                    aria-label="Cerrar"
                >
                    <X className="w-4 h-4" />
                </button>
            </div>
        </motion.div>
    )
}

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [toasts, setToasts] = useState<Toast[]>([])

    const dismiss = useCallback((id: string) => {
        setToasts((prev) => prev.filter((toast) => toast.id !== id))
    }, [])

    const toast = useCallback((opts: Omit<Toast, 'id'>) => {
        const id = crypto.randomUUID()
        setToasts((prev) => [...prev.slice(-4), { ...opts, id }])
    }, [])

    const success = useCallback((title: string, description?: string) => {
        toast({ type: 'success', title, description })
    }, [toast])

    const error = useCallback((title: string, description?: string) => {
        toast({ type: 'error', title, description, duration: 6000 })
    }, [toast])

    const warning = useCallback((title: string, description?: string) => {
        toast({ type: 'warning', title, description })
    }, [toast])

    const info = useCallback((title: string, description?: string) => {
        toast({ type: 'info', title, description })
    }, [toast])

    const value = useMemo(
        () => ({ toasts, toast, success, error, warning, info, dismiss }),
        [dismiss, error, info, success, toast, toasts, warning]
    )

    return (
        <ToastContext.Provider value={value}>
            {children}
            <div className="pointer-events-none fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+6.9rem)] z-[120] flex justify-center px-3 safe-left safe-right md:inset-x-auto md:right-6 md:justify-end md:px-0 md:bottom-6">
                <div className="flex w-full max-w-sm flex-col gap-2">
                    <AnimatePresence initial={false}>
                        {toasts.map((item) => (
                            <div key={item.id} className="pointer-events-auto">
                                <ToastItem toast={item} onDismiss={dismiss} />
                            </div>
                        ))}
                    </AnimatePresence>
                </div>
            </div>
        </ToastContext.Provider>
    )
}
