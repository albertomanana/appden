import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { MailCheck, UserPlus } from 'lucide-react'
import { authService } from '@services/auth.service'
import { registerSchema, type RegisterFormData } from '@lib/validators'
import { useToast } from '@components/ui/Toast'
import { AuthShell, PasswordInput } from '@components/layout/AuthShell'
import { ROUTES } from '@lib/constants'

const RegisterPage: React.FC = () => {
    const { error: toastError } = useToast()
    const [registeredEmail, setRegisteredEmail] = useState<string | null>(null)
    const [needsConfirmation, setNeedsConfirmation] = useState(true)

    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting },
    } = useForm<RegisterFormData>({ resolver: zodResolver(registerSchema) })

    const onSubmit = async (data: RegisterFormData) => {
        try {
            const result = await authService.register(data.email.trim(), data.password, data.display_name.trim())
            // Supabase returns a user without identities when the email is already registered
            // (it hides that fact to avoid account enumeration).
            if (result.user && Array.isArray(result.user.identities) && result.user.identities.length === 0) {
                toastError('Ese email ya tiene cuenta', 'Inicia sesión o recupera la contraseña.')
                return
            }
            setNeedsConfirmation(!result.session)
            setRegisteredEmail(data.email.trim())
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : 'Error al registrarse'
            const lower = msg.toLowerCase()
            if (lower.includes('already registered')) {
                toastError('Ese email ya tiene cuenta', 'Inicia sesión o recupera la contraseña.')
            } else if (lower.includes('database error saving new user')) {
                // Typical when migration 013's account-request trigger fails (see migration 015).
                toastError('El servidor no pudo crear tu perfil', 'Avisa al administrador: falta aplicar la migración 015 en Supabase.')
            } else if (lower.includes('rate limit') || lower.includes('security purposes')) {
                toastError('Demasiados intentos', 'Espera un minuto y vuelve a probar.')
            } else if (lower.includes('failed to fetch') || lower.includes('network') || lower.includes('timeout')) {
                toastError('Sin conexión', 'No pudimos contactar con el servidor.')
            } else if (lower.includes('password')) {
                toastError('Contraseña no válida', msg)
            } else {
                toastError('No se pudo crear la cuenta', msg)
            }
        }
    }

    if (registeredEmail) {
        return (
            <AuthShell
                title={needsConfirmation ? 'Confirma tu email' : '¡Cuenta creada!'}
                subtitle={
                    needsConfirmation
                        ? `Te hemos enviado un enlace a ${registeredEmail}. Ábrelo para activar la cuenta.`
                        : 'Ya puedes entrar.'
                }
                footer={
                    <Link to={ROUTES.LOGIN} className="font-semibold text-brand-300">
                        Ir a iniciar sesión
                    </Link>
                }
            >
                <div className="card flex items-start gap-3 p-4">
                    <MailCheck className="mt-0.5 h-6 w-6 shrink-0 text-brand-300" />
                    <p className="text-sm leading-relaxed text-gray-300">
                        Si el grupo usa aprobación de cuentas, un administrador tendrá que aceptarte antes de que puedas entrar. Te avisaremos al iniciar sesión.
                    </p>
                </div>
            </AuthShell>
        )
    }

    return (
        <AuthShell
            title="Crea tu cuenta"
            subtitle="Para compartir música y cuentas con tu grupo."
            footer={
                <>
                    ¿Ya tienes cuenta?{' '}
                    <Link to={ROUTES.LOGIN} className="font-semibold text-brand-300">
                        Inicia sesión
                    </Link>
                </>
            }
        >
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
                <div>
                    <label className="label" htmlFor="display_name">Tu nombre</label>
                    <input
                        id="display_name"
                        type="text"
                        autoComplete="name"
                        placeholder="Cómo te verá el grupo"
                        className={`input ${errors.display_name ? '!border-red-400/60' : ''}`}
                        {...register('display_name')}
                    />
                    {errors.display_name ? <p className="field-error">{errors.display_name.message}</p> : null}
                </div>

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
                    <label className="label" htmlFor="password">Contraseña</label>
                    <PasswordInput id="password" autoComplete="new-password" placeholder="Mínimo 8 caracteres" invalid={!!errors.password} {...register('password')} />
                    {errors.password ? <p className="field-error">{errors.password.message}</p> : null}
                </div>

                <div>
                    <label className="label" htmlFor="confirmPassword">Repite la contraseña</label>
                    <PasswordInput id="confirmPassword" autoComplete="new-password" invalid={!!errors.confirmPassword} {...register('confirmPassword')} />
                    {errors.confirmPassword ? <p className="field-error">{errors.confirmPassword.message}</p> : null}
                </div>

                <button type="submit" disabled={isSubmitting} className="btn-primary w-full !min-h-[3.25rem] text-base">
                    {isSubmitting ? (
                        <span className="h-5 w-5 animate-spin rounded-full border-2 border-black/20 border-t-black/70" />
                    ) : (
                        <>
                            <UserPlus className="h-5 w-5" />
                            Crear cuenta
                        </>
                    )}
                </button>
            </form>
        </AuthShell>
    )
}

export default RegisterPage
