import React from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { cn } from '@lib/utils'

interface ModalProps {
    open: boolean
    onClose: () => void
    children: React.ReactNode
    className?: string
}

export const Modal: React.FC<ModalProps> = ({ open, onClose, children, className }) => {
    return (
        <AnimatePresence>
            {open ? (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[110] flex items-center justify-center p-4"
                >
                    <button
                        type="button"
                        className="absolute inset-0 bg-black/80 backdrop-blur-xl"
                        onClick={onClose}
                        aria-label="Cerrar modal"
                    />
                    <motion.div
                        initial={{ opacity: 0, y: 28, scale: 0.96 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 18, scale: 0.98 }}
                        transition={{ duration: 0.24, ease: 'easeOut' }}
                        className={cn('relative w-full max-w-lg rounded-[1.5rem] bg-[#1a1919] p-6 shadow-[0_30px_90px_rgba(0,0,0,0.45)]', className)}
                    >
                        {children}
                    </motion.div>
                </motion.div>
            ) : null}
        </AnimatePresence>
    )
}
