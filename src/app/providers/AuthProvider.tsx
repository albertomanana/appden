import React, { useEffect, useCallback } from 'react'
import { authService } from '@services/auth.service'
import { profileService } from '@services/profile.service'
import { useAuthStore } from '@app/store/auth.store'
import { useGroupStore } from '@app/store/group.store'
import { groupsService } from '@services/groups.service'

/**
 * AuthProvider - initializes session on app boot and listens for auth changes.
 * Must wrap the entire router. Renders nothing visually.
 */
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { setUser, setLoading, setInitialized } = useAuthStore()
    const { setMyGroups, setActiveGroup, activeGroup } = useGroupStore()

    const initUser = useCallback(async (userId: string | null) => {
        if (!userId) {
            setUser(null)
            setMyGroups([])
            setLoading(false)
            setInitialized(true)
            return
        }

        try {
            const profile = await profileService.getProfile(userId)
            const session = await authService.getSession()
            setUser({
                id: userId,
                email: session?.user?.email ?? null,
                profile,
            })

            // Load groups
            const groups = await groupsService.getMyGroups(userId)
            setMyGroups(groups)

            // Select active group if not already set or if the saved one is no longer valid
            if (groups.length > 0) {
                const savedGroupValid = activeGroup && groups.some((g) => g.id === activeGroup.id)
                if (!savedGroupValid) {
                    setActiveGroup(groups[0])
                }
            }
        } catch (err) {
            console.error('Failed to initialize user session:', err)
            setUser(null)
        } finally {
            setLoading(false)
            setInitialized(true)
        }
    }, [setUser, setLoading, setInitialized, setMyGroups, setActiveGroup, activeGroup])

    useEffect(() => {
        // Initialize session from existing stored session with timeout.
        // If it fails, continue as logged-out to avoid blocking the app.
        void (async () => {
            try {
                console.log('[Auth] Initializing auth session...')

                const timeoutPromise: Promise<never> = new Promise((_resolve, reject) => {
                    setTimeout(() => {
                        reject(new Error('Supabase connection timeout. Check your .env.local credentials.'))
                    }, 15000)
                })

                const sessionPromise = authService.getSession()
                const session = await Promise.race([sessionPromise, timeoutPromise])

                console.log('[Auth] Session loaded:', session ? 'authenticated' : 'no session')
                await initUser(session?.user?.id ?? null)
            } catch (err) {
                const errorMsg = err instanceof Error ? err.message : 'Failed to load session'
                console.error('[Auth] Session init failed, falling back to logged-out state:', errorMsg)
                await initUser(null)
            }
        })()

        // Listen for later auth changes (login, logout, token refresh)
        const unsubscribe = authService.onAuthStateChange((userId) => {
            void initUser(userId)
        })

        return unsubscribe
    }, [initUser])

    return <>{children}</>
}
