import { supabase, STORAGE_BUCKETS, getStorageUrl } from '@lib/supabase/client'
import { generateStoragePath } from '@lib/utils'
import { ALLOWED_IMAGE_TYPES } from '@lib/constants'
import type { SharedFile } from '@/types'

export const filesService = {
    /**
     * Get all files for a group.
     */
    async getFiles(groupId: string): Promise<SharedFile[]> {
        const { data, error } = await supabase
            .from('files')
            .select('*, uploader:profiles!files_uploaded_by_fkey(id, display_name, avatar_url)')
            .eq('group_id', groupId)
            .order('created_at', { ascending: false })

        if (error) throw error
        return data as SharedFile[]
    },

    /**
     * Upload a file to Storage and save metadata.
     */
    async uploadFile(
        userId: string,
        groupId: string,
        file: File,
        customName: string
    ): Promise<SharedFile> {
        const isImage = ALLOWED_IMAGE_TYPES.includes(file.type)
        const category = isImage ? 'image' : 'document'
        const path = generateStoragePath(`${groupId}`, userId, file.name)

        const { error: uploadError } = await supabase.storage
            .from(STORAGE_BUCKETS.FILES)
            .upload(path, file, { cacheControl: '3600', upsert: false })

        if (uploadError) throw uploadError

        const fileUrl = getStorageUrl(STORAGE_BUCKETS.FILES, path)!

        const { data, error } = await supabase
            .from('files')
            .insert({
                group_id: groupId,
                uploaded_by: userId,
                name: customName || file.name,
                file_url: fileUrl,
                file_size: file.size,
                mime_type: file.type,
                category,
            })
            .select()
            .single()

        if (error) throw error
        return data as SharedFile
    },

    /**
     * Delete a file record. Storage cleanup via lifecycle policy.
     */
    async deleteFile(fileId: string): Promise<void> {
        const { error } = await supabase.from('files').delete().eq('id', fileId)
        if (error) throw error
    },
}
