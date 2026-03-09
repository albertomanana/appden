import React, { createContext, useContext, useCallback, useState, useEffect } from 'react'
import { CheckCircle, XCircle, AlertCircle, Info, X } from 'lucide-react'
import { cn } from '@lib/utils'

// ── Types ────────────────────────────────────────────────────

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

// ── Context ──────────────────────────────────────────────────

const ToastContext = createContext<ToastContextValue | null>(null)

export function useToast(): ToastContextValue {
    const ctx = useContext(ToastContext)
    if (!ctx) throw new Error('useToast must be used inside ToastProvider')
    return ctx
}

// ── Toast Item ───────────────────────────────────────────────

const icons: Record<ToastType, React.ReactNode> = {
    success: <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0" />,
    error: <XCircle className="w-5 h-5 text-red-400 flex-shrink-0" />,
    warning: <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0" />,
    info: <Info className="w-5 h-5 text-brand-400 flex-shrink-0" />,
}

const borderColors: Record<ToastType, string> = {
    success: 'border-l-emerald-500',
    error: 'border-l-red-500',
    warning: 'border-l-amber-500',
    info: 'border-l-brand-500',
}

interface ToastItemProps {
    toast: Toast
    onDismiss: (id: string) => void
}

const ToastItem: React.FC<ToastItemProps> = ({ toast, onDismiss }) => {
    const [visible, setVisible] = useState(false)

    useEffect(() => {
        // Animate in
        requestAnimationFrame(() => setVisible(true))
        // Auto-dismiss
        const duration = toast.duration ?? 4000
        const timer = setTimeout(() => {
            setVisible(false)
            setTimeout(() => onDismiss(toast.id), 300)
        }, duration)
        return () => clearTimeout(timer)
    }, [toast, onDismiss])

    return (
        <div
            className={cn(
                'flex items-start gap-3 w-full max-w-sm bg-surface-700 border border-surface-500 border-l-4 rounded-xl p-4 shadow-card',
                'transition-all duration-300',
                borderColors[toast.type],
                visible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-8'
            )}
        >
            {icons[toast.type]}
            <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white leading-tight">{toast.title}</p>
                {toast.description && (
                    <p className="text-xs text-gray-400 mt-0.5">{toast.description}</p>
                )}
            </div>
            <button
                onClick={() => onDismiss(toast.id)}
                className="text-gray-500 hover:text-gray-300 flex-shrink-0 mt-0.5 transition-colors"
                aria-label="Cerrar"
            >
                <X className="w-4 h-4" />
            </button>
        </div>
    )
}

// ── Provider ─────────────────────────────────────────────────

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [toasts, setToasts] = useState<Toast[]>([])

    const dismiss = useCallback((id: string) => {
        setToasts((prev) => prev.filter((t) => t.id !== id))
    }, [])

    const toast = useCallback((opts: Omit<Toast, 'id'>) => {
        const id = crypto.randomUUID()
        setToasts((prev) => [...prev.slice(-4), { ...opts, id }]) // max 5
    }, [])

    const success = useCallback((title: string, description?: string) =>
        toast({ type: 'success', title, description }), [toast])
    const error = useCallback((title: string, description?: string) =>
        toast({ type: 'error', title, description, duration: 6000 }), [toast])
    const warning = useCallback((title: string, description?: string) =>
        toast({ type: 'warning', title, description }), [toast])
    const info = useCallback((title: string, description?: string) =>
        toast({ type: 'info', title, description }), [toast])

    return (
        <ToastContext.Provider value={{ toasts, toast, success, error, warning, info, dismiss }}>
            {children}
            {/* Toast portal */}
            <div
                className="fixed bottom-20 right-4 z-50 flex flex-col gap-2 md:bottom-4"
                aria-live="polite"
                aria-atomic="false"
            >
                {toasts.map((t) => (
                    <ToastItem key={t.id} toast={t} onDismiss={dismiss} />
                ))}
            </div>
        </ToastContext.Provider>
    )
}
