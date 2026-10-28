-- ============================================================
-- Migration 016 - Albums + song edit permissions
--
-- Safe to run more than once. Apply AFTER 001-015.
--
-- Why this exists:
-- 1. Albums were only free text in `songs.album_name`, so two songs of
--    the same album could not share a cover, a title fix or a page.
--    This adds a real `albums` table scoped to the group and links
--    songs through the nullable `songs.album_id`.
-- 2. `songs` never had an UPDATE policy: editing a song (title, album,
--    artist summary) silently changed nothing. The uploader can now
--    update their own songs.
-- 3. `playlist_songs` had no UPDATE policy (reordering did nothing) and
--    only the playlist creator could remove songs, even the ones a
--    friend had just added by mistake.
--
-- Compatibility:
-- - `songs.album_name` stays as the denormalized title. A trigger keeps
--   it in sync with `album_id` both ways, so old clients that only send
--   `album_name` still end up linked to the right album (it is created
--   on the fly when it does not exist yet).
-- - Album titles are unique per group, case-insensitive.
-- - The app detects when this migration is missing and falls back to
--   grouping songs by `album_name`.
-- ============================================================

-- ------------------------------------------------------------
-- 1. albums table
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS albums (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    title TEXT NOT NULL CHECK (length(btrim(title)) BETWEEN 1 AND 100),
    cover_url TEXT,
    created_by UUID NOT NULL REFERENCES profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS albums_group_title_unique
    ON albums (group_id, lower(title));

CREATE INDEX IF NOT EXISTS idx_albums_group
    ON albums (group_id, created_at DESC);

COMMENT ON TABLE albums
    IS 'Albums of a group. Songs link through songs.album_id; songs.album_name mirrors the title.';

-- ------------------------------------------------------------
-- 2. songs.album_id
-- ------------------------------------------------------------
ALTER TABLE songs
    ADD COLUMN IF NOT EXISTS album_id UUID REFERENCES albums(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_songs_album
    ON songs (album_id);

-- ------------------------------------------------------------
-- 3. RLS for albums
-- ------------------------------------------------------------
ALTER TABLE albums ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "albums_select_group_member" ON albums;
CREATE POLICY "albums_select_group_member" ON albums
    FOR SELECT
    USING (is_group_member(albums.group_id, auth.uid()));

DROP POLICY IF EXISTS "albums_insert_group_member" ON albums;
CREATE POLICY "albums_insert_group_member" ON albums
    FOR INSERT
    WITH CHECK (
        albums.created_by = auth.uid()
        AND is_group_member(albums.group_id, auth.uid())
    );

DROP POLICY IF EXISTS "albums_update_creator_or_manager" ON albums;
CREATE POLICY "albums_update_creator_or_manager" ON albums
    FOR UPDATE
    USING (
        albums.created_by = auth.uid()
        OR is_group_manager(albums.group_id, auth.uid())
    )
    WITH CHECK (is_group_member(albums.group_id, auth.uid()));

DROP POLICY IF EXISTS "albums_delete_creator_or_manager" ON albums;
CREATE POLICY "albums_delete_creator_or_manager" ON albums
    FOR DELETE
    USING (
        albums.created_by = auth.uid()
        OR is_group_manager(albums.group_id, auth.uid())
    );

-- ------------------------------------------------------------
-- 4. Keep songs.album_id <-> songs.album_name in sync
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION sync_song_album()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_title TEXT;
    v_id UUID;
BEGIN
    -- A client that only changed the album name (legacy UI) re-links by name.
    IF TG_OP = 'UPDATE'
       AND NEW.album_id IS NOT DISTINCT FROM OLD.album_id
       AND NEW.album_name IS DISTINCT FROM OLD.album_name THEN
        NEW.album_id := NULL;
    END IF;

    -- Explicit album_id wins: copy its title (and ignore albums of other groups).
    IF NEW.album_id IS NOT NULL THEN
        SELECT a.title INTO v_title
        FROM albums a
        WHERE a.id = NEW.album_id
          AND a.group_id = NEW.group_id;

        IF v_title IS NULL THEN
            NEW.album_id := NULL;
        ELSE
            NEW.album_name := v_title;
            RETURN NEW;
        END IF;
    END IF;

    IF NEW.album_name IS NULL OR btrim(NEW.album_name) = '' THEN
        NEW.album_name := NULL;
        NEW.album_id := NULL;
        RETURN NEW;
    END IF;

    NEW.album_name := btrim(NEW.album_name);

    SELECT a.id, a.title INTO v_id, v_title
    FROM albums a
    WHERE a.group_id = NEW.group_id
      AND lower(a.title) = lower(NEW.album_name)
    LIMIT 1;

    IF v_id IS NULL THEN
        INSERT INTO albums (group_id, title, created_by)
        VALUES (NEW.group_id, NEW.album_name, NEW.uploaded_by)
        ON CONFLICT DO NOTHING
        RETURNING id, title INTO v_id, v_title;

        -- Lost a race with another insert: read the winner.
        IF v_id IS NULL THEN
            SELECT a.id, a.title INTO v_id, v_title
            FROM albums a
            WHERE a.group_id = NEW.group_id
              AND lower(a.title) = lower(NEW.album_name)
            LIMIT 1;
        END IF;
    END IF;

    NEW.album_id := v_id;
    NEW.album_name := COALESCE(v_title, NEW.album_name);
    RETURN NEW;
END;
$$;

COMMENT ON FUNCTION sync_song_album()
    IS 'Links songs to albums by id or by (case-insensitive) title and mirrors the title into songs.album_name.';

DROP TRIGGER IF EXISTS trg_songs_sync_album ON songs;
CREATE TRIGGER trg_songs_sync_album
    BEFORE INSERT OR UPDATE OF album_id, album_name, group_id ON songs
    FOR EACH ROW
    EXECUTE FUNCTION sync_song_album();

-- Renaming an album renames it on every song; deleting it clears the songs.
CREATE OR REPLACE FUNCTION propagate_album_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        UPDATE songs
        SET album_name = NULL
        WHERE album_id = OLD.id;
        RETURN OLD;
    END IF;

    IF NEW.title IS DISTINCT FROM OLD.title THEN
        UPDATE songs
        SET album_name = NEW.title
        WHERE album_id = NEW.id;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_albums_propagate_update ON albums;
CREATE TRIGGER trg_albums_propagate_update
    AFTER UPDATE OF title ON albums
    FOR EACH ROW
    EXECUTE FUNCTION propagate_album_changes();

DROP TRIGGER IF EXISTS trg_albums_propagate_delete ON albums;
CREATE TRIGGER trg_albums_propagate_delete
    BEFORE DELETE ON albums
    FOR EACH ROW
    EXECUTE FUNCTION propagate_album_changes();

-- ------------------------------------------------------------
-- 5. Backfill: one album per distinct album_name per group
-- ------------------------------------------------------------
INSERT INTO albums (group_id, title, created_by, created_at)
SELECT DISTINCT ON (s.group_id, lower(btrim(s.album_name)))
    s.group_id,
    btrim(s.album_name),
    s.uploaded_by,
    s.created_at
FROM songs s
WHERE s.album_name IS NOT NULL
  AND btrim(s.album_name) <> ''
ORDER BY s.group_id, lower(btrim(s.album_name)), s.created_at ASC
ON CONFLICT DO NOTHING;

UPDATE songs s
SET album_id = a.id
FROM albums a
WHERE s.album_id IS NULL
  AND s.album_name IS NOT NULL
  AND btrim(s.album_name) <> ''
  AND a.group_id = s.group_id
  AND lower(a.title) = lower(btrim(s.album_name));

-- ------------------------------------------------------------
-- 6. songs UPDATE policy (editing songs never worked)
-- ------------------------------------------------------------
DROP POLICY IF EXISTS "songs_update_uploader" ON songs;
CREATE POLICY "songs_update_uploader" ON songs
    FOR UPDATE
    USING (songs.uploaded_by = auth.uid())
    WITH CHECK (
        songs.uploaded_by = auth.uid()
        AND is_group_member(songs.group_id, auth.uid())
    );

-- ------------------------------------------------------------
-- 7. playlist_songs: reorder + remove what you added
-- ------------------------------------------------------------
DROP POLICY IF EXISTS "playlist_songs_update_creator" ON playlist_songs;
CREATE POLICY "playlist_songs_update_creator" ON playlist_songs
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM playlists p
            WHERE p.id = playlist_songs.playlist_id
              AND p.created_by = auth.uid()
        )
    );

DROP POLICY IF EXISTS "playlist_songs_delete_added_by" ON playlist_songs;
CREATE POLICY "playlist_songs_delete_added_by" ON playlist_songs
    FOR DELETE
    USING (playlist_songs.added_by = auth.uid());
