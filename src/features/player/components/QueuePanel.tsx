import React, { useMemo, useState } from 'react'
import { GripVertical, Trash2 } from 'lucide-react'
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
        <aside className="w-full rounded-[1.5rem] bg-[#131313] p-4 shadow-[0_24px_64px_rgba(0,0,0,0.35)] md:w-80">
            <div className="mb-4">
                <p className="page-kicker">Cola</p>
                <h3 className="mt-2 text-2xl font-headline font-extrabold text-white">Siguiente</h3>
            </div>

            {nowPlaying ? (
                    <div className="mb-4 rounded-[1.2rem] bg-[#201f1f] p-3">
                    <p className="text-[11px] uppercase tracking-[0.22em] text-white/55">Sonando</p>
                    <p className="mt-2 truncate text-sm font-semibold text-white">{nowPlaying.title}</p>
                    <p className="truncate text-xs uppercase tracking-[0.18em] text-white/55">{nowPlaying.artist_name}</p>
                </div>
            ) : null}

            <div className="max-h-80 space-y-2 overflow-y-auto pr-1">
                {nextUp.length === 0 ? (
                    <div className="py-6 text-center text-sm text-white/60">No hay canciones en cola.</div>
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
                                className={`flex items-center gap-2 rounded-[1.15rem] p-2.5 transition-colors ${
                                    isDropTarget ? 'bg-brand-500/22' : 'bg-[#201f1f] hover:bg-[#262626]'
                                }`}
                            >
                                <button type="button" className="text-white/35 hover:text-white" aria-label="Mover en cola">
                                    <GripVertical className="w-4 h-4" />
                                </button>
                                <button onClick={() => onPlayIndex(index)} className="min-w-0 flex-1 text-left">
                                    <p className="truncate text-sm text-white">{song.title}</p>
                                    <p className="truncate text-xs uppercase tracking-[0.18em] text-white/55">{song.artist_name}</p>
                                </button>
                                <button onClick={() => onRemove(song.id)} className="text-white/35 hover:text-red-300" aria-label="Quitar de la cola">
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        )
                    })
                )}
            </div>
        </aside>
    )
}
