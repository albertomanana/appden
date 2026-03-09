import { supabase, STORAGE_BUCKETS, getStorageUrl } from '@lib/supabase/client'
import { generateStoragePath } from '@lib/utils'
import type { Profile } from '@/types'
import type { ProfileFormData } from '@lib/validators'

export const profileService = {
    /**
     * Fetch a single profile by user ID.
     */
    async getProfile(userId: string): Promise<Profile> {
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .single()

        if (error) throw error
        return data as Profile
    },

    /**
     * Update the current user's profile.
     */
    async updateProfile(userId: string, updates: ProfileFormData): Promise<Profile> {
        const { data, error } = await supabase
            .from('profiles')
            .update({
                display_name: updates.display_name,
                username: updates.username || null,
                bio: updates.bio || null,
                updated_at: new Date().toISOString(),
            })
            .eq('id', userId)
            .select()
            .single()

        if (error) throw error
        return data as Profile
    },

    /**
     * Upload an avatar image and update the profile record.
     * Returns the new public URL.
     */
    async uploadAvatar(userId: string, file: File): Promise<string> {
        const path = generateStoragePath('avatars', userId, file.name)

        const { error: uploadError } = await supabase.storage
            .from(STORAGE_BUCKETS.AVATARS)
            .upload(path, file, {
                cacheControl: '3600',
                upsert: true,
            })

        if (uploadError) throw uploadError

        const url = getStorageUrl(STORAGE_BUCKETS.AVATARS, path)!

        const { error: updateError } = await supabase
            .from('profiles')
            .update({ avatar_url: url, updated_at: new Date().toISOString() })
            .eq('id', userId)

        if (updateError) throw updateError

        return url
    },

    /**
     * Search profiles by display_name or username (for debt member selection, etc.)
     */
    async searchProfiles(query: string, excludeIds: string[] = []): Promise<Profile[]> {
        let q = supabase
            .from('profiles')
            .select('*')
            .or(`display_name.ilike.%${query}%,username.ilike.%${query}%`)
            .limit(10)

        if (excludeIds.length > 0) {
            q = q.not('id', 'in', `(${excludeIds.join(',')})`)
        }

        const { data, error } = await q
        if (error) throw error
        return data as Profile[]
    },
}
