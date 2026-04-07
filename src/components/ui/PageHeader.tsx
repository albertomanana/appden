import React from 'react'
import { cn } from '@lib/utils'

type PageHeaderProps = {
    kicker?: string
    title: string
    description?: string
    meta?: React.ReactNode
    actions?: React.ReactNode
    className?: string
}

export const PageHeader: React.FC<PageHeaderProps> = ({
    kicker,
    title,
    description,
    meta,
    actions,
    className,
}) => {
    return (
        <section className={cn('page-hero', className)}>
            <div className="relative z-10 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
                <div className="min-w-0 max-w-3xl">
                    {kicker ? <p className="page-kicker">{kicker}</p> : null}
                    <h1 className="page-title mt-2">{title}</h1>
                    {description ? (
                        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-gray-400 md:text-base">
                            {description}
                        </p>
                    ) : null}
                    {meta ? <div className="mt-4 flex flex-wrap items-center gap-2">{meta}</div> : null}
                </div>

                {actions ? <div className="flex flex-wrap items-center gap-2 md:justify-end">{actions}</div> : null}
            </div>
        </section>
    )
}
