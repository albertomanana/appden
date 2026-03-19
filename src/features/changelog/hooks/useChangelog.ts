import { useQuery } from '@tanstack/react-query'
import { changelogService } from '@features/changelog/services/changelog.service'

export function useChangelog() {
    const query = useQuery({
        queryKey: ['changelog', 'auto-generated'],
        queryFn: () => changelogService.list(),
    })

    return {
        entries: query.data?.entries ?? [],
        isLoading: query.isLoading,
        currentVersion: query.data?.currentVersion ?? '1.0.0',
        source: query.data?.source ?? 'fallback',
    }
}

