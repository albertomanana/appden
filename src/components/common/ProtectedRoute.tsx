import React from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '@hooks/useAuth'
import { ROUTES } from '@lib/constants'

interface ProtectedRouteProps {
    children: React.ReactNode
}

/**
 * Wraps private routes. Redirects unauthenticated users to /login,
 * preserving the intended destination via state for post-login redirect.
 */
export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
    const { isAuthenticated, isInitialized } = useAuth()
    const location = useLocation()

    // Show nothing while auth is initializing (AuthProvider handles the splash)
    if (!isInitialized) return null

    if (!isAuthenticated) {
        return <Navigate to={ROUTES.LOGIN} state={{ from: location }} replace />
    }

    return <>{children}</>
}
