-- ============================================================
-- The Appden - Hotfix RLS recursion groups <-> group_invitations
-- Migration 008
-- ============================================================

-- Fix policies on group_invitations to avoid querying groups inside its own policy chain.
DROP POLICY IF EXISTS "group_invitations_select_participants" ON group_invitations;
CREATE POLICY "group_invitations_select_participants" ON group_invitations
    FOR SELECT
    USING (
        group_invitations.invited_user_id = auth.uid()
        OR group_invitations.invited_by = auth.uid()
        OR EXISTS (
            SELECT 1
            FROM group_members gm
            WHERE gm.group_id = group_invitations.group_id
              AND gm.user_id = auth.uid()
              AND gm.role = 'owner'
        )
    );

DROP POLICY IF EXISTS "group_invitations_insert_owner" ON group_invitations;
CREATE POLICY "group_invitations_insert_owner" ON group_invitations
    FOR INSERT
    WITH CHECK (
        group_invitations.invited_by = auth.uid()
        AND EXISTS (
            SELECT 1
            FROM group_members gm
            WHERE gm.group_id = group_invitations.group_id
              AND gm.user_id = auth.uid()
              AND gm.role = 'owner'
        )
    );

DROP POLICY IF EXISTS "group_invitations_update_owner_or_inviter" ON group_invitations;
CREATE POLICY "group_invitations_update_owner_or_inviter" ON group_invitations
    FOR UPDATE
    USING (
        group_invitations.invited_by = auth.uid()
        OR EXISTS (
            SELECT 1
            FROM group_members gm
            WHERE gm.group_id = group_invitations.group_id
              AND gm.user_id = auth.uid()
              AND gm.role = 'owner'
        )
    )
    WITH CHECK (
        group_invitations.status IN ('pending', 'cancelled', 'accepted', 'rejected')
    );

-- Re-assert groups select policy with invitation visibility (now safe after policy fix above).
DROP POLICY IF EXISTS "groups_select_own" ON groups;
CREATE POLICY "groups_select_own" ON groups
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1
            FROM group_members
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
