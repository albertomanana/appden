import React, { useEffect, useState } from 'react'
import { Reorder, useDragControls } from 'framer-motion'
import { GripVertical, X } from 'lucide-react'
import { Cover, EqualizerBars } from '@components/music/Cover'
import type { PlayerSong } from '@features/player/player.types'

interface QueuePanelProps {
    queue: PlayerSong[]
    queueIndex: number
    isPlaying?: boolean
    onPlayIndex: (index: number) => void
    onRemove: (songId: string) => void
    onReorder: (fromIndex: number, toIndex: number) => void
}

type QueueItem = { key: string; song: PlayerSong; index: number }

export const QueuePanel: React.FC<QueuePanelProps> = ({
    queue,
    queueIndex,
    isPlaying = false,
    onPlayIndex,
    onRemove,
    onReorder,
}) => {
    const nowPlaying = queue[queueIndex]
    const [items, setItems] = useState<QueueItem[]>([])

    useEffect(() => {
        setItems(
            queue.slice(queueIndex + 1).map((song, offset) => {
                const index = queueIndex + 1 + offset
                return { key: `${song.id}-${index}`, song, index }
            })
        )
    }, [queue, queueIndex])

    const commit = (item: QueueItem) => {
        const newPosition = items.findIndex((candidate) => candidate.key === item.key)
        if (newPosition < 0) return
        const toIndex = queueIndex + 1 + newPosition
        if (toIndex !== item.index) onReorder(item.index, toIndex)
    }

    return (
        <div>
            {nowPlaying ? (
                <div className="mb-5">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">Sonando ahora</p>
                    <div className="flex items-center gap-3 rounded-2xl bg-white/[0.05] p-2.5">
                        <Cover src={nowPlaying.cover_url} alt={nowPlaying.title} seed={nowPlaying.id} className="h-12 w-12 rounded-xl" />
                        <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold text-brand-200">{nowPlaying.title}</p>
                            <p className="truncate text-xs text-gray-400">{nowPlaying.artist_name}</p>
                        </div>
                        <EqualizerBars playing={isPlaying} className="mr-2 text-brand-300" />
                    </div>
                </div>
            ) : null}

            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">
                A continuación {items.length > 0 ? `· ${items.length}` : ''}
            </p>

            {items.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-white/10 py-8 text-center text-sm text-gray-400">
                    No hay más canciones en la cola.
                </div>
            ) : (
                <Reorder.Group axis="y" values={items} onReorder={setItems} className="space-y-1">
                    {items.map((item) => (
                        <QueueRow
                            key={item.key}
                            item={item}
                            onPlay={() => onPlayIndex(item.index)}
                            onRemove={() => onRemove(item.song.id)}
                            onDragEnd={() => commit(item)}
                        />
                    ))}
                </Reorder.Group>
            )}
        </div>
    )
}

const QueueRow: React.FC<{
    item: QueueItem
    onPlay: () => void
    onRemove: () => void
    onDragEnd: () => void
}> = ({ item, onPlay, onRemove, onDragEnd }) => {
    const controls = useDragControls()

    return (
        <Reorder.Item
            value={item}
            dragListener={false}
            dragControls={controls}
            onDragEnd={onDragEnd}
            className="flex items-center gap-2 rounded-2xl bg-[#17171a] py-1.5 pl-1 pr-1"
            whileDrag={{ scale: 1.02, boxShadow: '0 12px 30px rgba(0,0,0,0.45)', backgroundColor: '#222226' }}
        >
            <button
                type="button"
                onPointerDown={(event) => controls.start(event)}
                className="grid h-11 w-9 shrink-0 cursor-grab touch-none place-items-center text-gray-500 active:cursor-grabbing"
                aria-label="Arrastrar para reordenar"
            >
                <GripVertical className="h-4 w-4" />
            </button>
            <button type="button" onClick={onPlay} className="flex min-w-0 flex-1 items-center gap-3 text-left">
                <Cover src={item.song.cover_url} alt={item.song.title} seed={item.song.id} className="h-10 w-10 rounded-lg" iconClassName="h-4 w-4" />
                <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-white">{item.song.title}</span>
                    <span className="block truncate text-xs text-gray-400">{item.song.artist_name}</span>
                </span>
            </button>
            <button type="button" onClick={onRemove} className="icon-btn text-gray-500" aria-label="Quitar de la cola">
                <X className="h-4 w-4" />
            </button>
        </Reorder.Item>
    )
}
