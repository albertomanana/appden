import React, { useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
    Bell,
    Camera,
    ChevronRight,
    FileText,
    Flag,
    FolderOpen,
    Heart,
    LogOut,
    Pencil,
    ShieldCheck,
    Sparkles,
    UserPlus,
    Users,
    Wrench,
} from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { profileService } from '@services/profile.service'
import { authService } from '@services/auth.service'
import { useAuthStore } from '@app/store/auth.store'
import { useAdvancedPlayerStore } from '@features/player/player.store'
import { useAuth } from '@hooks/useAuth'
import { useActiveGroup } from '@hooks/useActiveGroup'
import { useIsAppAdmin } from '@hooks/useIsAppAdmin'
import { useUnreadNotificationsCount } from '@hooks/useNotifications'
import { profileSchema, validateAvatarFile, type ProfileFormData } from '@lib/validators'
import { clearSignedUrlCache } from '@lib/supabase/client'
import { useToast } from '@components/ui/Toast'
import { Avatar } from '@components/common/Avatar'
import { ConfirmDialog } from '@components/ui/ConfirmDialog'
import { Modal } from '@components/ui/Modal'
import { ProfileSkeleton } from '@components/ui/LoadingSkeleton'
import { formatDate } from '@lib/utils'
import { ROUTES } from '@lib/constants'

type MenuItem = {
    icon: React.ComponentType<{ className?: string }>
    label: string
    to?: string
    onClick?: () => void
    badge?: number
    hint?: string
    tone?: 'danger'
    hidden?: boolean
}

