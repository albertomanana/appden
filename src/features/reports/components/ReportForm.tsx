import React, { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Bug, ImagePlus, Lightbulb, Send } from 'lucide-react'
import { z } from 'zod'
import type { ReportSeverity, ReportType } from '@features/reports/types'

const reportSchema = z.object({
    type: z.enum(['bug', 'error', 'improvement']),
    title: z.string().min(3, 'El titulo debe tener al menos 3 caracteres').max(140, 'Maximo 140 caracteres'),
    description: z.string().min(10, 'Describe el problema con al menos 10 caracteres').max(3000, 'Maximo 3000 caracteres'),
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
            className="card overflow-hidden p-5 md:p-6"
        >
            <div className="grid gap-5 xl:grid-cols-[0.9fr,1.1fr]">
                <div>
                    <p className="page-kicker">Issue Intake</p>
                    <h2 className="mt-2 text-2xl font-headline font-extrabold text-white">Enviar reporte</h2>
                    <p className="mt-3 text-sm leading-relaxed text-gray-400">
                        Este formulario sigue conectado a la feature real de reports. Aqui solo estamos elevando la UX y la claridad del input.
                    </p>

                    <div className="mt-5 grid gap-2">
                        <div className="rounded-[1.35rem] border border-white/8 bg-black/15 p-3 text-sm text-gray-300">
                            <Bug className="mb-2 h-4 w-4 text-red-300" />
                            Bugs y errores con severidad alta se priorizan antes.
                        </div>
                        <div className="rounded-[1.35rem] border border-white/8 bg-black/15 p-3 text-sm text-gray-300">
                            <Lightbulb className="mb-2 h-4 w-4 text-amber-300" />
                            Las mejoras bien descritas alimentan el roadmap del producto.
                        </div>
                    </div>
                </div>

                <div className="space-y-4">
                    <div className="grid gap-3 md:grid-cols-2">
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
                        <input id="report-title" className="input" placeholder="Resumen corto del problema o mejora" {...register('title')} />
                        {errors.title ? <p className="mt-1 text-xs text-red-400">{errors.title.message}</p> : null}
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
                        {errors.description ? <p className="mt-1 text-xs text-red-400">{errors.description.message}</p> : null}
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
                        {errors.reproductionSteps ? <p className="mt-1 text-xs text-red-400">{errors.reproductionSteps.message}</p> : null}
                    </div>

                    <div>
                        <label htmlFor="report-image" className="label">Imagen (opcional)</label>
                        <label
                            htmlFor="report-image"
                            className="flex min-h-[112px] w-full cursor-pointer items-center gap-3 rounded-[1.5rem] border border-dashed border-white/12 bg-black/15 px-4 py-4 transition-colors hover:border-brand-300/30"
                        >
                            <div className="flex h-12 w-12 items-center justify-center rounded-[1.1rem] bg-white/6 text-brand-300">
                                <ImagePlus className="h-5 w-5" />
                            </div>
                            <div>
                                <p className="text-sm font-medium text-white">{imageFile ? imageFile.name : 'Adjuntar captura de pantalla'}</p>
                                <p className="mt-1 text-xs uppercase tracking-[0.18em] text-gray-500">PNG, JPG o WEBP</p>
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
                                <span className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                                Enviando...
                            </>
                        ) : (
                            <>
                                <Send className="w-4 h-4" />
                                Enviar reporte
                            </>
                        )}
                    </button>
                </div>
            </div>
        </form>
    )
}
