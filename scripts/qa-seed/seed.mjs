#!/usr/bin/env node
import { randomUUID } from 'node:crypto'
import {
    QA_GROUP_PREFIX,
    chunk,
    createServiceClient,
    findQaAuthUsers,
    getSeedConfig,
    isoDaysAgo,
    logStep,
    qaEmail,
    resetQaSeed,
} from './shared.mjs'
import {
    AUDIO_URLS,
    CHANGELOG_BLUEPRINTS,
    COMMENT_TEMPLATES,
    DEBT_BLUEPRINTS,
    FILE_BLUEPRINTS,
    FRIEND_REQUESTS,
    GROUP_BLUEPRINTS,
    GROUP_FRIEND_REQUESTS,
    GROUP_INVITATIONS,
    GROUP_MEMBERSHIPS,
    NOTIFICATION_BLUEPRINTS,
    PAYMENT_BLUEPRINTS,
    PLAYLIST_BLUEPRINTS,
    REPORT_BLUEPRINTS,
    REPORT_IMAGE_URLS,
    SONG_BLUEPRINTS,
    SONG_EXTRA_OWNERS,
    USER_BLUEPRINTS,
    makeAvatarDataUrl,
    makePlaceholderImage,
} from './fixtures.mjs'

const args = new Set(process.argv.slice(2))

if (args.has('--help') || args.has('-h')) {
    process.stdout.write(`Usage:
  npm run seed:qa
  npm run seed:qa:fresh
  npm run seed:qa:reset

Environment:
  SUPABASE_URL or VITE_SUPABASE_URL
  SUPABASE_SERVICE_ROLE_KEY
  QA_SEED_EMAIL_DOMAIN (optional)
  QA_SEED_DEFAULT_PASSWORD (optional)
`)
    process.exit(0)
}

function stableIdMap(items) {
    return new Map(items.map((item) => [item.slug, item]))
}

function requireEntity(map, slug, kind) {
    const value = map.get(slug)
    if (!value) throw new Error(`Missing ${kind}: ${slug}`)
    return value
}

function pairUsers(a, b) {
    return a < b ? [a, b] : [b, a]
}

async function insertBatched(client, table, rows) {
    if (!rows.length) return

    for (const batch of chunk(rows, 100)) {
        const { error } = await client.from(table).insert(batch)
        if (error) throw new Error(`[${table}] ${error.message}`)
    }
}

async function upsertBatched(client, table, rows, onConflict) {
    if (!rows.length) return

    for (const batch of chunk(rows, 100)) {
        const { error } = await client.from(table).upsert(batch, { onConflict })
        if (error) throw new Error(`[${table}] ${error.message}`)
    }
}

async function assertNamespaceIsClean(client, emailDomain) {
    const qaUsers = await findQaAuthUsers(client, emailDomain)
    const { data: qaGroups, error } = await client
        .from('groups')
        .select('id')
        .ilike('name', `${QA_GROUP_PREFIX}%`)

    if (error) throw error

    if (qaUsers.length > 0 || (qaGroups?.length ?? 0) > 0) {
        throw new Error(
            'Ya existe un namespace QA Seed en Supabase. Ejecuta `npm run seed:qa:fresh` o `npm run seed:qa:reset` antes de volver a sembrar.'
        )
    }
}

function buildUsers(emailDomain) {
    return USER_BLUEPRINTS.map((user) => ({
        ...user,
        email: qaEmail(user.localPart, emailDomain),
        avatarUrl:
            user.incompleteProfile || !user.accent
                ? null
                : makeAvatarDataUrl(user.displayName, user.accent[0], user.accent[1]),
    }))
}

async function createAuthUsers(client, users, defaultPassword) {
    const userIds = new Map()

    for (const user of users) {
        const { data, error } = await client.auth.admin.createUser({
            email: user.email,
            password: defaultPassword,
            email_confirm: true,
            user_metadata: {
                display_name: user.displayName,
            },
        })

        if (error) throw error
        if (!data.user?.id) throw new Error(`No auth user id returned for ${user.email}`)
        userIds.set(user.slug, data.user.id)
    }

    return userIds
}

