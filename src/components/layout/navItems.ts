import type React from 'react'
import {
    Bell,
    Disc3,
    Flag,
    FolderOpen,
    Heart,
    Home,
    Library,
    ListMusic,
    Mic2,
    Music2,
    Newspaper,
    ShieldCheck,
    Sparkles,
    User,
    UserPlus,
    Users,
    Wallet,
} from 'lucide-react'
import { ROUTES } from '@lib/constants'

export type NavIcon = React.ComponentType<{ className?: string; strokeWidth?: number | string }>

export type NavLinkItem = {
    key: string
    label: string
    to: string
    icon: NavIcon
    match: (pathname: string) => boolean
    /** Shows the unread notifications counter. */
    badge?: 'notifications'
    adminOnly?: boolean
}

export type NavSection = {
    key: 'home' | 'music' | 'social' | 'debts' | 'profile'
    label: string
    to: string
    icon: NavIcon
    /** Accent used for the active icon and indicator. */
    accent: string
    /** Matches the section root itself (used when no child link matches). */
    matchSelf: (pathname: string) => boolean
    children?: NavLinkItem[]
}

const starts = (pathname: string, prefix: string) => pathname === prefix || pathname.startsWith(`${prefix}/`)

export const NAV_SECTIONS: NavSection[] = [
    {
        key: 'home',
        label: 'Inicio',
        to: ROUTES.DASHBOARD,
        icon: Home,
        accent: '#9cc2ff',
        matchSelf: (pathname) => pathname === ROUTES.DASHBOARD,
    },
    {
        key: 'music',
        label: 'Música',
        to: ROUTES.MUSIC,
        icon: Library,
        accent: '#85adff',
        matchSelf: () => false,
        children: [
            {
                key: 'songs',
                label: 'Canciones',
                to: ROUTES.MUSIC,
                icon: Music2,
                match: (pathname) =>
                    starts(pathname, ROUTES.MUSIC) && !starts(pathname, ROUTES.ALBUMS) && !starts(pathname, ROUTES.ARTISTS),
            },
            { key: 'albums', label: 'Álbumes', to: ROUTES.ALBUMS, icon: Disc3, match: (pathname) => starts(pathname, ROUTES.ALBUMS) },
            {
                key: 'artists',
                label: 'Artistas',
                to: ROUTES.ARTISTS,
                icon: Mic2,
                match: (pathname) => starts(pathname, ROUTES.ARTISTS) || pathname.startsWith(`${ROUTES.PROFILE}/`),
            },
            { key: 'playlists', label: 'Playlists', to: ROUTES.PLAYLISTS, icon: ListMusic, match: (pathname) => starts(pathname, ROUTES.PLAYLISTS) },
            { key: 'favorites', label: 'Favoritas', to: ROUTES.FAVORITES, icon: Heart, match: (pathname) => starts(pathname, ROUTES.FAVORITES) },
        ],
    },
    {
        key: 'social',
        label: 'Social',
        to: ROUTES.SOCIAL,
        icon: Users,
        accent: '#ff8fd0',
        matchSelf: () => false,
        children: [
            { key: 'feed', label: 'Feed', to: ROUTES.SOCIAL, icon: Newspaper, match: (pathname) => starts(pathname, ROUTES.SOCIAL) },
            { key: 'groups', label: 'Grupos', to: ROUTES.GROUPS, icon: Users, match: (pathname) => starts(pathname, ROUTES.GROUPS) },
            {
                key: 'friends',
                label: 'Amigos',
                to: ROUTES.CONNECTIONS,
                icon: UserPlus,
                match: (pathname) => starts(pathname, ROUTES.CONNECTIONS) || starts(pathname, '/friends'),
            },
        ],
    },
    {
        key: 'debts',
        label: 'Cuentas',
        to: ROUTES.DEBTS,
        icon: Wallet,
        accent: '#ffc966',
        matchSelf: (pathname) => starts(pathname, ROUTES.DEBTS),
    },
    {
        key: 'profile',
        label: 'Perfil',
        to: ROUTES.PROFILE,
        icon: User,
        accent: '#ac8aff',
        matchSelf: (pathname) => pathname === ROUTES.PROFILE,
        children: [
            {
                key: 'notifications',
                label: 'Notificaciones',
                to: ROUTES.NOTIFICATIONS,
                icon: Bell,
                badge: 'notifications',
                match: (pathname) => starts(pathname, ROUTES.NOTIFICATIONS),
            },
            { key: 'files', label: 'Archivos', to: ROUTES.FILES, icon: FolderOpen, match: (pathname) => starts(pathname, ROUTES.FILES) },
            {
                key: 'reports',
                label: 'Reportes',
                to: ROUTES.REPORTS,
                icon: Flag,
                match: (pathname) => starts(pathname, ROUTES.REPORTS) || starts(pathname, ROUTES.REPORT),
            },
            { key: 'changelog', label: 'Novedades', to: ROUTES.CHANGELOG, icon: Sparkles, match: (pathname) => starts(pathname, ROUTES.CHANGELOG) },
            {
                key: 'requests',
                label: 'Solicitudes',
                to: ROUTES.ADMIN_REQUESTS,
                icon: ShieldCheck,
                adminOnly: true,
                match: (pathname) => pathname.startsWith('/admin'),
            },
        ],
    },
]

export type ActiveNav = {
    section: NavSection | null
    /** Most specific child link matching the path, if any. */
    child: NavLinkItem | null
}

export function resolveActiveNav(pathname: string): ActiveNav {
    for (const section of NAV_SECTIONS) {
        const child = section.children?.find((item) => item.match(pathname)) ?? null
        if (child || section.matchSelf(pathname)) return { section, child }
    }
    return { section: null, child: null }
}
