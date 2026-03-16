import React, { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, Music } from 'lucide-react'
import { profileService } from '@services/profile.service'
import { songsService } from '@services/songs.service'
import { useAuth } from '@hooks/useAuth'
import { usePlayerStore } from '@app/store/player.store'
import { Avatar } from '@components/common/Avatar'
import { SongCard } from '@components/music/SongCard'

const ArtistProfilePage: React.FC = () => {
    const { id } = useParams<{ id: string }>()
    const navigate = useNavigate()
    const { userId } = useAuth()
    const setQueue = usePlayerStore((s) => s.setQueue)
    const [selectedTab, setSelectedTab] = useState<'songs'>('songs')

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

    // Calculate stats
    const totalSongs = songs.length

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

            </div>
        </div>
    )
}

export default ArtistProfilePage
