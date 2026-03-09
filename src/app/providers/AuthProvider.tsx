import React, { useEffect, useCallback, useState } from 'react'
import { supabase } from '@lib/supabase/client'
import { authService } from '@services/auth.service'
import { profileService } from '@services/profile.service'
import { useAuthStore } from '@app/store/auth.store'
import { useGroupStore } from '@app/store/group.store'
import { groupsService } from '@services/groups.service'
import { DiagnosticPage } from '@pages/DiagnosticPage'

/**
 * AuthProvider - initializes session on app boot and listens for auth changes.
 * Must wrap the entire router. Renders nothing visually.
 */
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { setUser, setLoading, setInitialized } = useAuthStore()
    const { setMyGroups, setActiveGroup, activeGroup } = useGroupStore()
    const [initError, setInitError] = useState<string | null>(null)

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
        // Initialize session from existing stored session WITH TIMEOUT
        void (async () => {
            try {
                console.log('🔐 Initializing auth session...')

                // Create a timeout promise that rejects after 15 seconds
                const timeoutPromise = new Promise((_resolve, reject) => {
                    setTimeout(() => {
                        reject(new Error('Supabase connection timeout. Check your .env.local credentials.'))
                    }, 15000)
                })

                // Race between getting session and timeout
                const sessionPromise = authService.getSession()
                const session = await Promise.race([sessionPromise, timeoutPromise])

                console.log('✅ Session loaded:', session ? 'authenticated' : 'no session')
                await initUser(session?.user?.id ?? null)
            } catch (err) {
                const errorMsg = err instanceof Error ? err.message : 'Failed to load session'
                console.error('❌ Auth init error:', errorMsg)
                setInitError(errorMsg)
                setLoading(false)
                setInitialized(true)
            }
        })()

        // Listen for later auth changes (login, logout, token refresh)
        const unsubscribe = authService.onAuthStateChange((userId) => {
            void initUser(userId)
        })

        return unsubscribe
    }, [initUser, setLoading, setInitialized])

    // If there's an error, show diagnostic page
    if (initError) {
        return <DiagnosticPage />
    }

    return <>{children}</>
}
