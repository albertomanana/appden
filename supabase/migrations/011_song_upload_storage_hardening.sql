-- ============================================================
-- The Appden - Song upload + storage hardening
-- Migration 011
-- ============================================================
--
-- Why this exists:
-- - Song uploads depended on extra client-side inserts after creating `songs`.
-- - Those follow-up requests could fail with 500s while the UI still looked successful.
-- - Storage bucket policies were documented in loose SQL files, but not enforced in the
--   migration chain used for pre-launch environments.
--
-- Strategy:
-- - Ensure the required private storage buckets exist in the canonical migration flow.
-- - Normalize storage policies for avatars, covers, songs and files.
-- - Replace recursive/self-referential `song_owners` policies with SECURITY DEFINER helpers.
-- - Auto-create uploader ownership and upload activity when a song row is inserted.

-- ------------------------------------------------------------
-- Required private storage buckets
-- ------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public)
VALUES
    ('avatars', 'avatars', false),
    ('covers', 'covers', false),
    ('songs', 'songs', false),
    ('files', 'files', false),
    ('reports', 'reports', false)
ON CONFLICT (id) DO NOTHING;

ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------
-- Canonical storage policies
-- ------------------------------------------------------------

-- Avatars
DROP POLICY IF EXISTS "avatars_select_own" ON storage.objects;
DROP POLICY IF EXISTS "avatars_insert_own" ON storage.objects;
DROP POLICY IF EXISTS "avatars_delete_own" ON storage.objects;

CREATE POLICY "avatars_select_own" ON storage.objects
    FOR SELECT
    USING (
        bucket_id = 'avatars'
        AND auth.role() = 'authenticated'
    );

CREATE POLICY "avatars_insert_own" ON storage.objects
    FOR INSERT
    WITH CHECK (
        bucket_id = 'avatars'
        AND auth.role() = 'authenticated'
        AND (storage.foldername(name))[1] = auth.uid()::text
    );

CREATE POLICY "avatars_delete_own" ON storage.objects
    FOR DELETE
    USING (
        bucket_id = 'avatars'
        AND (storage.foldername(name))[1] = auth.uid()::text
    );

-- Covers
DROP POLICY IF EXISTS "music_covers_select_authenticated" ON storage.objects;
DROP POLICY IF EXISTS "music_covers_insert_authenticated" ON storage.objects;
DROP POLICY IF EXISTS "music_covers_delete_own" ON storage.objects;
DROP POLICY IF EXISTS "covers_select_authenticated" ON storage.objects;
DROP POLICY IF EXISTS "covers_insert_authenticated" ON storage.objects;
DROP POLICY IF EXISTS "covers_delete_own" ON storage.objects;

CREATE POLICY "covers_select_authenticated" ON storage.objects
    FOR SELECT
    USING (
        bucket_id = 'covers'
        AND auth.role() = 'authenticated'
    );

CREATE POLICY "covers_insert_authenticated" ON storage.objects
    FOR INSERT
    WITH CHECK (
        bucket_id = 'covers'
        AND auth.role() = 'authenticated'
    );

CREATE POLICY "covers_delete_own" ON storage.objects
    FOR DELETE
    USING (
        bucket_id = 'covers'
        AND auth.role() = 'authenticated'
        AND owner_id = auth.uid()
    );

-- Songs
DROP POLICY IF EXISTS "songs_select_authenticated" ON storage.objects;
DROP POLICY IF EXISTS "songs_insert_authenticated" ON storage.objects;
DROP POLICY IF EXISTS "songs_delete_own" ON storage.objects;

CREATE POLICY "songs_select_authenticated" ON storage.objects
    FOR SELECT
    USING (
        bucket_id = 'songs'
        AND auth.role() = 'authenticated'
    );

CREATE POLICY "songs_insert_authenticated" ON storage.objects
    FOR INSERT
    WITH CHECK (
        bucket_id = 'songs'
        AND auth.role() = 'authenticated'
    );

CREATE POLICY "songs_delete_own" ON storage.objects
    FOR DELETE
    USING (
        bucket_id = 'songs'
        AND auth.role() = 'authenticated'
        AND owner_id = auth.uid()
    );

-- Files
DROP POLICY IF EXISTS "files_select_authenticated" ON storage.objects;
DROP POLICY IF EXISTS "files_insert_authenticated" ON storage.objects;
DROP POLICY IF EXISTS "files_delete_own" ON storage.objects;

