import React, { useState, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, FolderOpen, Image, FileText, Download, Trash2, ExternalLink } from 'lucide-react'
import { filesService } from '@services/files.service'
import { useAuth } from '@hooks/useAuth'
import { useActiveGroup } from '@hooks/useActiveGroup'
import { useToast } from '@components/ui/Toast'
import { ConfirmDialog } from '@components/ui/ConfirmDialog'
import { EmptyState } from '@components/ui/EmptyState'
import { formatBytes, formatRelative, cn } from '@lib/utils'
import { validateDocumentFile, validateImageFile } from '@lib/validators'
import { ALLOWED_IMAGE_TYPES } from '@lib/constants'
import type { SharedFile } from '@/types'

const FileCard: React.FC<{
    file: SharedFile
    canDelete: boolean
    onDelete: () => void
}> = ({ file, canDelete, onDelete }) => {
    const isImage = file.category === 'image'
    return (
        <div className="card p-4 flex items-center gap-3">
            <div className={cn(
                'w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0',
                isImage ? 'bg-brand-500/15' : 'bg-surface-600'
            )}>
                {isImage ? <Image className="w-5 h-5 text-brand-400" /> : <FileText className="w-5 h-5 text-gray-400" />}
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">{file.name}</p>
                <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-gray-500">{file.file_size ? formatBytes(file.file_size) : ''}</span>
                    <span className="text-xs text-gray-500">·</span>
                    <span className="text-xs text-gray-500">{formatRelative(file.created_at)}</span>
                </div>
            </div>
            <div className="flex items-center gap-1">
                <a
                    href={file.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-ghost p-2 rounded-lg"
                    aria-label="Abrir"
                >
                    <ExternalLink className="w-4 h-4" />
                </a>
                {canDelete && (
                    <button onClick={onDelete} className="btn-ghost p-2 rounded-lg text-red-400 hover:text-red-300">
                        <Trash2 className="w-4 h-4" />
                    </button>
                )}
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

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return
        const isImage = ALLOWED_IMAGE_TYPES.includes(file.type)
        const err = isImage ? validateImageFile(file) : validateDocumentFile(file)
        if (err) { setFileError(err); return }
        setFileError(null)
        upload(file)
        e.target.value = ''
    }

    return (
        <div className="p-4 md:p-6 space-y-5 animate-fade-in">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="section-title">Archivos</h1>
                    {files && <p className="text-sm text-muted mt-0.5">{files.length} archivos</p>}
                </div>
                <button
                    onClick={() => fileInputRef.current?.click()}
                    className="btn-primary"
                    disabled={!hasGroup || isPending}
                >
                    {isPending ? (
                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : <Plus className="w-4 h-4" />}
                    <span className="hidden sm:inline">{isPending ? 'Subiendo...' : 'Subir'}</span>
                </button>
                <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.csv"
                    className="hidden"
                    onChange={handleFileChange}
                />
            </div>

            {fileError && (
                <div className="card p-3 border-red-500/30 bg-red-500/5">
                    <p className="text-sm text-red-400">{fileError}</p>
                </div>
            )}

            {isLoading ? (
                <div className="space-y-3">
                    {Array.from({ length: 4 }).map((_, i) => (
                        <div key={i} className="card p-4 animate-pulse flex items-center gap-3">
                            <div className="w-11 h-11 rounded-xl bg-surface-600" />
                            <div className="flex-1 space-y-2">
                                <div className="h-4 w-2/3 bg-surface-600 rounded" />
                                <div className="h-3 w-1/3 bg-surface-600 rounded" />
                            </div>
                        </div>
                    ))}
                </div>
            ) : !files || files.length === 0 ? (
                <EmptyState
                    icon={<FolderOpen className="w-7 h-7" />}
                    title="Sin archivos todavía"
                    description="Comparte imágenes o documentos con el grupo."
                    action={hasGroup ? (
                        <button onClick={() => fileInputRef.current?.click()} className="btn-primary">
                            <Plus className="w-4 h-4" /> Subir primer archivo
                        </button>
                    ) : undefined}
                />
            ) : (
                <div className="space-y-2">
                    {files.map((f) => (
                        <FileCard
                            key={f.id}
                            file={f}
                            canDelete={f.uploaded_by === userId}
                            onDelete={() => setDeleteTarget(f.id)}
                        />
                    ))}
                </div>
            )}

            <ConfirmDialog
                isOpen={!!deleteTarget}
                title="Eliminar archivo"
                description="¿Estás seguro de que quieres eliminar este archivo? Esta acción no se puede deshacer."
                confirmLabel="Eliminar"
                isLoading={isDeleting}
                onConfirm={() => deleteTarget && deleteFile(deleteTarget)}
                onCancel={() => setDeleteTarget(null)}
            />
        </div>
    )
}

export default FilesPage
