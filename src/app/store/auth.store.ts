import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { AuthUser } from '@/types'

interface AuthState {
    user: AuthUser | null
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

    setUser: (user) => set({ user }),
    setLoading: (isLoading) => set({ isLoading }),
    setInitialized: (isInitialized) => set({ isInitialized }),
    logout: () => set({ user: null }),
}))