CREATE POLICY "files_select_authenticated" ON storage.objects
    FOR SELECT
    USING (
        bucket_id = 'files'
        AND auth.role() = 'authenticated'
    );

CREATE POLICY "files_insert_authenticated" ON storage.objects
    FOR INSERT
    WITH CHECK (
        bucket_id = 'files'
        AND auth.role() = 'authenticated'
    );

CREATE POLICY "files_delete_own" ON storage.objects
    FOR DELETE
    USING (
        bucket_id = 'files'
        AND auth.role() = 'authenticated'
        AND owner_id = auth.uid()
    );

-- ------------------------------------------------------------
-- RLS-safe song ownership helper
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION is_song_owner(
    p_song_id UUID,
    p_user_id UUID DEFAULT auth.uid()
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM songs s
        LEFT JOIN song_owners so
            ON so.song_id = s.id
           AND so.user_id = p_user_id
           AND so.role IN ('owner', 'contributor')
        WHERE s.id = p_song_id
          AND (
              s.uploaded_by = p_user_id
              OR so.user_id IS NOT NULL
          )
    );
$$;

COMMENT ON FUNCTION is_song_owner(UUID, UUID)
    IS 'RLS-safe helper that treats the uploader and explicit song_owners rows as owners.';

GRANT EXECUTE ON FUNCTION is_song_owner(UUID, UUID) TO authenticated;

-- ------------------------------------------------------------
-- song_owners policies without self-recursive checks
-- ------------------------------------------------------------
DROP POLICY IF EXISTS "song_owners_select_group_member" ON song_owners;
DROP POLICY IF EXISTS "song_owners_insert_uploader_or_owner" ON song_owners;
DROP POLICY IF EXISTS "song_owners_delete_uploader_or_owner" ON song_owners;

CREATE POLICY "song_owners_select_group_member" ON song_owners
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1
            FROM songs s
            JOIN group_members gm ON gm.group_id = s.group_id
            WHERE s.id = song_owners.song_id
              AND gm.user_id = auth.uid()
        )
    );

CREATE POLICY "song_owners_insert_uploader_or_owner" ON song_owners
    FOR INSERT
    WITH CHECK (
        COALESCE(song_owners.added_by, auth.uid()) = auth.uid()
        AND EXISTS (
            SELECT 1
            FROM songs s
            WHERE s.id = song_owners.song_id
              AND (
                  s.uploaded_by = auth.uid()
                  OR is_song_owner(s.id, auth.uid())
              )
        )
    );

CREATE POLICY "song_owners_delete_uploader_or_owner" ON song_owners
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1
            FROM songs s
            WHERE s.id = song_owners.song_id
              AND (
                  s.uploaded_by = auth.uid()
                  OR is_song_owner(s.id, auth.uid())
              )
        )
    );

-- ------------------------------------------------------------
-- Post-insert sync for songs
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION handle_song_post_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Keep co-ownership in sync without an extra client-side request.
    BEGIN
        INSERT INTO song_owners (song_id, user_id, role, added_by)
        VALUES (NEW.id, NEW.uploaded_by, 'owner', NEW.uploaded_by)
        ON CONFLICT (song_id, user_id) DO UPDATE
        SET role = 'owner',
            added_by = EXCLUDED.added_by;
    EXCEPTION
        WHEN undefined_table THEN
            NULL;
    END;

    -- Create a group activity row for feed rendering when the table exists.
    BEGIN
        INSERT INTO group_activity (
            group_id,
            actor_id,
            action_type,
            song_id,
            payload
        )
        VALUES (
            NEW.group_id,
            NEW.uploaded_by,
            'song_uploaded',
            NEW.id,
            jsonb_build_object(
                'title', NEW.title,
                'artistName', NEW.artist_name
            )
        );
    EXCEPTION
        WHEN undefined_table THEN
            NULL;
    END;

    RETURN NEW;
END;
$$;

COMMENT ON FUNCTION handle_song_post_insert()
    IS 'After a song insert, sync owner bridge rows and feed activity without relying on client-side follow-up requests.';

DROP TRIGGER IF EXISTS trg_songs_post_insert_sync ON songs;
CREATE TRIGGER trg_songs_post_insert_sync
    AFTER INSERT ON songs
    FOR EACH ROW
    EXECUTE FUNCTION handle_song_post_insert();
