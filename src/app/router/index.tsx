import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { ProtectedRoute } from '@components/common/ProtectedRoute'
import { AppLayout } from '@components/layout/AppLayout'

// Pages - lazy loaded for performance
const LoginPage = React.lazy(() => import('@pages/auth/LoginPage'))
const RegisterPage = React.lazy(() => import('@pages/auth/RegisterPage'))
const ResetPasswordPage = React.lazy(() => import('@pages/auth/ResetPasswordPage'))
const DashboardPage = React.lazy(() => import('@pages/DashboardPage'))
const ProfilePage = React.lazy(() => import('@pages/profile/ProfilePage'))
const ArtistProfilePage = React.lazy(() => import('@pages/ArtistProfilePage'))
const MusicPage = React.lazy(() => import('@pages/music/MusicPage'))
const SongDetailPage = React.lazy(() => import('@pages/music/SongDetailPage'))
const PlaylistsPage = React.lazy(() => import('@pages/playlists/PlaylistsPage'))
const PlaylistDetailPage = React.lazy(() => import('@pages/playlists/PlaylistDetailPage'))
const FavoritesPage = React.lazy(() => import('@pages/FavoritesPage'))
const DebtsPage = React.lazy(() => import('@pages/debts/DebtsPage'))
const DebtDetailPage = React.lazy(() => import('@pages/debts/DebtDetailPage'))
const FilesPage = React.lazy(() => import('@pages/FilesPage'))
const SharedPage = React.lazy(() => import('@pages/SharedPage'))
const GroupsPage = React.lazy(() => import('@pages/groups/GroupsPage'))
const GroupDetailPage = React.lazy(() => import('@pages/groups/GroupDetailPage'))
const NotificationsPage = React.lazy(() => import('@pages/NotificationsPage'))

const PageLoader: React.FC = () => (
    <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
    </div>
)

export const AppRouter: React.FC = () => (
    <BrowserRouter>
        <React.Suspense fallback={<PageLoader />}>
            <Routes>
                {/* Public routes */}
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />
                <Route path="/reset-password" element={<ResetPasswordPage />} />
                <Route path="/shared/:token" element={<SharedPage />} />

                {/* Protected routes with layout */}
                <Route
                    element={
                        <ProtectedRoute>
                            <AppLayout />
                        </ProtectedRoute>
                    }
                >
                    <Route index element={<DashboardPage />} />
                    <Route path="/profile" element={<ProfilePage />} />
                    <Route path="/profile/:id" element={<ArtistProfilePage />} />
                    <Route path="/groups" element={<GroupsPage />} />
                    <Route path="/groups/:groupId" element={<GroupDetailPage />} />
                    <Route path="/notifications" element={<NotificationsPage />} />
                    <Route path="/music" element={<MusicPage />} />
                    <Route path="/music/:songId" element={<SongDetailPage />} />
                    <Route path="/playlists" element={<PlaylistsPage />} />
                    <Route path="/playlists/:playlistId" element={<PlaylistDetailPage />} />
                    <Route path="/favorites" element={<FavoritesPage />} />
                    <Route path="/debts" element={<DebtsPage />} />
                    <Route path="/debts/:debtId" element={<DebtDetailPage />} />
                    <Route path="/files" element={<FilesPage />} />
                </Route>

                {/* Catch-all */}
                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        </React.Suspense>
    </BrowserRouter>
)
