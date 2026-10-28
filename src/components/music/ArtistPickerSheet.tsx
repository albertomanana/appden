import React from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import { Modal } from '@components/ui/Modal'
import { Avatar } from '@components/common/Avatar'
import { ROUTES } from '@lib/constants'
import type { ArtistRef } from '@features/music/types'

interface ArtistPickerSheetProps {
    open: boolean
    onClose: () => void
    artists: ArtistRef[]
}

/** Small sheet to choose which credited member to open when a song has several. */
export const ArtistPickerSheet: React.FC<ArtistPickerSheetProps> = ({ open, onClose, artists }) => {
    const navigate = useNavigate()

    return (
        <Modal open={open} onClose={onClose} title="Ver artista" size="sm">
            <div className="-mx-2 space-y-0.5">
                {artists.map((artist) => (
                    <button
                        key={artist.key}
                        type="button"
                        onClick={() => {
                            onClose()
                            if (artist.profileId) navigate(ROUTES.ARTIST(artist.profileId))
                        }}
                        className="flex min-h-[3.5rem] w-full items-center gap-3 rounded-2xl px-2 text-left transition-colors active:bg-white/[0.06] md:hover:bg-white/[0.04]"
                    >
                        <Avatar src={artist.avatarUrl} name={artist.name} size="md" />
                        <span className="min-w-0 flex-1 truncate text-[15px] font-semibold text-white">{artist.name}</span>
                        <ChevronRight className="h-5 w-5 shrink-0 text-gray-500" />
                    </button>
                ))}
            </div>
        </Modal>
    )
}
