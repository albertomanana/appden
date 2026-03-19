-- ============================================================
-- The Appden - Social Connections + Reports Admin Hardening
-- Migration 009
-- ============================================================

-- ------------------------------
-- Group roles: add admin
-- ------------------------------
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_type t
        JOIN pg_enum e ON e.enumtypid = t.oid
        WHERE t.typname = 'group_role'
          AND e.enumlabel = 'admin'
    ) THEN
        ALTER TYPE group_role ADD VALUE 'admin';
    END IF;
END$$;

-- ------------------------------
-- Helpers for safe policy checks
-- ------------------------------
CREATE OR REPLACE FUNCTION is_group_owner(p_group_id UUID, p_user_id UUID DEFAULT auth.uid())
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

CREATE OR REPLACE FUNCTION is_group_manager(p_group_id UUID, p_user_id UUID DEFAULT auth.uid())
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

CREATE TABLE IF NOT EXISTS user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('admin')),
    created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (user_id, role)
);

CREATE OR REPLACE FUNCTION is_app_admin(p_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM user_roles ur
        WHERE ur.user_id = p_user_id
          AND ur.role = 'admin'
    );
$$;

GRANT EXECUTE ON FUNCTION is_group_owner(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION is_group_manager(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION is_app_admin(UUID) TO authenticated;

-- ------------------------------
-- Ensure group creator is owner member
-- ------------------------------
CREATE OR REPLACE FUNCTION ensure_group_owner_membership()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    INSERT INTO group_members (group_id, user_id, role)
    VALUES (NEW.id, NEW.created_by, 'owner')
    ON CONFLICT (group_id, user_id) DO UPDATE
    SET role = 'owner';

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_groups_auto_owner_membership ON groups;
CREATE TRIGGER trg_groups_auto_owner_membership
    AFTER INSERT ON groups
    FOR EACH ROW
    EXECUTE FUNCTION ensure_group_owner_membership();

-- ------------------------------
-- Group members policy hardening (owner/admin manager model)
-- ------------------------------
DROP POLICY IF EXISTS "group_members_insert_owner" ON group_members;
DROP POLICY IF EXISTS "group_members_delete_owner" ON group_members;
DROP POLICY IF EXISTS "group_members_update_owner_or_admin" ON group_members;

CREATE POLICY "group_members_insert_owner_or_admin" ON group_members
    FOR INSERT
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

-- ------------------------------
-- Group invitations: owner/admin can invite/cancel
-- ------------------------------
DROP POLICY IF EXISTS "group_invitations_select_participants" ON group_invitations;
CREATE POLICY "group_invitations_select_participants" ON group_invitations
    FOR SELECT
    USING (
        group_invitations.invited_user_id = auth.uid()
        OR group_invitations.invited_by = auth.uid()
        OR is_group_manager(group_invitations.group_id)
    );

DROP POLICY IF EXISTS "group_invitations_insert_owner" ON group_invitations;
DROP POLICY IF EXISTS "group_invitations_insert_owner_or_admin" ON group_invitations;
CREATE POLICY "group_invitations_insert_owner_or_admin" ON group_invitations
    FOR INSERT
    WITH CHECK (
        group_invitations.invited_by = auth.uid()
        AND is_group_manager(group_invitations.group_id)
        AND NOT EXISTS (
            SELECT 1
            FROM group_members gm
            WHERE gm.group_id = group_invitations.group_id
              AND gm.user_id = group_invitations.invited_user_id
        )
    );

DROP POLICY IF EXISTS "group_invitations_update_owner_or_inviter" ON group_invitations;
DROP POLICY IF EXISTS "group_invitations_update_owner_admin_or_inviter" ON group_invitations;
CREATE POLICY "group_invitations_update_owner_admin_or_inviter" ON group_invitations
    FOR UPDATE
    USING (
        group_invitations.invited_by = auth.uid()
        OR is_group_manager(group_invitations.group_id)
    )
    WITH CHECK (
        group_invitations.status IN ('pending', 'cancelled', 'accepted', 'rejected')
    );

-- ------------------------------
-- Global social connections
-- ------------------------------
CREATE TABLE IF NOT EXISTS friend_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    from_user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    to_user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'accepted', 'rejected', 'cancelled')),
    message TEXT CHECK (message IS NULL OR length(message) <= 280),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    responded_at TIMESTAMPTZ,
    UNIQUE (from_user_id, to_user_id),
    CHECK (from_user_id <> to_user_id)
);

