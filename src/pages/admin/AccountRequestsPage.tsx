import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Check, ShieldCheck, X } from 'lucide-react'
import { Avatar } from '@components/common/Avatar'
import { EmptyState } from '@components/ui/EmptyState'
import { ErrorNotice } from '@components/ui/ErrorNotice'
import { ListSkeleton } from '@components/ui/LoadingSkeleton'
import { PageHeader } from '@components/ui/PageHeader'
import { useToast } from '@components/ui/Toast'
import { useAuth } from '@hooks/useAuth'
import { useIsAppAdmin } from '@hooks/useIsAppAdmin'
import { ROUTES } from '@lib/constants'
import { formatRelative } from '@lib/utils'
import { accountRequestsService } from '@services/account-requests.service'

export default function AccountRequestsPage() {
    const { userId } = useAuth()
    const { isAdmin, isLoading: checkingAdmin } = useIsAppAdmin()
    const queryClient = useQueryClient()
    const toast = useToast()

    const requests = useQuery({
        queryKey: ['account-requests'],
        queryFn: () => accountRequestsService.listPending(),
        enabled: isAdmin,
    })

    const respond = useMutation({
        mutationFn: async ({ id, approve }: { id: string; approve: boolean }) => {
            if (approve) await accountRequestsService.approveRequest(id, userId!)
            else await accountRequestsService.rejectRequest(id)
        },
        onSuccess: (_data, { approve }) => {
            void queryClient.invalidateQueries({ queryKey: ['account-requests'] })
            toast.success(approve ? 'Cuenta aprobada' : 'Solicitud rechazada')
        },
        onError: (err) => toast.error('No se pudo responder', err instanceof Error ? err.message : undefined),
    })

    if (checkingAdmin) {
        return (
            <div className="page-shell">
                <ListSkeleton count={3} />
            </div>
        )
    }

    if (!isAdmin) {
        return (
            <div className="page-shell">
                <PageHeader back={ROUTES.PROFILE} title="Solicitudes de cuenta" />
                <EmptyState
                    icon={<ShieldCheck className="h-6 w-6" />}
                    title="Solo para administradores"
                    description="Esta sección es para quien gestiona el acceso a la app."
                />
            </div>
        )
    }

    const list = requests.data ?? []

    return (
        <div className="page-shell animate-fade-in">
            <PageHeader back={ROUTES.PROFILE} title="Solicitudes de cuenta" description="Personas que se han registrado y esperan acceso." />

            {requests.isLoading ? (
                <ListSkeleton count={3} />
            ) : requests.error ? (
                <ErrorNotice title="No pudimos cargar las solicitudes" error={requests.error} onRetry={() => void requests.refetch()} />
            ) : list.length === 0 ? (
                <EmptyState icon={<ShieldCheck className="h-6 w-6" />} title="No hay solicitudes pendientes" description="Cuando alguien se registre aparecerá aquí." />
            ) : (
                <div className="list-group">
                    {list.map((request) => (
                        <div key={request.id} className="list-row">
                            <Avatar src={request.profile?.avatar_url} name={request.profile?.display_name ?? request.email} size="md" />
                            <div className="min-w-0 flex-1">
                                <p className="truncate text-[15px] font-semibold text-white">{request.profile?.display_name ?? request.email}</p>
                                <p className="truncate text-[13px] text-gray-400">
                                    {request.email} · {formatRelative(request.created_at)}
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => respond.mutate({ id: request.id, approve: false })}
                                disabled={respond.isPending}
                                className="icon-btn bg-white/[0.06]"
                                aria-label={`Rechazar a ${request.email}`}
                            >
                                <X className="h-5 w-5" />
                            </button>
                            <button
                                type="button"
                                onClick={() => respond.mutate({ id: request.id, approve: true })}
                                disabled={respond.isPending}
                                className="icon-btn bg-emerald-400/15 text-emerald-200"
                                aria-label={`Aprobar a ${request.email}`}
                            >
                                <Check className="h-5 w-5" />
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
