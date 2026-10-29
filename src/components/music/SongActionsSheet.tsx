import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
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
import { canDeleteSong, canEditSong } from '@features/music/utils/permissions'
import { formatDuration, formatRelative } from '@lib/utils'
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

    const canEdit = canEditSong(song, userId)
    const canDelete = canDeleteSong(song, userId)
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
        { label: 'Editar', icon: Edit2, onSelect: () => onEdit?.(), hidden: !canEdit || !onEdit },
        { label: 'Eliminar', icon: Trash2, onSelect: () => setShowDelete(true), tone: 'danger', hidden: !canDelete },
    ]

    return (
        <>
            <ActionSheet
                open={open}
                onClose={onClose}
                header={
                    <div className="flex items-start gap-4">
                        <Cover src={song.cover_url} alt="" seed={song.id} className="h-20 w-20 rounded-2xl shadow-[0_12px_32px_rgba(0,0,0,0.4)]" iconClassName="h-7 w-7" />
                        <div className="min-w-0 flex-1">
                            <p className="truncate text-lg font-bold text-white">{song.title}</p>
                            <p className="mt-0.5 text-sm text-gray-300">
                                {memberCredits.length > 0
                                    ? memberCredits.map((artist, index) => (
                                          <React.Fragment key={artist.key}>
                                              {index > 0 ? ', ' : null}
                                              <Link to={ROUTES.ARTIST(artist.profileId!)} onClick={onClose} className="font-semibold text-white underline-offset-2 hover:underline">
                                                  {artist.name}
                                              </Link>
                                          </React.Fragment>
                                      ))
                                    : song.artist_name}
                            </p>
                            {song.album_name ? (
                                albumRouteId ? (
                                    <Link to={ROUTES.ALBUM(albumRouteId)} onClick={onClose} className="mt-0.5 flex items-center gap-1 text-sm text-gray-400 hover:text-white">
                                        <Disc3 className="h-3.5 w-3.5" />
                                        {song.album_name}
                                    </Link>
                                ) : (
                                    <p className="mt-0.5 text-sm text-gray-400">{song.album_name}</p>
                                )
                            ) : null}
                            <p className="mt-1.5 text-xs text-gray-500">
                                {[
                                    song.duration_seconds ? formatDuration(song.duration_seconds) : null,
                                    song.uploader?.display_name ? `Subida por ${song.uploader.display_name.split(' ')[0]}` : null,
                                    formatRelative(song.created_at),
                                ]
                                    .filter(Boolean)
                                    .join(' · ')}
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
