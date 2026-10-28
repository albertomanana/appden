import React from 'react'
import { Check, Clock3, UserPlus } from 'lucide-react'
import { useFriendActions } from '@hooks/useFriends'
import type { FriendRelation } from '@services/friends.service'
import type { PersonSummary } from '@components/social/PersonRow'

/**
 * Friendship state of one person as a compact control:
 * Añadir → Pendiente → Amigos, or Aceptar when they asked first.
 * Each instance owns its mutations, so the pending state is per row.
 */
export const FriendRelationButton: React.FC<{ person: PersonSummary; relation: FriendRelation }> = ({ person, relation }) => {
    const { send, accept } = useFriendActions()

    switch (relation.kind) {
        case 'self':
            return null
        case 'friend':
            return (
                <span className="badge-green">
                    <Check className="h-3.5 w-3.5" />
                    Amigos
                </span>
            )
        case 'outgoing':
            return (
                <span className="badge border border-white/10 bg-white/[0.05] text-gray-300">
                    <Clock3 className="h-3.5 w-3.5" />
                    Pendiente
                </span>
            )
        case 'incoming':
            return (
                <button
                    type="button"
                    onClick={() => accept.mutate(relation.request)}
                    disabled={accept.isPending}
                    className="btn-primary !px-4"
                >
                    <Check className="h-4 w-4" />
                    Aceptar
                </button>
            )
        default:
            return (
                <button
                    type="button"
                    onClick={() => send.mutate(person)}
                    disabled={send.isPending || send.isSuccess}
                    className="btn-secondary !px-3.5"
                >
                    <UserPlus className="h-4 w-4" />
                    {send.isPending ? 'Enviando…' : 'Añadir'}
                </button>
            )
    }
}
