import React from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { sharedLinksService } from '@services/shared-links.service'
import { songsService } from '@services/songs.service'
import { playlistsService } from '@services/playlists.service'
import { debtsService } from '@services/debts.service'
import { filesService } from '@services/files.service'
import { useAuth } from '@hooks/useAuth'
import { Music, ListMusic, CreditCard, FolderOpen, AlertCircle } from 'lucide-react'
import { formatMoney, formatDate } from '@lib/utils'
import { ROUTES } from '@lib/constants'

/**
 * Public shared resource page — accessible via /shared/:token.
 * Resolves the token, fetches the referenced resource, and renders a preview.
 * Requires login for 'private' visibility links.
 */
const SharedPage: React.FC = () => {
    const { token } = useParams<{ token: string }>()
    const { isAuthenticated } = useAuth()

    const { data: link, isLoading: linkLoading } = useQuery({
        queryKey: ['shared-link', token],
        queryFn: () => sharedLinksService.resolveToken(token!),
        enabled: !!token,
        retry: false,
    })

    if (linkLoading) {
        return (
            <div className="min-h-screen bg-surface-800 flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
            </div>
        )
    }

    if (!link) {
        return (
            <div className="min-h-screen bg-surface-800 flex items-center justify-center p-6">
                <div className="text-center max-w-sm">
                    <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-center justify-center mx-auto mb-4">
                        <AlertCircle className="w-8 h-8 text-red-400" />
                    </div>
                    <h1 className="text-xl font-bold text-white mb-2">Enlace no válido</h1>
                    <p className="text-sm text-gray-400 mb-6">
                        Este enlace no existe, ha expirado o ha sido eliminado.
                    </p>
                    <Link to={ROUTES.DASHBOARD} className="btn-primary">
                        Ir a The Appden
                    </Link>
                </div>
            </div>
        )
    }

    if (link.visibility === 'private' && !isAuthenticated) {
        return (
            <div className="min-h-screen bg-surface-800 flex items-center justify-center p-6">
                <div className="text-center max-w-sm">
                    <div className="w-16 h-16 rounded-2xl bg-brand-500/10 border border-brand-500/30 flex items-center justify-center mx-auto mb-4">
                        <AlertCircle className="w-8 h-8 text-brand-400" />
                    </div>
                    <h1 className="text-xl font-bold text-white mb-2">Acceso privado</h1>
                    <p className="text-sm text-gray-400 mb-6">
                        Este recurso es privado. Inicia sesión para verlo.
                    </p>
                    <Link to={ROUTES.LOGIN} className="btn-primary">
                        Iniciar sesión
                    </Link>
                </div>
            </div>
        )
    }

    // Render resource-specific preview
    const resourceMap: Record<string, React.FC<{ resourceId: string }>> = {
        song: SharedSongPreview,
        playlist: SharedPlaylistPreview,
        debt: SharedDebtPreview,
        file: SharedFilePreview,
    }

    const Preview = resourceMap[link.resource_type]

    return (
        <div className="min-h-screen bg-surface-800 flex flex-col">
            {/* Top bar */}
            <header className="border-b border-surface-500 px-4 py-3 flex items-center justify-between bg-surface-900">
                <span className="text-sm font-bold text-gradient">The Appden</span>
                {isAuthenticated ? (
                    <Link to={ROUTES.DASHBOARD} className="btn-secondary text-xs py-1.5 px-3">
                        Ir a la app
                    </Link>
                ) : (
                    <Link to={ROUTES.LOGIN} className="btn-primary text-xs py-1.5 px-3">
                        Iniciar sesión
                    </Link>
                )}
            </header>

            <main className="flex-1 flex items-center justify-center p-6">
                {Preview ? (
                    <Preview resourceId={link.resource_id} />
                ) : (
                    <p className="text-gray-400">Tipo de recurso desconocido.</p>
                )}
            </main>
        </div>
    )
}

// ── Resource Previews ────────────────────────────────────────

