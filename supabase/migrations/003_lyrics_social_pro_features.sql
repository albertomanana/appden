-- ============================================================
-- The Appden - Lyrics Pro + Social Pro + Activity Feed
-- ============================================================

-- ------------------------------------------------------------
-- Lyrics verification metadata
-- ------------------------------------------------------------
ALTER TABLE song_lyrics
    ADD COLUMN IF NOT EXISTS is_verified BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS verified_by UUID REFERENCES profiles(id),
    ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ;

-- ------------------------------------------------------------
-- Lyrics versions (history + rollback)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS song_lyrics_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    song_id UUID NOT NULL REFERENCES songs(id) ON DELETE CASCADE,
    version_number INTEGER NOT NULL CHECK (version_number > 0),
    raw_text TEXT NOT NULL DEFAULT '',
    language TEXT NOT NULL DEFAULT 'es',
    source TEXT NOT NULL DEFAULT 'manual' CHECK (source IN ('manual', 'auto')),
    is_auto_generated BOOLEAN NOT NULL DEFAULT false,
    confidence NUMERIC(4, 3),
    created_by UUID NOT NULL REFERENCES profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(song_id, version_number)
);

CREATE INDEX IF NOT EXISTS idx_song_lyrics_versions_song
    ON song_lyrics_versions(song_id, version_number DESC);

-- ------------------------------------------------------------
-- Lyrics edit proposals by members
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS song_lyrics_proposals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    song_id UUID NOT NULL REFERENCES songs(id) ON DELETE CASCADE,
    proposed_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    proposed_raw_text TEXT NOT NULL,
    note TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    reviewed_by UUID REFERENCES profiles(id),
    reviewed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_song_lyrics_proposals_song_status
    ON song_lyrics_proposals(song_id, status, created_at DESC);

-- ------------------------------------------------------------
-- Lyrics translations
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS song_lyrics_translations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    song_id UUID NOT NULL REFERENCES songs(id) ON DELETE CASCADE,
    language TEXT NOT NULL CHECK (language IN ('es', 'en')),
    raw_text TEXT NOT NULL DEFAULT '',
    source TEXT NOT NULL DEFAULT 'machine' CHECK (source IN ('machine', 'manual')),
    updated_by UUID NOT NULL REFERENCES profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(song_id, language)
);

CREATE INDEX IF NOT EXISTS idx_song_lyrics_translations_song
    ON song_lyrics_translations(song_id, language);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger WHERE tgname = 'trg_song_lyrics_translations_updated_at'
    ) THEN
        CREATE TRIGGER trg_song_lyrics_translations_updated_at
            BEFORE UPDATE ON song_lyrics_translations
            FOR EACH ROW EXECUTE FUNCTION update_updated_at();
    END IF;
END$$;

-- ------------------------------------------------------------
-- Comment likes
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS song_comment_likes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    comment_id UUID NOT NULL REFERENCES song_comments(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(comment_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_song_comment_likes_comment
    ON song_comment_likes(comment_id);

-- ------------------------------------------------------------
-- Quick reactions on songs (single reaction per user/song)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS song_reactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    song_id UUID NOT NULL REFERENCES songs(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    reaction TEXT NOT NULL CHECK (reaction IN ('fire', 'heart', 'headphones')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(song_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_song_reactions_song
    ON song_reactions(song_id, reaction);

-- ------------------------------------------------------------
-- Group activity feed
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS group_activity (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    actor_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    action_type TEXT NOT NULL CHECK (
        action_type IN (
            'song_uploaded',
            'song_liked',
            'song_reacted',
            'song_commented',
            'lyrics_updated',
            'lyrics_proposed',
            'lyrics_verified'
        )
    ),
    song_id UUID REFERENCES songs(id) ON DELETE CASCADE,
    comment_id UUID REFERENCES song_comments(id) ON DELETE CASCADE,
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_group_activity_group_time
    ON group_activity(group_id, created_at DESC);

-- ============================================================
-- RLS
-- ============================================================

ALTER TABLE song_lyrics_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE song_lyrics_proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE song_lyrics_translations ENABLE ROW LEVEL SECURITY;
ALTER TABLE song_comment_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE song_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_activity ENABLE ROW LEVEL SECURITY;

-- Lyrics versions
CREATE POLICY "song_lyrics_versions_select_group_member" ON song_lyrics_versions
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM songs s
            JOIN group_members gm ON gm.group_id = s.group_id
            WHERE s.id = song_lyrics_versions.song_id
              AND gm.user_id = auth.uid()
        )
    );

CREATE POLICY "song_lyrics_versions_insert_group_member" ON song_lyrics_versions
    FOR INSERT
    WITH CHECK (
        song_lyrics_versions.created_by = auth.uid()
        AND EXISTS (
            SELECT 1 FROM songs s
            JOIN group_members gm ON gm.group_id = s.group_id
            WHERE s.id = song_lyrics_versions.song_id
              AND gm.user_id = auth.uid()
        )
    );

-- Lyrics proposals
CREATE POLICY "song_lyrics_proposals_select_group_member" ON song_lyrics_proposals
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM songs s
            JOIN group_members gm ON gm.group_id = s.group_id
            WHERE s.id = song_lyrics_proposals.song_id
              AND gm.user_id = auth.uid()
        )
    );

CREATE POLICY "song_lyrics_proposals_insert_group_member" ON song_lyrics_proposals
    FOR INSERT
    WITH CHECK (
        song_lyrics_proposals.proposed_by = auth.uid()
        AND EXISTS (
            SELECT 1 FROM songs s
            JOIN group_members gm ON gm.group_id = s.group_id
            WHERE s.id = song_lyrics_proposals.song_id
              AND gm.user_id = auth.uid()
        )
    );

CREATE POLICY "song_lyrics_proposals_update_owner_or_author" ON song_lyrics_proposals
    FOR UPDATE
    USING (
        song_lyrics_proposals.proposed_by = auth.uid()
        OR EXISTS (
            SELECT 1 FROM songs s
            WHERE s.id = song_lyrics_proposals.song_id
              AND s.uploaded_by = auth.uid()
        )
    );

-- Lyrics translations
CREATE POLICY "song_lyrics_translations_select_group_member" ON song_lyrics_translations
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM songs s
            JOIN group_members gm ON gm.group_id = s.group_id
            WHERE s.id = song_lyrics_translations.song_id
              AND gm.user_id = auth.uid()
        )
    );

