-- ============================================================
-- The Appden - Song Lyrics + Social Layer
-- ============================================================

-- -- Song lyrics (one editable document per song)
CREATE TABLE IF NOT EXISTS song_lyrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    song_id UUID NOT NULL UNIQUE REFERENCES songs(id) ON DELETE CASCADE,
    raw_text TEXT NOT NULL DEFAULT '',
    language TEXT NOT NULL DEFAULT 'es',
    source TEXT NOT NULL DEFAULT 'manual' CHECK (source IN ('manual', 'auto')),
    is_auto_generated BOOLEAN NOT NULL DEFAULT false,
    confidence NUMERIC(4, 3),
    updated_by UUID NOT NULL REFERENCES profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_song_lyrics_song_id ON song_lyrics(song_id);

-- -- Timed lyric lines (for synced display)
CREATE TABLE IF NOT EXISTS song_lyric_lines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    song_id UUID NOT NULL REFERENCES songs(id) ON DELETE CASCADE,
    line_index INTEGER NOT NULL CHECK (line_index >= 0),
    content TEXT NOT NULL,
    start_seconds NUMERIC(10, 3),
    end_seconds NUMERIC(10, 3),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(song_id, line_index)
);

CREATE INDEX IF NOT EXISTS idx_song_lyric_lines_song_id
    ON song_lyric_lines(song_id, line_index);
CREATE INDEX IF NOT EXISTS idx_song_lyric_lines_song_time
    ON song_lyric_lines(song_id, start_seconds);

-- -- Song likes (social reactions independent from favorites)
CREATE TABLE IF NOT EXISTS song_likes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    song_id UUID NOT NULL REFERENCES songs(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(song_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_song_likes_song_id ON song_likes(song_id);
CREATE INDEX IF NOT EXISTS idx_song_likes_user_id ON song_likes(user_id);

-- -- Song comments
CREATE TABLE IF NOT EXISTS song_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    song_id UUID NOT NULL REFERENCES songs(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    body TEXT NOT NULL CHECK (length(body) BETWEEN 1 AND 500),
    parent_id UUID REFERENCES song_comments(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_song_comments_song_id ON song_comments(song_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_song_comments_user_id ON song_comments(user_id);

-- -- updated_at triggers
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger WHERE tgname = 'trg_song_lyrics_updated_at'
    ) THEN
        CREATE TRIGGER trg_song_lyrics_updated_at
            BEFORE UPDATE ON song_lyrics
            FOR EACH ROW EXECUTE FUNCTION update_updated_at();
    END IF;
END$$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger WHERE tgname = 'trg_song_comments_updated_at'
    ) THEN
        CREATE TRIGGER trg_song_comments_updated_at
            BEFORE UPDATE ON song_comments
            FOR EACH ROW EXECUTE FUNCTION update_updated_at();
    END IF;
END$$;

-- ============================================================
-- RLS
-- ============================================================

ALTER TABLE song_lyrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE song_lyric_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE song_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE song_comments ENABLE ROW LEVEL SECURITY;

-- Lyrics: members of song group can read; members can create/update
CREATE POLICY "song_lyrics_select_group_member" ON song_lyrics
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1
            FROM songs s
            JOIN group_members gm ON gm.group_id = s.group_id
            WHERE s.id = song_lyrics.song_id
              AND gm.user_id = auth.uid()
        )
    );

CREATE POLICY "song_lyrics_insert_group_member" ON song_lyrics
    FOR INSERT
    WITH CHECK (
        song_lyrics.updated_by = auth.uid()
        AND EXISTS (
            SELECT 1
            FROM songs s
            JOIN group_members gm ON gm.group_id = s.group_id
            WHERE s.id = song_lyrics.song_id
              AND gm.user_id = auth.uid()
        )
    );

CREATE POLICY "song_lyrics_update_group_member" ON song_lyrics
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1
            FROM songs s
            JOIN group_members gm ON gm.group_id = s.group_id
            WHERE s.id = song_lyrics.song_id
              AND gm.user_id = auth.uid()
        )
    )
    WITH CHECK (song_lyrics.updated_by = auth.uid());

CREATE POLICY "song_lyrics_delete_group_member" ON song_lyrics
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1
            FROM songs s
            JOIN group_members gm ON gm.group_id = s.group_id
            WHERE s.id = song_lyrics.song_id
              AND gm.user_id = auth.uid()
        )
    );

-- Lyric lines: same group visibility/write rules
CREATE POLICY "song_lyric_lines_select_group_member" ON song_lyric_lines
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1
            FROM songs s
            JOIN group_members gm ON gm.group_id = s.group_id
            WHERE s.id = song_lyric_lines.song_id
              AND gm.user_id = auth.uid()
        )
    );

CREATE POLICY "song_lyric_lines_insert_group_member" ON song_lyric_lines
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1
            FROM songs s
            JOIN group_members gm ON gm.group_id = s.group_id
            WHERE s.id = song_lyric_lines.song_id
              AND gm.user_id = auth.uid()
        )
    );

CREATE POLICY "song_lyric_lines_update_group_member" ON song_lyric_lines
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1
            FROM songs s
            JOIN group_members gm ON gm.group_id = s.group_id
            WHERE s.id = song_lyric_lines.song_id
              AND gm.user_id = auth.uid()
        )
    );

CREATE POLICY "song_lyric_lines_delete_group_member" ON song_lyric_lines
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1
            FROM songs s
            JOIN group_members gm ON gm.group_id = s.group_id
            WHERE s.id = song_lyric_lines.song_id
              AND gm.user_id = auth.uid()
        )
    );

-- Likes: group members can read; users can like/unlike for themselves
CREATE POLICY "song_likes_select_group_member" ON song_likes
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1
            FROM songs s
            JOIN group_members gm ON gm.group_id = s.group_id
            WHERE s.id = song_likes.song_id
              AND gm.user_id = auth.uid()
        )
    );

CREATE POLICY "song_likes_insert_own" ON song_likes
    FOR INSERT
    WITH CHECK (
        song_likes.user_id = auth.uid()
        AND EXISTS (
            SELECT 1
            FROM songs s
            JOIN group_members gm ON gm.group_id = s.group_id
            WHERE s.id = song_likes.song_id
              AND gm.user_id = auth.uid()
        )
    );

CREATE POLICY "song_likes_delete_own" ON song_likes
    FOR DELETE
    USING (song_likes.user_id = auth.uid());

-- Comments: group members can read; users can create/update/delete their own comments
CREATE POLICY "song_comments_select_group_member" ON song_comments
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1
            FROM songs s
            JOIN group_members gm ON gm.group_id = s.group_id
            WHERE s.id = song_comments.song_id
              AND gm.user_id = auth.uid()
        )
    );

CREATE POLICY "song_comments_insert_own" ON song_comments
    FOR INSERT
    WITH CHECK (
        song_comments.user_id = auth.uid()
        AND EXISTS (
            SELECT 1
            FROM songs s
            JOIN group_members gm ON gm.group_id = s.group_id
            WHERE s.id = song_comments.song_id
              AND gm.user_id = auth.uid()
        )
    );

CREATE POLICY "song_comments_update_own" ON song_comments
    FOR UPDATE
    USING (song_comments.user_id = auth.uid())
    WITH CHECK (song_comments.user_id = auth.uid());

CREATE POLICY "song_comments_delete_own" ON song_comments
    FOR DELETE
    USING (song_comments.user_id = auth.uid());