async function seedProfiles(client, users, userIds) {
    const rows = users.map((user) => ({
        id: userIds.get(user.slug),
        display_name: user.displayName,
        username: user.username,
        avatar_url: user.avatarUrl,
        bio: user.bio,
        created_at: isoDaysAgo(user.profileDaysAgo, 11, 0),
        updated_at: isoDaysAgo(Math.max(1, user.profileDaysAgo - 1), 18, 30),
    }))

    await upsertBatched(client, 'profiles', rows, 'id')
}

function buildGroups(userIds) {
    return GROUP_BLUEPRINTS.map((group) => ({
        ...group,
        id: randomUUID(),
        name: `${QA_GROUP_PREFIX} ${group.nameSuffix}`,
        createdById: userIds.get(group.owner),
        avatarUrl: makePlaceholderImage(group.nameSuffix, group.palette[0], group.palette[1], '400x400'),
        createdAt: isoDaysAgo(group.createdDaysAgo, 12, 0),
        updatedAt: isoDaysAgo(Math.max(1, group.createdDaysAgo - 2), 16, 45),
    }))
}

async function seedGroupsAndMemberships(client, groups, userIds) {
    await insertBatched(
        client,
        'groups',
        groups.map((group) => ({
            id: group.id,
            name: group.name,
            description: group.description,
            avatar_url: group.avatarUrl,
            created_by: group.createdById,
            created_at: group.createdAt,
            updated_at: group.updatedAt,
        }))
    )

    const groupMap = stableIdMap(groups)
    const memberRows = GROUP_MEMBERSHIPS.map((item) => ({
        group_id: requireEntity(groupMap, item.group, 'group').id,
        user_id: userIds.get(item.user),
        role: item.role,
        joined_at: isoDaysAgo(item.daysAgo, 13, 15),
    }))
    await upsertBatched(client, 'group_members', memberRows, 'group_id,user_id')

    const permissionRows = [
        {
            id: randomUUID(),
            group_id: requireEntity(groupMap, 'launch-house', 'group').id,
            user_id: userIds.get('bruno'),
            can_manage_debts: false,
            can_manage_music: true,
            can_manage_files: true,
            can_manage_members: false,
            updated_by: userIds.get('lucia'),
            updated_at: isoDaysAgo(15, 18, 20),
        },
        {
            id: randomUUID(),
            group_id: requireEntity(groupMap, 'balance-club', 'group').id,
            user_id: userIds.get('alma'),
            can_manage_debts: true,
            can_manage_music: false,
            can_manage_files: true,
            can_manage_members: true,
            updated_by: userIds.get('nova'),
            updated_at: isoDaysAgo(10, 17, 5),
        },
        {
            id: randomUUID(),
            group_id: requireEntity(groupMap, 'late-checkout', 'group').id,
            user_id: userIds.get('mateo'),
            can_manage_debts: true,
            can_manage_music: true,
            can_manage_files: true,
            can_manage_members: true,
            updated_by: userIds.get('alma'),
            updated_at: isoDaysAgo(12, 14, 0),
        },
        {
            id: randomUUID(),
            group_id: requireEntity(groupMap, 'neon-basement', 'group').id,
            user_id: userIds.get('sofia'),
            can_manage_debts: false,
            can_manage_music: true,
            can_manage_files: false,
            can_manage_members: true,
            updated_by: userIds.get('mateo'),
            updated_at: isoDaysAgo(18, 19, 10),
        },
    ]
    await upsertBatched(client, 'group_member_permissions', permissionRows, 'group_id,user_id')

    return groupMap
}

