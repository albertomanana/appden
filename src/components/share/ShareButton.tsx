import React, { useState } from 'react'
import { Share2, Copy, MessageCircle, Check } from 'lucide-react'
import { useMutation } from '@tanstack/react-query'
import { sharedLinksService } from '@services/shared-links.service'
import { shareService } from '@services/share.service'
import { useAuth } from '@hooks/useAuth'
import { useToast } from '@components/ui/Toast'
import type { SharedLinkResourceType } from '@/types'

interface ShareButtonProps {
    resourceType: SharedLinkResourceType
    resourceId: string
    label: string
}

export const ShareButton: React.FC<ShareButtonProps> = ({ resourceType, resourceId, label }) => {
    const { userId } = useAuth()
    const { success } = useToast()
    const [shareUrl, setShareUrl] = useState<string | null>(null)
    const [copied, setCopied] = useState(false)

    const { mutate: createLink, isPending } = useMutation({
        mutationFn: () => sharedLinksService.createLink(userId!, resourceType, resourceId),
        onSuccess: (link) => {
            const url = sharedLinksService.buildShareUrl(link.token)
            setShareUrl(url)
        },
    })

    const handleCopy = async () => {
        if (!shareUrl) return
        await shareService.copyToClipboard(shareUrl)
        setCopied(true)
        success('Enlace copiado', 'El enlace está en tu portapapeles.')
        setTimeout(() => setCopied(false), 2000)
    }

    const handleWhatsApp = () => {
        if (!shareUrl) return
        shareService.shareViaWhatsApp(label, shareUrl)
    }

    const handleNativeShare = async () => {
        if (!shareUrl) return
        await shareService.share(label, shareUrl)
    }

    if (!shareUrl) {
        return (
            <button
                onClick={() => createLink()}
                disabled={isPending}
                className="btn-secondary w-full gap-2"
            >
                {isPending ? (
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : <Share2 className="w-4 h-4" />}
                {isPending ? 'Generando enlace...' : 'Compartir'}
            </button>
        )
    }

    return (
        <div className="card p-4 space-y-3">
            <div className="flex items-center gap-2">
                <Share2 className="w-4 h-4 text-brand-400" />
                <h3 className="text-sm font-semibold text-white">Compartir</h3>
            </div>
            <div className="bg-surface-600 rounded-xl px-3 py-2">
                <p className="text-xs text-gray-400 break-all">{shareUrl}</p>
            </div>
            <div className="grid grid-cols-3 gap-2">
                <button onClick={handleCopy} className="btn-secondary text-xs py-2 gap-1.5 justify-center">
                    {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                    {copied ? 'Copiado' : 'Copiar'}
                </button>
                <button onClick={handleWhatsApp} className="btn-secondary text-xs py-2 gap-1.5 justify-center">
                    <MessageCircle className="w-4 h-4 text-emerald-400" />
                    WhatsApp
                </button>
                <button onClick={handleNativeShare} className="btn-secondary text-xs py-2 gap-1.5 justify-center">
                    <Share2 className="w-4 h-4" />
                    Compartir
                </button>
            </div>
        </div>
    )
}
