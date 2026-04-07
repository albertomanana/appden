import React from 'react'
import { cn } from '@lib/utils'

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'icon'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: ButtonVariant
}

const variantClass: Record<ButtonVariant, string> = {
    primary: 'btn-primary',
    secondary: 'btn-secondary',
    ghost: 'btn-ghost',
    danger: 'btn-danger',
    icon: 'btn-icon',
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
    ({ variant = 'primary', className, ...props }, ref) => (
        <button
            ref={ref}
            className={cn(variantClass[variant], className)}
            {...props}
        />
    )
)

Button.displayName = 'Button'
