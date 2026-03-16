-- ============================================================
-- The Appden - Friends (per group) + Song Co-Ownership
-- ============================================================

-- -- Friend requests within a group
CREATE TABLE IF NOT EXISTS group_friend_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    from_user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    to_user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'accepted', 'rejected', 'cancelled')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    responded_at TIMESTAMPTZ,
    UNIQUE (group_id, from_user_id, to_user_id),
    CHECK (from_user_id <> to_user_id)
);

CREATE INDEX IF NOT EXISTS idx_group_friend_requests_group
    ON group_friend_requests(group_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_group_friend_requests_to
    ON group_friend_requests(to_user_id, status);
CREATE INDEX IF NOT EXISTS idx_group_friend_requests_from
    ON group_friend_requests(from_user_id, status);

-- -- Song co-ownership bridge table
CREATE TABLE IF NOT EXISTS song_owners (
    song_id UUID NOT NULL REFERENCES songs(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'owner' CHECK (role IN ('owner', 'contributor')),
    added_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (song_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_song_owners_user
    ON song_owners(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_song_owners_song
    ON song_owners(song_id);

-- ============================================================
-- RLS
-- ============================================================

ALTER TABLE group_friend_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE song_owners ENABLE ROW LEVEL SECURITY;

-- Friend requests: only group members can read requests in that group
DROP POLICY IF EXISTS "group_friend_requests_select_group_member" ON group_friend_requests;
CREATE POLICY "group_friend_requests_select_group_member" ON group_friend_requests
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM group_members gm
            WHERE gm.group_id = group_friend_requests.group_id
              AND gm.user_id = auth.uid()
        )
    );

-- Create request: only group members, from_user must be current user
DROP POLICY IF EXISTS "group_friend_requests_insert_group_member" ON group_friend_requests;
CREATE POLICY "group_friend_requests_insert_group_member" ON group_friend_requests
    FOR INSERT
    WITH CHECK (
        group_friend_requests.from_user_id = auth.uid()
        AND EXISTS (
            SELECT 1 FROM group_members gm
            WHERE gm.group_id = group_friend_requests.group_id
              AND gm.user_id = auth.uid()
        )
        AND EXISTS (
            SELECT 1 FROM group_members gm2
            WHERE gm2.group_id = group_friend_requests.group_id
              AND gm2.user_id = group_friend_requests.to_user_id
        )
    );

-- Respond (accept/reject): only recipient can update their incoming request
DROP POLICY IF EXISTS "group_friend_requests_update_recipient" ON group_friend_requests;
CREATE POLICY "group_friend_requests_update_recipient" ON group_friend_requests
    FOR UPDATE
    USING (group_friend_requests.to_user_id = auth.uid())
    WITH CHECK (group_friend_requests.to_user_id = auth.uid());

-- Cancel: sender can cancel their own pending request
DROP POLICY IF EXISTS "group_friend_requests_update_sender_cancel" ON group_friend_requests;
CREATE POLICY "group_friend_requests_update_sender_cancel" ON group_friend_requests
    FOR UPDATE
    USING (group_friend_requests.from_user_id = auth.uid())
    WITH CHECK (group_friend_requests.from_user_id = auth.uid());

-- Delete: allow sender/recipient to delete (cleanup) if needed
DROP POLICY IF EXISTS "group_friend_requests_delete_participant" ON group_friend_requests;
CREATE POLICY "group_friend_requests_delete_participant" ON group_friend_requests
    FOR DELETE
    USING (group_friend_requests.from_user_id = auth.uid() OR group_friend_requests.to_user_id = auth.uid());

-- Song owners: group members can read ownership links for songs in their groups
DROP POLICY IF EXISTS "song_owners_select_group_member" ON song_owners;
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

-- Insert ownership: allowed if current user is uploader or already owner of the song
DROP POLICY IF EXISTS "song_owners_insert_uploader_or_owner" ON song_owners;
CREATE POLICY "song_owners_insert_uploader_or_owner" ON song_owners
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1
            FROM songs s
            WHERE s.id = song_owners.song_id
              AND (
                s.uploaded_by = auth.uid()
                OR EXISTS (
                    SELECT 1 FROM song_owners so
                    WHERE so.song_id = s.id
                      AND so.user_id = auth.uid()
                      AND so.role IN ('owner', 'contributor')
                )
              )
        )
    );

-- Delete ownership: allowed if current user is uploader or an owner of that song
DROP POLICY IF EXISTS "song_owners_delete_uploader_or_owner" ON song_owners;
CREATE POLICY "song_owners_delete_uploader_or_owner" ON song_owners
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1
            FROM songs s
            WHERE s.id = song_owners.song_id
              AND (
                s.uploaded_by = auth.uid()
                OR EXISTS (
                    SELECT 1 FROM song_owners so
                    WHERE so.song_id = s.id
                      AND so.user_id = auth.uid()
                      AND so.role = 'owner'
                )
              )
        )
    );

