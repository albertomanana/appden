import React from 'react'
import { AlertCircle, RotateCw } from 'lucide-react'
import { cn } from '@lib/utils'

interface ErrorNoticeProps {
    title?: string
    error?: unknown
    message?: string
    onRetry?: () => void
    className?: string
}

/** Inline error banner with an optional retry action. Never hides a failed query as "no data". */
export const ErrorNotice: React.FC<ErrorNoticeProps> = ({
    title = 'Algo ha fallado',
    error,
    message,
    onRetry,
    className,
}) => {
    const detail = message ?? (error instanceof Error ? error.message : typeof error === 'object' && error && 'message' in error ? String((error as { message: unknown }).message) : null)

    return (
        <div role="alert" className={cn('notice-error flex items-start gap-3', className)}>
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-300" />
            <div className="min-w-0 flex-1">
                <p className="font-semibold text-red-100">{title}</p>
                {detail ? <p className="mt-0.5 break-words text-sm text-red-100/75">{detail}</p> : null}
            </div>
            {onRetry ? (
                <button type="button" onClick={onRetry} className="icon-btn -my-1.5 -mr-2 text-red-100" aria-label="Reintentar">
                    <RotateCw className="h-4 w-4" />
                </button>
            ) : null}
        </div>
    )
}
