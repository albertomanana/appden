import React from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Shield } from 'lucide-react'
import { useToast } from '@components/ui/Toast'
import { debtProService } from '@services/debt-pro.service'
import type { GroupMember } from '@/types'

interface GroupPermissionsPanelProps {
    groupId: string
    members: GroupMember[]
    currentUserId: string
    isOwner: boolean
}

export const GroupPermissionsPanel: React.FC<GroupPermissionsPanelProps> = ({ groupId, members, currentUserId, isOwner }) => {
    const { success, error: toastError } = useToast()
    const queryClient = useQueryClient()

    const { data: permissions } = useQuery({
        queryKey: ['group-permissions', groupId],
        queryFn: () => debtProService.listGroupPermissions(groupId),
        enabled: !!groupId && isOwner,
    })

    const upsertPermissionMutation = useMutation({
        mutationFn: (payload: {
            userId: string
            canManageDebts: boolean
            canManageMusic: boolean
            canManageFiles: boolean
            canManageMembers: boolean
        }) =>
            debtProService.upsertGroupPermission({
                groupId,
                userId: payload.userId,
                updatedBy: currentUserId,
                canManageDebts: payload.canManageDebts,
                canManageMusic: payload.canManageMusic,
                canManageFiles: payload.canManageFiles,
                canManageMembers: payload.canManageMembers,
            }),
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: ['group-permissions', groupId] })
            success('Permisos actualizados')
        },
        onError: () => toastError('Error', 'No se pudo actualizar permisos.'),
    })

    if (!isOwner) return null

    const getPermission = (userId: string) => permissions?.find((item) => item.user_id === userId)

    return (
        <section className="space-y-3">
            <p className="inline-flex items-center gap-2 text-sm font-semibold text-white">
                <Shield className="w-4 h-4 text-brand-300" />
                Panel admin de permisos
            </p>

            <div className="space-y-2">
                {members.map((member) => {
                    const permission = getPermission(member.user_id)
                    const isMemberOwner = member.role === 'owner'
                    const state = {
                        canManageDebts: permission?.can_manage_debts ?? isMemberOwner,
                        canManageMusic: permission?.can_manage_music ?? isMemberOwner,
                        canManageFiles: permission?.can_manage_files ?? isMemberOwner,
                        canManageMembers: permission?.can_manage_members ?? isMemberOwner,
                    }

                    return (
                        <PermissionRow
                            key={member.user_id}
                            name={member.profile?.display_name ?? member.user_id}
                            value={state}
                            disabled={isMemberOwner || upsertPermissionMutation.isPending}
                            onChange={(next) => upsertPermissionMutation.mutate({ userId: member.user_id, ...next })}
                        />
                    )
                })}
            </div>
        </section>
    )
}

const PermissionRow: React.FC<{
    name: string
    value: {
        canManageDebts: boolean
        canManageMusic: boolean
        canManageFiles: boolean
        canManageMembers: boolean
    }
    disabled: boolean
    onChange: (next: {
        canManageDebts: boolean
        canManageMusic: boolean
        canManageFiles: boolean
        canManageMembers: boolean
    }) => void
}> = ({ name, value, disabled, onChange }) => {
    return (
        <div className="rounded-[1.35rem] bg-[#201f1f] p-3">
            <p className="mb-3 text-sm text-white">{name}</p>
            <div className="grid grid-cols-2 gap-2 text-xs md:grid-cols-4">
                <Toggle label="Deudas" checked={value.canManageDebts} disabled={disabled} onChange={(checked) => onChange({ ...value, canManageDebts: checked })} />
                <Toggle label="Musica" checked={value.canManageMusic} disabled={disabled} onChange={(checked) => onChange({ ...value, canManageMusic: checked })} />
                <Toggle label="Archivos" checked={value.canManageFiles} disabled={disabled} onChange={(checked) => onChange({ ...value, canManageFiles: checked })} />
                <Toggle label="Miembros" checked={value.canManageMembers} disabled={disabled} onChange={(checked) => onChange({ ...value, canManageMembers: checked })} />
            </div>
        </div>
    )
}

const Toggle: React.FC<{ label: string; checked: boolean; disabled: boolean; onChange: (checked: boolean) => void }> = ({ label, checked, disabled, onChange }) => (
    <label className="inline-flex items-center gap-1.5 text-gray-300">
        <input type="checkbox" checked={checked} disabled={disabled} onChange={(event) => onChange(event.target.checked)} />
        {label}
    </label>
)