async function seedInvitationsAndSocial(client, groupMap, userIds) {
    await insertBatched(
        client,
        'group_invitations',
        GROUP_INVITATIONS.map((item) => ({
            id: randomUUID(),
            group_id: requireEntity(groupMap, item.group, 'group').id,
            invited_by: userIds.get(item.invitedBy),
            invited_user_id: userIds.get(item.invitedUser),
            status: item.status,
            message: item.message,
            created_at: isoDaysAgo(item.createdDaysAgo, 10, 0),
            responded_at: item.respondedDaysAgo == null ? null : isoDaysAgo(item.respondedDaysAgo, 16, 0),
        }))
    )

    const friendRequestRows = FRIEND_REQUESTS.map((item) => ({
        id: randomUUID(),
        from_user_id: userIds.get(item.from),
        to_user_id: userIds.get(item.to),
        status: item.status,
        message: item.message,
        created_at: isoDaysAgo(item.createdDaysAgo, 11, 30),
        responded_at: item.respondedDaysAgo == null ? null : isoDaysAgo(item.respondedDaysAgo, 15, 45),
    }))
    await insertBatched(client, 'friend_requests', friendRequestRows)

    await insertBatched(
        client,
        'friendships',
        friendRequestRows
            .filter((row) => row.status === 'accepted')
            .map((row) => {
                const [userA, userB] = pairUsers(row.from_user_id, row.to_user_id)
                return {
                    id: randomUUID(),
                    user_a: userA,
                    user_b: userB,
                    created_from_request: row.id,
                    created_at: row.responded_at ?? row.created_at,
                }
            })
    )

    await insertBatched(
        client,
        'group_friend_requests',
        GROUP_FRIEND_REQUESTS.map((item) => ({
            id: randomUUID(),
            group_id: requireEntity(groupMap, item.group, 'group').id,
            from_user_id: userIds.get(item.from),
            to_user_id: userIds.get(item.to),
            status: item.status,
            created_at: isoDaysAgo(item.createdDaysAgo, 12, 15),
            responded_at: item.respondedDaysAgo == null ? null : isoDaysAgo(item.respondedDaysAgo, 17, 5),
        }))
    )
}

function buildSongs(groupMap, userIds) {
    const groupBlueprintMap = stableIdMap(GROUP_BLUEPRINTS)

    return SONG_BLUEPRINTS.map((song, index) => {
        const group = requireEntity(groupBlueprintMap, song.group, 'group blueprint')
        const runtimeGroup = requireEntity(groupMap, song.group, 'group')

        return {
            ...song,
            id: randomUUID(),
            groupId: runtimeGroup.id,
            uploadedById: userIds.get(song.user),
            audioUrl: AUDIO_URLS[index % AUDIO_URLS.length],
            coverUrl: song.noCover ? null : makePlaceholderImage(song.title, group.palette[0], group.palette[1]),
            createdAt: isoDaysAgo(song.daysAgo, 22 - (index % 4), 10 + (index % 20)),
            fileSize: 4_800_000 + index * 13_421,
        }
    })
}

function buildLyricsRows(songs) {
    const lyricRows = []
    const lineRows = []

    for (const [index, song] of songs.filter((_, itemIndex) => itemIndex < 6).entries()) {
        lyricRows.push({
            id: randomUUID(),
            song_id: song.id,
            raw_text: `${song.title}\nWe left the lights half on\nCounted every open tab\nStill made it to the chorus`,
            language: 'en',
            source: 'manual',
            is_auto_generated: false,
            confidence: null,
            updated_by: song.uploadedById,
            created_at: isoDaysAgo(song.daysAgo - 1, 19, 0),
            updated_at: isoDaysAgo(song.daysAgo - 1, 19, 15),
        })

        const baseStart = 12 + index
        ;[
            [0, song.title, baseStart, baseStart + 4.2],
            [1, 'We left the lights half on', baseStart + 4.2, baseStart + 8.8],
            [2, 'Counted every open tab', baseStart + 8.8, baseStart + 13.4],
            [3, 'Still made it to the chorus', baseStart + 13.4, baseStart + 18.1],
        ].forEach(([lineIndex, content, startSeconds, endSeconds]) => {
            lineRows.push({
                id: randomUUID(),
                song_id: song.id,
                line_index: lineIndex,
                content,
                start_seconds: startSeconds,
                end_seconds: endSeconds,
                created_at: isoDaysAgo(song.daysAgo - 1, 19, 20 + lineIndex),
            })
        })
    }

    return { lyricRows, lineRows }
}

