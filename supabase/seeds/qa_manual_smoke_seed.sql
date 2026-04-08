-- ============================================================
-- The Appden - QA manual smoke seed
-- ============================================================
--
-- Purpose:
-- - Create temporary, realistic QA data without needing SUPABASE_SERVICE_ROLE_KEY.
-- - Run directly in Supabase SQL Editor.
-- - Reuses existing profiles instead of creating auth.users rows.
--
-- Safety:
-- - Removes any previous seed created with the `QA Temp:` prefix before inserting.
-- - Only deletes:
--   - groups named `QA Temp:%`
--   - global friend requests whose message starts with `QA Temp:`
--
-- Recommended order:
-- 1. Apply migrations 001 -> 012
-- 2. Run `supabase/seeds/qa_manual_smoke_reset.sql` if you want a clean slate
-- 3. Run this file in Supabase SQL Editor
-- 4. Login with any existing user profile
-- 5. Use `docs/QA_MANUAL_SMOKE_ES.md`

BEGIN;

DELETE FROM friend_requests
WHERE message LIKE 'QA Temp:%';

DELETE FROM groups
WHERE name LIKE 'QA Temp:%';

DO $$
DECLARE
    profile_ids UUID[];
    profile_count INTEGER := 0;
    member_id UUID;
    idx INTEGER;

    owner_id UUID;
    admin_id UUID;
    performer_id UUID;
    collaborator_id UUID;
    invitee_id UUID;

    owner_name TEXT;
    admin_name TEXT;
    performer_name TEXT;
    collaborator_name TEXT;

    active_group_id UUID := gen_random_uuid();
    empty_group_id UUID := gen_random_uuid();

    smoke_playlist_id UUID := gen_random_uuid();
    road_playlist_id UUID := gen_random_uuid();
    empty_playlist_id UUID := gen_random_uuid();

    song_1_id UUID := gen_random_uuid();
    song_2_id UUID := gen_random_uuid();
    song_3_id UUID := gen_random_uuid();
    song_4_id UUID := gen_random_uuid();
    song_5_id UUID := gen_random_uuid();
    song_6_id UUID := gen_random_uuid();

    comment_1_id UUID := gen_random_uuid();
    comment_2_id UUID := gen_random_uuid();
    comment_3_id UUID := gen_random_uuid();

    debt_1_id UUID := gen_random_uuid();
    debt_2_id UUID := gen_random_uuid();

    report_1_id UUID := gen_random_uuid();
    report_2_id UUID := gen_random_uuid();
