-- ============================================================
-- The Appden - Social hardening + Changelog + Reports
-- Migration 006
-- ============================================================

-- ------------------------------
-- Social indexes (comments/likes/reactions/activity feed)
-- ------------------------------
CREATE INDEX IF NOT EXISTS idx_song_comments_parent_created
    ON song_comments(parent_id, created_at ASC);

CREATE INDEX IF NOT EXISTS idx_song_likes_song_user
    ON song_likes(song_id, user_id);

CREATE INDEX IF NOT EXISTS idx_song_reactions_song_user
    ON song_reactions(song_id, user_id);

CREATE INDEX IF NOT EXISTS idx_group_activity_group_action_time
    ON group_activity(group_id, action_type, created_at DESC);

-- Convenience compatibility view for "activity_feed"
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_views
        WHERE schemaname = 'public' AND viewname = 'activity_feed'
    ) THEN
        EXECUTE 'CREATE VIEW activity_feed AS SELECT * FROM group_activity';
    END IF;
END$$;

-- ------------------------------
-- Changelog (group-private release notes)
-- ------------------------------
CREATE TABLE IF NOT EXISTS changelog_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    version TEXT NOT NULL CHECK (length(version) BETWEEN 1 AND 24),
    title TEXT NOT NULL CHECK (length(title) BETWEEN 1 AND 140),
    description TEXT NOT NULL CHECK (length(description) BETWEEN 1 AND 3000),
    type TEXT NOT NULL CHECK (type IN ('feature', 'fix', 'improvement')),
    created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    release_date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_changelog_entries_group_release
    ON changelog_entries(group_id, release_date DESC, created_at DESC);

ALTER TABLE changelog_entries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "changelog_entries_select_group_member" ON changelog_entries;
CREATE POLICY "changelog_entries_select_group_member" ON changelog_entries
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1
            FROM group_members gm
            WHERE gm.group_id = changelog_entries.group_id
              AND gm.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "changelog_entries_insert_group_owner" ON changelog_entries;
CREATE POLICY "changelog_entries_insert_group_owner" ON changelog_entries
    FOR INSERT
    WITH CHECK (
        changelog_entries.created_by = auth.uid()
        AND EXISTS (
            SELECT 1
            FROM groups g
            WHERE g.id = changelog_entries.group_id
              AND g.created_by = auth.uid()
        )
    );

DROP POLICY IF EXISTS "changelog_entries_update_group_owner" ON changelog_entries;
CREATE POLICY "changelog_entries_update_group_owner" ON changelog_entries
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1
            FROM groups g
            WHERE g.id = changelog_entries.group_id
              AND g.created_by = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1
            FROM groups g
            WHERE g.id = changelog_entries.group_id
              AND g.created_by = auth.uid()
        )
    );

DROP POLICY IF EXISTS "changelog_entries_delete_group_owner" ON changelog_entries;
CREATE POLICY "changelog_entries_delete_group_owner" ON changelog_entries
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1
            FROM groups g
            WHERE g.id = changelog_entries.group_id
              AND g.created_by = auth.uid()
        )
    );

-- ------------------------------
-- Reports (bug/improvement)
-- ------------------------------
CREATE TABLE IF NOT EXISTS reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('bug', 'improvement')),
    description TEXT NOT NULL CHECK (length(description) BETWEEN 10 AND 3000),
    steps TEXT CHECK (steps IS NULL OR length(steps) <= 3000),
    image_url TEXT,
    status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_review', 'resolved', 'closed')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_reports_group_created
    ON reports(group_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_reports_user_created
    ON reports(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_reports_status
    ON reports(group_id, status, created_at DESC);

ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "reports_select_group_member" ON reports;
CREATE POLICY "reports_select_group_member" ON reports
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1
            FROM group_members gm
            WHERE gm.group_id = reports.group_id
              AND gm.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "reports_insert_own_group_member" ON reports;
CREATE POLICY "reports_insert_own_group_member" ON reports
    FOR INSERT
    WITH CHECK (
        reports.user_id = auth.uid()
        AND EXISTS (
            SELECT 1
            FROM group_members gm
            WHERE gm.group_id = reports.group_id
              AND gm.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "reports_update_owner_or_group_owner" ON reports;
CREATE POLICY "reports_update_owner_or_group_owner" ON reports
    FOR UPDATE
    USING (
        reports.user_id = auth.uid()
        OR EXISTS (
            SELECT 1
            FROM groups g
            WHERE g.id = reports.group_id
              AND g.created_by = auth.uid()
        )
    )
    WITH CHECK (
        reports.user_id = auth.uid()
        OR EXISTS (
            SELECT 1
            FROM groups g
            WHERE g.id = reports.group_id
              AND g.created_by = auth.uid()
        )
    );

DROP POLICY IF EXISTS "reports_delete_group_owner" ON reports;
CREATE POLICY "reports_delete_group_owner" ON reports
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1
            FROM groups g
            WHERE g.id = reports.group_id
              AND g.created_by = auth.uid()
        )
    );

-- ------------------------------
-- Storage bucket for report images
-- Path convention inside bucket: {group_id}/{user_id}/{filename}
-- ------------------------------
INSERT INTO storage.buckets (id, name, public)
VALUES ('reports', 'reports', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "reports_storage_select_group_member" ON storage.objects;
CREATE POLICY "reports_storage_select_group_member" ON storage.objects
    FOR SELECT
    USING (
        bucket_id = 'reports'
        AND split_part(name, '/', 1) ~* '^[0-9a-f-]{36}$'
        AND EXISTS (
            SELECT 1
            FROM group_members gm
            WHERE gm.group_id = split_part(name, '/', 1)::uuid
              AND gm.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "reports_storage_insert_own" ON storage.objects;
CREATE POLICY "reports_storage_insert_own" ON storage.objects
    FOR INSERT
    WITH CHECK (
        bucket_id = 'reports'
        AND split_part(name, '/', 1) ~* '^[0-9a-f-]{36}$'
        AND split_part(name, '/', 2) = auth.uid()::text
        AND EXISTS (
            SELECT 1
            FROM group_members gm
            WHERE gm.group_id = split_part(name, '/', 1)::uuid
              AND gm.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "reports_storage_delete_own" ON storage.objects;
CREATE POLICY "reports_storage_delete_own" ON storage.objects
    FOR DELETE
    USING (
        bucket_id = 'reports'
        AND split_part(name, '/', 2) = auth.uid()::text
    );
