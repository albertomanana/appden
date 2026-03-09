import React from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AppRouter } from '@app/router'
import { AuthProvider } from '@app/providers/AuthProvider'
import { ToastProvider } from '@components/ui/Toast'

const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            staleTime: 1000 * 60 * 5, // 5 minutes
            gcTime: 1000 * 60 * 10, // 10 minutes (formerly cacheTime)
        },
    },
})

export const App: React.FC = () => (
    <QueryClientProvider client={queryClient}>
        <ToastProvider>
            <AuthProvider>
                <AppRouter />
            </AuthProvider>
        </ToastProvider>
    </QueryClientProvider>
)
