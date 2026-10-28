import { create } from 'zustand'

const SIDEBAR_KEY = 'appden:sidebar-collapsed'

function readCollapsed(): boolean {
    try {
        return window.localStorage.getItem(SIDEBAR_KEY) === '1'
    } catch {
        return false
    }
}

function applyCollapsed(collapsed: boolean) {
    if (typeof document === 'undefined') return
    // Drives --sidebar-w in globals.css; set before the first paint to avoid a width jump.
    if (collapsed) document.documentElement.dataset.sidebar = 'collapsed'
    else delete document.documentElement.dataset.sidebar
}

const initialCollapsed = typeof window === 'undefined' ? false : readCollapsed()
applyCollapsed(initialCollapsed)

interface ShellState {
    /** Desktop sidebar folded into the icon rail (only meaningful at lg+). */
    sidebarCollapsed: boolean
    toggleSidebar: () => void
}

export const useShellStore = create<ShellState>((set, get) => ({
    sidebarCollapsed: initialCollapsed,
    toggleSidebar: () => {
        const next = !get().sidebarCollapsed
        applyCollapsed(next)
        try {
            window.localStorage.setItem(SIDEBAR_KEY, next ? '1' : '0')
        } catch {
            // Private mode or blocked storage: keep the in-memory preference.
        }
        set({ sidebarCollapsed: next })
    },
}))
