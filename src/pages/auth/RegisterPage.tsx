import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Eye, EyeOff, UserPlus } from 'lucide-react'
import { authService } from '@services/auth.service'
import { registerSchema, type RegisterFormData } from '@lib/validators'
import { useToast } from '@components/ui/Toast'
import { ROUTES } from '@lib/constants'

const RegisterPage: React.FC = () => {
    const navigate = useNavigate()
    const { success, error: toastError } = useToast()
    const [showPassword, setShowPassword] = useState(false)

    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting },
    } = useForm<RegisterFormData>({ resolver: zodResolver(registerSchema) })

    const onSubmit = async (data: RegisterFormData) => {
        try {
            await authService.register(data.email, data.password, data.display_name)
            success('¡Cuenta creada!', 'Revisa tu email para confirmar tu cuenta.')
            navigate(ROUTES.LOGIN)
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : 'Error al registrarse'
            console.error('Registration error:', err)

            if (msg.includes('already registered')) {
                toastError('Email en uso', 'Ya existe una cuenta con ese email.')
            } else if (msg.includes('connection') || msg.includes('Failed to fetch') || msg.includes('timeout')) {
                toastError('Error de conexión', '❌ No pude conectar con Supabase. Verifica:\n1. Tus credenciales en .env.local\n2. Que las migraciones SQL fueron ejecutadas\n3. Tu conexión a internet')
            } else if (msg.includes('password')) {
                toastError('Contraseña débil', 'La contraseña debe tener al menos 6 caracteres.')
            } else {
                toastError('Error al registrarse', msg)
            }
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
                    <h1 className="text-2xl font-extrabold text-white">Crear cuenta</h1>
                    <p className="text-sm text-gray-400 mt-1">Únete a The Appden</p>
                </div>

                <div className="card p-6">
                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
                        <div>
                            <label className="label" htmlFor="display_name">Nombre</label>
                            <input
                                id="display_name"
                                type="text"
                                autoComplete="name"
                                placeholder="Tu nombre"
                                className={`input ${errors.display_name ? 'border-red-500' : ''}`}
                                {...register('display_name')}
                            />
                            {errors.display_name && (
                                <p className="text-xs text-red-400 mt-1">{errors.display_name.message}</p>
                            )}
                        </div>

                        <div>
                            <label className="label" htmlFor="email">Email</label>
                            <input
                                id="email"
                                type="email"
                                autoComplete="email"
                                placeholder="tu@email.com"
                                className={`input ${errors.email ? 'border-red-500' : ''}`}
                                {...register('email')}
                            />
                            {errors.email && (
                                <p className="text-xs text-red-400 mt-1">{errors.email.message}</p>
                            )}
                        </div>

                        <div>
                            <label className="label" htmlFor="password">Contraseña</label>
                            <div className="relative">
                                <input
                                    id="password"
                                    type={showPassword ? 'text' : 'password'}
                                    autoComplete="new-password"
                                    placeholder="Mínimo 8 caracteres"
                                    className={`input pr-10 ${errors.password ? 'border-red-500' : ''}`}
                                    {...register('password')}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword((p) => !p)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                                    aria-label={showPassword ? 'Ocultar' : 'Mostrar'}
                                >
                                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            </div>
                            {errors.password && (
                                <p className="text-xs text-red-400 mt-1">{errors.password.message}</p>
                            )}
                        </div>

                        <div>
                            <label className="label" htmlFor="confirmPassword">Confirmar contraseña</label>
                            <input
                                id="confirmPassword"
                                type={showPassword ? 'text' : 'password'}
                                autoComplete="new-password"
                                placeholder="Repite la contraseña"
                                className={`input ${errors.confirmPassword ? 'border-red-500' : ''}`}
                                {...register('confirmPassword')}
                            />
                            {errors.confirmPassword && (
                                <p className="text-xs text-red-400 mt-1">{errors.confirmPassword.message}</p>
                            )}
                        </div>

                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="btn-primary w-full py-3 text-sm font-semibold"
                        >
                            {isSubmitting ? (
                                <span className="flex items-center gap-2 justify-center">
                                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    Creando cuenta...
                                </span>
                            ) : (
                                <span className="flex items-center gap-2 justify-center">
                                    <UserPlus className="w-4 h-4" />
                                    Crear cuenta
                                </span>
                            )}
                        </button>
                    </form>
                </div>

                <p className="text-center text-sm text-gray-400 mt-6">
                    ¿Ya tienes cuenta?{' '}
                    <Link to={ROUTES.LOGIN} className="text-brand-400 hover:text-brand-300 font-medium transition-colors">
                        Iniciar sesión
                    </Link>
                </p>
            </div>
        </div>
    )
}

export default RegisterPage
