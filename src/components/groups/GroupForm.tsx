import React from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Users } from 'lucide-react'

const groupFormSchema = z.object({
    name: z.string().min(2, 'Name must be at least 2 characters').max(80, 'Name is too long'),
    description: z.string().max(500, 'Description is too long').optional().or(z.literal('')),
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
    submitLabel = 'Create Group',
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
            setError(err instanceof Error ? err.message : 'An error occurred')
        }
    }

    return (
        <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-4">
            {error && (
                <div className="p-3 bg-red-500/10 border border-red-500 rounded-lg text-sm text-red-400">
                    {error}
                </div>
            )}

            <div>
                <label htmlFor="name" className="block text-sm font-medium text-neutral-300 mb-1.5">
                    Group Name
                </label>
                <input
                    {...register('name')}
                    type="text"
                    id="name"
                    placeholder="e.g. Summer 2024"
                    className="w-full px-4 py-2.5 bg-neutral-800 border border-neutral-700 rounded-lg text-white placeholder-neutral-500 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500/30 transition-all"
                />
                {errors.name && (
                    <p className="mt-1.5 text-sm text-red-400">{errors.name.message}</p>
                )}
            </div>

            <div>
                <label htmlFor="description" className="block text-sm font-medium text-neutral-300 mb-1.5">
                    Description (optional)
                </label>
                <textarea
                    {...register('description')}
                    id="description"
                    placeholder="Add a description for this group..."
                    rows={3}
                    className="w-full px-4 py-2.5 bg-neutral-800 border border-neutral-700 rounded-lg text-white placeholder-neutral-500 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500/30 transition-all resize-none"
                />
                {errors.description && (
                    <p className="mt-1.5 text-sm text-red-400">{errors.description.message}</p>
                )}
            </div>

            <button
                type="submit"
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-brand-500 hover:bg-brand-600 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
                <Users size={18} />
                {isLoading ? 'Creating...' : submitLabel}
            </button>
        </form>
    )
}
