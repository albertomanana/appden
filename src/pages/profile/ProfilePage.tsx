import React, { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Edit2, LogOut, ArrowLeft } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { profileService } from '@services/profile.service'
import { authService } from '@services/auth.service'
import { useAuthStore } from '@app/store/auth.store'
import { useAuth } from '@hooks/useAuth'
import { profileSchema, validateAvatarFile, type ProfileFormData } from '@lib/validators'
import { useToast } from '@components/ui/Toast'
import { Avatar } from '@components/common/Avatar'
import { formatDate } from '@lib/utils'

const ProfilePage: React.FC = () => {
    const { id } = useParams<{ id?: string }>()
    const { userId, profile: myProfile } = useAuth()
    const { setUser, logout } = useAuthStore()
    const { success, error: toastError } = useToast()
    const queryClient = useQueryClient()
    const navigate = useNavigate()

    const targetId = id ?? userId!
    const isOwnProfile = targetId === userId

    const [editing, setEditing] = useState(false)
    const [avatarFile, setAvatarFile] = useState<File | null>(null)
    const [avatarError, setAvatarError] = useState<string | null>(null)

    const { data: profile, isLoading } = useQuery({
        queryKey: ['profile', targetId],
        queryFn: () => profileService.getProfile(targetId),
    })

    const { register, handleSubmit, formState: { errors, isSubmitting }, reset } = useForm<ProfileFormData>({
        resolver: zodResolver(profileSchema),
        values: {
            display_name: profile?.display_name ?? '',
            username: profile?.username ?? '',
            bio: profile?.bio ?? '',
        },
    })

    const { mutate: updateProfile } = useMutation({
        mutationFn: (data: ProfileFormData) => profileService.updateProfile(userId!, data),
        onSuccess: (updated) => {
            void queryClient.invalidateQueries({ queryKey: ['profile', userId] })
            setUser({ id: userId!, email: myProfile?.username ?? null, profile: updated })
            success('Perfil actualizado', 'Los cambios se han guardado.')
            setEditing(false)
        },
        onError: () => toastError('Error', 'No se pudo actualizar el perfil.'),
    })

    const { mutate: uploadAvatar, isPending: isUploadingAvatar } = useMutation({
        mutationFn: (file: File) => profileService.uploadAvatar(userId!, file),
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: ['profile', userId] })
            success('Avatar actualizado')
            setAvatarFile(null)
        },
        onError: () => toastError('Error', 'No se pudo subir el avatar.'),
    })

    const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return
        const err = validateAvatarFile(file)
        if (err) { setAvatarError(err); return }
        setAvatarError(null)
        setAvatarFile(file)
        uploadAvatar(file)
    }

    const handleLogout = async () => {
        await authService.logout()
        logout()
        navigate('/login')
    }

    if (isLoading) {
        return (
            <div className="p-4 flex items-center justify-center h-64">
                <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
            </div>
        )
    }

    if (!profile) {
        return <div className="p-4 text-gray-400">Perfil no encontrado.</div>
    }

    return (
        <div className="p-4 md:p-6 max-w-lg mx-auto space-y-5 animate-fade-in">
            {/* Back for other profiles */}
            {id && (
                <button onClick={() => navigate(-1)} className="btn-ghost gap-2 -ml-1">
                    <ArrowLeft className="w-4 h-4" /> Volver
                </button>
            )}

            {/* Profile header */}
            <div className="card p-6 flex flex-col items-center gap-4">
                {/* Avatar */}
                <div className="relative">
                    <Avatar src={profile.avatar_url} name={profile.display_name} size="xl" />
                    {isOwnProfile && (
                        <label className="absolute bottom-0 right-0 w-8 h-8 bg-brand-600 hover:bg-brand-500 rounded-full flex items-center justify-center cursor-pointer transition-colors shadow-lg">
                            <Edit2 className="w-3.5 h-3.5 text-white" />
                            <input type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
                        </label>
                    )}
                    {isUploadingAvatar && (
                        <div className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center">
                            <span className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        </div>
                    )}
                </div>

                {!editing ? (
                    <div className="text-center">
                        <h1 className="text-xl font-bold text-white">{profile.display_name}</h1>
                        {profile.username && (
                            <p className="text-sm text-brand-400 mt-0.5">@{profile.username}</p>
                        )}
                        {profile.bio && (
                            <p className="text-sm text-gray-400 mt-2 max-w-xs">{profile.bio}</p>
                        )}
                        <p className="text-xs text-gray-500 mt-3">
                            Miembro desde {formatDate(profile.created_at)}
                        </p>
                    </div>
                ) : null}

                {isOwnProfile && !editing && (
                    <button onClick={() => setEditing(true)} className="btn-secondary w-full">
                        <Edit2 className="w-4 h-4" />
                        Editar perfil
                    </button>
                )}
            </div>

            {/* Edit form */}
            {editing && isOwnProfile && (
                <div className="card p-5">
                    <form onSubmit={handleSubmit((d) => updateProfile(d))} className="space-y-4">
                        <div>
                            <label className="label" htmlFor="display_name">Nombre *</label>
                            <input id="display_name" type="text" className={`input ${errors.display_name ? 'border-red-500' : ''}`} {...register('display_name')} />
                            {errors.display_name && <p className="text-xs text-red-400 mt-1">{errors.display_name.message}</p>}
                        </div>
                        <div>
                            <label className="label" htmlFor="username">Nombre de usuario</label>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">@</span>
                                <input id="username" type="text" className="input pl-7" {...register('username')} />
                            </div>
                            {errors.username && <p className="text-xs text-red-400 mt-1">{errors.username.message}</p>}
                        </div>
                        <div>
                            <label className="label" htmlFor="bio">Bio</label>
                            <textarea id="bio" rows={3} className="input resize-none" placeholder="Cuéntanos algo de ti..." {...register('bio')} />
                            {errors.bio && <p className="text-xs text-red-400 mt-1">{errors.bio.message}</p>}
                        </div>
                        <div className="flex gap-3">
                            <button type="button" onClick={() => { setEditing(false); reset() }} className="btn-secondary flex-1">
                                Cancelar
                            </button>
                            <button type="submit" disabled={isSubmitting} className="btn-primary flex-1">
                                {isSubmitting ? 'Guardando...' : 'Guardar'}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Logout */}
            {isOwnProfile && (
                <button onClick={handleLogout} className="btn-danger w-full">
                    <LogOut className="w-4 h-4" />
                    Cerrar sesión
                </button>
            )}
        </div>
    )
}

export default ProfilePage