const SharedSongPreview: React.FC<{ resourceId: string }> = ({ resourceId }) => {
    const { userId } = useAuth()
    const { data: song, isLoading } = useQuery({
        queryKey: ['shared-song', resourceId],
        queryFn: () => songsService.getSong(resourceId, userId ?? ''),
        enabled: !!resourceId,
    })

    if (isLoading) return <PreviewSkeleton />
    if (!song) return <p className="text-gray-400">Canción no encontrada.</p>

    return (
        <div className="card p-6 max-w-sm w-full space-y-4 text-center">
            <div className="w-40 h-40 rounded-2xl overflow-hidden bg-surface-600 mx-auto">
                {song.cover_url ? (
                    <img src={song.cover_url} alt={song.title} className="w-full h-full object-cover" />
                ) : (
                    <div className="w-full h-full flex items-center justify-center">
                        <Music className="w-12 h-12 text-gray-500" />
                    </div>
                )}
            </div>
            <div>
                <span className="badge badge-brand mb-3"><Music className="w-3 h-3" /> Canción</span>
                <h2 className="text-xl font-bold text-white">{song.title}</h2>
                <p className="text-gray-400">{song.artist_name}</p>
                {song.album_name && <p className="text-sm text-gray-500">{song.album_name}</p>}
            </div>
            <p className="text-xs text-gray-500">Compartida desde The Appden · {formatDate(song.created_at)}</p>
        </div>
    )
}

const SharedPlaylistPreview: React.FC<{ resourceId: string }> = ({ resourceId }) => {
    const { data: playlist, isLoading } = useQuery({
        queryKey: ['shared-playlist', resourceId],
        queryFn: () => playlistsService.getPlaylist(resourceId),
        enabled: !!resourceId,
    })

    if (isLoading) return <PreviewSkeleton />
    if (!playlist) return <p className="text-gray-400">Playlist no encontrada.</p>

    const songCount = playlist.songs?.length ?? 0

    return (
        <div className="card p-6 max-w-sm w-full space-y-4 text-center">
            <div className="w-40 h-40 rounded-2xl bg-gradient-to-br from-brand-600 to-accent-purple mx-auto flex items-center justify-center">
                <ListMusic className="w-12 h-12 text-white" />
            </div>
            <div>
                <span className="badge badge-brand mb-3"><ListMusic className="w-3 h-3" /> Playlist</span>
                <h2 className="text-xl font-bold text-white">{playlist.name}</h2>
                {playlist.description && <p className="text-gray-400">{playlist.description}</p>}
                <p className="text-sm text-gray-500 mt-1">{songCount} {songCount === 1 ? 'canción' : 'canciones'}</p>
            </div>
        </div>
    )
}

const SharedDebtPreview: React.FC<{ resourceId: string }> = ({ resourceId }) => {
    const { data: debt, isLoading } = useQuery({
        queryKey: ['shared-debt', resourceId],
        queryFn: () => debtsService.getDebt(resourceId),
        enabled: !!resourceId,
    })

    if (isLoading) return <PreviewSkeleton />
    if (!debt) return <p className="text-gray-400">Deuda no encontrada.</p>

    return (
        <div className="card p-6 max-w-sm w-full space-y-4 text-center">
            <div className="w-16 h-16 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center mx-auto">
                <CreditCard className="w-8 h-8 text-amber-400" />
            </div>
            <div>
                <span className="badge badge-amber mb-3"><CreditCard className="w-3 h-3" /> Deuda</span>
                <h2 className="text-xl font-bold text-white">{formatMoney(debt.amount, debt.currency)}</h2>
                <p className="text-gray-400">{debt.concept}</p>
            </div>
        </div>
    )
}

const SharedFilePreview: React.FC<{ resourceId: string }> = ({ resourceId }) => (
    <div className="card p-6 max-w-sm w-full space-y-4 text-center">
        <div className="w-16 h-16 rounded-2xl bg-surface-600 border border-surface-500 flex items-center justify-center mx-auto">
            <FolderOpen className="w-8 h-8 text-gray-400" />
        </div>
        <div>
            <span className="badge badge-brand mb-3"><FolderOpen className="w-3 h-3" /> Archivo</span>
            <p className="text-gray-400">Inicia sesión para descargar este archivo.</p>
        </div>
        <Link to={ROUTES.FILES} className="btn-primary inline-flex">
            Ver archivos
        </Link>
    </div>
)

const PreviewSkeleton: React.FC = () => (
    <div className="card p-6 max-w-sm w-full space-y-4 text-center animate-pulse">
        <div className="w-40 h-40 rounded-2xl bg-surface-600 mx-auto" />
        <div className="space-y-2">
            <div className="h-5 w-3/4 bg-surface-600 rounded mx-auto" />
            <div className="h-4 w-1/2 bg-surface-600 rounded mx-auto" />
        </div>
    </div>
)

export default SharedPage