CREATE INDEX IF NOT EXISTS idx_friend_requests_to_status
    ON friend_requests(to_user_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_friend_requests_from_status
    ON friend_requests(from_user_id, status, created_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS idx_friend_requests_pending_pair
    ON friend_requests (
        LEAST(from_user_id, to_user_id),
        GREATEST(from_user_id, to_user_id)
    )
    WHERE status = 'pending';

CREATE TABLE IF NOT EXISTS friendships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_a UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    user_b UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    created_from_request UUID REFERENCES friend_requests(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (user_a, user_b),
    CHECK (user_a <> user_b),
    CHECK (user_a < user_b)
);

CREATE INDEX IF NOT EXISTS idx_friendships_user_a
    ON friendships(user_a, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_friendships_user_b
    ON friendships(user_b, created_at DESC);

ALTER TABLE friend_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE friendships ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "friend_requests_select_participant" ON friend_requests;
CREATE POLICY "friend_requests_select_participant" ON friend_requests
    FOR SELECT
    USING (
        friend_requests.from_user_id = auth.uid()
        OR friend_requests.to_user_id = auth.uid()
    );

DROP POLICY IF EXISTS "friend_requests_insert_sender" ON friend_requests;
CREATE POLICY "friend_requests_insert_sender" ON friend_requests
    FOR INSERT
    WITH CHECK (
        friend_requests.from_user_id = auth.uid()
        AND friend_requests.to_user_id <> auth.uid()
        AND NOT EXISTS (
            SELECT 1
            FROM friendships f
            WHERE f.user_a = LEAST(friend_requests.from_user_id, friend_requests.to_user_id)
              AND f.user_b = GREATEST(friend_requests.from_user_id, friend_requests.to_user_id)
        )
    );

DROP POLICY IF EXISTS "friend_requests_update_recipient" ON friend_requests;
CREATE POLICY "friend_requests_update_recipient" ON friend_requests
    FOR UPDATE
    USING (
        friend_requests.to_user_id = auth.uid()
        AND friend_requests.status = 'pending'
    )
    WITH CHECK (
        friend_requests.to_user_id = auth.uid()
        AND friend_requests.status IN ('accepted', 'rejected')
    );

DROP POLICY IF EXISTS "friend_requests_update_sender_cancel" ON friend_requests;
CREATE POLICY "friend_requests_update_sender_cancel" ON friend_requests
    FOR UPDATE
    USING (
        friend_requests.from_user_id = auth.uid()
        AND friend_requests.status = 'pending'
    )
    WITH CHECK (
        friend_requests.from_user_id = auth.uid()
        AND friend_requests.status = 'cancelled'
    );

DROP POLICY IF EXISTS "friend_requests_delete_participant" ON friend_requests;
CREATE POLICY "friend_requests_delete_participant" ON friend_requests
    FOR DELETE
    USING (
        friend_requests.from_user_id = auth.uid()
        OR friend_requests.to_user_id = auth.uid()
    );

DROP POLICY IF EXISTS "friendships_select_participant" ON friendships;
CREATE POLICY "friendships_select_participant" ON friendships
    FOR SELECT
    USING (friendships.user_a = auth.uid() OR friendships.user_b = auth.uid());

DROP POLICY IF EXISTS "friendships_delete_participant" ON friendships;
CREATE POLICY "friendships_delete_participant" ON friendships
    FOR DELETE
    USING (friendships.user_a = auth.uid() OR friendships.user_b = auth.uid());

CREATE OR REPLACE FUNCTION create_friendship_from_request()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NEW.status = 'accepted' AND OLD.status IS DISTINCT FROM 'accepted' THEN
        INSERT INTO friendships (user_a, user_b, created_from_request)
        VALUES (
            LEAST(NEW.from_user_id, NEW.to_user_id),
            GREATEST(NEW.from_user_id, NEW.to_user_id),
            NEW.id
        )
        ON CONFLICT (user_a, user_b) DO NOTHING;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_friend_requests_create_friendship ON friend_requests;
CREATE TRIGGER trg_friend_requests_create_friendship
    AFTER UPDATE OF status ON friend_requests
    FOR EACH ROW
    EXECUTE FUNCTION create_friendship_from_request();

-- ------------------------------
-- Global app roles (admin bootstrap-ready)
-- ------------------------------
CREATE INDEX IF NOT EXISTS idx_user_roles_role_user
    ON user_roles(role, user_id);

ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_roles_select_own_or_admin" ON user_roles;
CREATE POLICY "user_roles_select_own_or_admin" ON user_roles
    FOR SELECT
    USING (user_roles.user_id = auth.uid() OR is_app_admin());

DROP POLICY IF EXISTS "user_roles_manage_admin_only" ON user_roles;
CREATE POLICY "user_roles_manage_admin_only" ON user_roles
    FOR ALL
    USING (is_app_admin())
    WITH CHECK (is_app_admin());

-- ------------------------------
-- Reports: make global-auth visible + richer model
-- ------------------------------
ALTER TABLE reports
    ADD COLUMN IF NOT EXISTS title TEXT,
    ADD COLUMN IF NOT EXISTS reproduction_steps TEXT,
    ADD COLUMN IF NOT EXISTS severity TEXT,
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

ALTER TABLE reports
    ALTER COLUMN group_id DROP NOT NULL;

UPDATE reports
SET title = COALESCE(NULLIF(title, ''), left(description, 100))
WHERE title IS NULL OR title = '';

UPDATE reports
SET reproduction_steps = COALESCE(reproduction_steps, steps)
WHERE (reproduction_steps IS NULL OR reproduction_steps = '')
  AND steps IS NOT NULL;

ALTER TABLE reports
    ALTER COLUMN title SET NOT NULL;

ALTER TABLE reports
    DROP CONSTRAINT IF EXISTS reports_type_check;

ALTER TABLE reports
    ADD CONSTRAINT reports_type_check
    CHECK (type IN ('bug', 'error', 'improvement'));

ALTER TABLE reports
    DROP CONSTRAINT IF EXISTS reports_severity_check;

ALTER TABLE reports
    ADD CONSTRAINT reports_severity_check
    CHECK (severity IS NULL OR severity IN ('low', 'medium', 'high', 'critical'));

ALTER TABLE reports
    DROP CONSTRAINT IF EXISTS reports_title_length_check;

ALTER TABLE reports
    ADD CONSTRAINT reports_title_length_check
    CHECK (length(title) BETWEEN 3 AND 140);

CREATE INDEX IF NOT EXISTS idx_reports_status_created
    ON reports(status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_reports_updated_at
    ON reports(updated_at DESC);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_trigger
        WHERE tgname = 'trg_reports_updated_at'
    ) THEN
        CREATE TRIGGER trg_reports_updated_at
            BEFORE UPDATE ON reports
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at();
    END IF;
END$$;

DROP POLICY IF EXISTS "reports_select_group_member" ON reports;
DROP POLICY IF EXISTS "reports_insert_own_group_member" ON reports;
DROP POLICY IF EXISTS "reports_update_owner_or_group_owner" ON reports;
DROP POLICY IF EXISTS "reports_delete_group_owner" ON reports;

CREATE POLICY "reports_select_authenticated" ON reports
    FOR SELECT
    USING (auth.role() = 'authenticated');

CREATE POLICY "reports_insert_authenticated" ON reports
    FOR INSERT
    WITH CHECK (
        reports.user_id = auth.uid()
        AND (
            reports.group_id IS NULL
            OR EXISTS (
                SELECT 1
                FROM group_members gm
                WHERE gm.group_id = reports.group_id
                  AND gm.user_id = auth.uid()
            )
        )
    );

CREATE POLICY "reports_update_creator_or_admin" ON reports
    FOR UPDATE
    USING (reports.user_id = auth.uid() OR is_app_admin())
    WITH CHECK (reports.user_id = auth.uid() OR is_app_admin());

CREATE POLICY "reports_delete_creator_or_admin" ON reports
    FOR DELETE
    USING (reports.user_id = auth.uid() OR is_app_admin());

-- ------------------------------
-- Report notifications for admins
-- ------------------------------
CREATE TABLE IF NOT EXISTS report_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    report_id UUID NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
    admin_user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    read BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    read_at TIMESTAMPTZ,
    UNIQUE (report_id, admin_user_id)
);

CREATE INDEX IF NOT EXISTS idx_report_notifications_admin_read
    ON report_notifications(admin_user_id, read, created_at DESC);

ALTER TABLE report_notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "report_notifications_select_own_admin" ON report_notifications;
CREATE POLICY "report_notifications_select_own_admin" ON report_notifications
    FOR SELECT
    USING (
        report_notifications.admin_user_id = auth.uid()
        AND is_app_admin()
    );

DROP POLICY IF EXISTS "report_notifications_update_own_admin" ON report_notifications;
CREATE POLICY "report_notifications_update_own_admin" ON report_notifications
    FOR UPDATE
    USING (
        report_notifications.admin_user_id = auth.uid()
        AND is_app_admin()
    )
    WITH CHECK (
        report_notifications.admin_user_id = auth.uid()
        AND is_app_admin()
    );

DROP POLICY IF EXISTS "report_notifications_delete_own_admin" ON report_notifications;
CREATE POLICY "report_notifications_delete_own_admin" ON report_notifications
    FOR DELETE
    USING (
        report_notifications.admin_user_id = auth.uid()
        AND is_app_admin()
    );

CREATE OR REPLACE FUNCTION create_report_notifications_for_admins()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO report_notifications (report_id, admin_user_id)
    SELECT NEW.id, ur.user_id
    FROM user_roles ur
    WHERE ur.role = 'admin'
    ON CONFLICT (report_id, admin_user_id) DO NOTHING;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_reports_admin_notifications ON reports;
CREATE TRIGGER trg_reports_admin_notifications
    AFTER INSERT ON reports
    FOR EACH ROW
    EXECUTE FUNCTION create_report_notifications_for_admins();
