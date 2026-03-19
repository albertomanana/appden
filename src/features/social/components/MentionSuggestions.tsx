import React from 'react'
import type { MentionOption } from '@features/social/types'

type MentionSuggestionsProps = {
    options: MentionOption[]
    onSelect: (option: MentionOption) => void
}

export const MentionSuggestions: React.FC<MentionSuggestionsProps> = ({ options, onSelect }) => {
    if (options.length === 0) return null

    return (
        <div className="rounded-xl border border-surface-500 bg-surface-800/70 p-2 flex flex-wrap gap-2">
            {options.slice(0, 6).map((option) => (
                <button
                    key={option.id}
                    type="button"
                    onClick={() => onSelect(option)}
                    className="rounded-full border border-surface-400 bg-surface-700 px-2.5 py-1 text-xs text-gray-200 hover:text-white"
                >
                    @{option.token}
                </button>
            ))}
        </div>
    )
}

