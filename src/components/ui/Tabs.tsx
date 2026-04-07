import React from 'react'
import { Link } from 'react-router-dom'
import { cn } from '@lib/utils'

export type TabItem = {
    label: string
    href?: string
    value: string
}

interface TabsProps {
    items: TabItem[]
    active: string
    onChange?: (value: string) => void
    className?: string
}

export const Tabs: React.FC<TabsProps> = ({ items, active, onChange, className }) => {
    return (
        <div className={cn('flex flex-wrap items-center gap-2', className)}>
            {items.map((item) => {
                const tabClass = cn(
                    'inline-flex items-center justify-center rounded-full px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.22em] transition-all',
                    active === item.value
                        ? 'bg-secondary text-white shadow-[0_0_12px_rgba(172,138,255,0.35)]'
                        : 'bg-surface-700 text-gray-400 hover:text-white'
                )

                if (item.href) {
                    return (
                        <Link key={item.value} to={item.href} className={tabClass}>
                            {item.label}
                        </Link>
                    )
                }

                return (
                    <button
                        key={item.value}
                        type="button"
                        onClick={() => onChange?.(item.value)}
                        className={tabClass}
                    >
                        {item.label}
                    </button>
                )
            })}
        </div>
    )
}
