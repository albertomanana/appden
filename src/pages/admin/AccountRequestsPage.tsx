import { useEffect, useState } from 'react'
import { accountRequestsService } from '@services/account-requests.service'
import { reportsService } from '@features/reports/services/reports.service'
import { useAuth } from '@hooks/useAuth'
import { useNotifications } from '@hooks/useNotifications'

export default function AccountRequestsPage() {
    const { user } = useAuth()
    const { addNotification } = useNotifications()
    const [requests, setRequests] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [isAdmin, setIsAdmin] = useState(false)

    useEffect(() => {
        void (async () => {
            if (!user) return
            const access = await reportsService.getViewerAccess(user.id)
            setIsAdmin(!!access.isAdmin)
            if (!access.isAdmin) return
            await load()
        })()
    }, [user])

    async function load() {
        try {
            setLoading(true)
            const data = await accountRequestsService.listPending()
            setRequests(data)
        } catch (err) {
            console.error(err)
        } finally {
            setLoading(false)
        }
    }

    async function approve(id: string) {
        try {
            if (!user) return
            await accountRequestsService.approveRequest(id, user.id)
            addNotification({ type: 'success', title: 'Aprobado', message: 'Cuenta aprobada' })
            await load()
        } catch (err) {
            addNotification({ type: 'error', title: 'Error', message: err instanceof Error ? err.message : 'No se pudo aprobar' })
        }
    }

    async function reject(id: string) {
        try {
            await accountRequestsService.rejectRequest(id)
            addNotification({ type: 'success', title: 'Rechazado', message: 'Solicitud rechazada' })
            await load()
        } catch (err) {
            addNotification({ type: 'error', title: 'Error', message: err instanceof Error ? err.message : 'No se pudo rechazar' })
        }
    }

    if (!isAdmin) return <div className="page-shell">No autorizado</div>

    return (
        <div className="page-shell">
            <h1 className="text-2xl font-bold mb-4">Solicitudes de cuenta</h1>
            {loading ? <div>Loading...</div> : null}
            <div className="space-y-3">
                {requests.map((r) => (
                    <div key={r.id} className="card p-3 flex items-center justify-between">
                        <div>
                            <div className="font-semibold">{r.profile?.display_name ?? r.email}</div>
                            <div className="text-xs text-gray-400">{new Date(r.created_at).toLocaleString()}</div>
                        </div>
                        <div className="flex gap-2">
                            <button className="btn-primary" onClick={() => approve(r.id)}>Aprobar</button>
                            <button className="btn-ghost" onClick={() => reject(r.id)}>Rechazar</button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}
