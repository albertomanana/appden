import React, { useEffect, useId } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion, useDragControls, type PanInfo } from 'framer-motion'
import { X } from 'lucide-react'
import { cn } from '@lib/utils'
import { useIsMobile } from '@hooks/useMediaQuery'

interface ModalProps {
    open: boolean
    onClose: () => void
    children: React.ReactNode
    className?: string
    /** Optional header title. When set, the sheet renders a sticky header with a close button. */
    title?: React.ReactNode
    description?: React.ReactNode
    /** Content rendered in a sticky footer (primary actions). */
    footer?: React.ReactNode
    size?: 'sm' | 'md' | 'lg'
}

const sizeClass = {
    sm: 'sm:max-w-md',
    md: 'sm:max-w-lg',
    lg: 'sm:max-w-2xl',
}

let openCount = 0

function lockScroll() {
    openCount += 1
    if (openCount === 1) {
        document.documentElement.dataset.scrollLocked = 'true'
        document.body.style.overflow = 'hidden'
        const root = document.querySelector<HTMLElement>('[data-scroll-root]')
        if (root) root.style.overflow = 'hidden'
    }
}

function unlockScroll() {
    openCount = Math.max(0, openCount - 1)
    if (openCount === 0) {
        delete document.documentElement.dataset.scrollLocked
        document.body.style.overflow = ''
        const root = document.querySelector<HTMLElement>('[data-scroll-root]')
        if (root) root.style.overflow = ''
    }
}

/**
 * Responsive dialog: a draggable bottom sheet on phones, a centered card on larger screens.
 * Rendered in a portal so it always sits above the shell (header, dock, mini player).
 */
export const Modal: React.FC<ModalProps> = ({
    open,
    onClose,
    children,
    className,
    title,
    description,
    footer,
    size = 'md',
}) => {
    const isMobile = useIsMobile()
    const dragControls = useDragControls()
    const titleId = useId()

    useEffect(() => {
        if (!open) return
        lockScroll()
        const onKey = (event: KeyboardEvent) => {
            if (event.key === 'Escape') onClose()
        }
        window.addEventListener('keydown', onKey)
        return () => {
            window.removeEventListener('keydown', onKey)
            unlockScroll()
        }
    }, [open, onClose])

    const handleDragEnd = (_event: unknown, info: PanInfo) => {
        if (info.offset.y > 120 || info.velocity.y > 600) onClose()
    }

    const startDrag = (event: React.PointerEvent) => {
        if (isMobile) dragControls.start(event)
    }

    if (typeof document === 'undefined') return null

    return createPortal(
        <AnimatePresence>
            {open ? (
                <motion.div
                    key="modal-root"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.18 }}
                    className="fixed inset-0 z-[110] flex items-end justify-center sm:items-center sm:p-4"
                >
                    <button
                        type="button"
                        tabIndex={-1}
                        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
                        onClick={onClose}
                        aria-label="Cerrar"
                    />
                    <motion.div
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby={title ? titleId : undefined}
                        initial={isMobile ? { y: '100%' } : { opacity: 0, y: 16, scale: 0.97 }}
                        animate={isMobile ? { y: 0 } : { opacity: 1, y: 0, scale: 1 }}
                        exit={isMobile ? { y: '100%' } : { opacity: 0, y: 10, scale: 0.98 }}
                        transition={isMobile ? { type: 'spring', stiffness: 420, damping: 40 } : { duration: 0.2, ease: 'easeOut' }}
                        drag={isMobile ? 'y' : false}
                        dragControls={dragControls}
                        dragListener={false}
                        dragConstraints={{ top: 0, bottom: 0 }}
                        dragElastic={{ top: 0, bottom: 0.6 }}
                        onDragEnd={handleDragEnd}
                        className={cn(
                            'relative flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-[1.75rem] border border-white/[0.08] bg-[#17171a] shadow-[0_-20px_80px_rgba(0,0,0,0.5)]',
                            'sm:max-h-[88dvh] sm:rounded-[1.5rem]',
                            sizeClass[size],
                            className
                        )}
                    >
                        <div onPointerDown={startDrag} className="shrink-0 touch-none sm:touch-auto">
                            <div className="flex justify-center pb-1 pt-2.5 sm:hidden">
                                <span className="h-1.5 w-10 rounded-full bg-white/20" />
                            </div>
                            {title ? (
                                <div className="flex items-start gap-3 px-5 pb-3 pt-2 sm:px-6 sm:pt-5">
                                    <div className="min-w-0 flex-1">
                                        <h2 id={titleId} className="font-headline text-xl font-extrabold tracking-tight text-white">
                                            {title}
                                        </h2>
                                        {description ? <p className="mt-1 text-sm text-gray-400">{description}</p> : null}
                                    </div>
                                    <button type="button" onClick={onClose} className="icon-btn -mr-2 -mt-1.5" aria-label="Cerrar">
                                        <X className="h-5 w-5" />
                                    </button>
                                </div>
                            ) : null}
                        </div>

                        <div
                            className={cn(
                                'min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 sm:px-6',
                                title ? 'pb-5' : 'pb-5 pt-3 sm:pt-6',
                                !footer && 'pb-[calc(env(safe-area-inset-bottom)+1.25rem)] sm:pb-6'
                            )}
                        >
                            {children}
                        </div>

                        {footer ? (
                            <div className="shrink-0 border-t border-white/[0.06] bg-[#17171a] px-5 pb-[calc(env(safe-area-inset-bottom)+1rem)] pt-3 sm:px-6 sm:pb-5">
                                {footer}
                            </div>
                        ) : null}
                    </motion.div>
                </motion.div>
            ) : null}
        </AnimatePresence>,
        document.body
    )
}
