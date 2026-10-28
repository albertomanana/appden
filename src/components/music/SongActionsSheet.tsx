import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Disc3, Edit2, FileText, Heart, ListEnd, ListMusic, ListPlus, Mic2, Pause, Play, Share2, Trash2 } from 'lucide-react'
import { useAdvancedPlayerStore } from '@features/player/player.store'
import type { PlayerSong } from '@features/player/player.types'
import { ActionSheet, type ActionSheetItem } from '@components/ui/ActionSheet'
import { ConfirmDialog } from '@components/ui/ConfirmDialog'
import { useToast } from '@components/ui/Toast'
import { Cover } from '@components/music/Cover'
import { AddToPlaylistSheet } from '@components/music/AddToPlaylistSheet'
import { ArtistPickerSheet } from '@components/music/ArtistPickerSheet'
import { useAuth } from '@hooks/useAuth'
import { useActiveGroup } from '@hooks/useActiveGroup'
import { ROUTES } from '@lib/constants'
import { songsService } from '@services/songs.service'
import { getSongAlbumRouteId, getSongMemberCredits } from '@features/music/utils/library'
import type { Song } from '@/types'

export interface SongActionsSheetProps {
    song: Song
    open: boolean
    onClose: () => void
    favorite: { isFavorite: boolean; toggle: () => void }
    isCurrent: boolean
    isPlaying: boolean
    /** Play (or pause when it is the current song). */
    onPrimary: () => void
    onEdit?: () => void
    extraActions?: ActionSheetItem[]
    /** On the song page the "Letra y comentarios" shortcut is redundant. */
    context?: 'list' | 'detail'
    onDeleted?: () => void
}

/** Every secondary action of a song, as a bottom sheet (+ the sheets it opens). */
export const SongActionsSheet: React.FC<SongActionsSheetProps> = ({
    song,
    open,
    onClose,
    favorite,
    isCurrent,
    isPlaying,
    onPrimary,
    onEdit,
    extraActions = [],
    context = 'list',
    onDeleted,
}) => {
    const navigate = useNavigate()
    const { userId } = useAuth()
    const { groupId } = useActiveGroup()
    const queryClient = useQueryClient()
    const { success, error: toastError, info } = useToast()
    const addToQueue = useAdvancedPlayerStore((state) => state.addToQueue)
    const playNext = useAdvancedPlayerStore((state) => state.playNext)
    const [showPlaylists, setShowPlaylists] = useState(false)
    const [showArtists, setShowArtists] = useState(false)
    const [showDelete, setShowDelete] = useState(false)

    const isOwner = !!userId && userId === song.uploaded_by
    const memberCredits = getSongMemberCredits(song)
    const albumRouteId = getSongAlbumRouteId(song)
    const isThisPlaying = isCurrent && isPlaying

    const { mutate: deleteSong, isPending: isDeleting } = useMutation({
        mutationFn: () => songsService.deleteSong(song.id),
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: ['songs', groupId] })
            void queryClient.invalidateQueries({ queryKey: ['favorites'] })
            void queryClient.invalidateQueries({ queryKey: ['playlists', groupId] })
            void queryClient.invalidateQueries({ queryKey: ['albums', groupId] })
            void queryClient.invalidateQueries({ queryKey: ['playlist'] })
            queryClient.removeQueries({ queryKey: ['song', song.id] })
            success('Canción eliminada', song.title)
            setShowDelete(false)
            onDeleted?.()
        },
        onError: (err) => {
            toastError('No se pudo eliminar la canción', err instanceof Error ? err.message : undefined)
        },
    })

    const share = async () => {
        const url = `${window.location.origin}${ROUTES.SONG(song.id)}`
        try {
            if (navigator.share) {
                await navigator.share({ title: song.title, text: `${song.title} · ${song.artist_name}`, url })
                return
            }
            await navigator.clipboard.writeText(url)
            success('Enlace copiado', 'Solo lo podrán abrir los miembros del grupo.')
        } catch {
            // The user closed the share sheet.
        }
    }

    const openArtist = () => {
        if (memberCredits.length === 1 && memberCredits[0].profileId) {
            navigate(ROUTES.ARTIST(memberCredits[0].profileId))
            return
        }
        setShowArtists(true)
    }

    const items: ActionSheetItem[] = [
        { label: isThisPlaying ? 'Pausar' : 'Reproducir', icon: isThisPlaying ? Pause : Play, onSelect: onPrimary },
        {
            label: 'Reproducir a continuación',
            icon: ListPlus,
            onSelect: () => {
                playNext(song as PlayerSong)
                info('Sonará a continuación', song.title)
            },
            hidden: isCurrent,
        },
        {
            label: 'Añadir a la cola',
            icon: ListEnd,
            onSelect: () => {
                addToQueue(song as PlayerSong)
                info('Añadida a la cola', song.title)
            },
            hidden: isCurrent,
        },
        { label: 'Añadir a playlist', icon: ListMusic, onSelect: () => setShowPlaylists(true) },
        { label: favorite.isFavorite ? 'Quitar de favoritas' : 'Añadir a favoritas', icon: Heart, onSelect: favorite.toggle },
        {
            label: memberCredits.length > 1 ? 'Ver artistas' : 'Ver artista',
            icon: Mic2,
            onSelect: openArtist,
            hidden: memberCredits.length === 0,
        },
        {
            label: 'Ver álbum',
            icon: Disc3,
            onSelect: () => albumRouteId && navigate(ROUTES.ALBUM(albumRouteId)),
            hidden: !albumRouteId,
        },
        {
            label: 'Letra y comentarios',
            icon: FileText,
            onSelect: () => navigate(ROUTES.SONG(song.id)),
            hidden: context === 'detail',
        },
        { label: 'Compartir', icon: Share2, onSelect: () => void share() },
        ...extraActions,
        { label: 'Editar', icon: Edit2, onSelect: () => onEdit?.(), hidden: !isOwner || !onEdit },
        { label: 'Eliminar', icon: Trash2, onSelect: () => setShowDelete(true), tone: 'danger', hidden: !isOwner },
    ]

    return (
        <>
            <ActionSheet
                open={open}
                onClose={onClose}
                header={
                    <div className="flex items-center gap-3">
                        <Cover src={song.cover_url} alt="" seed={song.id} className="h-14 w-14 rounded-xl" />
                        <div className="min-w-0">
                            <p className="truncate font-semibold text-white">{song.title}</p>
                            <p className="truncate text-sm text-gray-400">
                                {song.artist_name}
                                {song.album_name ? <span className="text-gray-500"> · {song.album_name}</span> : null}
                            </p>
                        </div>
                    </div>
                }
                items={items}
            />

            <AddToPlaylistSheet song={song} open={showPlaylists} onClose={() => setShowPlaylists(false)} />
            {memberCredits.length > 1 ? (
                <ArtistPickerSheet open={showArtists} onClose={() => setShowArtists(false)} artists={memberCredits} />
            ) : null}

            <ConfirmDialog
                isOpen={showDelete}
                title="¿Eliminar canción?"
                description={`«${song.title}» se borrará para todo el grupo, también de las playlists. No se puede deshacer.`}
                variant="danger"
                isLoading={isDeleting}
                confirmLabel="Eliminar"
                onConfirm={() => deleteSong()}
                onCancel={() => setShowDelete(false)}
            />
        </>
    )
}
