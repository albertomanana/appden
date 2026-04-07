import React, { useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ExternalLink, FileText, FolderOpen, Image, Plus, Trash2 } from 'lucide-react'
import { ConfirmDialog } from '@components/ui/ConfirmDialog'
import { EmptyState } from '@components/ui/EmptyState'
import { PageHeader } from '@components/ui/PageHeader'
import { Tabs } from '@components/ui/Tabs'
import { useToast } from '@components/ui/Toast'
import { useAuth } from '@hooks/useAuth'
import { useActiveGroup } from '@hooks/useActiveGroup'
import { ALLOWED_IMAGE_TYPES, ROUTES } from '@lib/constants'
import { cn, formatBytes, formatRelative } from '@lib/utils'
import { validateDocumentFile, validateImageFile } from '@lib/validators'
import { filesService } from '@services/files.service'
import type { SharedFile } from '@/types'

const FileCard: React.FC<{ file: SharedFile; canDelete: boolean; onDelete: () => void }> = ({ file, canDelete, onDelete }) => {
    const isImage = file.category === 'image'
    return (
        <div className="card flex items-center gap-3 p-4">
            <div className={cn('flex h-12 w-12 items-center justify-center rounded-[1.1rem] flex-shrink-0', isImage ? 'bg-brand-500/14' : 'bg-[#201f1f]')}>
                {isImage ? <Image className="w-5 h-5 text-brand-300" /> : <FileText className="w-5 h-5 text-gray-400" />}
            </div>
            <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-white">{file.name}</p>
                <div className="mt-1 flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-gray-500">
                    <span>{file.file_size ? formatBytes(file.file_size) : ''}</span>
                    <span>·</span>
                    <span>{formatRelative(file.created_at)}</span>
                </div>
            </div>
            <div className="flex items-center gap-1">
                <a href={file.file_url} target="_blank" rel="noopener noreferrer" className="btn-ghost p-2 rounded-lg" aria-label="Abrir">
                    <ExternalLink className="w-4 h-4" />
                </a>
                {canDelete ? (
                    <button onClick={onDelete} className="btn-ghost p-2 rounded-lg text-red-400 hover:text-red-300">
                        <Trash2 className="w-4 h-4" />
                    </button>
                ) : null}
            </div>
        </div>
    )
}

const FilesPage: React.FC = () => {
    const { userId } = useAuth()
    const { groupId, hasGroup } = useActiveGroup()
    const { success, error: toastError } = useToast()
    const queryClient = useQueryClient()
    const fileInputRef = useRef<HTMLInputElement>(null)
    const [deleteTarget, setDeleteTarget] = useState<string | null>(null)
    const [fileError, setFileError] = useState<string | null>(null)

    const { data: files, isLoading } = useQuery({
        queryKey: ['files', groupId],
        queryFn: () => filesService.getFiles(groupId!),
        enabled: !!groupId,
    })

    const { mutate: upload, isPending } = useMutation({
        mutationFn: (file: File) => filesService.uploadFile(userId!, groupId!, file, file.name),
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: ['files', groupId] })
            success('Archivo subido')
        },
        onError: (err) => toastError('Error', err instanceof Error ? err.message : 'Error'),
    })

    const { mutate: deleteFile, isPending: isDeleting } = useMutation({
        mutationFn: (id: string) => filesService.deleteFile(id),
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: ['files', groupId] })
            success('Archivo eliminado')
            setDeleteTarget(null)
        },
        onError: () => toastError('Error', 'No se pudo eliminar el archivo.'),
    })

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0]
        if (!file) return
        const isImage = ALLOWED_IMAGE_TYPES.includes(file.type)
        const validationError = isImage ? validateImageFile(file) : validateDocumentFile(file)
        if (validationError) {
            setFileError(validationError)
            return
        }
        setFileError(null)
        upload(file)
        event.target.value = ''
    }

    return (
        <div className="page-shell animate-fade-in">
            <PageHeader
                kicker="Shared Assets"
                title="Archivos"
                description={files ? `${files.length} archivos compartidos` : 'Repositorio privado del grupo para imagenes y documentos.'}
                actions={
                    <button onClick={() => fileInputRef.current?.click()} className="btn-primary" disabled={!hasGroup || isPending}>
                        {isPending ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Plus className="w-4 h-4" />}
                        {isPending ? 'Subiendo...' : 'Subir'}
                    </button>
                }
            />

            <Tabs
                active="files"
                items={[
                    { label: 'Reports', value: 'reports', href: ROUTES.REPORTS },
                    { label: 'Changelog', value: 'changelog', href: ROUTES.CHANGELOG },
                    { label: 'Files', value: 'files', href: ROUTES.FILES },
                ]}
            />

            <input
                ref={fileInputRef}
                type="file"
                accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.csv"
                className="hidden"
                onChange={handleFileChange}
            />

            {fileError ? (
                <div className="card p-3 bg-red-500/8">
                    <p className="text-sm text-red-300">{fileError}</p>
                </div>
            ) : null}

            {isLoading ? (
                <div className="space-y-3">
                    {Array.from({ length: 4 }).map((_, index) => (
                        <div key={index} className="card p-4 animate-pulse flex items-center gap-3">
                            <div className="w-12 h-12 rounded-[1.1rem] bg-[#201f1f]" />
                            <div className="flex-1 space-y-2">
                                <div className="h-4 w-2/3 rounded bg-[#201f1f]" />
                                <div className="h-3 w-1/3 rounded bg-[#201f1f]" />
                            </div>
                        </div>
                    ))}
                </div>
            ) : !files || files.length === 0 ? (
                <EmptyState
                    icon={<FolderOpen className="w-7 h-7" />}
                    title="Sin archivos todavia"
                    description="Comparte imagenes o documentos con el grupo."
                    action={hasGroup ? (
                        <button onClick={() => fileInputRef.current?.click()} className="btn-primary">
                            <Plus className="w-4 h-4" />
                            Subir primer archivo
                        </button>
                    ) : undefined}
                />
            ) : (
                <div className="space-y-3">
                    {files.map((file) => (
                        <FileCard key={file.id} file={file} canDelete={file.uploaded_by === userId} onDelete={() => setDeleteTarget(file.id)} />
                    ))}
                </div>
            )}

            <ConfirmDialog
                isOpen={!!deleteTarget}
                title="Eliminar archivo"
                description="Estas seguro de que quieres eliminar este archivo? Esta accion no se puede deshacer."
                confirmLabel="Eliminar"
                isLoading={isDeleting}
                onConfirm={() => deleteTarget && deleteFile(deleteTarget)}
                onCancel={() => setDeleteTarget(null)}
            />
        </div>
    )
}

export default FilesPage