const ProfilePage: React.FC = () => {
    const { user, userId, profile: authProfile } = useAuth()
    const { myGroups } = useActiveGroup()
    const { setUser, logout } = useAuthStore()
    const { success, error: toastError } = useToast()
    const queryClient = useQueryClient()
    const navigate = useNavigate()
    const { isAdmin } = useIsAppAdmin()
    const unread = useUnreadNotificationsCount()
    const fileInputRef = useRef<HTMLInputElement | null>(null)
    const [editing, setEditing] = useState(false)
    const [confirmLogout, setConfirmLogout] = useState(false)
    const [isRepairing, setIsRepairing] = useState(false)

    const { data: profile, isLoading } = useQuery({
        queryKey: ['profile', userId],
        queryFn: () => profileService.getProfile(userId!),
        enabled: !!userId,
        initialData: authProfile ?? undefined,
    })

    const syncAuthProfile = (next: typeof profile) => {
        if (!userId || !next) return
        setUser({ id: userId, email: user?.email ?? null, profile: next })
        queryClient.setQueryData(['profile', userId], next)
    }

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

    const { mutateAsync: updateProfile } = useMutation({
        mutationFn: (data: ProfileFormData) => profileService.updateProfile(userId!, data),
        onSuccess: (updated) => {
            syncAuthProfile(updated)
            success('Perfil actualizado')
            setEditing(false)
        },
        onError: (err) => {
            const raw = `${(err as { code?: string }).code ?? ''} ${err instanceof Error ? err.message : ''}`.toLowerCase()
            if (raw.includes('23505') || raw.includes('duplicate')) {
                toastError('Ese nombre de usuario ya está cogido', 'Prueba con otro.')
                return
            }
            toastError('No se pudo actualizar el perfil')
        },
    })

    const { mutate: uploadAvatar, isPending: isUploadingAvatar } = useMutation({
        mutationFn: (file: File) => profileService.uploadAvatar(userId!, file),
        onSuccess: (path) => {
            clearSignedUrlCache('avatars')
            if (profile) syncAuthProfile({ ...profile, avatar_url: path })
            success('Foto actualizada')
        },
        onError: () => toastError('No se pudo subir la foto', 'Usa una imagen JPG, PNG o WebP de menos de 5 MB.'),
    })

    const handleAvatarChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0]
        event.target.value = ''
        if (!file) return
        const err = validateAvatarFile(file)
        if (err) {
            toastError('Imagen no válida', err)
            return
        }
        uploadAvatar(file)
    }

    const handleLogout = async () => {
        try {
            await authService.logout()
        } finally {
            // Don't leave this user's queue/now-playing for the next person on the device.
            useAdvancedPlayerStore.getState().pause()
            useAdvancedPlayerStore.getState().clearQueue()
            useAdvancedPlayerStore.getState().dismissContinueOffer()
            clearSignedUrlCache()
            queryClient.clear()
            logout()
            navigate(ROUTES.LOGIN, { replace: true })
        }
    }

    const handleRepair = async () => {
        setIsRepairing(true)
        await authService.hardResetClientState()
        window.location.replace(ROUTES.LOGIN)
    }

    if (isLoading && !profile) {
        return (
            <div className="page-shell">
                <ProfileSkeleton />
            </div>
        )
    }

    if (!profile) {
        return <div className="page-shell text-gray-400">No encontramos tu perfil.</div>
    }

    const sections: Array<{ title: string; items: MenuItem[] }> = [
        {
            title: 'Tu actividad',
            items: [
                { icon: Bell, label: 'Notificaciones', to: ROUTES.NOTIFICATIONS, badge: unread },
                { icon: Users, label: 'Mis grupos', to: ROUTES.GROUPS, hint: String(myGroups.length) },
                { icon: UserPlus, label: 'Amigos', to: ROUTES.CONNECTIONS },
                { icon: Heart, label: 'Canciones favoritas', to: ROUTES.FAVORITES },
                { icon: FolderOpen, label: 'Archivos del grupo', to: ROUTES.FILES },
            ],
        },
        {
            title: 'The Appden',
            items: [
                { icon: Flag, label: 'Reportar un problema o idea', to: ROUTES.REPORTS },
                { icon: Sparkles, label: 'Novedades', to: ROUTES.CHANGELOG },
                { icon: ShieldCheck, label: 'Solicitudes de cuenta', to: ROUTES.ADMIN_REQUESTS, hidden: !isAdmin },
            ],
        },
        {
            title: 'Sesión',
            items: [
                { icon: Wrench, label: isRepairing ? 'Reparando…' : 'Reparar sesión en este dispositivo', onClick: () => void handleRepair() },
                { icon: LogOut, label: 'Cerrar sesión', onClick: () => setConfirmLogout(true), tone: 'danger' },
            ],
        },
    ]

    return (
        <div className="page-shell animate-fade-in">
            <section className="flex flex-col items-center pt-2 text-center">
                <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="relative rounded-full"
                    aria-label="Cambiar foto de perfil"
                    disabled={isUploadingAvatar}
                >
                    <Avatar src={profile.avatar_url} name={profile.display_name} size="xl" />
                    <span className="absolute bottom-0 right-0 grid h-9 w-9 place-items-center rounded-full border-2 border-[#0b0b0d] bg-brand-400 text-black">
                        <Camera className="h-4 w-4" />
                    </span>
                    {isUploadingAvatar ? (
                        <span className="absolute inset-0 grid place-items-center rounded-full bg-black/55">
                            <span className="h-7 w-7 animate-spin rounded-full border-2 border-white border-t-transparent" />
                        </span>
                    ) : null}
                </button>
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />

                <h1 className="mt-4 font-headline text-2xl font-extrabold tracking-tight text-white">{profile.display_name}</h1>
                <p className="mt-0.5 text-sm text-gray-400">
                    {profile.username ? <span className="text-brand-300">@{profile.username}</span> : 'Sin nombre de usuario'}
                    <span className="mx-1.5 text-gray-600">·</span>
                    Desde {formatDate(profile.created_at)}
                </p>
                {profile.bio ? <p className="mt-3 max-w-sm text-sm leading-relaxed text-gray-300">{profile.bio}</p> : null}

                <div className="mt-4 flex gap-2">
                    <button type="button" onClick={() => setEditing(true)} className="btn-secondary">
                        <Pencil className="h-4 w-4" />
                        Editar perfil
                    </button>
                    <Link to={ROUTES.PROFILE_ID(profile.id)} className="btn-secondary">
                        <FileText className="h-4 w-4" />
                        Perfil público
                    </Link>
                </div>
            </section>

            {sections.map((section) => {
                const items = section.items.filter((item) => !item.hidden)
                if (items.length === 0) return null
                return (
                    <section key={section.title}>
                        <h2 className="mb-2 px-1 text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">{section.title}</h2>
                        <div className="list-group">
                            {items.map((item) => (
                                <MenuRow key={item.label} item={item} />
                            ))}
                        </div>
                    </section>
                )
            })}

            <p className="pb-2 text-center text-xs text-gray-600">{user?.email}</p>

            <Modal
                open={editing}
                onClose={() => {
                    setEditing(false)
                    reset()
                }}
                title="Editar perfil"
                size="sm"
            >
                <form onSubmit={handleSubmit((data) => updateProfile(data).catch(() => undefined))} className="space-y-4">
                    <div>
                        <label className="label" htmlFor="display_name">Nombre</label>
                        <input id="display_name" type="text" autoComplete="name" className="input" {...register('display_name')} />
                        {errors.display_name ? <p className="field-error">{errors.display_name.message}</p> : null}
                    </div>

                    <div>
                        <label className="label" htmlFor="username">Nombre de usuario</label>
                        <div className="relative">
                            <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">@</span>
                            <input
                                id="username"
                                type="text"
                                autoCapitalize="none"
                                autoCorrect="off"
                                spellCheck={false}
                                className="input pl-8"
                                {...register('username')}
                            />
                        </div>
                        {errors.username ? <p className="field-error">{errors.username.message}</p> : null}
                    </div>

                    <div>
                        <label className="label" htmlFor="bio">Bio</label>
                        <textarea id="bio" rows={3} className="input resize-none" placeholder="Cuéntale algo al grupo…" {...register('bio')} />
                        {errors.bio ? <p className="field-error">{errors.bio.message}</p> : null}
                    </div>

                    <button type="submit" disabled={isSubmitting} className="btn-primary w-full">
                        {isSubmitting ? 'Guardando…' : 'Guardar cambios'}
                    </button>
                </form>
            </Modal>

            <ConfirmDialog
                isOpen={confirmLogout}
                title="¿Cerrar sesión?"
                description="Tendrás que volver a introducir tu email y contraseña en este dispositivo."
                confirmLabel="Cerrar sesión"
                onConfirm={() => void handleLogout()}
                onCancel={() => setConfirmLogout(false)}
            />
        </div>
    )
}

