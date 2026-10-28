import React from 'react'
import { useNavigate } from 'react-router-dom'
import { Check, Crown, MoreHorizontal, Music2, Shield, ShieldCheck, ShieldOff, UserMinus, UserPlus, UserRound, X } from 'lucide-react'
import { Avatar } from '@components/common/Avatar'
import { PersonRow, YouPill, type PersonSummary } from '@components/social/PersonRow'
import { ActionSheet } from '@components/ui/ActionSheet'
import { ConfirmDialog } from '@components/ui/ConfirmDialog'
import { useFriendActions, useFriends } from '@hooks/useFriends'
import type { FriendRelation } from '@services/friends.service'
import { ROUTES } from '@lib/constants'
import { cn } from '@lib/utils'
import type { GroupMember, GroupRole } from '@/types'

interface GroupMemberListProps {
    groupId: string
    members: GroupMember[]
    currentUserId: string
    isManager: boolean
    /** Only the owner can promote/demote admins. */
    canAssignRoles?: boolean
    onRemoveMember?: (userId: string) => Promise<void>
    onUpdateRole?: (userId: string, role: 'owner' | 'admin' | 'member') => Promise<void>
    isLoading?: boolean
}

export const ROLE_LABELS: Record<GroupRole, string> = { owner: 'Propietario', admin: 'Admin', member: 'Miembro' }
const roleRank: Record<GroupRole, number> = { owner: 0, admin: 1, member: 2 }
const firstName = (name?: string | null) => (name ?? '').trim().split(/\s+/)[0] || 'este miembro'

/** Compact role tag for list sublines and headers. */
export const RoleTag: React.FC<{ role: GroupRole; className?: string }> = ({ role, className }) => (
    <span
        className={cn(
            'inline-flex items-center gap-1 rounded-full px-1.5 py-px align-[1px] text-[11px] font-semibold',
            role === 'owner' && 'bg-brand-400/15 text-brand-200',
            role === 'admin' && 'bg-violet-400/15 text-violet-200',
            role === 'member' && 'bg-white/[0.06] text-gray-300',
            className
        )}
    >
        {role === 'owner' ? <Crown className="h-3 w-3" /> : role === 'admin' ? <Shield className="h-3 w-3" /> : null}
        {ROLE_LABELS[role]}
    </span>
)

const toPerson = (member: GroupMember): PersonSummary => ({
    id: member.user_id,
    display_name: member.profile?.display_name ?? 'Usuario',
    username: member.profile?.username ?? null,
    avatar_url: member.profile?.avatar_url ?? null,
})

const relationText = (relation: FriendRelation) => {
    if (relation.kind === 'friend') return 'Amigos'
    if (relation.kind === 'outgoing') return 'Solicitud enviada'
    if (relation.kind === 'incoming') return 'Quiere ser tu amigo'
    return null
}

