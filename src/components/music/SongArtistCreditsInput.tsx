import React, { useMemo } from 'react'
import { Plus, UserRound, X } from 'lucide-react'
import {
    useFieldArray,
    type Control,
    type FieldErrors,
    type UseFormRegister,
    type UseFormSetValue,
    type UseFormWatch,
} from 'react-hook-form'
import type { GroupMember } from '@/types'
import type { SongFormData } from '@lib/validators'
import {
    buildArtistSummary,
    buildMemberLookup,
    createEmptyArtistCredit,
} from '@features/music/utils/artistCredits'

interface SongArtistCreditsInputProps {
    control: Control<SongFormData>
    register: UseFormRegister<SongFormData>
    watch: UseFormWatch<SongFormData>
    setValue: UseFormSetValue<SongFormData>
    errors: FieldErrors<SongFormData>
    members: GroupMember[]
    disabled?: boolean
}

export const SongArtistCreditsInput: React.FC<SongArtistCreditsInputProps> = ({
    control,
    register,
    watch,
    setValue,
    errors,
    members,
    disabled = false,
}) => {
    const { fields, append, remove } = useFieldArray({
        control,
        name: 'artist_credits',
    })

    const credits = watch('artist_credits') ?? []
    const membersById = useMemo(() => buildMemberLookup(members), [members])
    const summary = buildArtistSummary(credits, membersById)

    const handleSourceChange = (index: number, source: 'profile' | 'manual') => {
        setValue(`artist_credits.${index}.source`, source, { shouldValidate: true, shouldDirty: true })

        if (source === 'profile') {
            setValue(`artist_credits.${index}.artist_name`, '', { shouldValidate: true, shouldDirty: true })
            return
        }

        setValue(`artist_credits.${index}.profile_id`, '', { shouldValidate: true, shouldDirty: true })
    }

    const handleProfileChange = (index: number, profileId: string) => {
        const displayName = membersById.get(profileId)?.profile?.display_name ?? ''
        setValue(`artist_credits.${index}.profile_id`, profileId, { shouldValidate: true, shouldDirty: true })
        setValue(`artist_credits.${index}.artist_name`, displayName, { shouldValidate: true, shouldDirty: true })
    }

    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
                <div>
                    <label className="label">Artistas *</label>
                    <p className="mt-1 text-xs text-gray-500">
                        Combina usuarios del grupo y nombres libres.
                    </p>
                </div>

                <button
                    type="button"
                    onClick={() => append(createEmptyArtistCredit())}
                    className="btn-secondary !min-h-[2.5rem]"
                    disabled={disabled || fields.length >= 6}
                >
                    <Plus className="h-4 w-4" />
                    Anadir
                </button>
            </div>

            {fields.map((field, index) => {
                const credit = credits[index]
                const rowErrors = errors.artist_credits?.[index]
                const isProfile = credit?.source === 'profile'

                return (
                    <div key={field.id} className="rounded-2xl border border-surface-500 bg-surface-700/60 p-4 space-y-3">
                        <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2 text-sm text-white">
                                <UserRound className="h-4 w-4 text-brand-300" />
                                Artista {index + 1}
                            </div>

                            <button
                                type="button"
                                onClick={() => remove(index)}
                                className="btn-ghost !min-h-[2rem] !w-[2rem] !p-0"
                                disabled={disabled || fields.length === 1}
                                aria-label="Eliminar artista"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>

                        <div className="grid gap-3 md:grid-cols-[140px,1fr]">
                            <div>
                                <label className="label" htmlFor={`artist-source-${index}`}>Tipo</label>
                                <select
                                    id={`artist-source-${index}`}
                                    {...register(`artist_credits.${index}.source`)}
                                    className="input"
                                    value={credit?.source ?? 'manual'}
                                    onChange={(event) => handleSourceChange(index, event.target.value as 'profile' | 'manual')}
                                    disabled={disabled}
                                >
                                    <option value="manual">Nombre libre</option>
                                    <option value="profile" disabled={members.length === 0}>
                                        Usuario del grupo
                                    </option>
                                </select>
                            </div>

                            {isProfile ? (
                                <div>
                                    <label className="label" htmlFor={`artist-profile-${index}`}>Usuario</label>
                                    <select
                                        id={`artist-profile-${index}`}
                                        {...register(`artist_credits.${index}.profile_id`)}
                                        className={`input ${rowErrors?.profile_id ? 'border-red-500' : ''}`}
                                        value={credit?.profile_id ?? ''}
                                        onChange={(event) => handleProfileChange(index, event.target.value)}
                                        disabled={disabled || members.length === 0}
                                    >
                                        <option value="">Selecciona un miembro</option>
                                        {members.map((member) => (
                                            <option key={member.user_id} value={member.user_id}>
                                                {member.profile?.display_name ?? 'Usuario'}
                                                {member.profile?.username ? ` (@${member.profile.username})` : ''}
                                            </option>
                                        ))}
                                    </select>
                                    <input type="hidden" {...register(`artist_credits.${index}.artist_name`)} />
                                    {rowErrors?.profile_id?.message ? (
                                        <p className="mt-1 text-xs text-red-400">{rowErrors.profile_id.message}</p>
                                    ) : null}
                                </div>
                            ) : (
                                <div>
                                    <label className="label" htmlFor={`artist-name-${index}`}>Nombre del artista</label>
                                    <input
                                        id={`artist-name-${index}`}
                                        type="text"
                                        placeholder="Ej. The Weeknd"
                                        className={`input ${rowErrors?.artist_name ? 'border-red-500' : ''}`}
                                        disabled={disabled}
                                        {...register(`artist_credits.${index}.artist_name`)}
                                    />
                                    {rowErrors?.artist_name?.message ? (
                                        <p className="mt-1 text-xs text-red-400">{rowErrors.artist_name.message}</p>
                                    ) : null}
                                </div>
                            )}
                        </div>
                    </div>
                )
            })}

            <div className="rounded-2xl border border-brand-400/15 bg-brand-400/8 px-4 py-3">
                <p className="text-[11px] uppercase tracking-[0.18em] text-brand-200/70">Vista previa</p>
                <p className="mt-1 text-sm text-white">{summary || 'Selecciona al menos un artista.'}</p>
            </div>

            {typeof errors.artist_credits?.message === 'string' ? (
                <p className="text-xs text-red-400">{errors.artist_credits.message}</p>
            ) : null}
        </div>
    )
}
