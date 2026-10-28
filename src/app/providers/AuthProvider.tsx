import React, { useEffect } from 'react'
import { authService } from '@services/auth.service'
import { profileService } from '@services/profile.service'
import { useAuthStore } from '@app/store/auth.store'
import { useGroupStore } from '@app/store/group.store'
import { groupsService } from '@services/groups.service'
import { clearSignedUrlCache } from '@lib/supabase/client'
import { useAdvancedPlayerStore } from '@features/player/player.store'
import type { AuthUser } from '@/types'

const SESSION_TIMEOUT_MS = 15000
const PROFILE_TIMEOUT_MS = 10000
const GROUPS_TIMEOUT_MS = 10000

const withTimeout = <T,>(promise: Promise<T>, timeoutMs: number, label: string): Promise<T> =>
    Promise.race([
        promise,
        new Promise<T>((_resolve, reject) => {
            window.setTimeout(() => reject(new Error(`${label} timeout`)), timeoutMs)
        }),
    ])

/**
 * AuthProvider - initializes session on app boot and listens for auth changes.
 * Must wrap the entire router. Renders nothing visually.
 *
 * Store access goes through `getState()` so this effect runs once: depending on the
 * active group made every group switch re-run the whole session bootstrap.
 */
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    useEffect(() => {
        let disposed = false
        let currentUserId: string | null | undefined

        const finish = () => {
            const auth = useAuthStore.getState()
            auth.setLoading(false)
            auth.setInitialized(true)
        }

        const loadUser = async (userId: string | null, email: string | null) => {
            const auth = useAuthStore.getState()
            const groups = useGroupStore.getState()

            if (!userId) {
                if (currentUserId) {
                    // Signed out (here, in another tab or because the session expired):
                    // drop the previous user's player state.
                    const player = useAdvancedPlayerStore.getState()
                    player.pause()
                    player.clearQueue()
                }
                currentUserId = null
                auth.setUser(null)
                groups.setMyGroups([])
                clearSignedUrlCache()
                finish()
                return
            }

            currentUserId = userId
            try {
                const profile = await withTimeout(profileService.getProfile(userId), PROFILE_TIMEOUT_MS, 'Profile connection')
                if (disposed || currentUserId !== userId) return

                // Accounts created after migration 013 need an admin approval before using the app.
                if (profile && profile.is_approved === false) {
                    auth.setNotice('pending-approval')
                    auth.setUser(null)
                    groups.setMyGroups([])
                    finish()
                    try {
                        await authService.logout()
                    } catch (error) {
                        console.warn('[Auth] Error signing out unapproved account', error)
                    }
                    return
                }

                const user: AuthUser = { id: userId, email, profile }
                auth.setUser(user)

                try {
                    // Load groups without dropping the authenticated session on failure.
                    const myGroups = await withTimeout(groupsService.getMyGroups(userId), GROUPS_TIMEOUT_MS, 'Groups connection')
                    if (disposed || currentUserId !== userId) return
                    groups.setMyGroups(myGroups)
                    const active = useGroupStore.getState().activeGroup
                    const fresh = active ? myGroups.find((group) => group.id === active.id) : null
                    groups.setActiveGroup(fresh ?? myGroups[0] ?? null)
                } catch (groupErr) {
                    console.error('[Auth] Failed to load groups, keeping session active:', groupErr)
                    groups.setMyGroups([])
                }
            } catch (err) {
                console.error('[Auth] Failed to initialize user session:', err)
                auth.setUser(null)
            } finally {
                if (!disposed) finish()
            }
        }

        void (async () => {
            try {
                const timeout = new Promise<never>((_resolve, reject) => {
                    window.setTimeout(() => reject(new Error('Supabase connection timeout')), SESSION_TIMEOUT_MS)
                })
                const session = await Promise.race([authService.getSession(), timeout])
                if (disposed) return
                await loadUser(session?.user?.id ?? null, session?.user?.email ?? null)
            } catch (err) {
                console.error('[Auth] Session init failed, falling back to logged-out state:', err instanceof Error ? err.message : err)
                authService.clearStoredSession()
                await loadUser(null, null)
            }
        })()

        const { data } = authService.subscribe((event, session) => {
            // Token refreshes and the initial event don't change who is signed in.
            if (event === 'INITIAL_SESSION' || event === 'TOKEN_REFRESHED') return
            const nextUserId = session?.user?.id ?? null
            if (event !== 'USER_UPDATED' && nextUserId === currentUserId) return

            // Never call Supabase inside the auth callback: the auth lock is still held
            // and nested calls (getSession, queries) can deadlock. Defer to the next tick.
            window.setTimeout(() => {
                if (!disposed) void loadUser(nextUserId, session?.user?.email ?? null)
            }, 0)
        })

        return () => {
            disposed = true
            data.subscription.unsubscribe()
        }
    }, [])

    return <>{children}</>
}
