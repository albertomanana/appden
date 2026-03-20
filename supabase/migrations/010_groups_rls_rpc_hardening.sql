-- ============================================================
-- The Appden - Groups RLS + RPC hardening
-- Migration 010
-- ============================================================
--
-- Why this exists:
-- - The original groups/group_members policies can recurse through each other.
-- - The login bootstrap reads groups very early, so one broken policy can make
--   the whole session appear broken.
-- - Group creation should be atomic: group row + owner membership in one step.
--
-- Strategy:
-- - Use SECURITY DEFINER helper functions for membership/ownership checks.
-- - Replace recursive policies on groups and group_members.
-- - Expose create_group_with_owner(name, description) as a single RPC.

-- ------------------------------
-- SECURITY DEFINER group helpers
-- ------------------------------
CREATE OR REPLACE FUNCTION is_group_member(
    p_group_id UUID,
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
        FROM group_members gm
        WHERE gm.group_id = p_group_id
          AND gm.user_id = p_user_id
    );
$$;

CREATE OR REPLACE FUNCTION is_group_owner(
    p_group_id UUID,
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
        FROM groups g
        WHERE g.id = p_group_id
          AND g.created_by = p_user_id
    );
$$;

CREATE OR REPLACE FUNCTION is_group_manager(
    p_group_id UUID,
    p_user_id UUID DEFAULT auth.uid()
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT
        is_group_owner(p_group_id, p_user_id)
        OR EXISTS (
            SELECT 1
            FROM group_members gm
            WHERE gm.group_id = p_group_id
              AND gm.user_id = p_user_id
              AND gm.role IN ('owner', 'admin')
        );
$$;

COMMENT ON FUNCTION is_group_member(UUID, UUID)
    IS 'RLS-safe membership check for groups/group_members policies.';
COMMENT ON FUNCTION is_group_owner(UUID, UUID)
    IS 'RLS-safe owner check for groups and group-level privileged actions.';
COMMENT ON FUNCTION is_group_manager(UUID, UUID)
    IS 'RLS-safe owner/admin check for managing members and invitations.';

GRANT EXECUTE ON FUNCTION is_group_member(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION is_group_owner(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION is_group_manager(UUID, UUID) TO authenticated;

-- ------------------------------
-- Atomic group creation RPC
-- ------------------------------
CREATE OR REPLACE FUNCTION create_group_with_owner(
    p_name TEXT,
    p_description TEXT DEFAULT NULL
)
RETURNS TABLE (
    id UUID,
    name TEXT,
    description TEXT,
    avatar_url TEXT,
    created_by UUID,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_group groups%ROWTYPE;
    v_name TEXT := left(trim(coalesce(p_name, '')), 120);
    v_description TEXT := nullif(left(trim(coalesce(p_description, '')), 500), '');
BEGIN
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required'
            USING ERRCODE = '42501';
    END IF;

    IF length(v_name) < 2 THEN
        RAISE EXCEPTION 'Group name must contain at least 2 characters'
            USING ERRCODE = '22023';
    END IF;

    INSERT INTO groups (name, description, created_by)
    VALUES (v_name, v_description, v_user_id)
    RETURNING * INTO v_group;

    INSERT INTO group_members (group_id, user_id, role)
    VALUES (v_group.id, v_user_id, 'owner')
    ON CONFLICT (group_id, user_id) DO UPDATE
    SET role = 'owner';

    RETURN QUERY
    SELECT
        v_group.id,
        v_group.name,
        v_group.description,
        v_group.avatar_url,
        v_group.created_by,
        v_group.created_at,
        v_group.updated_at;
END;
$$;

COMMENT ON FUNCTION create_group_with_owner(TEXT, TEXT)
    IS 'Creates a group and guarantees the creator is stored as owner member in the same transaction.';

GRANT EXECUTE ON FUNCTION create_group_with_owner(TEXT, TEXT) TO authenticated;

-- ------------------------------
-- Groups policies (non-recursive)
-- ------------------------------
DROP POLICY IF EXISTS "groups_select_own" ON groups;
DROP POLICY IF EXISTS "groups_select_member_owner_or_invitee" ON groups;
DROP POLICY IF EXISTS "groups_update_owner" ON groups;
DROP POLICY IF EXISTS "groups_update_owner_or_admin" ON groups;
DROP POLICY IF EXISTS "groups_delete_owner" ON groups;
DROP POLICY IF EXISTS "groups_insert_auth" ON groups;
DROP POLICY IF EXISTS "groups_insert_authenticated_owner" ON groups;

CREATE POLICY "groups_select_member_owner_or_invitee" ON groups
    FOR SELECT
    USING (
        is_group_member(groups.id)
        OR groups.created_by = auth.uid()
        OR EXISTS (
            SELECT 1
            FROM group_invitations gi
            WHERE gi.group_id = groups.id
              AND gi.invited_user_id = auth.uid()
              AND gi.status IN ('pending', 'accepted')
        )
    );

CREATE POLICY "groups_insert_authenticated_owner" ON groups
    FOR INSERT
    WITH CHECK (groups.created_by = auth.uid());

CREATE POLICY "groups_update_owner_or_admin" ON groups
    FOR UPDATE
    USING (is_group_manager(groups.id))
    WITH CHECK (is_group_manager(groups.id));

CREATE POLICY "groups_delete_owner" ON groups
    FOR DELETE
    USING (is_group_owner(groups.id));

-- ------------------------------
-- Group members policies (non-recursive)
-- ------------------------------
DROP POLICY IF EXISTS "group_members_select" ON group_members;
DROP POLICY IF EXISTS "group_members_select_group_member" ON group_members;
DROP POLICY IF EXISTS "group_members_insert_owner" ON group_members;
DROP POLICY IF EXISTS "group_members_insert_owner_or_admin" ON group_members;
DROP POLICY IF EXISTS "group_members_delete_owner" ON group_members;
DROP POLICY IF EXISTS "group_members_delete_owner_or_admin" ON group_members;
DROP POLICY IF EXISTS "group_members_update_owner_or_admin" ON group_members;

CREATE POLICY "group_members_select_group_member" ON group_members
    FOR SELECT
    USING (is_group_member(group_members.group_id) OR is_group_owner(group_members.group_id));

CREATE POLICY "group_members_insert_owner_or_admin" ON group_members
    FOR INSERT
    WITH CHECK (
        is_group_manager(group_members.group_id)
        AND (
            group_members.role <> 'owner'
            OR is_group_owner(group_members.group_id)
        )
    );

CREATE POLICY "group_members_update_owner_or_admin" ON group_members
    FOR UPDATE
    USING (
        is_group_manager(group_members.group_id)
        AND (
            group_members.role <> 'owner'
            OR is_group_owner(group_members.group_id)
        )
    )
    WITH CHECK (
        is_group_manager(group_members.group_id)
        AND (
            group_members.role <> 'owner'
            OR is_group_owner(group_members.group_id)
        )
    );

CREATE POLICY "group_members_delete_owner_or_admin" ON group_members
    FOR DELETE
    USING (
        is_group_manager(group_members.group_id)
        AND (
            group_members.role <> 'owner'
            OR is_group_owner(group_members.group_id)
        )
    );

-- ------------------------------
-- Group invitations policies aligned with helper functions
-- ------------------------------
DROP POLICY IF EXISTS "group_invitations_select_participants" ON group_invitations;
DROP POLICY IF EXISTS "group_invitations_insert_owner" ON group_invitations;
DROP POLICY IF EXISTS "group_invitations_insert_owner_or_admin" ON group_invitations;
DROP POLICY IF EXISTS "group_invitations_update_owner_or_inviter" ON group_invitations;
DROP POLICY IF EXISTS "group_invitations_update_owner_admin_or_inviter" ON group_invitations;

CREATE POLICY "group_invitations_select_participants" ON group_invitations
    FOR SELECT
    USING (
        group_invitations.invited_user_id = auth.uid()
        OR group_invitations.invited_by = auth.uid()
        OR is_group_manager(group_invitations.group_id)
    );

CREATE POLICY "group_invitations_insert_owner_or_admin" ON group_invitations
    FOR INSERT
    WITH CHECK (
        group_invitations.invited_by = auth.uid()
        AND is_group_manager(group_invitations.group_id)
        AND NOT is_group_member(group_invitations.group_id, group_invitations.invited_user_id)
    );

CREATE POLICY "group_invitations_update_owner_admin_or_inviter" ON group_invitations
    FOR UPDATE
    USING (
        group_invitations.invited_by = auth.uid()
        OR is_group_manager(group_invitations.group_id)
    )
    WITH CHECK (
        group_invitations.status IN ('pending', 'cancelled', 'accepted', 'rejected')
    );