function buildSongSocialRows(songs, userIds) {
    const membershipsByGroup = new Map()
    for (const membership of GROUP_MEMBERSHIPS) {
        if (!membershipsByGroup.has(membership.group)) membershipsByGroup.set(membership.group, [])
        membershipsByGroup.get(membership.group).push(membership.user)
    }

    const favorites = []
    const likes = []
    const reactions = []
    const comments = []
    const commentLikes = []
    const activityRows = []
    const reactionCycle = ['fire', 'heart', 'headphones']

    songs.forEach((song, index) => {
        if (song.group === 'quiet-drafts') return

        const members = (membershipsByGroup.get(song.group) ?? []).filter((member) => member !== song.user)
        if (members.length === 0) return

        const intensity = song.group === 'launch-house' ? 3 : song.group === 'late-checkout' ? 2 : 1
        const createdDayBase = Math.max(0, song.daysAgo - 1)
        const favoriteUsers = members.slice(0, Math.min(intensity + 1, members.length))
        const likeUsers = members.slice(0, Math.min(intensity + 2, members.length))
        const reactionUsers = members.slice(0, Math.min(intensity + 1, members.length))

        favoriteUsers.forEach((member, memberIndex) => {
            favorites.push({
                id: randomUUID(),
                user_id: userIds.get(member),
                song_id: song.id,
                created_at: isoDaysAgo(createdDayBase, 12 + memberIndex, 10),
            })
        })

        likeUsers.forEach((member, memberIndex) => {
            const createdAt = isoDaysAgo(createdDayBase, 13 + memberIndex, 5)
            likes.push({
                id: randomUUID(),
                song_id: song.id,
                user_id: userIds.get(member),
                created_at: createdAt,
            })

            if (memberIndex === 0) {
                activityRows.push({
                    id: randomUUID(),
                    group_id: song.groupId,
                    actor_id: userIds.get(member),
                    action_type: 'song_liked',
                    song_id: song.id,
                    comment_id: null,
                    payload: { title: song.title, artistName: song.artist },
                    created_at: createdAt,
                })
            }
        })

        reactionUsers.forEach((member, memberIndex) => {
            const reaction = reactionCycle[(index + memberIndex) % reactionCycle.length]
            const createdAt = isoDaysAgo(createdDayBase, 15 + memberIndex, 12)
            reactions.push({
                id: randomUUID(),
                song_id: song.id,
                user_id: userIds.get(member),
                reaction,
                created_at: createdAt,
            })

            if (memberIndex === 0) {
                activityRows.push({
                    id: randomUUID(),
                    group_id: song.groupId,
                    actor_id: userIds.get(member),
                    action_type: 'song_reacted',
                    song_id: song.id,
                    comment_id: null,
                    payload: { title: song.title, reaction },
                    created_at: createdAt,
                })
            }
        })

        const primaryCommenter = members[index % members.length]
        const primaryCommentId = randomUUID()
        const primaryCommentCreatedAt = isoDaysAgo(createdDayBase, 18, (index % 40) + 5)
        comments.push({
            id: primaryCommentId,
            song_id: song.id,
            user_id: userIds.get(primaryCommenter),
            body: COMMENT_TEMPLATES[index % COMMENT_TEMPLATES.length],
            parent_id: null,
            created_at: primaryCommentCreatedAt,
            updated_at: primaryCommentCreatedAt,
        })
        activityRows.push({
            id: randomUUID(),
            group_id: song.groupId,
            actor_id: userIds.get(primaryCommenter),
            action_type: 'song_commented',
            song_id: song.id,
            comment_id: primaryCommentId,
            payload: {
                title: song.title,
                preview: COMMENT_TEMPLATES[index % COMMENT_TEMPLATES.length],
            },
            created_at: primaryCommentCreatedAt,
        })

        if (members.length > 1 && index % 3 === 0) {
            const replyAuthor = members[(index + 1) % members.length]
            const replyCreatedAt = isoDaysAgo(createdDayBase, 19, (index % 40) + 15)
            comments.push({
                id: randomUUID(),
                song_id: song.id,
                user_id: userIds.get(replyAuthor),
                body: 'Leaving this here so we do not lose the current version.',
                parent_id: primaryCommentId,
                created_at: replyCreatedAt,
                updated_at: replyCreatedAt,
            })
        }

        const likerForComment = likeUsers[0]
        if (likerForComment) {
            commentLikes.push({
                id: randomUUID(),
                comment_id: primaryCommentId,
                user_id: userIds.get(likerForComment),
                created_at: isoDaysAgo(createdDayBase, 20, (index % 40) + 3),
            })
        }
    })

    return { favorites, likes, reactions, comments, commentLikes, activityRows }
}

