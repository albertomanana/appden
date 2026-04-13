import React, { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Edit2, LogOut, Sparkles } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { profileService } from '@services/profile.service'
import { authService } from '@services/auth.service'
import { useAuthStore } from '@app/store/auth.store'
import { useAuth } from '@hooks/useAuth'
import { profileSchema, validateAvatarFile, type ProfileFormData } from '@lib/validators'
import { useToast } from '@components/ui/Toast'
import { Avatar } from '@components/common/Avatar'
import { PageHeader } from '@components/ui/PageHeader'
import { Tabs } from '@components/ui/Tabs'
import { formatDate } from '@lib/utils'
import { ROUTES } from '@lib/constants'

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

    const { data: profile, isLoading } = useQuery({
        queryKey: ['profile', targetId],
        queryFn: () => profileService.getProfile(targetId),
    })

    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting },
        reset,
    } = useForm<ProfileFormData>({
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
        },
        onError: () => toastError('Error', 'No se pudo subir el avatar.'),
    })

    const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return
        const err = validateAvatarFile(file)
        if (err) {
            toastError('Error', err)
            return
        }
        uploadAvatar(file)
    }

    const handleLogout = async () => {
        await authService.logout()
        logout()
        navigate('/login')
    }

    if (isLoading) {
        return (
            <div className="page-shell flex min-h-[50vh] items-center justify-center">
                <div className="h-8 w-8 rounded-full border-2 border-brand-400 border-t-transparent animate-spin" />
            </div>
        )
    }

    if (!profile) {
        return <div className="page-shell text-gray-400">Perfil no encontrado.</div>
    }

    return (
        <div className="page-shell animate-fade-in">
            {id ? (
                <button onClick={() => navigate(-1)} className="btn-ghost -ml-2 w-fit gap-2">
                    <ArrowLeft className="w-4 h-4" />
                    Volver
                </button>
            ) : null}

            <PageHeader
                kicker="Identity"
                title={isOwnProfile ? 'Tu perfil' : profile.display_name}
                description={profile.bio ?? 'Perfil de The Appden con identidad visual integrada y datos reales del sistema.'}
                meta={
                    <>
                        {profile.username ? <span className="hero-meta-pill">@{profile.username}</span> : null}
                        <span className="hero-meta-pill">Miembro desde {formatDate(profile.created_at)}</span>
                    </>
                }
                actions={
                    !editing && isOwnProfile ? (
                        <button onClick={() => setEditing(true)} className="btn-primary">
                            <Edit2 className="w-4 h-4" />
                            Editar perfil
                        </button>
                    ) : undefined
                }
            />

            <Tabs
                active="profile"
                items={[
                    { label: 'Profile', value: 'profile', href: ROUTES.PROFILE },
                    { label: 'Reports', value: 'reports', href: ROUTES.REPORTS },
                    { label: 'Changelog', value: 'changelog', href: ROUTES.CHANGELOG },
                    { label: 'Admin Auth', value: 'admin', href: ROUTES.ADMIN_REQUESTS },
                    { label: 'Files', value: 'files', href: ROUTES.FILES },
                    { label: 'Alerts', value: 'notifications', href: ROUTES.NOTIFICATIONS },
                ]}
            />

            <div className="grid gap-4 xl:grid-cols-[0.85fr,1.15fr]">
                <section className="card p-6">
                    <div className="flex flex-col items-center text-center">
                        <div className="relative">
                            <Avatar src={profile.avatar_url} name={profile.display_name} size="xl" />
                            {isOwnProfile ? (
                                <label className="absolute bottom-1 right-1 flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border border-white/10 bg-brand-500 text-black shadow-[0_16px_36px_rgba(133,173,255,0.25)]">
                                    <Edit2 className="h-4 w-4" />
                                    <input type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
                                </label>
                            ) : null}
                            {isUploadingAvatar ? (
                                <div className="absolute inset-0 grid place-items-center rounded-full bg-black/55">
                                    <span className="h-7 w-7 rounded-full border-2 border-white border-t-transparent animate-spin" />
                                </div>
                            ) : null}
                        </div>

                        <h2 className="mt-5 text-2xl font-headline font-extrabold text-white">{profile.display_name}</h2>
                        {profile.username ? <p className="mt-1 text-sm text-brand-300">@{profile.username}</p> : null}
                        {profile.bio ? <p className="mt-3 max-w-sm text-sm leading-relaxed text-gray-400">{profile.bio}</p> : null}

                        <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
                            <span className="hero-meta-pill">
                                <Sparkles className="w-3.5 h-3.5 text-brand-300" />
                                Perfil activo
                            </span>
                            <span className="hero-meta-pill">{isOwnProfile ? 'Edicion disponible' : 'Solo lectura'}</span>
                        </div>
                    </div>
                </section>

                {editing && isOwnProfile ? (
                    <section className="card p-5">
                        <div>
                            <p className="page-kicker">Edit Session</p>
                            <h2 className="mt-2 text-2xl font-headline font-extrabold text-white">Actualizar identidad</h2>
                        </div>

                        <form onSubmit={handleSubmit((data) => updateProfile(data))} className="mt-5 space-y-4">
                            <div>
                                <label className="label" htmlFor="display_name">Nombre *</label>
                                <input id="display_name" type="text" className={`input ${errors.display_name ? 'border-red-500' : ''}`} {...register('display_name')} />
                                {errors.display_name ? <p className="mt-1 text-xs text-red-400">{errors.display_name.message}</p> : null}
                            </div>

                            <div>
                                <label className="label" htmlFor="username">Nombre de usuario</label>
                                <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-gray-500">@</span>
                                    <input id="username" type="text" className="input pl-8" {...register('username')} />
                                </div>
                                {errors.username ? <p className="mt-1 text-xs text-red-400">{errors.username.message}</p> : null}
                            </div>

                            <div>
                                <label className="label" htmlFor="bio">Bio</label>
                                <textarea id="bio" rows={4} className="input resize-none" placeholder="Cuentanos algo de ti..." {...register('bio')} />
                                {errors.bio ? <p className="mt-1 text-xs text-red-400">{errors.bio.message}</p> : null}
                            </div>

                            <div className="flex flex-col gap-2 sm:flex-row">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setEditing(false)
                                        reset()
                                    }}
                                    className="btn-secondary flex-1"
                                >
                                    Cancelar
                                </button>
                                <button type="submit" disabled={isSubmitting} className="btn-primary flex-1">
                                    {isSubmitting ? 'Guardando...' : 'Guardar cambios'}
                                </button>
                            </div>
                        </form>
                    </section>
                ) : (
                    <section className="card p-5">
                        <div>
                            <p className="page-kicker">Account State</p>
                            <h2 className="mt-2 text-2xl font-headline font-extrabold text-white">Resumen</h2>
                        </div>
                        <div className="mt-5 grid gap-3 sm:grid-cols-2">
                            <div className="rounded-[1.4rem] border border-white/8 bg-black/15 p-4">
                                <p className="label">Display name</p>
                                <p className="text-white">{profile.display_name}</p>
                            </div>
                            <div className="rounded-[1.4rem] border border-white/8 bg-black/15 p-4">
                                <p className="label">Username</p>
                                <p className="text-white">{profile.username ? `@${profile.username}` : 'No definido'}</p>
                            </div>
                            <div className="rounded-[1.4rem] border border-white/8 bg-black/15 p-4 sm:col-span-2">
                                <p className="label">Bio</p>
                                <p className="text-white">{profile.bio || 'Sin bio todavia.'}</p>
                            </div>
                        </div>
                    </section>
                )}
            </div>

            {isOwnProfile ? (
                <button onClick={handleLogout} className="btn-danger w-full sm:w-fit">
                    <LogOut className="w-4 h-4" />
                    Cerrar sesion
                </button>
            ) : null}
        </div>
    )
}

export default ProfilePage
