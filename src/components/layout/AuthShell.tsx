import React from 'react'

interface AuthShellProps {
    title: string
    subtitle?: string
    children: React.ReactNode
    footer?: React.ReactNode
}

/** Shared full-height layout for login, register and password recovery. */
export const AuthShell: React.FC<AuthShellProps> = ({ title, subtitle, children, footer }) => (
    <div className="relative flex min-h-dvh flex-col overflow-hidden bg-background px-5 pb-[calc(env(safe-area-inset-bottom)+1.5rem)] pt-[calc(env(safe-area-inset-top)+2.5rem)]">
        <div className="pointer-events-none absolute -right-32 -top-40 h-96 w-96 rounded-full bg-brand-500/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-40 -left-32 h-96 w-96 rounded-full bg-violet-500/15 blur-3xl" />

        <div className="relative mx-auto flex w-full max-w-sm flex-1 flex-col justify-center">
            <div className="mb-8">
                <span className="font-display bg-gradient-to-r from-blue-200 to-blue-500 bg-clip-text text-3xl font-black italic tracking-[-0.05em] text-transparent">
                    The Appden
                </span>
                <h1 className="mt-6 font-headline text-[1.75rem] font-extrabold leading-tight tracking-tight text-white">{title}</h1>
                {subtitle ? <p className="mt-1.5 text-[15px] text-gray-400">{subtitle}</p> : null}
            </div>

            {children}

            {footer ? <div className="mt-8 text-center text-sm text-gray-400">{footer}</div> : null}
        </div>
    </div>
)

/** Password input with a show/hide toggle sized for touch. */
export const PasswordInput = React.forwardRef<
    HTMLInputElement,
    React.InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }
>(({ invalid, className, ...props }, ref) => {
    const [visible, setVisible] = React.useState(false)
    return (
        <div className="relative">
            <input
                ref={ref}
                type={visible ? 'text' : 'password'}
                className={`input pr-12 ${invalid ? '!border-red-400/60' : ''} ${className ?? ''}`}
                {...props}
            />
            <button
                type="button"
                onClick={() => setVisible((value) => !value)}
                className="absolute right-1 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full text-sm text-gray-400"
                aria-label={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
            >
                {visible ? (
                    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
                        <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
                        <path d="M6.61 6.61A13.53 13.53 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
                        <line x1="2" x2="22" y1="2" y2="22" />
                    </svg>
                ) : (
                    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                        <circle cx="12" cy="12" r="3" />
                    </svg>
                )}
            </button>
        </div>
    )
})

PasswordInput.displayName = 'PasswordInput'
