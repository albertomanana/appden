import React, { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { AlertCircle, Bug, ImagePlus, Lightbulb, Send } from 'lucide-react'
import { z } from 'zod'
import type { ReportSeverity, ReportType } from '@features/reports/types'

const reportSchema = z.object({
    type: z.enum(['bug', 'error', 'improvement']),
    title: z
        .string()
        .min(3, 'El titulo debe tener al menos 3 caracteres')
        .max(140, 'Maximo 140 caracteres'),
    description: z
        .string()
        .min(10, 'Describe el problema con al menos 10 caracteres')
        .max(3000, 'Maximo 3000 caracteres'),
    reproductionSteps: z.string().max(3000, 'Maximo 3000 caracteres').optional(),
    severity: z.enum(['low', 'medium', 'high', 'critical']).optional().nullable(),
})

type ReportFormData = z.infer<typeof reportSchema>

type ReportFormProps = {
    isSubmitting: boolean
    onSubmit: (payload: {
        type: ReportType
        title: string
        description: string
        reproductionSteps?: string
        severity?: ReportSeverity | null
        imageFile?: File | null
    }) => void
}

export const ReportForm: React.FC<ReportFormProps> = ({ isSubmitting, onSubmit }) => {
    const [imageFile, setImageFile] = useState<File | null>(null)

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<ReportFormData>({
        resolver: zodResolver(reportSchema),
        defaultValues: {
            type: 'bug',
            title: '',
            description: '',
            reproductionSteps: '',
            severity: 'medium',
        },
    })

    return (
        <form
            onSubmit={handleSubmit((data) => {
                onSubmit({
                    type: data.type,
                    title: data.title,
                    description: data.description,
                    reproductionSteps: data.reproductionSteps,
                    severity: data.severity ?? null,
                    imageFile,
                })
            })}
            className="card p-4 md:p-5 space-y-4"
        >
            <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-brand-300" />
                <h2 className="text-base font-semibold text-white">Enviar reporte</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                    <label htmlFor="report-type" className="label">Tipo</label>
                    <select id="report-type" className="input" {...register('type')}>
                        <option value="bug">Bug</option>
                        <option value="error">Error</option>
                        <option value="improvement">Mejora</option>
                    </select>
                </div>

                <div>
                    <label htmlFor="report-severity" className="label">Severidad</label>
                    <select id="report-severity" className="input" {...register('severity')}>
                        <option value="low">Baja</option>
                        <option value="medium">Media</option>
                        <option value="high">Alta</option>
                        <option value="critical">Critica</option>
                    </select>
                </div>
            </div>

            <div>
                <label htmlFor="report-title" className="label">Titulo</label>
                <input
                    id="report-title"
                    className="input"
                    placeholder="Resumen corto del problema o mejora"
                    {...register('title')}
                />
                {errors.title ? <p className="text-xs text-red-400 mt-1">{errors.title.message}</p> : null}
            </div>

            <div>
                <label htmlFor="report-description" className="label">Descripcion</label>
                <textarea
                    id="report-description"
                    rows={5}
                    className="input resize-none"
                    placeholder="Que paso, que esperabas y que impacto tiene"
                    {...register('description')}
                />
                {errors.description ? <p className="text-xs text-red-400 mt-1">{errors.description.message}</p> : null}
            </div>

            <div>
                <label htmlFor="report-steps" className="label">Pasos para reproducir (opcional)</label>
                <textarea
                    id="report-steps"
                    rows={4}
                    className="input resize-none"
                    placeholder="1) Abrir... 2) Pulsar... 3) Resultado..."
                    {...register('reproductionSteps')}
                />
                {errors.reproductionSteps ? <p className="text-xs text-red-400 mt-1">{errors.reproductionSteps.message}</p> : null}
            </div>

            <div>
                <label htmlFor="report-image" className="label">Imagen (opcional)</label>
                <label
                    htmlFor="report-image"
                    className="w-full border-2 border-dashed border-surface-400 rounded-xl px-4 py-3 flex items-center gap-3 cursor-pointer hover:border-surface-300 transition-colors"
                >
                    <ImagePlus className="w-5 h-5 text-gray-400" />
                    <div className="text-sm text-gray-300">
                        {imageFile ? imageFile.name : 'Adjuntar captura de pantalla'}
                    </div>
                </label>
                <input
                    id="report-image"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(event) => setImageFile(event.target.files?.[0] ?? null)}
                />
            </div>

            <button type="submit" disabled={isSubmitting} className="btn-primary w-full">
                {isSubmitting ? (
                    <>
                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Enviando...
                    </>
                ) : (
                    <>
                        <Send className="w-4 h-4" />
                        Enviar reporte
                    </>
                )}
            </button>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div className="rounded-xl border border-surface-500 bg-surface-700/50 p-3 text-xs text-gray-300 inline-flex items-center gap-2">
                    <Bug className="w-3.5 h-3.5 text-red-300" />
                    Bugs y errores con severidad alta se priorizan
                </div>
                <div className="rounded-xl border border-surface-500 bg-surface-700/50 p-3 text-xs text-gray-300 inline-flex items-center gap-2">
                    <Lightbulb className="w-3.5 h-3.5 text-amber-300" />
                    Las mejoras alimentan el roadmap
                </div>
            </div>
        </form>
    )
}
