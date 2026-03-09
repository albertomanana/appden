import { supabase } from '@lib/supabase/client'
import type { Profile } from '@/types'

/**
 * Auth service - wraps Supabase auth methods.
 * Session persistence is handled by the Supabase client itself.
 */

export const authService = {
    /**
     * Register a new user with email + password.
     * Creates the profile record via DB trigger.
     */
    async register(email: string, password: string, displayName: string) {
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: { display_name: displayName },
            },
        })
        if (error) throw error
        return data
    },

    /**
     * Login with email + password.
     */
    async login(email: string, password: string) {
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
        })
        if (error) throw error
        return data
    },

    /**
     * Logout and clear session.
     */
    async logout() {
        const { error } = await supabase.auth.signOut()
        if (error) throw error
    },

    /**
     * Send a password reset email.
     */
    async resetPassword(email: string) {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: `${window.location.origin}/reset-password`,
        })
        if (error) throw error
    },

    /**
     * Update password after receiving reset link.
     */
    async updatePassword(newPassword: string) {
        const { error } = await supabase.auth.updateUser({ password: newPassword })
        if (error) throw error
    },

    /**
     * Get current Supabase session (used at app boot).
     */
    async getSession() {
        const { data, error } = await supabase.auth.getSession()
        if (error) throw error
        return data.session
    },

    /**
     * Subscribe to auth state changes. Returns unsubscribe function.
     */
    onAuthStateChange(
        callback: (userId: string | null) => void
    ): () => void {
        const { data } = supabase.auth.onAuthStateChange((_event, session) => {
            callback(session?.user?.id ?? null)
        })
        return () => data.subscription.unsubscribe()
    },
}
