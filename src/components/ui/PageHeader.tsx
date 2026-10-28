import React from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft } from 'lucide-react'
import { cn } from '@lib/utils'

type PageHeaderProps = {
    kicker?: string
    title: React.ReactNode
    description?: React.ReactNode
    meta?: React.ReactNode
    actions?: React.ReactNode
    className?: string
    /** Shows a back button. `true` goes back in history; a string navigates to that path. */
    back?: boolean | string
}

export const PageHeader: React.FC<PageHeaderProps> = ({
    kicker,
    title,
    description,
    meta,
    actions,
    className,
    back,
}) => {
    const navigate = useNavigate()

    const handleBack = () => {
        if (typeof back === 'string') {
            navigate(back)
            return
        }
        if (window.history.length > 1) navigate(-1)
        else navigate('/')
    }

    return (
        <section className={cn('page-hero', className)}>
            {back ? (
                <button type="button" onClick={handleBack} className="-ml-2 mb-2 inline-flex min-h-[2.5rem] items-center gap-0.5 rounded-full pl-1 pr-3 text-sm font-medium text-gray-300 active:bg-white/5">
                    <ChevronLeft className="h-5 w-5" />
                    Volver
                </button>
            ) : null}
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                    {kicker ? <p className="page-kicker mb-1.5">{kicker}</p> : null}
                    <h1 className="page-title break-words">{title}</h1>
                    {description ? (
                        <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-gray-400 md:text-base">{description}</p>
                    ) : null}
                </div>

                {actions ? <div className="flex shrink-0 items-center gap-2 pt-0.5">{actions}</div> : null}
            </div>
            {meta ? <div className="mt-3 flex flex-wrap items-center gap-2">{meta}</div> : null}
        </section>
    )
}

/** Section heading used inside pages ("Recientes", "Miembros"...). */
export const SectionHeader: React.FC<{
    title: React.ReactNode
    action?: React.ReactNode
    description?: React.ReactNode
    className?: string
}> = ({ title, action, description, className }) => (
    <div className={cn('mb-3 flex items-end justify-between gap-3', className)}>
        <div className="min-w-0">
            <h2 className="section-title">{title}</h2>
            {description ? <p className="mt-0.5 text-sm text-gray-400">{description}</p> : null}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
    </div>
)
