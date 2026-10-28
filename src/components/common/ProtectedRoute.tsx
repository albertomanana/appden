import React from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '@hooks/useAuth'
import { ROUTES } from '@lib/constants'

interface ProtectedRouteProps {
    children: React.ReactNode
}

/** Branded splash shown while the stored session is being restored. */
const SessionSplash: React.FC = () => (
    <div className="grid min-h-dvh place-items-center bg-background" role="status" aria-label="Cargando sesión">
        <div className="flex flex-col items-center gap-5">
            <span className="font-display animate-pulse bg-gradient-to-r from-blue-200 to-blue-500 bg-clip-text text-3xl font-black italic tracking-[-0.05em] text-transparent">
                The Appden
            </span>
            <span className="h-1 w-24 overflow-hidden rounded-full bg-white/10">
                <span className="block h-full w-1/2 animate-[slideUp_1s_ease-in-out_infinite_alternate] rounded-full bg-brand-400" />
            </span>
        </div>
    </div>
)

/**
 * Wraps private routes. Redirects unauthenticated users to /login,
 * preserving the intended destination (path + query, e.g. invite links) for post-login redirect.
 */
export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
    const { isAuthenticated, isInitialized } = useAuth()
    const location = useLocation()

    if (!isInitialized) return <SessionSplash />

    if (!isAuthenticated) {
        return <Navigate to={ROUTES.LOGIN} state={{ from: location }} replace />
    }

    return <>{children}</>
}