CREATE POLICY "song_lyrics_translations_upsert_group_member" ON song_lyrics_translations
    FOR INSERT
    WITH CHECK (
        song_lyrics_translations.updated_by = auth.uid()
        AND EXISTS (
            SELECT 1 FROM songs s
            JOIN group_members gm ON gm.group_id = s.group_id
            WHERE s.id = song_lyrics_translations.song_id
              AND gm.user_id = auth.uid()
        )
    );

CREATE POLICY "song_lyrics_translations_update_group_member" ON song_lyrics_translations
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM songs s
            JOIN group_members gm ON gm.group_id = s.group_id
            WHERE s.id = song_lyrics_translations.song_id
              AND gm.user_id = auth.uid()
        )
    )
    WITH CHECK (song_lyrics_translations.updated_by = auth.uid());

-- Comment likes
CREATE POLICY "song_comment_likes_select_group_member" ON song_comment_likes
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1
            FROM song_comments sc
            JOIN songs s ON s.id = sc.song_id
            JOIN group_members gm ON gm.group_id = s.group_id
            WHERE sc.id = song_comment_likes.comment_id
              AND gm.user_id = auth.uid()
        )
    );

CREATE POLICY "song_comment_likes_insert_own" ON song_comment_likes
    FOR INSERT
    WITH CHECK (
        song_comment_likes.user_id = auth.uid()
        AND EXISTS (
            SELECT 1
            FROM song_comments sc
            JOIN songs s ON s.id = sc.song_id
            JOIN group_members gm ON gm.group_id = s.group_id
            WHERE sc.id = song_comment_likes.comment_id
              AND gm.user_id = auth.uid()
        )
    );

CREATE POLICY "song_comment_likes_delete_own" ON song_comment_likes
    FOR DELETE
    USING (song_comment_likes.user_id = auth.uid());

-- Song reactions
CREATE POLICY "song_reactions_select_group_member" ON song_reactions
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1
            FROM songs s
            JOIN group_members gm ON gm.group_id = s.group_id
            WHERE s.id = song_reactions.song_id
              AND gm.user_id = auth.uid()
        )
    );

CREATE POLICY "song_reactions_insert_own" ON song_reactions
    FOR INSERT
    WITH CHECK (
        song_reactions.user_id = auth.uid()
        AND EXISTS (
            SELECT 1
            FROM songs s
            JOIN group_members gm ON gm.group_id = s.group_id
            WHERE s.id = song_reactions.song_id
              AND gm.user_id = auth.uid()
        )
    );

CREATE POLICY "song_reactions_update_own" ON song_reactions
    FOR UPDATE
    USING (song_reactions.user_id = auth.uid())
    WITH CHECK (song_reactions.user_id = auth.uid());

CREATE POLICY "song_reactions_delete_own" ON song_reactions
    FOR DELETE
    USING (song_reactions.user_id = auth.uid());

-- Group activity
CREATE POLICY "group_activity_select_group_member" ON group_activity
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM group_members gm
            WHERE gm.group_id = group_activity.group_id
              AND gm.user_id = auth.uid()
        )
    );

CREATE POLICY "group_activity_insert_group_member" ON group_activity
    FOR INSERT
    WITH CHECK (
        group_activity.actor_id = auth.uid()
        AND EXISTS (
            SELECT 1 FROM group_members gm
            WHERE gm.group_id = group_activity.group_id
              AND gm.user_id = auth.uid()
        )
    );
