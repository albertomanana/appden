import React, { useMemo, useState } from 'react'
import { GripVertical, Music2, Trash2 } from 'lucide-react'
import type { PlayerSong } from '@features/player/player.types'

interface QueuePanelProps {
    queue: PlayerSong[]
    queueIndex: number
    onPlayIndex: (index: number) => void
    onRemove: (songId: string) => void
    onReorder: (fromIndex: number, toIndex: number) => void
}

export const QueuePanel: React.FC<QueuePanelProps> = ({
    queue,
    queueIndex,
    onPlayIndex,
    onRemove,
    onReorder,
}) => {
    const [dragFrom, setDragFrom] = useState<number | null>(null)
    const [dragTo, setDragTo] = useState<number | null>(null)

    const nextUp = useMemo(() => queue.slice(queueIndex + 1), [queue, queueIndex])
    const nowPlaying = queue[queueIndex]

    return (
        <aside className="w-full md:w-80 rounded-2xl bg-black/35 border border-white/10 p-3">
            <h3 className="text-sm font-semibold text-white mb-3">Queue</h3>
            {nowPlaying ? (
                <div className="mb-3 rounded-xl bg-white/10 p-2.5">
                    <p className="text-[11px] uppercase tracking-wider text-white/60">Now Playing</p>
                    <p className="text-sm font-semibold text-white truncate">{nowPlaying.title}</p>
                    <p className="text-xs text-white/60 truncate">{nowPlaying.artist_name}</p>
                </div>
            ) : null}

            <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                {nextUp.length === 0 ? (
                    <div className="text-sm text-white/60 py-6 text-center">
                        No hay canciones en cola.
                    </div>
                ) : (
                    nextUp.map((song, offset) => {
                        const index = queueIndex + 1 + offset
                        const isDropTarget = dragTo === index
                        return (
                            <div
                                key={`${song.id}-${index}`}
                                draggable
                                onDragStart={() => {
                                    setDragFrom(index)
                                    setDragTo(index)
                                }}
                                onDragOver={(event) => {
                                    event.preventDefault()
                                    setDragTo(index)
                                }}
                                onDragEnd={() => {
                                    if (dragFrom != null && dragTo != null && dragFrom !== dragTo) {
                                        onReorder(dragFrom, dragTo)
                                    }
                                    setDragFrom(null)
                                    setDragTo(null)
                                }}
                                className={`flex items-center gap-2 rounded-xl p-2 transition-colors ${
                                    isDropTarget ? 'bg-brand-500/30' : 'bg-white/5 hover:bg-white/10'
                                }`}
                            >
                                <button
                                    type="button"
                                    className="text-white/45 hover:text-white"
                                    aria-label="Drag to reorder"
                                >
                                    <GripVertical className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={() => onPlayIndex(index)}
                                    className="min-w-0 flex-1 text-left"
                                >
                                    <p className="text-sm text-white truncate">{song.title}</p>
                                    <p className="text-xs text-white/60 truncate">{song.artist_name}</p>
                                </button>
                                <button
                                    onClick={() => onRemove(song.id)}
                                    className="text-white/45 hover:text-red-300"
                                    aria-label="Remove from queue"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        )
                    })
                )}
            </div>

            <div className="mt-3 text-xs text-white/55 flex items-center gap-1">
                <Music2 className="w-3.5 h-3.5" />
                Drag and drop para reordenar la cola
            </div>
        </aside>
    )
}
