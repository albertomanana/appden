import React from 'react'
import { Plus, Radio, PlayCircle } from 'lucide-react'
import { FullPlayer } from '@features/player/components/FullPlayer'
import { MiniPlayer } from '@features/player/components/MiniPlayer'
import { usePlayer } from '@features/player/hooks/usePlayer'
import type { PlayerSong } from '@features/player/player.types'

interface PlayerIntegrationExampleProps {
    songs: PlayerSong[]
    userId: string
}

export const PlayerIntegrationExample: React.FC<PlayerIntegrationExampleProps> = ({ songs, userId }) => {
    const player = usePlayer({ catalog: songs, userId })

    return (
        <div className="space-y-3 pb-28">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-bold text-white">Music Library</h2>
                    <p className="text-sm text-white/65">Integracion de player avanzado</p>
                </div>
                <button
                    onClick={() => player.startRadioFromSong()}
                    className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-brand-500/20 border border-brand-300/40 text-brand-200"
                >
                    <Radio className="w-4 h-4" />
                    Radio auto
                </button>
            </div>

            <div className="space-y-2">
                {songs.map((song, index) => (
                    <div key={song.id} className="rounded-xl bg-white/5 border border-white/10 p-2.5 flex items-center gap-3">
                        <button
                            onClick={() => void player.playSong(song, songs, index, 0)}
                            className="w-10 h-10 rounded-lg bg-brand-500/25 grid place-items-center text-brand-100"
                            aria-label={`Play ${song.title}`}
                        >
                            <PlayCircle className="w-5 h-5" />
                        </button>
                        <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold text-white truncate">{song.title}</p>
                            <p className="text-xs text-white/60 truncate">{song.artist_name}</p>
                        </div>
                        <button
                            onClick={() => player.addToQueue(song)}
                            className="w-9 h-9 rounded-lg bg-white/10 hover:bg-white/20 text-white/85 grid place-items-center"
                            aria-label={`Add ${song.title} to queue`}
                        >
                            <Plus className="w-4 h-4" />
                        </button>
                    </div>
                ))}
            </div>

            <MiniPlayer />
            <FullPlayer />
        </div>
    )
}

