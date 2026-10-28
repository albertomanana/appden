import { supabase } from '@lib/supabase/client'
import type { AppNotification } from '@/types'

export const notificationsService = {
    async listForUser(userId: string): Promise<AppNotification[]> {
        const { data, error } = await supabase
            .from('notifications')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(50)

        if (error) throw error
        return (data ?? []) as AppNotification[]
    },

    async markAsRead(id: string): Promise<void> {
        const { error } = await supabase
            .from('notifications')
            .update({ read: true })
            .eq('id', id)

        if (error) throw error
    },

    async markAllAsRead(userId: string): Promise<void> {
        const { error } = await supabase
            .from('notifications')
            .update({ read: true })
            .eq('user_id', userId)
            .eq('read', false)

        if (error) throw error
    },

    async remove(id: string): Promise<void> {
        const { error } = await supabase
            .from('notifications')
            .delete()
            .eq('id', id)

        if (error) throw error
    },
}