const MenuRow: React.FC<{ item: MenuItem }> = ({ item }) => {
    const { icon: Icon, label, to, onClick, badge, hint, tone } = item
    const content = (
        <>
            <span className={tone === 'danger' ? 'grid h-9 w-9 place-items-center rounded-xl bg-red-400/10 text-red-300' : 'grid h-9 w-9 place-items-center rounded-xl bg-white/[0.06] text-gray-300'}>
                <Icon className="h-[18px] w-[18px]" />
            </span>
            <span className={tone === 'danger' ? 'flex-1 text-[15px] font-medium text-red-300' : 'flex-1 text-[15px] font-medium text-white'}>{label}</span>
            {badge ? (
                <span className="grid h-6 min-w-6 place-items-center rounded-full bg-brand-400 px-2 text-xs font-bold text-black">{badge > 99 ? '99+' : badge}</span>
            ) : hint ? (
                <span className="text-sm text-gray-500">{hint}</span>
            ) : null}
            {to ? <ChevronRight className="h-5 w-5 text-gray-600" /> : null}
        </>
    )

    if (to) {
        return (
            <Link to={to} className="list-row">
                {content}
            </Link>
        )
    }
    return (
        <button type="button" onClick={onClick} className="list-row">
            {content}
        </button>
    )
}

export default ProfilePage