async function seedSongs(client, songs) {
    await insertBatched(
        client,
        'songs',
        songs.map((song) => ({
            id: song.id,
            group_id: song.groupId,
            uploaded_by: song.uploadedById,
            title: song.title,
            artist_name: song.artist,
            album_name: song.album,
            cover_url: song.coverUrl,
            audio_url: song.audioUrl,
            duration_seconds: song.duration,
            file_size: song.fileSize,
            mime_type: 'audio/mpeg',
            created_at: song.createdAt,
        }))
    )

    for (const song of songs) {
        const { error } = await client
            .from('group_activity')
            .update({ created_at: song.createdAt })
            .eq('song_id', song.id)
            .eq('action_type', 'song_uploaded')

        if (error) throw new Error(`[group_activity] ${error.message}`)
    }
}

async function seedSongOwners(client, songs, userIds) {
    const songMap = stableIdMap(songs)
    await insertBatched(
        client,
        'song_owners',
        SONG_EXTRA_OWNERS.map((item) => ({
            song_id: requireEntity(songMap, item.song, 'song').id,
            user_id: userIds.get(item.user),
            role: item.role,
            added_by: userIds.get(item.addedBy),
            created_at: isoDaysAgo(item.daysAgo, 19, 0),
        }))
    )
}

async function seedPlaylists(client, playlists, songMap, groupMap, userIds) {
    await insertBatched(
        client,
        'playlists',
        playlists.map((playlist) => ({
            id: playlist.id,
            group_id: requireEntity(groupMap, playlist.group, 'group').id,
            created_by: userIds.get(playlist.creator),
            name: playlist.name,
            description: playlist.description,
            cover_url: makePlaceholderImage(playlist.name, '111827', 'f8fafc'),
            created_at: isoDaysAgo(playlist.daysAgo, 12, 0),
            updated_at: isoDaysAgo(Math.max(0, playlist.daysAgo - 1), 18, 0),
        }))
    )

    const playlistSongRows = []
    playlists.forEach((playlist) => {
        playlist.songSlugs.forEach((songSlug, index) => {
            playlistSongRows.push({
                id: randomUUID(),
                playlist_id: playlist.id,
                song_id: requireEntity(songMap, songSlug, 'song').id,
                position: index,
                added_by: userIds.get(playlist.creator),
                added_at: isoDaysAgo(Math.max(0, playlist.daysAgo - 1), 14, index + 5),
            })
        })
    })

    await insertBatched(client, 'playlist_songs', playlistSongRows)
}

