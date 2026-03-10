import React, { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, Music, CreditCard, Calendar } from 'lucide-react'
import { profileService } from '@services/profile.service'
import { songsService } from '@services/songs.service'
import { debtsService } from '@services/debts.service'
import { useAuth } from '@hooks/useAuth'
import { usePlayerStore } from '@app/store/player.store'
import { Avatar } from '@components/common/Avatar'
import { SongCard } from '@components/music/SongCard'
import { formatMoney, formatRelative } from '@lib/utils'
import { DEBT_STATUS_LABELS } from '@lib/constants'
import type { Debt } from '@/types'

const ArtistProfilePage: React.FC = () => {
    const { id } = useParams<{ id: string }>()
    const navigate = useNavigate()
    const { userId } = useAuth()
    const setQueue = usePlayerStore((s) => s.setQueue)
    const [selectedTab, setSelectedTab] = useState<'songs' | 'debts'>('songs')

    if (!id) {
        return <div className="p-4">Artist ID not provided</div>
    }

    const { data: profile, isLoading: profileLoading } = useQuery({
        queryKey: ['profile', id],
        queryFn: () => profileService.getProfile(id),
    })

    const { data: songs = [], isLoading: songsLoading } = useQuery({
        queryKey: ['songs-by-artist', id],
        queryFn: () => songsService.getSongsByArtist(id, userId || ''),
        enabled: !!id && !!userId,
    })

    const { data: debts = [] } = useQuery({
        queryKey: ['debts-artist', id],
        queryFn: () => debtsService.getDebts(''), // Get all debts and filter
        enabled: !!id,
    })

    // Filter debts where artist is creditor or debtor
    const artistDebts = debts.filter((d: Debt) => d.creditor_id === id || d.debtor_id === id)

    // Calculate stats
    const totalSongs = songs.length
    const totalDebtsOwed = artistDebts
        .filter((d: Debt) => d.debtor_id === id && d.status !== 'paid')
        .reduce((sum, d: Debt) => sum + (d.amount - d.amount_paid), 0)
    const totalDebtsCredited = artistDebts
        .filter((d: Debt) => d.creditor_id === id && d.status !== 'paid')
        .reduce((sum, d: Debt) => sum + (d.amount - d.amount_paid), 0)

    if (profileLoading) {
        return (
            <div className="p-4 flex items-center justify-center h-64">
                <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
            </div>
        )
    }

    if (!profile) {
        return <div className="p-4">Artist not found</div>
    }

    return (
        <div className="min-h-screen bg-gradient-to-b from-brand-900/40 to-surface-900 pb-32">
            {/* Header */}
            <div className="p-4 md:p-6">
                <button
                    onClick={() => navigate(-1)}
                    className="mb-6 flex items-center gap-2 text-brand-400 hover:text-brand-300 transition-colors"
                >
                    <ArrowLeft className="w-5 h-5" />
                    Volver
                </button>

                {/* Artist Hero */}
                <div className="flex flex-col md:flex-row items-start gap-6 mb-8">
                    <Avatar src={profile.avatar_url} name={profile.display_name} size="lg" />
                    <div className="flex-1">
                        <h1 className="text-4xl font-bold text-white mb-2">{profile.display_name}</h1>
                        {profile.bio && <p className="text-gray-300 mb-4">{profile.bio}</p>}
                        <div className="flex gap-6 flex-wrap">
                            <div>
                                <p className="text-xs text-gray-400 uppercase tracking-wider">Canciones</p>
                                <p className="text-2xl font-bold text-white">{totalSongs}</p>
                            </div>
                            <div>
                                <p className="text-xs text-gray-400 uppercase tracking-wider">Te deben</p>
                                <p className="text-2xl font-bold text-emerald-400">{formatMoney(totalDebtsCredited)}</p>
                            </div>
                            <div>
                                <p className="text-xs text-gray-400 uppercase tracking-wider">Debes</p>
                                <p className="text-2xl font-bold text-red-400">{formatMoney(totalDebtsOwed)}</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Tabs */}
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
                        Deudas ({artistDebts.length})
                    </button>
                </div>

                {/* Songs Tab */}
                {selectedTab === 'songs' && (
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
                                    onPlay={() => setQueue(songs, idx)}
                                    showArtist={false}
                                />
                            ))
                        )}
                    </div>
                )}

                {/* Debts Tab */}
                {selectedTab === 'debts' && (
                    <div className="space-y-3">
                        {artistDebts.length === 0 ? (
                            <div className="text-center py-12 text-gray-400">
                                <CreditCard className="w-12 h-12 mx-auto mb-3 opacity-50" />
                                <p>Sin deudas registradas</p>
                            </div>
                        ) : (
                            artistDebts.map((debt: Debt) => {
                                const isCreditor = debt.creditor_id === id
                                return (
                                    <div key={debt.id} className="card p-4 space-y-3">
                                        <div className="flex items-center justify-between">
                                            <div className="flex-1">
                                                <p className="text-sm font-semibold text-white">{debt.concept}</p>
                                                <p className="text-xs text-gray-400">
                                                    {isCreditor ? 'Te debe →' : '← Te debe'}{' '}
                                                    {formatMoney(debt.amount, debt.currency)}
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
                                                <p className={`text-xs  font-semibold ${
                                                    debt.status === 'paid'
                                                        ? 'text-emerald-400'
                                                        : debt.status === 'partial'
                                                            ? 'text-yellow-400'
                                                            : 'text-gray-400'
                                                }`}>
                                                    {DEBT_STATUS_LABELS[debt.status]}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex justify-between text-xs text-gray-500">
                                            <span className="flex items-center gap-1">
                                                <Calendar className="w-3 h-3" />
                                                {formatRelative(debt.created_at)}
                                            </span>
                                            {debt.amount_paid > 0 && (
                                                <span>Pagado: {formatMoney(debt.amount_paid, debt.currency)}</span>
                                            )}
                                        </div>
                                    </div>
                                )
                            })
                        )}
                    </div>
                )}
            </div>
        </div>
    )
}

export default ArtistProfilePage
