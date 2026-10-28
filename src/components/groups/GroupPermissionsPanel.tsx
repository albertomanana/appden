import React from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Crown, Shield, UserRound } from 'lucide-react'
import { Avatar } from '@components/common/Avatar'
import { useToast } from '@components/ui/Toast'
import { debtProService } from '@services/debt-pro.service'
import { cn } from '@lib/utils'
import type { GroupMember, GroupMemberPermission } from '@/types'

interface GroupPermissionsPanelProps {
    groupId: string
    members: GroupMember[]
    currentUserId: string
    isOwner: boolean
}

type PermissionKey = 'can_manage_debts' | 'can_manage_music' | 'can_manage_files' | 'can_manage_members'

const AREAS: Array<{ key: PermissionKey; label: string }> = [
    { key: 'can_manage_debts', label: 'Cuentas' },
    { key: 'can_manage_music', label: 'Música' },
    { key: 'can_manage_files', label: 'Archivos' },
    { key: 'can_manage_members', label: 'Miembros' },
]

const ROLES = [
    { icon: Crown, tone: 'bg-brand-400/15 text-brand-200', name: 'Propietario', text: 'Lo puede todo: nombra admins, expulsa a cualquiera y puede eliminar el grupo.' },
    { icon: Shield, tone: 'bg-violet-400/15 text-violet-200', name: 'Admin', text: 'Invita a gente, expulsa a miembros y edita los datos del grupo.' },
    { icon: UserRound, tone: 'bg-white/[0.06] text-gray-300', name: 'Miembro', text: 'Sube música, crea playlists, apunta cuentas y participa en el feed.' },
]

export const GroupPermissionsPanel: React.FC<GroupPermissionsPanelProps> = ({ groupId, members, currentUserId, isOwner }) => {
    const toast = useToast()
    const queryClient = useQueryClient()
    const key = ['group-permissions', groupId] as const

    const { data: permissions = [] } = useQuery({
        queryKey: key,
        queryFn: () => debtProService.listGroupPermissions(groupId),
        enabled: !!groupId,
    })

    const save = useMutation({
        mutationFn: (next: Pick<GroupMemberPermission, 'user_id' | PermissionKey>) =>
            debtProService.upsertGroupPermission({
                groupId,
                userId: next.user_id,
                updatedBy: currentUserId,
                canManageDebts: next.can_manage_debts,
                canManageMusic: next.can_manage_music,
                canManageFiles: next.can_manage_files,
                canManageMembers: next.can_manage_members,
            }),
        onMutate: (next) => {
            queryClient.setQueryData<GroupMemberPermission[]>(key, (items = []) => {
                const existing = items.find((item) => item.user_id === next.user_id)
                const merged = { ...(existing ?? { id: `tmp-${next.user_id}`, group_id: groupId, updated_by: currentUserId, updated_at: '' }), ...next }
                return [merged as GroupMemberPermission, ...items.filter((item) => item.user_id !== next.user_id)]
            })
        },
        onError: () => {
            toast.error('No se pudo guardar', 'Vuelve a intentarlo en un momento.')
            void queryClient.invalidateQueries({ queryKey: key })
        },
    })

    const people = members.filter((member) => member.role !== 'owner')
    const valueFor = (userId: string) => {
        const permission = permissions.find((item) => item.user_id === userId)
        return {
            can_manage_debts: permission?.can_manage_debts ?? false,
            can_manage_music: permission?.can_manage_music ?? false,
            can_manage_files: permission?.can_manage_files ?? false,
            can_manage_members: permission?.can_manage_members ?? false,
        }
    }

    return (
        <div className="space-y-5">
            <ul className="space-y-3">
                {ROLES.map(({ icon: Icon, tone, name, text }) => (
                    <li key={name} className="flex gap-3">
                        <span className={cn('grid h-9 w-9 shrink-0 place-items-center rounded-xl', tone)}>
                            <Icon className="h-4 w-4" />
                        </span>
                        <span className="min-w-0 text-sm">
                            <span className="block font-semibold text-white">{name}</span>
                            <span className="block text-gray-400">{text}</span>
                        </span>
                    </li>
                ))}
            </ul>

            {people.length > 0 ? (
                <div className="border-t border-white/[0.06] pt-4">
                    <p className="text-sm font-semibold text-white">Encargados</p>
                    <p className="mt-0.5 text-sm text-gray-400">
                        {isOwner
                            ? 'Marca quién se ocupa de cada cosa para que el grupo sepa a quién acudir. Lo que cada uno puede hacer lo marca su rol.'
                            : 'Quién se ocupa de cada cosa en el grupo. Solo el propietario puede cambiarlo.'}
                    </p>
                    <div className="mt-3 space-y-3">
                        {people.map((member) => {
                            const value = valueFor(member.user_id)
                            const name = member.profile?.display_name ?? 'Usuario'
                            return (
                                <div key={member.user_id} className="rounded-2xl bg-white/[0.03] p-3">
                                    <div className="mb-2 flex items-center gap-2.5">
                                        <Avatar src={member.profile?.avatar_url} name={name} size="sm" />
                                        <span className="truncate text-sm font-semibold text-white">{name}</span>
                                    </div>
                                    <div className="grid grid-cols-2 gap-1 sm:grid-cols-4">
                                        {AREAS.map((area) => (
                                            <Switch
                                                key={area.key}
                                                label={area.label}
                                                checked={value[area.key]}
                                                disabled={!isOwner}
                                                onChange={(checked) => save.mutate({ user_id: member.user_id, ...value, [area.key]: checked })}
                                            />
                                        ))}
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>
            ) : null}
        </div>
    )
}

const Switch: React.FC<{ label: string; checked: boolean; disabled: boolean; onChange: (checked: boolean) => void }> = ({
    label,
    checked,
    disabled,
    onChange,
}) => (
    <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className="flex min-h-[2.75rem] items-center justify-between gap-2 rounded-xl px-2 text-left text-sm text-gray-200 transition-colors enabled:active:bg-white/[0.05] disabled:cursor-default"
    >
        <span className="truncate">{label}</span>
        <span
            className={cn(
                'relative inline-flex h-6 w-10 shrink-0 rounded-full transition-colors',
                checked ? 'bg-brand-400' : 'bg-white/[0.12]',
                disabled && 'opacity-60'
            )}
        >
            <span
                className={cn(
                    'absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform',
                    checked ? 'translate-x-[1.125rem]' : 'translate-x-0.5'
                )}
            />
        </span>
    </button>
)