async function seedDebts(client, debtRows, paymentRows, groupMap, userIds) {
    await insertBatched(
        client,
        'debts',
        debtRows.map((debt) => ({
            id: debt.id,
            group_id: requireEntity(groupMap, debt.group, 'group').id,
            creditor_id: userIds.get(debt.creditor),
            debtor_id: userIds.get(debt.debtor),
            amount: debt.amount,
            amount_paid: debt.amountPaid,
            currency: debt.currency,
            concept: debt.concept,
            status: debt.status,
            created_at: isoDaysAgo(debt.daysAgo, 12, 0),
            updated_at: isoDaysAgo(Math.max(0, debt.daysAgo - 1), 18, 0),
        }))
    )

    await insertBatched(
        client,
        'debt_payments',
        paymentRows.map((payment) => ({
            id: payment.id,
            debt_id: payment.debtId,
            amount: payment.amount,
            note: payment.note,
            paid_by: userIds.get(payment.paidBy),
            created_at: isoDaysAgo(payment.daysAgo, 16, 30),
        }))
    )

    const debtMap = stableIdMap(debtRows)
    await insertBatched(client, 'debt_reminders', [
        {
            id: randomUUID(),
            debt_id: requireEntity(debtMap, 'balance-rent-1', 'debt').id,
            group_id: requireEntity(groupMap, 'balance-club', 'group').id,
            debtor_id: userIds.get('javi'),
            created_by: userIds.get('nova'),
            frequency: 'normal',
            channels: { push: true, email: false, whatsapp: true },
            next_run_at: isoDaysAgo(0, 9, 0),
            last_sent_at: isoDaysAgo(2, 10, 30),
            active: true,
            created_at: isoDaysAgo(10, 8, 0),
            updated_at: isoDaysAgo(2, 10, 30),
        },
        {
            id: randomUUID(),
            debt_id: requireEntity(debtMap, 'checkout-hotel-1', 'debt').id,
            group_id: requireEntity(groupMap, 'late-checkout', 'group').id,
            debtor_id: userIds.get('mateo'),
            created_by: userIds.get('alma'),
            frequency: 'estricto',
            channels: { push: true, email: true, whatsapp: true },
            next_run_at: isoDaysAgo(0, 7, 30),
            last_sent_at: isoDaysAgo(1, 8, 45),
            active: true,
            created_at: isoDaysAgo(20, 9, 0),
            updated_at: isoDaysAgo(1, 8, 45),
        },
    ])

    await insertBatched(client, 'debt_installments', [
        {
            id: randomUUID(),
            debt_id: requireEntity(debtMap, 'balance-rent-1', 'debt').id,
            installment_number: 1,
            amount: 40,
            due_date: '2026-03-05',
            status: 'overdue',
            paid_at: null,
            created_at: isoDaysAgo(12, 10, 0),
        },
        {
            id: randomUUID(),
            debt_id: requireEntity(debtMap, 'balance-rent-1', 'debt').id,
            installment_number: 2,
            amount: 40,
            due_date: '2026-04-05',
            status: 'pending',
            paid_at: null,
            created_at: isoDaysAgo(12, 10, 2),
        },
        {
            id: randomUUID(),
            debt_id: requireEntity(debtMap, 'balance-rent-1', 'debt').id,
            installment_number: 3,
            amount: 40,
            due_date: '2026-05-05',
            status: 'pending',
            paid_at: null,
            created_at: isoDaysAgo(12, 10, 4),
        },
        {
            id: randomUUID(),
            debt_id: requireEntity(debtMap, 'checkout-hotel-1', 'debt').id,
            installment_number: 1,
            amount: 70,
            due_date: '2026-02-28',
            status: 'paid',
            paid_at: isoDaysAgo(23, 16, 30),
            created_at: isoDaysAgo(27, 10, 0),
        },
        {
            id: randomUUID(),
            debt_id: requireEntity(debtMap, 'checkout-hotel-1', 'debt').id,
            installment_number: 2,
            amount: 70,
            due_date: '2026-03-28',
            status: 'pending',
            paid_at: null,
            created_at: isoDaysAgo(27, 10, 3),
        },
        {
            id: randomUUID(),
            debt_id: requireEntity(debtMap, 'checkout-hotel-1', 'debt').id,
            installment_number: 3,
            amount: 70,
            due_date: '2026-04-28',
            status: 'pending',
            paid_at: null,
            created_at: isoDaysAgo(27, 10, 6),
        },
    ])

    await insertBatched(client, 'group_goals', [
        {
            id: randomUUID(),
            group_id: requireEntity(groupMap, 'balance-club', 'group').id,
            created_by: userIds.get('nova'),
            title: 'Reduce open debt by 30%',
            target_type: 'debt_reduction',
            target_value: 120,
            current_value: 52,
            deadline: '2026-05-20',
            status: 'active',
            created_at: isoDaysAgo(20, 11, 0),
            updated_at: isoDaysAgo(3, 17, 0),
        },
        {
            id: randomUUID(),
            group_id: requireEntity(groupMap, 'balance-club', 'group').id,
            created_by: userIds.get('alma'),
            title: 'Zero overdue by next sprint',
            target_type: 'zero_overdue',
            target_value: 0,
            current_value: 1,
            deadline: '2026-04-25',
            status: 'active',
            created_at: isoDaysAgo(14, 10, 0),
            updated_at: isoDaysAgo(2, 16, 30),
        },
        {
            id: randomUUID(),
            group_id: requireEntity(groupMap, 'late-checkout', 'group').id,
            created_by: userIds.get('alma'),
            title: 'Close minibar backlog',
            target_type: 'custom',
            target_value: 100,
            current_value: 65,
            deadline: '2026-04-18',
            status: 'active',
            created_at: isoDaysAgo(13, 13, 0),
            updated_at: isoDaysAgo(5, 14, 30),
        },
    ])

    await insertBatched(client, 'user_badges', [
        {
            id: randomUUID(),
            group_id: requireEntity(groupMap, 'balance-club', 'group').id,
            user_id: userIds.get('alma'),
            badge_key: 'cleanup_captain',
            badge_label: 'Cleanup Captain',
            payload: { streak: 3, reason: 'Closed three debt threads in a row' },
            awarded_at: isoDaysAgo(6, 18, 0),
        },
        {
            id: randomUUID(),
            group_id: requireEntity(groupMap, 'launch-house', 'group').id,
            user_id: userIds.get('lucia'),
            badge_key: 'playlist_engine',
            badge_label: 'Playlist Engine',
            payload: { playlists: 3 },
            awarded_at: isoDaysAgo(9, 18, 10),
        },
        {
            id: randomUUID(),
            group_id: requireEntity(groupMap, 'late-checkout', 'group').id,
            user_id: userIds.get('mateo'),
            badge_key: 'first_transfer',
            badge_label: 'First Transfer',
            payload: { amount: 60 },
            awarded_at: isoDaysAgo(23, 17, 45),
        },
    ])
}