export const GroupMemberList: React.FC<GroupMemberListProps> = ({
    groupId,
    members,
    currentUserId,
    isManager,
    canAssignRoles = false,
    onRemoveMember,
    onUpdateRole,
    isLoading = false,
}) => {
    const navigate = useNavigate()
    const { relationOf } = useFriends()
    const { send, accept, cancel } = useFriendActions()
    const [menuMember, setMenuMember] = React.useState<GroupMember | null>(null)
    const [expelling, setExpelling] = React.useState<GroupMember | null>(null)
    const [busy, setBusy] = React.useState(false)

    const sorted = React.useMemo(
        () =>
            [...members].sort(
                (a, b) =>
                    roleRank[a.role] - roleRank[b.role] ||
                    (a.profile?.display_name ?? '').localeCompare(b.profile?.display_name ?? '', 'es')
            ),
        [members]
    )

    const canChangeRole = (member: GroupMember) =>
        canAssignRoles && !!onUpdateRole && member.user_id !== currentUserId && member.role !== 'owner'
    // Admins can expel members; only the owner can expel admins. Nobody can expel the owner.
    const canExpel = (member: GroupMember) =>
        isManager && !!onRemoveMember && member.user_id !== currentUserId && member.role !== 'owner' && (canAssignRoles || member.role === 'member')

    const run = async (task: () => Promise<void>) => {
        setBusy(true)
        try {
            await task()
        } finally {
            setBusy(false)
        }
    }

    const menuRelation = menuMember ? relationOf(menuMember.user_id) : null
    const menuPerson = menuMember ? toPerson(menuMember) : null

    return (
        <>
            <div className="list-group">
                {sorted.map((member) => {
                    const person = toPerson(member)
                    const isMe = member.user_id === currentUserId
                    const relation = relationOf(member.user_id)
                    const extra = isMe ? null : relationText(relation)
                    return (
                        <PersonRow
                            key={member.id}
                            person={person}
                            badge={isMe ? <YouPill /> : null}
                            subtitle={
                                <>
                                    <RoleTag role={member.role} />
                                    {person.username ? <span> · @{person.username}</span> : null}
                                    {extra ? <span className={relation.kind === 'friend' ? 'text-emerald-300/90' : undefined}> · {extra}</span> : null}
                                </>
                            }
                            onOpen={() => navigate(ROUTES.GROUP_MEMBER(groupId, member.user_id))}
                            openLabel={`Ver el perfil de ${person.display_name}`}
                        >
                            {!isMe ? <QuickFriendAction person={person} relation={relation} /> : null}
                            {!isMe ? (
                                <button
                                    type="button"
                                    onClick={() => setMenuMember(member)}
                                    className="icon-btn -mr-2 text-gray-400"
                                    aria-label={`Opciones de ${person.display_name}`}
                                >
                                    <MoreHorizontal className="h-5 w-5" />
                                </button>
                            ) : null}
                        </PersonRow>
                    )
                })}
            </div>

            <ActionSheet
                open={!!menuMember}
                onClose={() => setMenuMember(null)}
                header={
                    menuMember && menuPerson ? (
                        <div className="flex items-center gap-3">
                            <Avatar src={menuPerson.avatar_url} name={menuPerson.display_name} size="md" />
                            <div className="min-w-0">
                                <p className="truncate font-semibold text-white">{menuPerson.display_name}</p>
                                <p className="truncate text-sm text-gray-400">
                                    <RoleTag role={menuMember.role} />
                                    {menuPerson.username ? ` · @${menuPerson.username}` : ''}
                                </p>
                            </div>
                        </div>
                    ) : null
                }
                items={[
                    {
                        label: 'Ver perfil',
                        icon: UserRound,
                        onSelect: () => menuMember && navigate(ROUTES.GROUP_MEMBER(groupId, menuMember.user_id)),
                    },
                    { label: 'Ver como artista', icon: Music2, onSelect: () => menuMember && navigate(ROUTES.ARTIST(menuMember.user_id)) },
                    {
                        label: 'Añadir amigo',
                        icon: UserPlus,
                        hidden: menuRelation?.kind !== 'none',
                        onSelect: () => menuPerson && send.mutate(menuPerson),
                    },
                    {
                        label: 'Aceptar solicitud de amistad',
                        icon: Check,
                        hidden: menuRelation?.kind !== 'incoming',
                        onSelect: () => menuRelation?.kind === 'incoming' && accept.mutate(menuRelation.request),
                    },
                    {
                        label: 'Cancelar solicitud de amistad',
                        icon: X,
                        hidden: menuRelation?.kind !== 'outgoing',
                        onSelect: () => menuRelation?.kind === 'outgoing' && cancel.mutate(menuRelation.request),
                    },
                    {
                        label: 'Hacer admin',
                        icon: ShieldCheck,
                        hidden: !menuMember || !canChangeRole(menuMember) || menuMember.role !== 'member',
                        disabled: busy || isLoading,
                        onSelect: () => menuMember && onUpdateRole && void run(() => onUpdateRole(menuMember.user_id, 'admin')),
                    },
                    {
                        label: 'Quitar admin',
                        icon: ShieldOff,
                        hidden: !menuMember || !canChangeRole(menuMember) || menuMember.role !== 'admin',
                        disabled: busy || isLoading,
                        onSelect: () => menuMember && onUpdateRole && void run(() => onUpdateRole(menuMember.user_id, 'member')),
                    },
                    {
                        label: 'Expulsar del grupo',
                        icon: UserMinus,
                        tone: 'danger',
                        hidden: !menuMember || !canExpel(menuMember),
                        onSelect: () => setExpelling(menuMember),
                    },
                ]}
            />

            <ConfirmDialog
                isOpen={!!expelling}
                title={`¿Expulsar a ${firstName(expelling?.profile?.display_name)}?`}
                description="Dejará de ver la música, las playlists y las cuentas de este grupo. Podrás volver a invitarle cuando quieras."
                confirmLabel="Expulsar"
                isLoading={busy}
                onConfirm={() =>
                    expelling &&
                    onRemoveMember &&
                    void run(async () => {
                        await onRemoveMember(expelling.user_id)
                        setExpelling(null)
                    })
                }
                onCancel={() => setExpelling(null)}
            />
        </>
    )
}

/** Inline shortcut next to a member: "Añadir amigo" or "Aceptar" when they asked first. */
const QuickFriendAction: React.FC<{ person: PersonSummary; relation: FriendRelation }> = ({ person, relation }) => {
    const { send, accept } = useFriendActions()

    if (relation.kind === 'none') {
        return (
            <button
                type="button"
                onClick={() => send.mutate(person)}
                disabled={send.isPending || send.isSuccess}
                className="icon-btn text-brand-300"
                aria-label={`Añadir a ${person.display_name} como amigo`}
                title="Añadir amigo"
            >
                <UserPlus className="h-5 w-5" />
            </button>
        )
    }

    if (relation.kind === 'incoming') {
        return (
            <button
                type="button"
                onClick={() => accept.mutate(relation.request)}
                disabled={accept.isPending}
                className="icon-btn bg-emerald-400/15 text-emerald-200"
                aria-label={`Aceptar la solicitud de amistad de ${person.display_name}`}
                title="Aceptar solicitud"
            >
                <Check className="h-5 w-5" />
            </button>
        )
    }

    return null
}
