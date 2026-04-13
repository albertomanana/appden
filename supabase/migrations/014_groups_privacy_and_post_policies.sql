-- ============================================================
-- Migration 014 - Groups privacy flag and stricter posts RLS
-- Adds: groups.is_private, invite_tokens table, and policies for posts visibility
-- ============================================================

-- Add is_private flag to groups
ALTER TABLE IF EXISTS groups
    ADD COLUMN IF NOT EXISTS is_private boolean NOT NULL DEFAULT false;

-- Invite tokens table (one-time or time-limited invite links)
CREATE TABLE IF NOT EXISTS group_invite_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    token TEXT NOT NULL UNIQUE,
    created_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    expires_at TIMESTAMPTZ NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    used_by UUID NULL REFERENCES profiles(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_group_invite_tokens_group ON group_invite_tokens(group_id);

-- Posts: tighten SELECT policy by visibility
DROP POLICY IF EXISTS posts_select_authenticated ON posts;
CREATE POLICY posts_select_visibility ON posts
    FOR SELECT
    USING (
        -- public posts are visible to all authenticated users
        (visibility = 'public' AND auth.role() = 'authenticated')
        -- private posts only visible to author
        OR (visibility = 'private' AND user_id = auth.uid())
        -- group posts visible to members of that group
        OR (
            visibility = 'group'
            AND EXISTS (
                SELECT 1 FROM group_members gm
                WHERE gm.group_id = posts.group_id
                  AND gm.user_id = auth.uid()
            )
        )
    );

-- Ensure inserts only by authenticated user with matching user_id (already exists)
-- Ensure delete/update policies can be added by project owners as needed.