async function seedFiles(client, groupMap, userIds) {
    const rows = FILE_BLUEPRINTS.map((file) => ({
        id: randomUUID(),
        group_id: requireEntity(groupMap, file.group, 'group').id,
        uploaded_by: userIds.get(file.user),
        name: file.name,
        file_url: file.fileUrl,
        file_size: file.fileSize,
        mime_type: file.mimeType,
        category: file.category,
        created_at: isoDaysAgo(file.daysAgo, 15, 0),
    }))

    await insertBatched(client, 'files', rows)
    return rows
}

async function seedReports(client, reports, groupMap, userIds) {
    await insertBatched(
        client,
        'reports',
        reports.map((report) => ({
            id: report.id,
            group_id: requireEntity(groupMap, report.group, 'group').id,
            user_id: userIds.get(report.user),
            title: report.title,
            description: report.description,
            type: report.type,
            steps: report.reproductionSteps,
            reproduction_steps: report.reproductionSteps,
            severity: report.severity,
            image_url: report.imageIndex == null ? null : REPORT_IMAGE_URLS[report.imageIndex],
            status: report.status,
            created_at: isoDaysAgo(report.daysAgo, 12, 0),
            updated_at: isoDaysAgo(Math.max(0, report.daysAgo - 1), 17, 0),
        }))
    )
}

async function seedChangelog(client, entries, groupMap, userIds) {
    await insertBatched(
        client,
        'changelog_entries',
        entries.map((entry) => ({
            id: entry.id,
            group_id: requireEntity(groupMap, entry.group, 'group').id,
            version: entry.version,
            title: entry.title,
            description: entry.description,
            type: entry.type,
            created_by: userIds.get(entry.user),
            release_date: isoDaysAgo(entry.releaseDaysAgo, 12, 0).slice(0, 10),
            created_at: isoDaysAgo(entry.releaseDaysAgo, 12, 5),
        }))
    )
}

async function seedNotifications(client, groupMap, userIds, entityRefs) {
    await insertBatched(
        client,
        'notifications',
        NOTIFICATION_BLUEPRINTS.map((item) => ({
            id: randomUUID(),
            user_id: userIds.get(item.user),
            group_id: requireEntity(groupMap, item.group, 'group').id,
            type: item.type,
            title: item.title,
            body: item.body,
            read: false,
            resource_type: item.resourceType,
            resource_id: entityRefs[item.resourceType]?.get(item.resource) ?? null,
            created_at: isoDaysAgo(item.daysAgo, 9, 0),
        }))
    )
}

