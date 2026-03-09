import React from 'react'
import { Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Mail } from 'lucide-react'
import { authService } from '@services/auth.service'
import { resetPasswordSchema, type ResetPasswordFormData } from '@lib/validators'
import { useToast } from '@components/ui/Toast'
import { ROUTES } from '@lib/constants'

const ResetPasswordPage: React.FC = () => {
    const { success, error: toastError } = useToast()

    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting, isSubmitSuccessful },
    } = useForm<ResetPasswordFormData>({ resolver: zodResolver(resetPasswordSchema) })

    const onSubmit = async (data: ResetPasswordFormData) => {
        try {
            await authService.resetPassword(data.email)
            success('Email enviado', 'Revisa tu bandeja de entrada.')
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : 'Error'
            toastError('Error', msg)
        }
    }

    return (
        <div className="min-h-screen bg-surface-800 flex items-center justify-center p-6">
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute -top-40 -right-40 w-96 h-96 bg-brand-600/10 rounded-full blur-3xl" />
            </div>
            <div className="relative w-full max-w-sm">
                <div className="text-center mb-8">
                    <div className="w-14 h-14 rounded-2xl bg-surface-600 border border-surface-500 flex items-center justify-center mx-auto mb-4">
                        <Mail className="w-6 h-6 text-brand-400" />
                    </div>
                    <h1 className="text-2xl font-bold text-white">Recuperar contraseña</h1>
                    <p className="text-sm text-gray-400 mt-1">Te enviaremos un enlace de recuperación</p>
                </div>

                <div className="card p-6">
                    {isSubmitSuccessful ? (
                        <div className="text-center py-4">
                            <p className="text-sm text-gray-300">
                                Revisa tu email y sigue las instrucciones para restablecer tu contraseña.
                            </p>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
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
                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="btn-primary w-full py-3"
                            >
                                {isSubmitting ? 'Enviando...' : 'Enviar enlace de recuperación'}
                            </button>
                        </form>
                    )}
                </div>

                <p className="text-center text-sm text-gray-400 mt-6">
                    <Link to={ROUTES.LOGIN} className="text-brand-400 hover:text-brand-300 font-medium transition-colors">
                        ← Volver al inicio de sesión
                    </Link>
                </p>
            </div>
        </div>
    )
}

export default ResetPasswordPage
