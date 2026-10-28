import React from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

const groupFormSchema = z.object({
    name: z.string().trim().min(2, 'Mínimo 2 caracteres').max(80, 'Máximo 80 caracteres'),
    description: z.string().max(500, 'Máximo 500 caracteres').optional().or(z.literal('')),
})

export type GroupFormData = z.infer<typeof groupFormSchema>

interface GroupFormProps {
    initialData?: GroupFormData
    onSubmit: (data: GroupFormData) => Promise<void>
    isLoading?: boolean
    submitLabel?: string
}

export const GroupForm: React.FC<GroupFormProps> = ({
    initialData,
    onSubmit,
    isLoading = false,
    submitLabel = 'Crear grupo',
}) => {
    const [error, setError] = React.useState<string | null>(null)

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<GroupFormData>({
        resolver: zodResolver(groupFormSchema),
        defaultValues: initialData || {},
    })

    const onFormSubmit = async (data: GroupFormData) => {
        try {
            setError(null)
            await onSubmit(data)
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Ha ocurrido un error')
        }
    }

    return (
        <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-4">
            {error ? <div className="notice-error">{error}</div> : null}

            <div>
                <label htmlFor="group-name" className="label">
                    Nombre
                </label>
                <input {...register('name')} type="text" id="group-name" placeholder="Ej. Los del Ático" className="input" autoComplete="off" />
                {errors.name ? <p className="field-error">{errors.name.message}</p> : null}
            </div>

            <div>
                <label htmlFor="group-description" className="label">
                    Descripción <span className="font-normal text-gray-500">(opcional)</span>
                </label>
                <textarea
                    {...register('description')}
                    id="group-description"
                    placeholder="¿Para qué es este grupo?"
                    rows={3}
                    className="input resize-none"
                />
                {errors.description ? <p className="field-error">{errors.description.message}</p> : null}
            </div>

            <button type="submit" disabled={isLoading} className="btn-primary w-full">
                {isLoading ? 'Guardando…' : submitLabel}
            </button>
        </form>
    )
}