async function main() {
    const config = getSeedConfig()
    const client = createServiceClient()
    const shouldClean = args.has('--clean')

    logStep(`Using Supabase project at ${config.supabaseUrl}`)
    if (shouldClean) {
        await resetQaSeed(client, config.emailDomain)
    } else {
        await assertNamespaceIsClean(client, config.emailDomain)
    }

    const users = buildUsers(config.emailDomain)
    const userIds = await createAuthUsers(client, users, config.defaultPassword)
    await seedProfiles(client, users, userIds)

    logStep('Creating admin role bootstrap.')
    await insertBatched(client, 'user_roles', [
        {
            id: randomUUID(),
            user_id: userIds.get('nova'),
            role: 'admin',
            created_by: userIds.get('nova'),
            created_at: isoDaysAgo(12, 10, 0),
        },
    ])

    logStep('Creating QA groups, memberships and permissions.')
    const groups = buildGroups(userIds)
    const groupMap = await seedGroupsAndMemberships(client, groups, userIds)

    logStep('Creating invitations and social graph.')
    await seedInvitationsAndSocial(client, groupMap, userIds)

    logStep('Creating music catalog and upload activity.')
    const songs = buildSongs(groupMap, userIds)
    await seedSongs(client, songs)
    await seedSongOwners(client, songs, userIds)

    const { lyricRows, lineRows } = buildLyricsRows(songs)
    await insertBatched(client, 'song_lyrics', lyricRows)
    await insertBatched(client, 'song_lyric_lines', lineRows)

    const socialRows = buildSongSocialRows(songs, userIds)
    await insertBatched(client, 'favorites', socialRows.favorites)
    await insertBatched(client, 'song_likes', socialRows.likes)
    await insertBatched(client, 'song_reactions', socialRows.reactions)
    await insertBatched(client, 'song_comments', socialRows.comments)
    await insertBatched(client, 'song_comment_likes', socialRows.commentLikes)
    await insertBatched(client, 'group_activity', socialRows.activityRows)

    logStep('Creating playlists and favorites context.')
    const songMap = stableIdMap(songs)
    const playlists = PLAYLIST_BLUEPRINTS.map((playlist) => ({ ...playlist, id: randomUUID() }))
    await seedPlaylists(client, playlists, songMap, groupMap, userIds)

    logStep('Creating debts, payments and finance-pro records.')
    const debtRows = DEBT_BLUEPRINTS.map((debt) => ({ ...debt, id: randomUUID() }))
    const debtMap = stableIdMap(debtRows)
    const paymentRows = PAYMENT_BLUEPRINTS.map((payment) => ({
        ...payment,
        id: randomUUID(),
        debtId: requireEntity(debtMap, payment.debt, 'debt').id,
    }))
    await seedDebts(client, debtRows, paymentRows, groupMap, userIds)

    logStep('Creating files, reports and changelog entries.')
    const files = await seedFiles(client, groupMap, userIds)
    const reports = REPORT_BLUEPRINTS.map((report) => ({ ...report, id: randomUUID() }))
    await seedReports(client, reports, groupMap, userIds)
    const changelogEntries = CHANGELOG_BLUEPRINTS.map((entry) => ({ ...entry, id: randomUUID() }))
    await seedChangelog(client, changelogEntries, groupMap, userIds)

    logStep('Creating backend notifications for QA completeness.')
    await seedNotifications(client, groupMap, userIds, {
        song: new Map(songs.map((song) => [song.slug, song.id])),
        playlist: new Map(playlists.map((playlist) => [playlist.slug, playlist.id])),
        debt: new Map(debtRows.map((debt) => [debt.slug, debt.id])),
        file: new Map(files.map((file) => [file.name, file.id])),
    })

    const summary = {
        users: users.length,
        adminUsers: users.filter((user) => user.admin).length,
        groups: groups.length,
        memberships: GROUP_MEMBERSHIPS.length,
        invitations: GROUP_INVITATIONS.length,
        friendRequests: FRIEND_REQUESTS.length,
        friendships: FRIEND_REQUESTS.filter((item) => item.status === 'accepted').length,
        groupFriendRequests: GROUP_FRIEND_REQUESTS.length,
        songs: songs.length,
        songOwners: SONG_EXTRA_OWNERS.length + songs.length,
        lyrics: lyricRows.length,
        playlists: playlists.length,
        favorites: socialRows.favorites.length,
        songLikes: socialRows.likes.length,
        reactions: socialRows.reactions.length,
        comments: socialRows.comments.length,
        commentLikes: socialRows.commentLikes.length,
        debts: debtRows.length,
        payments: paymentRows.length,
        reports: reports.length,
        changelogEntries: changelogEntries.length,
        files: files.length,
        notifications: NOTIFICATION_BLUEPRINTS.length,
    }

    process.stdout.write('\n[qa-seed] QA dataset created successfully.\n')
    Object.entries(summary).forEach(([key, value]) => {
        process.stdout.write(`[qa-seed]   ${key}: ${value}\n`)
    })
    process.stdout.write(`[qa-seed] Admin login: ${qaEmail('nova-admin', config.emailDomain)}\n`)
    process.stdout.write(`[qa-seed] Default password: ${config.defaultPassword}\n`)
    process.stdout.write(
        '[qa-seed] Edge scenarios included: user without groups, owner-only group, empty playlist, song without cover, incomplete profile, partial/full debts, report without image, quiet user, high-activity group.\n'
    )
}

main().catch((error) => {
    process.stderr.write(`[qa-seed] Seed failed: ${error instanceof Error ? error.message : String(error)}\n`)
    process.exitCode = 1
})
