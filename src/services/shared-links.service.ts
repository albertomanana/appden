import { supabase } from '@lib/supabase/client'
import type { SharedLink, SharedLinkResourceType, SharedLinkVisibility } from '@/types'
import { nanoid } from 'nanoid' // Using crypto.randomUUID() instead to avoid dep

/**
 * Generate a secure random token using the browser's crypto API.
 */
function generateToken(): string {
    const arr = new Uint8Array(20)
    crypto.getRandomValues(arr)
    return Array.from(arr, (b) => b.toString(16).padStart(2, '0')).join('')
}

export const sharedLinksService = {
    /**
     * Create a shared link for a resource.
     */
    async createLink(
        userId: string,
        resourceType: SharedLinkResourceType,
        resourceId: string,
        visibility: SharedLinkVisibility = 'private',
        expiresAt?: Date
    ): Promise<SharedLink> {
        const token = generateToken()

        const { data, error } = await supabase
            .from('shared_links')
            .insert({
                token,
                resource_type: resourceType,
                resource_id: resourceId,
                created_by: userId,
                visibility,
                expires_at: expiresAt?.toISOString() ?? null,
            })
            .select()
            .single()

        if (error) throw error
        return data as SharedLink
    },

    /**
     * Resolve a shared link token. Returns the link record or null if invalid/expired.
     */
    async resolveToken(token: string): Promise<SharedLink | null> {
        const { data, error } = await supabase
            .from('shared_links')
            .select('*')
            .eq('token', token)
            .single()

        if (error) return null

        const link = data as SharedLink

        // Check expiry
        if (link.expires_at && new Date(link.expires_at) < new Date()) {
            return null
        }

        return link
    },

    /**
     * Delete a shared link.
     */
    async deleteLink(linkId: string): Promise<void> {
        const { error } = await supabase
            .from('shared_links')
            .delete()
            .eq('id', linkId)

        if (error) throw error
    },

    /**
     * Get all shared links created by a user for a specific resource.
     */
    async getLinksForResource(
        resourceId: string,
        resourceType: SharedLinkResourceType
    ): Promise<SharedLink[]> {
        const { data, error } = await supabase
            .from('shared_links')
            .select('*')
            .eq('resource_id', resourceId)
            .eq('resource_type', resourceType)
            .order('created_at', { ascending: false })

        if (error) throw error
        return data as SharedLink[]
    },

    /**
     * Build the full shareable URL from a token.
     */
    buildShareUrl(token: string): string {
        return `${window.location.origin}/shared/${token}`
    },
}
