import React from 'react'
import { Avatar } from '@components/common/Avatar'
import { cn } from '@lib/utils'
import type { Profile } from '@/types'

export type PersonSummary = Pick<Profile, 'id' | 'display_name'> & Partial<Pick<Profile, 'username' | 'avatar_url'>>

interface PersonRowProps {
    person: PersonSummary
    /** Second line. Defaults to @username. */
    subtitle?: React.ReactNode
    /** Inline badge right after the name (e.g. "Tú"). */
    badge?: React.ReactNode
    /** Tapping the avatar/name area. */
    onOpen?: () => void
    openLabel?: string
    /** Trailing controls (buttons, badges, ⋯). */
    children?: React.ReactNode
    className?: string
}

/** One person inside a `list-group`: avatar, name, @username and trailing actions. */
export const PersonRow: React.FC<PersonRowProps> = ({ person, subtitle, badge, onOpen, openLabel, children, className }) => {
    const body = (
        <>
            <Avatar src={person.avatar_url} name={person.display_name} size="md" />
            <span className="min-w-0 flex-1">
                <span className="flex min-w-0 items-center gap-1.5">
                    <span className="truncate text-[15px] font-semibold text-white">{person.display_name || 'Usuario'}</span>
                    {badge}
                </span>
                <span className="block truncate text-[13px] text-gray-400">
                    {subtitle ?? (person.username ? `@${person.username}` : 'Sin nombre de usuario')}
                </span>
            </span>
        </>
    )

    return (
        <div className={cn('list-row', className)}>
            {onOpen ? (
                <button
                    type="button"
                    onClick={onOpen}
                    aria-label={openLabel}
                    className="-my-3 flex min-h-[3.5rem] min-w-0 flex-1 items-center gap-3 py-3 text-left"
                >
                    {body}
                </button>
            ) : (
                <div className="flex min-w-0 flex-1 items-center gap-3">{body}</div>
            )}
            {children ? <div className="flex shrink-0 items-center gap-1.5">{children}</div> : null}
        </div>
    )
}

/** Small "Tú" pill shown next to your own name. */
export const YouPill: React.FC = () => (
    <span className="shrink-0 rounded-full bg-white/[0.08] px-2 py-0.5 text-[11px] font-semibold text-gray-300">Tú</span>
)
