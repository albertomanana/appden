import React, { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Check, Plus } from 'lucide-react'
import { Modal } from '@components/ui/Modal'
import { ErrorNotice } from '@components/ui/ErrorNotice'
import { Skeleton } from '@components/ui/LoadingSkeleton'
import { useToast } from '@components/ui/Toast'
import { PlaylistCover } from '@components/playlists/PlaylistCover'
import { PlaylistForm } from '@components/playlists/PlaylistForm'
import { useAuth } from '@hooks/useAuth'
import { useActiveGroup } from '@hooks/useActiveGroup'
import { useGroupSongs } from '@features/music/hooks/useMusicLibrary'
import { pluralize } from '@features/music/utils/library'
import { playlistsService } from '@services/playlists.service'
import type { Playlist, Song } from '@/types'

interface AddToPlaylistSheetProps {
    song: Song
    open: boolean
    onClose: () => void
}

/** Bottom sheet listing the group's playlists (+ "Nueva playlist") to add a song to. */
export const AddToPlaylistSheet: React.FC<AddToPlaylistSheetProps> = ({ song, open, onClose }) => {
    const { userId } = useAuth()
    const { groupId } = useActiveGroup()
    const queryClient = useQueryClient()
    const { success, error: toastError } = useToast()
    const [creating, setCreating] = useState(false)

    const playlistsQuery = useQuery({
        queryKey: ['playlists', groupId],
        queryFn: () => playlistsService.getPlaylists(groupId!),
        enabled: open && !!groupId,
    })

    const containingKey = ['playlist-ids-with-song', song.id]
    const containingQuery = useQuery({
        queryKey: containingKey,
        queryFn: () => playlistsService.getPlaylistIdsWithSong(song.id),
        enabled: open,
    })

    const { data: groupSongs } = useGroupSongs()
    const coversById = useMemo(
        () => new Map((groupSongs ?? []).map((item) => [item.id, { id: item.id, cover_url: item.cover_url }])),
        [groupSongs]
    )

    const containing = new Set(containingQuery.data ?? [])

    const addMutation = useMutation({
        mutationFn: (playlist: Playlist) => {
            if (!userId) throw new Error('Tu sesión ha caducado. Vuelve a entrar.')
            return playlistsService.addSong(playlist.id, song.id, userId)
        },
        onMutate: async (playlist) => {
            await queryClient.cancelQueries({ queryKey: containingKey })
            const previous = queryClient.getQueryData<string[]>(containingKey)
            queryClient.setQueryData<string[]>(containingKey, (current) => [...(current ?? []), playlist.id])
            return { previous }
        },
        onSuccess: (_data, playlist) => {
            success(`Añadida a «${playlist.name}»`, song.title)
        },
        onError: (err, _playlist, context) => {
            queryClient.setQueryData(containingKey, context?.previous)
            toastError('No se pudo añadir a la playlist', err instanceof Error ? err.message : undefined)
        },
        onSettled: (_data, _error, playlist) => {
            void queryClient.invalidateQueries({ queryKey: containingKey })
            void queryClient.invalidateQueries({ queryKey: ['playlists', groupId] })
            void queryClient.invalidateQueries({ queryKey: ['playlist', playlist.id] })
        },
    })

    const handlePick = (playlist: Playlist) => {
        if (containing.has(playlist.id)) return
        addMutation.mutate(playlist)
        onClose()
    }

    const playlists = playlistsQuery.data ?? []

    return (
        <>
            <Modal open={open && !creating} onClose={onClose} title="Añadir a playlist" description={song.title} size="sm">
                <div className="-mx-2 space-y-0.5">
                    <button
                        type="button"
                        onClick={() => setCreating(true)}
                        className="flex min-h-[3.75rem] w-full items-center gap-3 rounded-2xl px-2 text-left transition-colors active:bg-white/[0.06] md:hover:bg-white/[0.04]"
                    >
                        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-white/[0.08] text-white">
                            <Plus className="h-5 w-5" />
                        </span>
                        <span className="text-[15px] font-semibold text-white">Nueva playlist</span>
                    </button>

                    {playlistsQuery.isLoading ? (
                        Array.from({ length: 3 }).map((_, index) => (
                            <div key={index} className="flex items-center gap-3 px-2 py-1.5">
                                <Skeleton className="h-12 w-12 rounded-xl" />
                                <Skeleton className="h-4 w-1/2" />
                            </div>
                        ))
                    ) : playlistsQuery.error ? (
                        <ErrorNotice
                            className="mx-2 mt-2"
                            title="No pudimos cargar las playlists"
                            error={playlistsQuery.error}
                            onRetry={() => void playlistsQuery.refetch()}
                        />
                    ) : playlists.length === 0 ? (
                        <p className="px-2 pb-2 pt-3 text-sm text-gray-400">
                            Aún no hay playlists en el grupo. Crea la primera con esta canción.
                        </p>
                    ) : (
                        playlists.map((playlist) => {
                            const added = containing.has(playlist.id)
                            const covers = (playlist.preview_song_ids ?? [])
                                .map((id) => coversById.get(id))
                                .filter((cover): cover is { id: string; cover_url: string | null } => !!cover)

                            return (
                                <button
                                    key={playlist.id}
                                    type="button"
                                    onClick={() => handlePick(playlist)}
                                    disabled={added}
                                    className="flex min-h-[3.75rem] w-full items-center gap-3 rounded-2xl px-2 text-left transition-colors active:bg-white/[0.06] disabled:cursor-default md:hover:bg-white/[0.04]"
                                >
                                    <PlaylistCover covers={covers} seed={playlist.id} className="h-12 w-12 rounded-xl" iconClassName="h-5 w-5" />
                                    <span className="min-w-0 flex-1">
                                        <span className="block truncate text-[15px] font-semibold text-white">{playlist.name}</span>
                                        <span className="block truncate text-[13px] text-gray-400">
                                            {added ? 'Ya está en esta playlist' : pluralize(playlist.song_count ?? 0, 'canción', 'canciones')}
                                        </span>
                                    </span>
                                    {added ? <Check className="mr-2 h-5 w-5 shrink-0 text-brand-300" aria-hidden="true" /> : null}
                                </button>
                            )
                        })
                    )}
                </div>
            </Modal>

            {creating ? (
                <PlaylistForm
                    description={`Se añadirá «${song.title}».`}
                    onSaved={(playlist) => {
                        addMutation.mutate(playlist)
                        onClose()
                    }}
                    onClose={() => setCreating(false)}
                />
            ) : null}
        </>
    )
}
