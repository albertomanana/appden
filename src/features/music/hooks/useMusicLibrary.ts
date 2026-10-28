import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@hooks/useAuth'
import { useActiveGroup } from '@hooks/useActiveGroup'
import { songsService } from '@services/songs.service'
import { groupsService } from '@services/groups.service'
import { albumsService } from '@features/music/services/albums.service'
import { buildAlbums, buildArtists, buildMemberIndex } from '@features/music/utils/library'

/** Songs of the active group. Same cache entry as the library page. */
export function useGroupSongs() {
    const { userId } = useAuth()
    const { groupId } = useActiveGroup()

    return useQuery({
        queryKey: ['songs', groupId, userId],
        queryFn: () => songsService.getSongs(groupId!, userId!),
        enabled: !!groupId && !!userId,
    })
}

export function useGroupMembers(groupId: string | null | undefined) {
    return useQuery({
        queryKey: ['group-members', groupId],
        queryFn: () => groupsService.getGroupMembers(groupId!),
        enabled: !!groupId,
        staleTime: 60_000,
    })
}

/** Album rows of the group; `available: false` when migration 016 is missing. */
export function useAlbumRows(groupId: string | null | undefined) {
    return useQuery({
        queryKey: ['albums', groupId],
        queryFn: () => albumsService.listRows(groupId!),
        enabled: !!groupId,
        staleTime: 30_000,
    })
}

/**
 * Everything the music pages need: songs, albums (rows + songs) and artists (members + credited names).
 */
export function useMusicLibrary() {
    const { groupId } = useActiveGroup()
    const songsQuery = useGroupSongs()
    const membersQuery = useGroupMembers(groupId)
    const albumRowsQuery = useAlbumRows(groupId)

    const songs = useMemo(() => songsQuery.data ?? [], [songsQuery.data])
    const memberIndex = useMemo(() => buildMemberIndex(membersQuery.data), [membersQuery.data])
    const albums = useMemo(
        () => buildAlbums(songs, albumRowsQuery.data?.rows ?? [], memberIndex),
        [songs, albumRowsQuery.data, memberIndex]
    )
    const artists = useMemo(() => buildArtists(songs, memberIndex), [songs, memberIndex])

    return {
        songs,
        albums,
        artists,
        memberIndex,
        members: membersQuery.data ?? [],
        albumRows: albumRowsQuery.data?.rows ?? [],
        albumsAvailable: albumRowsQuery.data?.available ?? false,
        songsQuery,
        membersQuery,
        albumRowsQuery,
        isLoading: songsQuery.isLoading,
        error: songsQuery.error,
    }
}
