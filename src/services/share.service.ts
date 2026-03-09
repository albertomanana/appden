import { buildWhatsAppUrl, shareOrCopy } from '@lib/utils'

/**
 * Unified sharing service for cross-platform share actions.
 * Uses Web Share API when available, falls back to clipboard.
 */
export const shareService = {
    /**
     * Share or copy a URL + title. Returns the action taken.
     */
    async share(title: string, url: string): Promise<'shared' | 'copied'> {
        return shareOrCopy(title, url)
    },

    /**
     * Open WhatsApp share with a prefilled message.
     */
    shareViaWhatsApp(title: string, url: string): void {
        const text = `${title}\n\n${url}`
        window.open(buildWhatsAppUrl(text), '_blank', 'noopener,noreferrer')
    },

    /**
     * Copy text to clipboard.
     */
    async copyToClipboard(text: string): Promise<void> {
        await navigator.clipboard.writeText(text)
    },

    /**
     * Build a WhatsApp URL for a given resource share link.
     */
    buildWhatsAppMessage(resourceLabel: string, shareUrl: string): string {
        return `Te comparto "${resourceLabel}" desde The Appden:\n${shareUrl}`
    },
}
