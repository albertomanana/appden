import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { changelogService } from '@features/changelog/services/changelog.service'

export function useChangelog(groupId: string | null) {
    const query = useQuery({
        queryKey: ['changelog', groupId],
        queryFn: () => changelogService.list(groupId!),
        enabled: !!groupId,
    })

    const currentVersion = useMemo(
        () => changelogService.getCurrentVersion(query.data ?? []),
        [query.data]
    )

    return {
        entries: query.data ?? [],
        isLoading: query.isLoading,
        currentVersion,
    }
}

