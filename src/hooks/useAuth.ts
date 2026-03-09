import { useCallback } from 'react'
import { useAuthStore } from '@app/store/auth.store'

/**
 * Convenience hook to access the current authenticated user.
 * Returns user object and shortcut helpers.
 */
export function useAuth() {
    const { user, isLoading, isInitialized } = useAuthStore()

    return {
        user,
        profile: user?.profile ?? null,
        isAuthenticated: !!user,
        isLoading,
        isInitialized,
        userId: user?.id ?? null,
    }
}
