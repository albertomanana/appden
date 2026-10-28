import React, { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Clock, LogIn } from 'lucide-react'
import { authService } from '@services/auth.service'
import { useAuthStore } from '@app/store/auth.store'
import { loginSchema, type LoginFormData } from '@lib/validators'
import { useToast } from '@components/ui/Toast'
import { AuthShell, PasswordInput } from '@components/layout/AuthShell'
import { ROUTES } from '@lib/constants'
import { useAuth } from '@hooks/useAuth'

type FromState = { from?: { pathname: string; search?: string; hash?: string } }

const LoginPage: React.FC = () => {
    const navigate = useNavigate()
    const location = useLocation()
    const { error: toastError } = useToast()
    const { isAuthenticated, isInitialized } = useAuth()
    const [isRepairing, setIsRepairing] = useState(false)
    const notice = useAuthStore((state) => state.notice)
    const setNotice = useAuthStore((state) => state.setNotice)

    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting },
    } = useForm<LoginFormData>({ resolver: zodResolver(loginSchema) })

    // Keep the query string so invite links (?invite=...) survive the login redirect.
    const fromState = (location.state as FromState | null)?.from
    const from = fromState ? `${fromState.pathname}${fromState.search ?? ''}${fromState.hash ?? ''}` : ROUTES.DASHBOARD

    useEffect(() => {
        if (isInitialized && isAuthenticated) {
            navigate(from, { replace: true })
        }
    }, [from, isAuthenticated, isInitialized, navigate])

    const onSubmit = async (data: LoginFormData) => {
        setNotice(null)
        try {
            await authService.login(data.email.trim(), data.password)
            // Navigation happens in the effect above once AuthProvider has loaded the profile.
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : 'Error al iniciar sesión'
            if (msg.includes('Invalid login credentials')) {
                toastError('Email o contraseña incorrectos')
            } else if (msg.includes('Failed to fetch') || msg.toLowerCase().includes('network') || msg.includes('timeout')) {
                toastError('Sin conexión', 'No pudimos contactar con el servidor. Revisa tu conexión.')
            } else if (msg.includes('not confirmed')) {
                toastError('Confirma tu email', 'Te enviamos un enlace al registrarte. Revisa también la carpeta de spam.')
            } else {
                toastError('No se pudo iniciar sesión', msg)
            }
        }
    }

    const handleRepairLocalState = async () => {
        setIsRepairing(true)
        try {
            await authService.hardResetClientState()
            window.location.replace(ROUTES.LOGIN)
        } finally {
            setIsRepairing(false)
        }
    }

    return (
        <AuthShell
            title="Bienvenido de nuevo"
            subtitle="Tu espacio privado para música, planes y cuentas con amigos."
            footer={
                <>
                    ¿No tienes cuenta?{' '}
                    <Link to={ROUTES.REGISTER} className="font-semibold text-brand-300">
                        Regístrate
                    </Link>
                    <div className="mt-6">
                        <button
                            type="button"
                            onClick={handleRepairLocalState}
                            disabled={isRepairing}
                            className="min-h-[2.75rem] px-2 text-xs text-gray-500 underline underline-offset-2"
                        >
                            {isRepairing ? 'Reparando…' : '¿Problemas para entrar? Reparar la sesión de este dispositivo'}
                        </button>
                    </div>
                </>
            }
        >
            {notice === 'pending-approval' ? (
                <div className="notice-warning mb-5 flex gap-3">
                    <Clock className="mt-0.5 h-5 w-5 shrink-0 text-amber-300" />
                    <div>
                        <p className="font-semibold text-amber-100">Tu cuenta está pendiente de aprobación</p>
                        <p className="mt-0.5 text-amber-100/80">Un administrador tiene que darte acceso. Prueba de nuevo más tarde.</p>
                    </div>
                </div>
            ) : null}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
                <div>
                    <label className="label" htmlFor="email">Email</label>
                    <input
                        id="email"
                        type="email"
                        inputMode="email"
                        autoComplete="email"
                        autoCapitalize="none"
                        placeholder="tu@email.com"
                        className={`input ${errors.email ? '!border-red-400/60' : ''}`}
                        {...register('email')}
                    />
                    {errors.email ? <p className="field-error">{errors.email.message}</p> : null}
                </div>

                <div>
                    <div className="mb-2 flex items-center justify-between">
                        <label className="label !mb-0" htmlFor="password">Contraseña</label>
                        <Link to={ROUTES.RESET_PASSWORD} className="text-xs font-semibold text-brand-300">
                            ¿La has olvidado?
                        </Link>
                    </div>
                    <PasswordInput
                        id="password"
                        autoComplete="current-password"
                        placeholder="Tu contraseña"
                        invalid={!!errors.password}
                        {...register('password')}
                    />
                    {errors.password ? <p className="field-error">{errors.password.message}</p> : null}
                </div>

                <button type="submit" disabled={isSubmitting} className="btn-primary w-full !min-h-[3.25rem] text-base">
                    {isSubmitting ? (
                        <span className="h-5 w-5 animate-spin rounded-full border-2 border-black/20 border-t-black/70" />
                    ) : (
                        <>
                            <LogIn className="h-5 w-5" />
                            Entrar
                        </>
                    )}
                </button>
            </form>
        </AuthShell>
    )
}

export default LoginPage
