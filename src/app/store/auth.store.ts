import { create } from 'zustand'
import type { AuthUser } from '@/types'

export type AuthNotice = 'pending-approval' | null

interface AuthState {
    user: AuthUser | null
    /** Message for the login screen (e.g. the account still needs admin approval). */
    notice: AuthNotice
    setNotice: (notice: AuthNotice) => void
    isLoading: boolean
    isInitialized: boolean
    setUser: (user: AuthUser | null) => void
    setLoading: (loading: boolean) => void
    setInitialized: (initialized: boolean) => void
    logout: () => void
}

/**
 * Auth store - holds the current authenticated user + session state.
 * Initialized once in AuthProvider on app boot via Supabase auth listener.
 */
export const useAuthStore = create<AuthState>()((set) => ({
    user: null,
    isLoading: true,
    isInitialized: false,
    notice: null,
    setNotice: (notice) => set({ notice }),

    setUser: (user) => set({ user }),
    setLoading: (isLoading) => set({ isLoading }),
    setInitialized: (isInitialized) => set({ isInitialized }),
    logout: () => set({ user: null }),
}))
