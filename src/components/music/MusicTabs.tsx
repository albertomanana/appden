import React, { useEffect, useRef } from 'react'
import { Tabs } from '@components/ui/Tabs'
import { ROUTES } from '@lib/constants'

export type MusicTab = 'music' | 'albums' | 'artists' | 'playlists' | 'favorites'

const items = [
    { label: 'Canciones', value: 'music', href: ROUTES.MUSIC },
    { label: 'Álbumes', value: 'albums', href: ROUTES.ALBUMS },
    { label: 'Artistas', value: 'artists', href: ROUTES.ARTISTS },
    { label: 'Playlists', value: 'playlists', href: ROUTES.PLAYLISTS },
    { label: 'Favoritas', value: 'favorites', href: ROUTES.FAVORITES },
]

/** Secondary navigation shared by every library page (songs, albums, artists, playlists, favourites). */
export const MusicTabs: React.FC<{ active: MusicTab }> = ({ active }) => {
    const ref = useRef<HTMLDivElement>(null)

    // On phones the row scrolls: keep the active tab visible without moving the page.
    useEffect(() => {
        const container = ref.current
        const scroller = container?.firstElementChild as HTMLElement | null
        const tab = container?.querySelector<HTMLElement>('[aria-selected="true"]')
        if (!scroller || !tab || scroller.scrollWidth <= scroller.clientWidth) return
        const tabRect = tab.getBoundingClientRect()
        const scrollerRect = scroller.getBoundingClientRect()
        const left = scroller.scrollLeft + (tabRect.left - scrollerRect.left) - (scroller.clientWidth - tabRect.width) / 2
        scroller.scrollTo({ left: Math.max(0, left) })
    }, [active])

    return (
        <div ref={ref}>
            <Tabs active={active} stretch items={items} />
        </div>
    )
}
