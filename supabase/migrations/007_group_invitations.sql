-- ============================================================
-- The Appden - Group Invitations (invite non-members)
-- Migration 007
-- ============================================================

CREATE TABLE IF NOT EXISTS group_invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    invited_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    invited_user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'cancelled')),
    message TEXT CHECK (message IS NULL OR length(message) <= 280),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    responded_at TIMESTAMPTZ,
    UNIQUE (group_id, invited_user_id),
    CHECK (invited_by <> invited_user_id)
);

CREATE INDEX IF NOT EXISTS idx_group_invitations_invited_user
    ON group_invitations(invited_user_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_group_invitations_group
    ON group_invitations(group_id, status, created_at DESC);

ALTER TABLE group_invitations ENABLE ROW LEVEL SECURITY;

-- Selected users and group owner can read invitation rows.
DROP POLICY IF EXISTS "group_invitations_select_participants" ON group_invitations;
CREATE POLICY "group_invitations_select_participants" ON group_invitations
    FOR SELECT
    USING (
        group_invitations.invited_user_id = auth.uid()
        OR group_invitations.invited_by = auth.uid()
        OR EXISTS (
            SELECT 1
            FROM groups g
            WHERE g.id = group_invitations.group_id
              AND g.created_by = auth.uid()
        )
    );

-- Only group owner can invite members.
DROP POLICY IF EXISTS "group_invitations_insert_owner" ON group_invitations;
CREATE POLICY "group_invitations_insert_owner" ON group_invitations
    FOR INSERT
    WITH CHECK (
        group_invitations.invited_by = auth.uid()
        AND EXISTS (
            SELECT 1
            FROM groups g
            WHERE g.id = group_invitations.group_id
              AND g.created_by = auth.uid()
        )
    );

-- Invitee can accept/reject their pending invitation.
DROP POLICY IF EXISTS "group_invitations_update_invitee" ON group_invitations;
CREATE POLICY "group_invitations_update_invitee" ON group_invitations
    FOR UPDATE
    USING (
        group_invitations.invited_user_id = auth.uid()
        AND group_invitations.status = 'pending'
    )
    WITH CHECK (
        group_invitations.invited_user_id = auth.uid()
        AND group_invitations.status IN ('accepted', 'rejected')
    );

-- Owner (or inviter) can cancel invitation.
DROP POLICY IF EXISTS "group_invitations_update_owner_or_inviter" ON group_invitations;
CREATE POLICY "group_invitations_update_owner_or_inviter" ON group_invitations
    FOR UPDATE
    USING (
        group_invitations.invited_by = auth.uid()
        OR EXISTS (
            SELECT 1
            FROM groups g
            WHERE g.id = group_invitations.group_id
              AND g.created_by = auth.uid()
        )
    )
    WITH CHECK (
        group_invitations.status IN ('pending', 'cancelled', 'accepted', 'rejected')
    );

-- Allow invited users with accepted invite to self-join as member.
DROP POLICY IF EXISTS "group_members_insert_from_accepted_invite" ON group_members;
CREATE POLICY "group_members_insert_from_accepted_invite" ON group_members
    FOR INSERT
    WITH CHECK (
        group_members.user_id = auth.uid()
        AND group_members.role = 'member'
        AND EXISTS (
            SELECT 1
            FROM group_invitations gi
            WHERE gi.group_id = group_members.group_id
              AND gi.invited_user_id = auth.uid()
              AND gi.status = 'accepted'
        )
    );

-- Expand groups SELECT policy so invited users can see group basic info.
DROP POLICY IF EXISTS "groups_select_own" ON groups;
CREATE POLICY "groups_select_own" ON groups
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM group_members
            WHERE group_members.group_id = groups.id
              AND group_members.user_id = auth.uid()
        )
        OR groups.created_by = auth.uid()
        OR EXISTS (
            SELECT 1
            FROM group_invitations gi
            WHERE gi.group_id = groups.id
              AND gi.invited_user_id = auth.uid()
              AND gi.status IN ('pending', 'accepted')
        )
    );
