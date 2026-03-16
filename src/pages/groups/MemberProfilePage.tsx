import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, CreditCard, FileText, Music } from 'lucide-react'
import { profileService } from '@services/profile.service'
import { songsService } from '@services/songs.service'
import { debtsService } from '@services/debts.service'
import { filesService } from '@services/files.service'
import { useAuth } from '@hooks/useAuth'
import { usePlayerStore } from '@app/store/player.store'
import { Avatar } from '@components/common/Avatar'
import { SongCard } from '@components/music/SongCard'
import { formatMoney, formatRelative } from '@lib/utils'
import { DEBT_STATUS_LABELS } from '@lib/constants'
import type { Debt, SharedFile } from '@/types'

export default function MemberProfilePage() {
    const { groupId, userId } = useParams<{ groupId: string; userId: string }>()
    const navigate = useNavigate()
    const { userId: viewerUserId } = useAuth()
    const setQueue = usePlayerStore((s) => s.setQueue)
    const [selectedTab, setSelectedTab] = useState<'songs' | 'debts' | 'files'>('songs')

    if (!groupId || !userId) {
        return <div className="p-4 text-gray-400">Faltan parámetros.</div>
    }

    const { data: profile, isLoading: profileLoading } = useQuery({
        queryKey: ['member-profile', userId],
        queryFn: () => profileService.getProfile(userId),
    })

    const { data: songs = [], isLoading: songsLoading } = useQuery({
        queryKey: ['songs-by-owner', groupId, userId],
        queryFn: () => songsService.getSongsByOwner(groupId, userId, viewerUserId || ''),
        enabled: !!viewerUserId,
    })

    const { data: debts = [], isLoading: debtsLoading } = useQuery({
        queryKey: ['debts', groupId],
        queryFn: () => debtsService.getDebts(groupId),
    })

    const memberDebts = useMemo(
        () => debts.filter((d: Debt) => d.creditor_id === userId || d.debtor_id === userId),
        [debts, userId]
    )

    const { data: files = [], isLoading: filesLoading } = useQuery({
        queryKey: ['files', groupId],
        queryFn: () => filesService.getFiles(groupId),
    })

    const memberFiles = useMemo(
        () => files.filter((f: SharedFile) => f.uploaded_by === userId),
        [files, userId]
    )

    const totalDebtsOwed = memberDebts
        .filter((d: Debt) => d.debtor_id === userId && d.status !== 'paid')
        .reduce((sum, d: Debt) => sum + (d.amount - d.amount_paid), 0)

    const totalDebtsCredited = memberDebts
        .filter((d: Debt) => d.creditor_id === userId && d.status !== 'paid')
        .reduce((sum, d: Debt) => sum + (d.amount - d.amount_paid), 0)

    if (profileLoading) {
        return (
            <div className="p-4 flex items-center justify-center h-64">
                <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
            </div>
        )
    }

    if (!profile) {
        return <div className="p-4 text-gray-400">Perfil no encontrado.</div>
    }

    const totalSongs = songs.length

    return (
        <div className="min-h-screen bg-gradient-to-b from-brand-900/30 to-surface-900 pb-32">
            <div className="p-4 md:p-6">
                <button
                    onClick={() => navigate(-1)}
                    className="mb-6 flex items-center gap-2 text-brand-400 hover:text-brand-300 transition-colors"
                >
                    <ArrowLeft className="w-5 h-5" />
                    Volver
                </button>

                <div className="flex flex-col md:flex-row items-start gap-5 mb-6">
                    <Avatar src={profile.avatar_url} name={profile.display_name} size="lg" />
                    <div className="flex-1">
                        <h1 className="text-3xl md:text-4xl font-bold text-white mb-1">{profile.display_name}</h1>
                        {profile.bio ? <p className="text-gray-300 mb-4">{profile.bio}</p> : null}

                        <div className="flex gap-6 flex-wrap">
                            <div>
                                <p className="text-xs text-gray-400 uppercase tracking-wider">Canciones</p>
                                <p className="text-2xl font-bold text-white">{totalSongs}</p>
                            </div>
                            <div>
                                <p className="text-xs text-gray-400 uppercase tracking-wider">Te deben</p>
                                <p className="text-2xl font-bold text-emerald-400">
                                    {formatMoney(totalDebtsCredited)}
                                </p>
                            </div>
                            <div>
                                <p className="text-xs text-gray-400 uppercase tracking-wider">Debes</p>
                                <p className="text-2xl font-bold text-red-400">{formatMoney(totalDebtsOwed)}</p>
                            </div>
                            <div>
                                <p className="text-xs text-gray-400 uppercase tracking-wider">Archivos</p>
                                <p className="text-2xl font-bold text-white">{memberFiles.length}</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex gap-4 border-b border-surface-700 mb-6">
                    <button
                        onClick={() => setSelectedTab('songs')}
                        className={`px-4 py-3 border-b-2 font-semibold transition-colors ${
                            selectedTab === 'songs'
                                ? 'border-brand-500 text-white'
                                : 'border-transparent text-gray-400 hover:text-white'
                        }`}
                    >
                        <Music className="w-5 h-5 inline mr-2" />
                        Canciones ({totalSongs})
                    </button>
                    <button
                        onClick={() => setSelectedTab('debts')}
                        className={`px-4 py-3 border-b-2 font-semibold transition-colors ${
                            selectedTab === 'debts'
                                ? 'border-brand-500 text-white'
                                : 'border-transparent text-gray-400 hover:text-white'
                        }`}
                    >
                        <CreditCard className="w-5 h-5 inline mr-2" />
                        Deudas ({memberDebts.length})
                    </button>
                    <button
                        onClick={() => setSelectedTab('files')}
                        className={`px-4 py-3 border-b-2 font-semibold transition-colors ${
                            selectedTab === 'files'
                                ? 'border-brand-500 text-white'
                                : 'border-transparent text-gray-400 hover:text-white'
                        }`}
                    >
                        <FileText className="w-5 h-5 inline mr-2" />
                        Archivos ({memberFiles.length})
                    </button>
                </div>

                {selectedTab === 'songs' ? (
                    <div className="space-y-3">
                        {songsLoading ? (
                            <div className="flex items-center justify-center py-12">
                                <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
                            </div>
                        ) : songs.length === 0 ? (
                            <div className="text-center py-12 text-gray-400">
                                <Music className="w-12 h-12 mx-auto mb-3 opacity-50" />
                                <p>No hay canciones aún</p>
                            </div>
                        ) : (
                            songs.map((song, idx) => (
                                <SongCard
                                    key={song.id}
                                    song={song}
                                    showArtist={true}
                                    onPlay={() => setQueue(songs, idx)}
                                />
                            ))
                        )}
                    </div>
                ) : null}

                {selectedTab === 'debts' ? (
                    <div className="space-y-3">
                        {debtsLoading ? (
                            <div className="flex items-center justify-center py-12">
                                <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
                            </div>
                        ) : memberDebts.length === 0 ? (
                            <div className="text-center py-12 text-gray-400">
                                <CreditCard className="w-12 h-12 mx-auto mb-3 opacity-50" />
                                <p>Sin deudas registradas</p>
                            </div>
                        ) : (
                            memberDebts.map((debt: Debt) => {
                                const isCreditor = debt.creditor_id === userId
                                return (
                                    <div
                                        key={debt.id}
                                        className="card p-4 space-y-3 cursor-pointer"
                                        onClick={() => navigate(`/debts/${debt.id}`)}
                                        role="button"
                                        tabIndex={0}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' || e.key === ' ') navigate(`/debts/${debt.id}`)
                                        }}
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="flex-1">
                                                <p className="text-sm font-semibold text-white">{debt.concept}</p>
                                                <p className="text-xs text-gray-400">
                                                    {isCreditor ? 'Te debe →' : '← Debes'} {formatMoney(debt.amount, debt.currency)}
                                                </p>
                                            </div>
                                            <div className="text-right">
                                                <p
                                                    className={`text-lg font-bold ${
                                                        isCreditor ? 'text-emerald-400' : 'text-red-400'
                                                    }`}
                                                >
                                                    {formatMoney(debt.amount - debt.amount_paid, debt.currency)}
                                                </p>
                                                <p
                                                    className={`text-xs font-semibold ${
                                                        debt.status === 'paid'
                                                            ? 'text-emerald-400'
                                                            : debt.status === 'partial'
                                                                ? 'text-yellow-400'
                                                                : 'text-gray-400'
                                                    }`}
                                                >
                                                    {DEBT_STATUS_LABELS[debt.status]}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex justify-between text-xs text-gray-500">
                                            <span>{formatRelative(debt.created_at)}</span>
                                            {debt.amount_paid > 0 ? (
                                                <span>Pagado: {formatMoney(debt.amount_paid, debt.currency)}</span>
                                            ) : null}
                                        </div>
                                    </div>
                                )
                            })
                        )}
                    </div>
                ) : null}

                {selectedTab === 'files' ? (
                    <div className="space-y-2">
                        {filesLoading ? (
                            <div className="flex items-center justify-center py-12">
                                <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
                            </div>
                        ) : memberFiles.length === 0 ? (
                            <div className="text-center py-12 text-gray-400">
                                <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
                                <p>Sin archivos</p>
                            </div>
                        ) : (
                            memberFiles.map((f) => (
                                <a
                                    key={f.id}
                                    href={f.file_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="card p-4 flex items-center justify-between hover:border-surface-400 transition-colors"
                                >
                                    <div className="min-w-0">
                                        <p className="text-sm font-medium text-white truncate">{f.name}</p>
                                        <p className="text-xs text-gray-500">{formatRelative(f.created_at)}</p>
                                    </div>
                                    <span className="text-xs text-brand-400">Abrir</span>
                                </a>
                            ))
                        )}
                    </div>
                ) : null}
            </div>
        </div>
    )
}