BEGIN
    SELECT COALESCE(array_agg(id ORDER BY created_at ASC), ARRAY[]::UUID[])
    INTO profile_ids
    FROM profiles;

    profile_count := COALESCE(array_length(profile_ids, 1), 0);

    IF profile_count = 0 THEN
        RAISE EXCEPTION 'No hay perfiles en public.profiles. Crea al menos un usuario antes de ejecutar el seed manual.';
    END IF;

    owner_id := profile_ids[1];
    admin_id := CASE WHEN profile_count >= 2 THEN profile_ids[2] ELSE profile_ids[1] END;
    performer_id := CASE WHEN profile_count >= 3 THEN profile_ids[3] ELSE profile_ids[1] END;
    collaborator_id := CASE WHEN profile_count >= 4 THEN profile_ids[4] ELSE admin_id END;
    invitee_id := CASE WHEN profile_count >= 5 THEN profile_ids[5] ELSE NULL END;

    SELECT display_name INTO owner_name FROM profiles WHERE id = owner_id;
    SELECT display_name INTO admin_name FROM profiles WHERE id = admin_id;
    SELECT display_name INTO performer_name FROM profiles WHERE id = performer_id;
    SELECT display_name INTO collaborator_name FROM profiles WHERE id = collaborator_id;

    owner_name := COALESCE(owner_name, 'Owner QA');
    admin_name := COALESCE(admin_name, 'Admin QA');
    performer_name := COALESCE(performer_name, 'Performer QA');
    collaborator_name := COALESCE(collaborator_name, 'Collaborator QA');

    INSERT INTO groups (
        id,
        name,
        description,
        avatar_url,
        created_by,
        created_at,
        updated_at
    )
    VALUES
    (
        active_group_id,
        'QA Temp: Music Smoke',
        'Grupo temporal con musica, playlists, comentarios, deudas y reports para validar la app de punta a punta.',
        'https://placehold.co/512x512/0f172a/e2e8f0.png?text=QA+Music+Smoke',
        owner_id,
        now() - interval '7 days',
        now() - interval '2 hours'
    ),
    (
        empty_group_id,
        'QA Temp: Empty Corners',
        'Grupo temporal para probar estados vacios, playlists vacias e invitaciones pendientes.',
        'https://placehold.co/512x512/1e293b/f8fafc.png?text=QA+Empty+Corners',
        owner_id,
        now() - interval '3 days',
        now() - interval '1 hour'
    );

    FOR idx IN 1..profile_count LOOP
        member_id := profile_ids[idx];

        INSERT INTO group_members (group_id, user_id, role, joined_at)
        VALUES (
            active_group_id,
            member_id,
            CASE
                WHEN member_id = owner_id THEN 'owner'::group_role
                WHEN member_id = admin_id AND admin_id <> owner_id THEN 'admin'::group_role
                ELSE 'member'::group_role
            END,
            now() - make_interval(days => GREATEST(1, 15 - idx))
        )
        ON CONFLICT (group_id, user_id) DO UPDATE
        SET role = EXCLUDED.role;
    END LOOP;

    INSERT INTO group_members (group_id, user_id, role, joined_at)
    VALUES (
        empty_group_id,
        owner_id,
        'owner'::group_role,
        now() - interval '3 days'
    )
    ON CONFLICT (group_id, user_id) DO UPDATE
    SET role = EXCLUDED.role;

    IF admin_id <> owner_id THEN
        INSERT INTO group_members (group_id, user_id, role, joined_at)
        VALUES (
            empty_group_id,
            admin_id,
            'admin'::group_role,
            now() - interval '2 days'
        )
        ON CONFLICT (group_id, user_id) DO UPDATE
        SET role = EXCLUDED.role;
    END IF;

    INSERT INTO group_member_permissions (
        group_id,
        user_id,
        can_manage_debts,
        can_manage_music,
        can_manage_files,
        can_manage_members,
        updated_by,
        updated_at
    )
    VALUES (
        active_group_id,
        owner_id,
        true,
        true,
        true,
        true,
        owner_id,
        now() - interval '1 day'
    )
    ON CONFLICT (group_id, user_id) DO UPDATE
    SET can_manage_debts = EXCLUDED.can_manage_debts,
        can_manage_music = EXCLUDED.can_manage_music,
        can_manage_files = EXCLUDED.can_manage_files,
        can_manage_members = EXCLUDED.can_manage_members,
        updated_by = EXCLUDED.updated_by,
        updated_at = EXCLUDED.updated_at;

    IF admin_id <> owner_id THEN
        INSERT INTO group_member_permissions (
            group_id,
            user_id,
            can_manage_debts,
            can_manage_music,
            can_manage_files,
            can_manage_members,
            updated_by,
            updated_at
        )
        VALUES (
            active_group_id,
            admin_id,
            true,
            true,
            true,
            false,
            owner_id,
            now() - interval '12 hours'
        )
        ON CONFLICT (group_id, user_id) DO UPDATE
        SET can_manage_debts = EXCLUDED.can_manage_debts,
            can_manage_music = EXCLUDED.can_manage_music,
            can_manage_files = EXCLUDED.can_manage_files,
            can_manage_members = EXCLUDED.can_manage_members,
            updated_by = EXCLUDED.updated_by,
            updated_at = EXCLUDED.updated_at;
    END IF;

    INSERT INTO songs (
        id,
        group_id,
        uploaded_by,
        title,
        artist_name,
        album_name,
        cover_url,
        audio_url,
        duration_seconds,
        file_size,
        mime_type,
        created_at
    )
    VALUES
    (
        song_1_id,
        active_group_id,
        owner_id,
        'Midnight Checkpoint',
        owner_name,
        'Launch Tape',
        'https://placehold.co/600x600/0f172a/e2e8f0.png?text=Midnight+Checkpoint',
        'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
        348.00,
        7340032,
        'audio/mpeg',
        now() - interval '6 days'
    ),
    (
        song_2_id,
        active_group_id,
        owner_id,
        'Dockside Echo',
        owner_name || ' & ' || admin_name,
        'Launch Tape',
        'https://placehold.co/600x600/1e293b/f8fafc.png?text=Dockside+Echo',
        'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3',
        301.00,
        6291456,
        'audio/mpeg',
        now() - interval '5 days'
    ),
    (
        song_3_id,
        active_group_id,
        performer_id,
        'Low Battery Lovers',
        performer_name || ' feat. Night Guest',
        'Backstage Drafts',
        'https://placehold.co/600x600/334155/f8fafc.png?text=Low+Battery+Lovers',
        'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3',
        272.00,
        5242880,
        'audio/mpeg',
        now() - interval '4 days'
    ),
    (
        song_4_id,
        active_group_id,
        admin_id,
        'No Cover Club',
        'Analog Ghost',
        'Backstage Drafts',
        NULL,
        'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3',
        255.00,
        4980736,
        'audio/mpeg',
        now() - interval '3 days'
    ),
    (
        song_5_id,
        active_group_id,
        admin_id,
        'Receipt Afterparty',
        admin_name,
        'Balance Sessions',
        'https://placehold.co/600x600/0f766e/f0fdfa.png?text=Receipt+Afterparty',
        'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3',
        221.00,
        4718592,
        'audio/mpeg',
        now() - interval '2 days'
    ),
    (
        song_6_id,
        active_group_id,
        owner_id,
        'Last Train Sync',
        owner_name || ' x ' || collaborator_name,
        'Balance Sessions',
        'https://placehold.co/600x600/7c2d12/fff7ed.png?text=Last+Train+Sync',
        'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-6.mp3',
        287.00,
        5767168,
        'audio/mpeg',
        now() - interval '36 hours'
    );

    INSERT INTO song_owners (song_id, user_id, role, added_by, created_at)
    VALUES
    (song_2_id, admin_id, 'contributor', owner_id, now() - interval '5 days'),
    (song_3_id, performer_id, 'owner', performer_id, now() - interval '4 days'),
    (song_6_id, collaborator_id, 'contributor', owner_id, now() - interval '1 day')
    ON CONFLICT (song_id, user_id) DO UPDATE
    SET role = EXCLUDED.role,
        added_by = EXCLUDED.added_by;

    INSERT INTO song_artist_credits (
        song_id,
        position,
        profile_id,
        artist_name,
        added_by,
        created_at
    )
    VALUES
    (song_1_id, 0, owner_id, NULL, owner_id, now() - interval '6 days'),
    (song_2_id, 0, owner_id, NULL, owner_id, now() - interval '5 days'),
    (song_2_id, 1, admin_id, NULL, owner_id, now() - interval '5 days'),
    (song_3_id, 0, performer_id, NULL, performer_id, now() - interval '4 days'),
    (song_3_id, 1, NULL, 'Night Guest', performer_id, now() - interval '4 days'),
    (song_4_id, 0, NULL, 'Analog Ghost', admin_id, now() - interval '3 days'),
    (song_5_id, 0, admin_id, NULL, admin_id, now() - interval '2 days'),
    (song_6_id, 0, owner_id, NULL, owner_id, now() - interval '36 hours'),
    (song_6_id, 1, collaborator_id, NULL, owner_id, now() - interval '36 hours')
    ON CONFLICT (song_id, position) DO UPDATE
    SET profile_id = EXCLUDED.profile_id,
        artist_name = EXCLUDED.artist_name,
        added_by = EXCLUDED.added_by;

    INSERT INTO song_lyrics (
        song_id,
        raw_text,
        language,
        source,
        is_auto_generated,
        confidence,
        updated_by,
        created_at,
        updated_at,
        is_verified,
        verified_by,
        verified_at
    )
    VALUES (
        song_1_id,
        'A las 02:14 seguimos vivos.' || E'\n' || 'Subimos otra mezcla y por fin cae en tempo.',
        'es',
        'manual',
        false,
        NULL,
        owner_id,
        now() - interval '6 days',
        now() - interval '18 hours',
        true,
        owner_id,
        now() - interval '12 hours'
    );

    INSERT INTO song_lyric_lines (song_id, line_index, content, start_seconds, end_seconds)
    VALUES
    (song_1_id, 0, 'A las 02:14 seguimos vivos.', 0.000, 7.400),
    (song_1_id, 1, 'Subimos otra mezcla y por fin cae en tempo.', 7.401, 15.100);

    INSERT INTO song_lyrics_versions (
        song_id,
        version_number,
        raw_text,
        language,
        source,
        is_auto_generated,
        confidence,
        created_by,
        created_at
    )
    VALUES (
        song_1_id,
        1,
        'A las 02:14 seguimos vivos.' || E'\n' || 'Subimos otra mezcla y por fin cae en tempo.',
        'es',
        'manual',
        false,
        NULL,
        owner_id,
        now() - interval '6 days'
    );

    INSERT INTO song_lyrics_translations (
        song_id,
        language,
        raw_text,
        source,
        updated_by,
        created_at,
        updated_at
    )
    VALUES (
        song_1_id,
        'en',
        'At 2:14 a.m. we are still alive.' || E'\n' || 'We upload one more mix and it finally lands in time.',
        'manual',
        admin_id,
        now() - interval '2 days',
        now() - interval '2 days'
    );

    IF performer_id <> owner_id THEN
        INSERT INTO song_lyrics_proposals (
            song_id,
            proposed_by,
            proposed_raw_text,
            note,
            status,
            reviewed_by,
            reviewed_at,
            created_at
        )
        VALUES (
            song_1_id,
            performer_id,
            'A las 02:14 seguimos firmes.' || E'\n' || 'Subimos otra mezcla y todo encaja mejor.',
            'QA Temp: propuesta para revisar el flujo de letras.',
            'pending',
            NULL,
            NULL,
            now() - interval '10 hours'
        );
    END IF;

    INSERT INTO playlists (
        id,
        group_id,
        created_by,
        name,
        description,
        cover_url,
        created_at,
        updated_at
    )
    VALUES
    (
        smoke_playlist_id,
        active_group_id,
        owner_id,
        'Smoke Rotation',
        'Lista corta para validar cards, detalle, cola y mini player.',
        'https://placehold.co/600x600/0f172a/e2e8f0.png?text=Smoke+Rotation',
        now() - interval '3 days',
        now() - interval '6 hours'
    ),
    (
        road_playlist_id,
        active_group_id,
        admin_id,
        'Road Test Mix',
        'Mezcla con casos de artista multiple, cancion sin portada y orden manual.',
        'https://placehold.co/600x600/334155/f8fafc.png?text=Road+Test+Mix',
        now() - interval '2 days',
        now() - interval '5 hours'
    ),
    (
        empty_playlist_id,
        empty_group_id,
        owner_id,
        'Empty Playlist Check',
        'Playlist vacia para validar estados sin canciones.',
        NULL,
        now() - interval '2 days',
        now() - interval '2 days'
    );

    INSERT INTO playlist_songs (playlist_id, song_id, position, added_by, added_at)
    VALUES
    (smoke_playlist_id, song_1_id, 0, owner_id, now() - interval '3 days'),
    (smoke_playlist_id, song_2_id, 1, owner_id, now() - interval '3 days'),
    (smoke_playlist_id, song_4_id, 2, owner_id, now() - interval '2 days'),
    (road_playlist_id, song_3_id, 0, admin_id, now() - interval '2 days'),
    (road_playlist_id, song_5_id, 1, admin_id, now() - interval '2 days'),
    (road_playlist_id, song_6_id, 2, admin_id, now() - interval '1 day');

    INSERT INTO favorites (user_id, song_id, created_at)
    VALUES
    (owner_id, song_2_id, now() - interval '2 days'),
    (admin_id, song_1_id, now() - interval '2 days'),
    (performer_id, song_1_id, now() - interval '1 day'),
    (performer_id, song_6_id, now() - interval '12 hours')
    ON CONFLICT (user_id, song_id) DO NOTHING;

    INSERT INTO song_likes (song_id, user_id, created_at)
    VALUES
    (song_1_id, admin_id, now() - interval '26 hours'),
    (song_2_id, performer_id, now() - interval '20 hours'),
    (song_6_id, owner_id, now() - interval '8 hours')
    ON CONFLICT (song_id, user_id) DO NOTHING;

    INSERT INTO song_reactions (song_id, user_id, reaction, created_at)
    VALUES
    (song_1_id, performer_id, 'fire', now() - interval '1 day'),
    (song_3_id, owner_id, 'heart', now() - interval '18 hours'),
    (song_6_id, admin_id, 'headphones', now() - interval '4 hours')
    ON CONFLICT (song_id, user_id) DO UPDATE
    SET reaction = EXCLUDED.reaction,
        created_at = EXCLUDED.created_at;

    INSERT INTO song_comments (
        id,
        song_id,
        user_id,
        body,
        parent_id,
        created_at,
        updated_at
    )
    VALUES
    (
        comment_1_id,
        song_1_id,
        admin_id,
        'El arranque ya funciona bien para probar play, pause y seek.',
        NULL,
        now() - interval '22 hours',
        now() - interval '22 hours'
    ),
    (
        comment_2_id,
        song_1_id,
        owner_id,
        'Perfecto. Luego pruebo tambien desde la playlist.',
        comment_1_id,
        now() - interval '21 hours',
        now() - interval '21 hours'
    ),
    (
        comment_3_id,
        song_3_id,
        performer_id,
        'Aqui deberiamos revisar bien como renderiza el segundo artista manual.',
        NULL,
        now() - interval '14 hours',
        now() - interval '14 hours'
    );

    INSERT INTO song_comment_likes (comment_id, user_id, created_at)
    VALUES
    (comment_1_id, owner_id, now() - interval '20 hours'),
    (comment_3_id, admin_id, now() - interval '12 hours')
    ON CONFLICT (comment_id, user_id) DO NOTHING;

    INSERT INTO group_activity (
        group_id,
        actor_id,
        action_type,
        song_id,
        comment_id,
        payload,
        created_at
    )
    VALUES
    (
        active_group_id,
        admin_id,
        'song_liked',
        song_1_id,
        NULL,
        jsonb_build_object('title', 'Midnight Checkpoint'),
        now() - interval '26 hours'
    ),
    (
        active_group_id,
        performer_id,
        'song_reacted',
        song_1_id,
        NULL,
        jsonb_build_object('reaction', 'fire'),
        now() - interval '1 day'
    ),
    (
        active_group_id,
        admin_id,
        'song_commented',
        song_1_id,
        comment_1_id,
        jsonb_build_object('excerpt', 'El arranque ya funciona bien...'),
        now() - interval '22 hours'
    ),
    (
        active_group_id,
        owner_id,
        'lyrics_updated',
        song_1_id,
        NULL,
        jsonb_build_object('language', 'es'),
        now() - interval '18 hours'
    );

    IF profile_count >= 2 AND owner_id <> admin_id THEN
        INSERT INTO debts (
            id,
            group_id,
            creditor_id,
            debtor_id,
            amount,
            currency,
            concept,
            status,
            amount_paid,
            created_at,
            updated_at
        )
        VALUES (
            debt_1_id,
            active_group_id,
            owner_id,
            admin_id,
            48.00,
            'EUR'::debt_currency,
            'Taxi, cables y cena despues del ensayo',
            'partial'::debt_status,
            18.00,
            now() - interval '5 days',
            now() - interval '1 day'
        );

        INSERT INTO debt_payments (
            debt_id,
            amount,
            note,
            paid_by,
            receipt_url,
            receipt_mime_type,
            created_at
        )
        VALUES (
            debt_1_id,
            18.00,
            'Primer pago parcial',
            admin_id,
            'https://placehold.co/1200x800/f8fafc/0f172a.png?text=Receipt+Partial+Payment',
            'image/png',
            now() - interval '1 day'
        );

        INSERT INTO debt_reminders (
            debt_id,
            group_id,
            debtor_id,
            created_by,
            frequency,
            channels,
            next_run_at,
            last_sent_at,
            active,
            created_at,
            updated_at
        )
        VALUES (
            debt_1_id,
            active_group_id,
            admin_id,
            owner_id,
            'normal',
            '{"push": true, "email": false, "whatsapp": true}'::jsonb,
            now() + interval '2 days',
            now() - interval '1 day',
            true,
            now() - interval '4 days',
            now() - interval '1 day'
        );

        INSERT INTO debt_installments (
            debt_id,
            installment_number,
            amount,
            due_date,
            status,
            paid_at,
            created_at
        )
        VALUES
        (
            debt_1_id,
            1,
            18.00,
            current_date - 1,
            'paid',
            now() - interval '1 day',
            now() - interval '5 days'
        ),
        (
            debt_1_id,
            2,
            30.00,
            current_date + 5,
            'pending',
            NULL,
            now() - interval '5 days'
        );
    END IF;

    IF profile_count >= 3 AND performer_id <> owner_id THEN
        INSERT INTO debts (
            id,
            group_id,
            creditor_id,
            debtor_id,
            amount,
            currency,
            concept,
            status,
            amount_paid,
            created_at,
            updated_at
        )
        VALUES (
            debt_2_id,
            active_group_id,
            performer_id,
            owner_id,
            25.00,
            'EUR'::debt_currency,
            'Diseno de portada y entrega final',
            'paid'::debt_status,
            25.00,
            now() - interval '8 days',
            now() - interval '12 hours'
        );

        INSERT INTO debt_payments (
            debt_id,
            amount,
            note,
            paid_by,
            receipt_url,
            receipt_mime_type,
            created_at
        )
        VALUES (
            debt_2_id,
            25.00,
            'Pago completo',
            owner_id,
            'https://placehold.co/1200x800/e2e8f0/0f172a.png?text=Receipt+Full+Payment',
            'image/png',
            now() - interval '12 hours'
        );

        INSERT INTO debt_installments (
            debt_id,
            installment_number,
            amount,
            due_date,
            status,
            paid_at,
            created_at
        )
        VALUES (
            debt_2_id,
            1,
            25.00,
            current_date - 2,
            'paid',
            now() - interval '12 hours',
            now() - interval '8 days'
        );
    END IF;

    INSERT INTO group_goals (
        group_id,
        created_by,
        title,
        target_type,
        target_value,
        current_value,
        deadline,
        status,
        created_at,
        updated_at
    )
    VALUES (
        active_group_id,
        owner_id,
        'Cerrar todas las deudas abiertas del grupo',
        'debt_reduction',
        100.00,
        43.00,
        current_date + 21,
        'active',
        now() - interval '6 days',
        now() - interval '6 hours'
    );

    INSERT INTO user_badges (
        group_id,
        user_id,
        badge_key,
        badge_label,
        payload,
        awarded_at
    )
    VALUES
    (
        active_group_id,
        owner_id,
        'qa-host',
        'QA Host',
        '{"reason": "Seed temporal para smoke testing"}'::jsonb,
        now() - interval '2 days'
    ),
    (
        active_group_id,
        admin_id,
        'fast-payer',
        'Fast Payer',
        '{"reason": "Tiene un pago parcial registrado"}'::jsonb,
        now() - interval '1 day'
    )
    ON CONFLICT (group_id, user_id, badge_key) DO NOTHING;

    INSERT INTO files (
        group_id,
        uploaded_by,
        name,
        file_url,
        file_size,
        mime_type,
        category,
        created_at
    )
    VALUES
    (
        active_group_id,
        owner_id,
        'setlist-tour.pdf',
        'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
        128000,
        'application/pdf',
        'document'::file_category,
        now() - interval '2 days'
    ),
    (
        active_group_id,
        admin_id,
        'notes-room.md',
        'https://raw.githubusercontent.com/github/gitignore/main/README.md',
        4800,
        'text/markdown',
        'document'::file_category,
        now() - interval '36 hours'
    ),
    (
        active_group_id,
        owner_id,
        'stage-reference.png',
        'https://placehold.co/1280x960/0f172a/e2e8f0.png?text=Stage+Reference',
        256000,
        'image/png',
        'image'::file_category,
        now() - interval '18 hours'
    );

    INSERT INTO reports (
        id,
        group_id,
        user_id,
        type,
        title,
        description,
        reproduction_steps,
        steps,
        severity,
        image_url,
        status,
        created_at,
        updated_at
    )
    VALUES
    (
        report_1_id,
        active_group_id,
        owner_id,
        'bug',
        'La biblioteca no refresca despues de subir audio',
        'Tras subir una cancion nueva, la lista principal a veces no la muestra hasta refrescar manualmente la pagina.',
        '1. Abrir musica' || E'\n' || '2. Subir un MP3 valido' || E'\n' || '3. Esperar el toast de exito' || E'\n' || '4. Revisar si aparece en la lista sin recargar',
        '1. Abrir musica' || E'\n' || '2. Subir un MP3 valido' || E'\n' || '3. Esperar el toast de exito' || E'\n' || '4. Revisar si aparece en la lista sin recargar',
        'high',
        'https://placehold.co/1280x720/0f172a/e2e8f0.png?text=QA+Temp+Upload+Regression',
        'open',
        now() - interval '18 hours',
        now() - interval '18 hours'
    ),
    (
        report_2_id,
        active_group_id,
        admin_id,
        'improvement',
        'El detalle de playlist necesita mejor feedback vacio',
        'Cuando una playlist no tiene canciones, el espacio central queda demasiado frio y no invita a anadir contenido.',
        '1. Abrir la playlist vacia de QA' || E'\n' || '2. Revisar mensajes, CTA y espacio disponible',
        '1. Abrir la playlist vacia de QA' || E'\n' || '2. Revisar mensajes, CTA y espacio disponible',
        'low',
        NULL,
        'in_review',
        now() - interval '8 hours',
        now() - interval '4 hours'
    );

    INSERT INTO changelog_entries (
        group_id,
        version,
        title,
        description,
        type,
        created_by,
        release_date,
        created_at
    )
    VALUES
    (
        active_group_id,
        'v1.7.2-qa',
        'Carga de musica simplificada',
        'Se redujo el ruido del player y se dejo el flujo de subida centrado en audio, portada y reproduccion.',
        'improvement',
        owner_id,
        current_date - 3,
        now() - interval '3 days'
    ),
    (
        active_group_id,
        'v1.7.2-qa.1',
        'Soporte para varios artistas',
        'Las canciones ya pueden tener artistas vinculados a perfiles existentes y artistas manuales externos.',
        'feature',
        owner_id,
        current_date - 2,
        now() - interval '2 days'
    ),
    (
        active_group_id,
        'v1.7.2-qa.2',
        'Playlist vacia mas clara',
        'Se deja una playlist vacia preparada para validar estados sin contenido y llamadas a la accion.',
        'fix',
        admin_id,
        current_date - 1,
        now() - interval '1 day'
    );

    INSERT INTO notifications (
        user_id,
        group_id,
        type,
        title,
        body,
        read,
        resource_type,
        resource_id,
        created_at
    )
    VALUES
    (
        owner_id,
        active_group_id,
        'song_added'::notification_type,
        'QA Temp: nueva cancion lista para probar',
        'La biblioteca tiene nuevas canciones semilla para validar reproduccion y playlists.',
        false,
        'song'::shared_link_resource_type,
        song_6_id,
        now() - interval '6 hours'
    ),
    (
        admin_id,
        active_group_id,
        'playlist_created'::notification_type,
        'QA Temp: playlist preparada',
        'Road Test Mix ya esta lista para validar orden y reproduccion desde playlist.',
        false,
        'playlist'::shared_link_resource_type,
        road_playlist_id,
        now() - interval '4 hours'
    );

    IF profile_count >= 2 AND owner_id <> admin_id THEN
        INSERT INTO friend_requests (
            from_user_id,
            to_user_id,
            status,
            message,
            created_at,
            responded_at
        )
        VALUES (
            admin_id,
            owner_id,
            'pending',
            'QA Temp: prueba el flujo de solicitudes globales desde Connections.',
            now() - interval '3 hours',
            NULL
        )
        ON CONFLICT (from_user_id, to_user_id) DO UPDATE
        SET status = EXCLUDED.status,
            message = EXCLUDED.message,
            responded_at = EXCLUDED.responded_at;
    END IF;

    IF profile_count >= 3 AND performer_id <> admin_id THEN
        INSERT INTO group_friend_requests (
            group_id,
            from_user_id,
            to_user_id,
            status,
            created_at,
            responded_at
        )
        VALUES (
            active_group_id,
            performer_id,
            admin_id,
            'pending',
            now() - interval '5 hours',
            NULL
        )
        ON CONFLICT (group_id, from_user_id, to_user_id) DO UPDATE
        SET status = EXCLUDED.status,
            responded_at = EXCLUDED.responded_at;
    END IF;

    IF invitee_id IS NOT NULL AND invitee_id <> owner_id AND invitee_id <> admin_id THEN
        INSERT INTO group_invitations (
            group_id,
            invited_by,
            invited_user_id,
            status,
            message,
            created_at,
            responded_at
        )
        VALUES (
            empty_group_id,
            owner_id,
            invitee_id,
            'pending',
            'QA Temp: invitacion pendiente para validar el flujo de invitaciones y el grupo casi vacio.',
            now() - interval '2 hours',
            NULL
        )
        ON CONFLICT (group_id, invited_user_id) DO UPDATE
        SET status = EXCLUDED.status,
            message = EXCLUDED.message,
            responded_at = EXCLUDED.responded_at;
    END IF;

    RAISE NOTICE 'QA manual seed listo. Grupo activo: %, grupo vacio: %, perfiles usados: %', active_group_id, empty_group_id, profile_count;
END $$;

COMMIT;

SELECT
    g.id,
    g.name,
    g.created_at
FROM groups g
WHERE g.name LIKE 'QA Temp:%'
ORDER BY g.created_at DESC;

