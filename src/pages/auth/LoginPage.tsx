import React, { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
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
            const msg = err instanceof Error ? err.message : 'Error al iniciar sesión'
            console.error('Login error:', err)

            if (msg.includes('Invalid login credentials')) {
                toastError('Credenciales incorrectas', 'Verifica tu email y contraseña.')
            } else if (msg.includes('connection') || msg.includes('Failed to fetch') || msg.includes('timeout')) {
                toastError('Error de conexión', '❌ No pude conectar con Supabase. Verifica:\n1. Tus credenciales en .env.local\n2. Que las migraciones SQL fueron ejecutadas\n3. Tu conexión a internet')
            } else if (msg.includes('not confirmed')) {
                toastError('Email no confirmado', 'Revisa tu email para confirmar tu cuenta.')
            } else {
                toastError('Error al iniciar sesión', msg)
            }
        }
    }

    return (
        <div className="min-h-screen bg-surface-800 flex items-center justify-center p-6">
            {/* Background decoration */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute -top-40 -right-40 w-96 h-96 bg-brand-600/10 rounded-full blur-3xl" />
                <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-accent-purple/10 rounded-full blur-3xl" />
            </div>

            <div className="relative w-full max-w-sm">
                {/* Logo */}
                <div className="text-center mb-8">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-brand-600 to-accent-purple flex items-center justify-center mx-auto mb-4 shadow-glow-brand">
                        <span className="text-2xl font-black text-white">A</span>
                    </div>
                    <h1 className="text-2xl font-extrabold text-white">The Appden</h1>
                    <p className="text-sm text-gray-400 mt-1">Inicia sesión para continuar</p>
                </div>

                {/* Form card */}
                <div className="card p-6">
                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
                        {/* Email */}
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
                            {errors.email && (
                                <p className="text-xs text-red-400 mt-1">{errors.email.message}</p>
                            )}
                        </div>

                        {/* Password */}
                        <div>
                            <label className="label" htmlFor="password">Contraseña</label>
                            <div className="relative">
                                <input
                                    id="password"
                                    type={showPassword ? 'text' : 'password'}
                                    autoComplete="current-password"
                                    placeholder="••••••••"
                                    className={`input pr-10 ${errors.password ? 'border-red-500 focus:ring-red-500' : ''}`}
                                    {...register('password')}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword((p) => !p)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                                    aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                                >
                                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            </div>
                            {errors.password && (
                                <p className="text-xs text-red-400 mt-1">{errors.password.message}</p>
                            )}
                        </div>

                        {/* Forgot password */}
                        <div className="text-right">
                            <Link
                                to={ROUTES.RESET_PASSWORD}
                                className="text-xs text-brand-400 hover:text-brand-300 transition-colors"
                            >
                                ¿Olvidaste tu contraseña?
                            </Link>
                        </div>

                        {/* Submit */}
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
                                    Iniciar sesión
                                </span>
                            )}
                        </button>
                    </form>
                </div>

                <p className="text-center text-sm text-gray-400 mt-6">
                    ¿No tienes cuenta?{' '}
                    <Link to={ROUTES.REGISTER} className="text-brand-400 hover:text-brand-300 font-medium transition-colors">
                        Regístrate
                    </Link>
                </p>
            </div>
        </div>
    )
}

export default LoginPage
