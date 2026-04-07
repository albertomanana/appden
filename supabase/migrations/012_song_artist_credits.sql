-- ============================================================
-- The Appden - Song artist credits
-- Migration 012
-- ============================================================
--
-- Why this exists:
-- - `songs.artist_name` is not enough for real credits.
-- - We need one or many artists per song.
-- - A credit can point to an existing profile or to a free-text artist.
--
-- Compatibility:
-- - `songs.artist_name` remains as the denormalized summary used by legacy UI.
-- - New UI writes both the summary and the normalized credits rows.

ALTER TABLE songs
    DROP CONSTRAINT IF EXISTS songs_artist_name_check;

ALTER TABLE songs
    ADD CONSTRAINT songs_artist_name_check
    CHECK (length(artist_name) BETWEEN 1 AND 200);

CREATE TABLE IF NOT EXISTS song_artist_credits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    song_id UUID NOT NULL REFERENCES songs(id) ON DELETE CASCADE,
    position INTEGER NOT NULL DEFAULT 0 CHECK (position >= 0),
    profile_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    artist_name TEXT CHECK (artist_name IS NULL OR length(artist_name) BETWEEN 1 AND 100),
    added_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT song_artist_credits_identity_check CHECK (
        profile_id IS NOT NULL OR artist_name IS NOT NULL
    ),
    CONSTRAINT song_artist_credits_song_position_unique UNIQUE (song_id, position)
);

CREATE INDEX IF NOT EXISTS idx_song_artist_credits_song
    ON song_artist_credits(song_id, position);

CREATE INDEX IF NOT EXISTS idx_song_artist_credits_profile
    ON song_artist_credits(profile_id);

ALTER TABLE song_artist_credits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "song_artist_credits_select_group_member" ON song_artist_credits;
CREATE POLICY "song_artist_credits_select_group_member" ON song_artist_credits
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1
            FROM songs s
            JOIN group_members gm ON gm.group_id = s.group_id
            WHERE s.id = song_artist_credits.song_id
              AND gm.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "song_artist_credits_insert_uploader" ON song_artist_credits;
CREATE POLICY "song_artist_credits_insert_uploader" ON song_artist_credits
    FOR INSERT
    WITH CHECK (
        COALESCE(song_artist_credits.added_by, auth.uid()) = auth.uid()
        AND EXISTS (
            SELECT 1
            FROM songs s
            WHERE s.id = song_artist_credits.song_id
              AND s.uploaded_by = auth.uid()
        )
    );

DROP POLICY IF EXISTS "song_artist_credits_update_uploader" ON song_artist_credits;
CREATE POLICY "song_artist_credits_update_uploader" ON song_artist_credits
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1
            FROM songs s
            WHERE s.id = song_artist_credits.song_id
              AND s.uploaded_by = auth.uid()
        )
    )
    WITH CHECK (
        COALESCE(song_artist_credits.added_by, auth.uid()) = auth.uid()
        AND EXISTS (
            SELECT 1
            FROM songs s
            WHERE s.id = song_artist_credits.song_id
              AND s.uploaded_by = auth.uid()
        )
    );

DROP POLICY IF EXISTS "song_artist_credits_delete_uploader" ON song_artist_credits;
CREATE POLICY "song_artist_credits_delete_uploader" ON song_artist_credits
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1
            FROM songs s
            WHERE s.id = song_artist_credits.song_id
              AND s.uploaded_by = auth.uid()
        )
    );
