import { supabase, STORAGE_BUCKETS, getStorageUrl } from '@lib/supabase/client'
import { generateStoragePath } from '@lib/utils'
import { ALLOWED_IMAGE_TYPES } from '@lib/constants'
import type { SharedFile } from '@/types'

function buildFileStoragePath(groupId: string, userId: string, filename: string): string {
    return generateStoragePath(`${groupId}/files`, userId, filename)
}

function isExternalUrl(value: string | null | undefined): boolean {
    return !!value && /^https?:\/\//i.test(value.trim())
}

async function resolveFileUrl(pathOrUrl: string | null | undefined): Promise<string> {
    if (!pathOrUrl) return ''

    if (isExternalUrl(pathOrUrl)) {
        return pathOrUrl.trim()
    }

    const signed = await getStorageUrl(STORAGE_BUCKETS.FILES, pathOrUrl)
    return signed ?? pathOrUrl
}

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

        const files = (data ?? []) as SharedFile[]
        return Promise.all(
            files.map(async (file) => ({
                ...file,
                file_url: await resolveFileUrl(file.file_url),
            }))
        )
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
        const path = buildFileStoragePath(groupId, userId, file.name)

        const { error: uploadError } = await supabase.storage
            .from(STORAGE_BUCKETS.FILES)
            .upload(path, file, {
                cacheControl: '3600',
                upsert: false,
                contentType: file.type || undefined,
            })

        if (uploadError) throw uploadError

        const { data, error } = await supabase
            .from('files')
            .insert({
                group_id: groupId,
                uploaded_by: userId,
                name: customName || file.name,
                file_url: path,
                file_size: file.size,
                mime_type: file.type,
                category,
            })
            .select()
            .single()

        if (error) {
            await supabase.storage.from(STORAGE_BUCKETS.FILES).remove([path]).catch(() => {
                // Best-effort cleanup only.
            })
            throw error
        }

        return {
            ...(data as SharedFile),
            file_url: await resolveFileUrl(path),
        }
    },

    /**
     * Delete a file record. Storage cleanup via lifecycle policy.
     */
    async deleteFile(fileId: string): Promise<void> {
        const { data: existing } = await supabase
            .from('files')
            .select('file_url')
            .eq('id', fileId)
            .maybeSingle()

        const { error } = await supabase.from('files').delete().eq('id', fileId)
        if (error) throw error

        if (existing?.file_url && !isExternalUrl(existing.file_url)) {
            await supabase.storage.from(STORAGE_BUCKETS.FILES).remove([existing.file_url]).catch(() => {
                // Best-effort cleanup only.
            })
        }
    },
}
