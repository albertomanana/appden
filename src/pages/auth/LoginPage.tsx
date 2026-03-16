import React, { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Eye, EyeOff, LogIn } from 'lucide-react'
import { authService } from '@services/auth.service'
import { loginSchema, type LoginFormData } from '@lib/validators'
import { useToast } from '@components/ui/Toast'
import { ROUTES } from '@lib/constants'

const LoginPage: React.FC = () => {
    const navigate = useNavigate()
    const location = useLocation()
    const { error: toastError } = useToast()
    const [showPassword, setShowPassword] = useState(false)
    const [isRepairing, setIsRepairing] = useState(false)

    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting },
    } = useForm<LoginFormData>({ resolver: zodResolver(loginSchema) })

    const from = (location.state as { from?: { pathname: string } })?.from?.pathname ?? ROUTES.DASHBOARD

    const onSubmit = async (data: LoginFormData) => {
        try {
            await authService.login(data.email, data.password)
            navigate(from, { replace: true })
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : 'Error al iniciar sesion'
            console.error('Login error:', err)

            if (msg.includes('Invalid login credentials')) {
                toastError('Credenciales incorrectas', 'Verifica tu email y contrasena.')
            } else if (msg.includes('connection') || msg.includes('Failed to fetch') || msg.includes('timeout')) {
                toastError('Error de conexion', 'No pude conectar con Supabase. Revisa tus variables .env.')
            } else if (msg.includes('not confirmed')) {
                toastError('Email no confirmado', 'Revisa tu email para confirmar tu cuenta.')
            } else {
                toastError('Error al iniciar sesion', msg)
            }
        }
    }

    const handleRepairLocalState = async () => {
        try {
            setIsRepairing(true)
            await authService.hardResetClientState()
            window.location.replace(ROUTES.LOGIN)
        } finally {
            setIsRepairing(false)
        }
    }

    return (
        <div className="min-h-screen bg-surface-800 flex items-center justify-center p-6">
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute -top-40 -right-40 w-96 h-96 bg-brand-600/10 rounded-full blur-3xl" />
                <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-accent-purple/10 rounded-full blur-3xl" />
            </div>

            <div className="relative w-full max-w-sm">
                <div className="text-center mb-8">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-brand-600 to-accent-purple flex items-center justify-center mx-auto mb-4 shadow-glow-brand">
                        <span className="text-2xl font-black text-white">A</span>
                    </div>
                    <h1 className="text-2xl font-extrabold text-white">The Appden</h1>
                    <p className="text-sm text-gray-400 mt-1">Inicia sesion para continuar</p>
                </div>

                <div className="card p-6">
                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
                        <div>
                            <label className="label" htmlFor="email">Email</label>
                            <input
                                id="email"
                                type="email"
                                autoComplete="email"
                                placeholder="tu@email.com"
                                className={`input ${errors.email ? 'border-red-500 focus:ring-red-500' : ''}`}
                                {...register('email')}
                            />
                            {errors.email && <p className="text-xs text-red-400 mt-1">{errors.email.message}</p>}
                        </div>

                        <div>
                            <label className="label" htmlFor="password">Contrasena</label>
                            <div className="relative">
                                <input
                                    id="password"
                                    type={showPassword ? 'text' : 'password'}
                                    autoComplete="current-password"
                                    placeholder="********"
                                    className={`input pr-10 ${errors.password ? 'border-red-500 focus:ring-red-500' : ''}`}
                                    {...register('password')}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword((prev) => !prev)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                                    aria-label={showPassword ? 'Ocultar contrasena' : 'Mostrar contrasena'}
                                >
                                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            </div>
                            {errors.password && <p className="text-xs text-red-400 mt-1">{errors.password.message}</p>}
                        </div>

                        <div className="text-right">
                            <Link
                                to={ROUTES.RESET_PASSWORD}
                                className="text-xs text-brand-400 hover:text-brand-300 transition-colors"
                            >
                                Olvidaste tu contrasena?
                            </Link>
                        </div>

                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="btn-primary w-full py-3 text-sm font-semibold"
                        >
                            {isSubmitting ? (
                                <span className="flex items-center gap-2 justify-center">
                                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    Iniciando...
                                </span>
                            ) : (
                                <span className="flex items-center gap-2 justify-center">
                                    <LogIn className="w-4 h-4" />
                                    Iniciar sesion
                                </span>
                            )}
                        </button>
                    </form>
                </div>

                <p className="text-center text-sm text-gray-400 mt-6">
                    No tienes cuenta?{' '}
                    <Link to={ROUTES.REGISTER} className="text-brand-400 hover:text-brand-300 font-medium transition-colors">
                        Registrate
                    </Link>
                </p>

                <div className="mt-4 text-center">
                    <button
                        type="button"
                        onClick={handleRepairLocalState}
                        disabled={isRepairing}
                        className="text-xs text-gray-400 hover:text-gray-200 underline underline-offset-2"
                    >
                        {isRepairing ? 'Reparando sesion local...' : 'Reparar sesion local (si solo funciona en incognito)'}
                    </button>
                </div>
            </div>
        </div>
    )
}

export default LoginPage
