import React, { useState } from 'react'
import { Heart, MoreHorizontal, Play } from 'lucide-react'
import { usePlayerStore } from '@app/store/player.store'
import type { ActionSheetItem } from '@components/ui/ActionSheet'
import { Cover, EqualizerBars } from '@components/music/Cover'
import { SongActionsSheet } from '@components/music/SongActionsSheet'
import { useFavoriteToggle } from '@hooks/useFavoriteToggle'
import { useLongPress } from '@hooks/useLongPress'
import { cn, formatDuration } from '@lib/utils'
import type { Song } from '@/types'

interface SongCardProps {
    song: Song
    onPlay: () => void
    showArtist?: boolean
    onEdit?: () => void
    /** Extra contextual actions (e.g. "Quitar de la playlist"). */
    extraActions?: ActionSheetItem[]
    /** Optional track number shown on the left of the cover. */
    index?: number
    /** Hide the cover (album tracklists). */
    hideCover?: boolean
}

/**
 * Compact, touch-first song row. Tapping the row plays the song; the "more"
 * button opens a bottom sheet with every secondary action.
 */
export const SongCard: React.FC<SongCardProps> = ({ song, onPlay, showArtist = true, onEdit, extraActions, index, hideCover = false }) => {
    const currentSong = usePlayerStore((state) => state.currentSong)
    const isPlaying = usePlayerStore((state) => state.isPlaying)
    const togglePlay = usePlayerStore((state) => state.togglePlay)
    const favorite = useFavoriteToggle(song.id, song.is_favorite)
    const isCurrentSong = currentSong?.id === song.id
    const isThisPlaying = isCurrentSong && isPlaying
    const [showActions, setShowActions] = useState(false)
    // The sheets are only mounted once the menu has been opened (long lists stay light).
    const [actionsMounted, setActionsMounted] = useState(false)

    const handlePrimary = () => {
        if (isCurrentSong) {
            togglePlay()
            return
        }
        onPlay()
    }

    const openActions = () => {
        setActionsMounted(true)
        setShowActions(true)
    }

    // Hold a row to see the song's details (artists, album, who uploaded it) and its actions.
    const longPress = useLongPress(openActions)

    const subtitle = showArtist ? song.artist_name : song.album_name ?? song.artist_name

    return (
        <>
            <div
                {...longPress}
                className={cn(
                    'group flex select-none items-center gap-3 rounded-2xl py-1.5 pl-1.5 pr-0.5 transition-[background-color,transform] duration-200 [-webkit-touch-callout:none] active:scale-[0.985]',
                    isCurrentSong ? 'bg-brand-400/[0.08]' : 'active:bg-white/[0.05] md:hover:translate-x-0.5 md:hover:bg-white/[0.04]'
                )}
            >
                {index != null ? (
                    <span className="grid w-6 shrink-0 place-items-center text-center text-sm font-medium tabular text-gray-500">
                        {isCurrentSong ? <EqualizerBars playing={isThisPlaying} className="text-brand-300" /> : index + 1}
                    </span>
                ) : null}

                <button
                    type="button"
                    onClick={handlePrimary}
                    className={cn('flex min-w-0 flex-1 items-center gap-3 text-left', hideCover && 'min-h-[3rem]')}
                    aria-label={isThisPlaying ? `Pausar ${song.title}` : `Reproducir ${song.title}`}
                >
                    {hideCover ? null : (
                        <Cover src={song.cover_url} alt="" seed={song.id} className="h-12 w-12 rounded-xl">
                            {isCurrentSong && index == null ? (
                                <span className="absolute inset-0 grid place-items-center bg-black/45 text-white">
                                    <EqualizerBars playing={isThisPlaying} />
                                </span>
                            ) : (
                                <span className="absolute inset-0 hidden place-items-center bg-black/45 text-white md:group-hover:grid">
                                    <Play className="ml-0.5 h-5 w-5 fill-current" />
                                </span>
                            )}
                        </Cover>
                    )}
                    <span className="min-w-0 flex-1">
                        <span className={cn('block truncate text-[15px] font-semibold', isCurrentSong ? 'text-brand-200' : 'text-white')}>
                            {song.title}
                        </span>
                        <span className="mt-0.5 flex items-center gap-1.5 text-[13px] text-gray-400">
                            {favorite.isFavorite ? <Heart className="h-3 w-3 shrink-0 fill-pink-400 text-pink-400" aria-label="Favorita" /> : null}
                            <span className="truncate">
                                {subtitle}
                                {song.duration_seconds ? <span className="text-gray-500"> · {formatDuration(song.duration_seconds)}</span> : null}
                            </span>
                        </span>
                    </span>
                </button>

                <button
                    type="button"
                    onClick={favorite.toggle}
                    className={cn('icon-btn hidden md:inline-grid', favorite.isFavorite ? 'text-pink-400' : 'text-gray-500')}
                    aria-label={favorite.isFavorite ? 'Quitar de favoritas' : 'Añadir a favoritas'}
                    aria-pressed={favorite.isFavorite}
                >
                    <Heart className={cn('h-[18px] w-[18px]', favorite.isFavorite && 'fill-current')} />
                </button>
                <button type="button" onClick={openActions} className="icon-btn text-gray-400" aria-label={`Más opciones de ${song.title}`}>
                    <MoreHorizontal className="h-5 w-5" />
                </button>
            </div>

            {actionsMounted ? (
                <SongActionsSheet
                    song={song}
                    open={showActions}
                    onClose={() => setShowActions(false)}
                    favorite={favorite}
                    isCurrent={isCurrentSong}
                    isPlaying={isPlaying}
                    onPrimary={handlePrimary}
                    onEdit={onEdit}
                    extraActions={extraActions}
                />
            ) : null}
        </>
    )
}
