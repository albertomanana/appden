-- ============================================================
-- Migration 015 - Fixes for the v1.7.2 features (account approval,
-- posts, private groups) plus real notifications.
--
-- Safe to run more than once. Apply AFTER 001-014.
--
-- 1. Sign-up was broken: the account-request trigger inserted
--    profiles.username (NULL at sign-up) into a NOT NULL email column,
--    so every new auth user failed with "Database error saving new user".
-- 2. Approval could never happen: account_requests had RLS enabled but
--    no policies, and approve_account_request ran with the caller's
--    rights. Users could also flip their own profiles.is_approved.
-- 3. post_likes had no SELECT/DELETE policies (likes invisible, unlike
--    impossible) and posts had no DELETE policy.
-- 4. group_invite_tokens had no RLS at all (any user could read every
--    token) and invitees cannot insert into group_members themselves,
--    so invite links never worked. Joining now goes through an RPC.
-- 5. Members could not leave a group (only managers can delete rows).
-- 6. Nothing ever inserted into notifications. Triggers now do.
-- ============================================================

-- ------------------------------------------------------------
-- 1. Account approval
-- ------------------------------------------------------------

-- New profiles need approval only when at least one app admin exists;
-- otherwise nobody could ever approve them and the app would lock everyone out.
CREATE OR REPLACE FUNCTION public.set_profile_approval_default()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM user_roles WHERE role = 'admin') THEN
        NEW.is_approved := true;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_profiles_approval_default ON profiles;
CREATE TRIGGER trg_profiles_approval_default
BEFORE INSERT ON profiles
FOR EACH ROW EXECUTE FUNCTION public.set_profile_approval_default();

-- Account request with the real email from auth.users. Never blocks sign-up.
CREATE OR REPLACE FUNCTION public.create_account_request_on_profile_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    v_email text;
BEGIN
    IF NEW.is_approved = false THEN
        SELECT u.email INTO v_email FROM auth.users u WHERE u.id = NEW.id;
        BEGIN
            INSERT INTO account_requests (profile_id, email, message)
            VALUES (NEW.id, COALESCE(v_email, NEW.username, NEW.id::text), NULL);
        EXCEPTION WHEN OTHERS THEN
            RAISE WARNING 'account_requests insert failed for %: %', NEW.id, SQLERRM;
        END;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_create_account_request ON profiles;
CREATE TRIGGER trg_create_account_request
AFTER INSERT ON profiles
FOR EACH ROW EXECUTE FUNCTION public.create_account_request_on_profile_insert();

-- Users must not be able to approve themselves through profiles_update_own.
CREATE OR REPLACE FUNCTION public.protect_profile_approval()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NEW.is_approved IS DISTINCT FROM OLD.is_approved
       AND auth.uid() IS NOT NULL
       AND NOT is_app_admin(auth.uid()) THEN
        NEW.is_approved := OLD.is_approved;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_profiles_protect_approval ON profiles;
CREATE TRIGGER trg_profiles_protect_approval
BEFORE UPDATE ON profiles
FOR EACH ROW EXECUTE FUNCTION public.protect_profile_approval();

DROP POLICY IF EXISTS account_requests_select_admin_or_own ON account_requests;
CREATE POLICY account_requests_select_admin_or_own ON account_requests
    FOR SELECT
    USING (is_app_admin(auth.uid()) OR profile_id = auth.uid());

DROP POLICY IF EXISTS account_requests_update_admin ON account_requests;
CREATE POLICY account_requests_update_admin ON account_requests
    FOR UPDATE
    USING (is_app_admin(auth.uid()))
    WITH CHECK (is_app_admin(auth.uid()));

CREATE OR REPLACE FUNCTION public.approve_account_request(p_request_id UUID, p_admin_user_id UUID DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_profile UUID;
BEGIN
    IF NOT is_app_admin(auth.uid()) THEN
        RAISE EXCEPTION 'Only app admins can approve accounts' USING ERRCODE = '42501';
    END IF;

    UPDATE account_requests
    SET status = 'approved', responded_at = now()
    WHERE id = p_request_id
    RETURNING profile_id INTO v_profile;

    IF v_profile IS NULL THEN
        RAISE EXCEPTION 'Account request not found';
    END IF;

    UPDATE profiles SET is_approved = true WHERE id = v_profile;
END;
$$;

CREATE OR REPLACE FUNCTION public.reject_account_request(p_request_id UUID, p_message TEXT DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NOT is_app_admin(auth.uid()) THEN
        RAISE EXCEPTION 'Only app admins can reject accounts' USING ERRCODE = '42501';
    END IF;

    UPDATE account_requests
    SET status = 'rejected', message = p_message, responded_at = now()
    WHERE id = p_request_id;
END;
$$;

REVOKE ALL ON FUNCTION public.approve_account_request(UUID, UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.reject_account_request(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.approve_account_request(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reject_account_request(UUID, TEXT) TO authenticated;

-- Repair accounts created while the broken trigger was active: profiles that
-- exist but have no request row (or no admin to review them).
INSERT INTO account_requests (profile_id, email)
SELECT p.id, COALESCE(u.email, p.id::text)
FROM profiles p
JOIN auth.users u ON u.id = p.id
WHERE p.is_approved = false
  AND NOT EXISTS (SELECT 1 FROM account_requests ar WHERE ar.profile_id = p.id AND ar.status = 'pending');

UPDATE profiles SET is_approved = true
WHERE is_approved = false
  AND NOT EXISTS (SELECT 1 FROM user_roles WHERE role = 'admin');

-- ------------------------------------------------------------
-- 2. Posts and likes
-- ------------------------------------------------------------

DROP POLICY IF EXISTS posts_delete_owner ON posts;
CREATE POLICY posts_delete_owner ON posts
    FOR DELETE
    USING (user_id = auth.uid());

-- Group posts must target a group the author belongs to.
DROP POLICY IF EXISTS posts_insert_owner ON posts;
CREATE POLICY posts_insert_owner ON posts
    FOR INSERT
    WITH CHECK (
        user_id = auth.uid()
        AND (visibility <> 'group' OR (group_id IS NOT NULL AND is_group_member(group_id, auth.uid())))
    );

DROP POLICY IF EXISTS post_likes_select_visible ON post_likes;
CREATE POLICY post_likes_select_visible ON post_likes
    FOR SELECT
    USING (EXISTS (SELECT 1 FROM posts p WHERE p.id = post_likes.post_id));

DROP POLICY IF EXISTS post_likes_delete_owner ON post_likes;
CREATE POLICY post_likes_delete_owner ON post_likes
    FOR DELETE
    USING (user_id = auth.uid());

-- ------------------------------------------------------------
-- 3. Invite links
-- ------------------------------------------------------------

ALTER TABLE group_invite_tokens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS group_invite_tokens_select_manager ON group_invite_tokens;
CREATE POLICY group_invite_tokens_select_manager ON group_invite_tokens
    FOR SELECT
    USING (is_group_manager(group_id, auth.uid()));

DROP POLICY IF EXISTS group_invite_tokens_insert_manager ON group_invite_tokens;
CREATE POLICY group_invite_tokens_insert_manager ON group_invite_tokens
    FOR INSERT
    WITH CHECK (created_by = auth.uid() AND is_group_manager(group_id, auth.uid()));

DROP POLICY IF EXISTS group_invite_tokens_delete_manager ON group_invite_tokens;
CREATE POLICY group_invite_tokens_delete_manager ON group_invite_tokens
    FOR DELETE
    USING (is_group_manager(group_id, auth.uid()));

-- Reusable link until it expires (a friend group shares one link in a chat).
CREATE OR REPLACE FUNCTION public.join_group_with_invite(p_token TEXT)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user UUID := auth.uid();
    v_token group_invite_tokens%ROWTYPE;
BEGIN
    IF v_user IS NULL THEN
        RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501';
    END IF;

    SELECT * INTO v_token FROM group_invite_tokens WHERE token = p_token;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Invalid invite token';
    END IF;

    IF v_token.expires_at IS NOT NULL AND v_token.expires_at < now() THEN
        RAISE EXCEPTION 'Invite token expired';
    END IF;

    INSERT INTO group_members (group_id, user_id, role)
    VALUES (v_token.group_id, v_user, 'member')
    ON CONFLICT (group_id, user_id) DO NOTHING;

    UPDATE group_invite_tokens SET used_by = v_user WHERE id = v_token.id AND used_by IS NULL;

    -- A pending formal invitation for the same group is now redundant.
    UPDATE group_invitations
    SET status = 'accepted', responded_at = now()
    WHERE group_id = v_token.group_id AND invited_user_id = v_user AND status = 'pending';

    RETURN v_token.group_id;
END;
$$;

REVOKE ALL ON FUNCTION public.join_group_with_invite(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.join_group_with_invite(TEXT) TO authenticated;

-- ------------------------------------------------------------
-- 4. Leaving a group
-- ------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.leave_group(p_group_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501';
    END IF;

    IF is_group_owner(p_group_id, auth.uid()) THEN
        RAISE EXCEPTION 'The owner cannot leave the group';
    END IF;

    DELETE FROM group_members WHERE group_id = p_group_id AND user_id = auth.uid();
END;
$$;

REVOKE ALL ON FUNCTION public.leave_group(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.leave_group(UUID) TO authenticated;

-- ------------------------------------------------------------
-- 5. Notifications
-- ------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.notify_group_on_song()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_name text;
BEGIN
    SELECT display_name INTO v_name FROM profiles WHERE id = NEW.uploaded_by;
    INSERT INTO notifications (user_id, group_id, type, title, body, resource_type, resource_id)
    SELECT gm.user_id, NEW.group_id, 'song_added', 'Nueva canción',
           COALESCE(v_name, 'Alguien') || ' ha subido "' || NEW.title || '"', 'song', NEW.id
    FROM group_members gm
    WHERE gm.group_id = NEW.group_id AND gm.user_id <> NEW.uploaded_by;
    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'notify_group_on_song failed: %', SQLERRM;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_songs_notify_group ON songs;
CREATE TRIGGER trg_songs_notify_group
AFTER INSERT ON songs
FOR EACH ROW EXECUTE FUNCTION public.notify_group_on_song();

CREATE OR REPLACE FUNCTION public.notify_on_debt_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_creditor text;
    v_debtor text;
BEGIN
    SELECT display_name INTO v_creditor FROM profiles WHERE id = NEW.creditor_id;
    SELECT display_name INTO v_debtor FROM profiles WHERE id = NEW.debtor_id;

    IF TG_OP = 'INSERT' THEN
        INSERT INTO notifications (user_id, group_id, type, title, body, resource_type, resource_id)
        VALUES (NEW.debtor_id, NEW.group_id, 'debt_created', 'Nueva deuda',
                COALESCE(v_creditor, 'Alguien') || ' te ha apuntado ' || to_char(NEW.amount, 'FM999999990.00') || ' ' || NEW.currency::text || ' por "' || NEW.concept || '"',
                'debt', NEW.id);
    ELSIF NEW.status = 'paid' AND OLD.status IS DISTINCT FROM 'paid' THEN
        INSERT INTO notifications (user_id, group_id, type, title, body, resource_type, resource_id)
        VALUES (NEW.creditor_id, NEW.group_id, 'debt_paid', 'Deuda saldada',
                COALESCE(v_debtor, 'Alguien') || ' ha saldado "' || NEW.concept || '"',
                'debt', NEW.id);
    END IF;
    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'notify_on_debt_change failed: %', SQLERRM;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_debts_notify ON debts;
CREATE TRIGGER trg_debts_notify
AFTER INSERT OR UPDATE OF status ON debts
FOR EACH ROW EXECUTE FUNCTION public.notify_on_debt_change();

CREATE OR REPLACE FUNCTION public.notify_group_on_playlist()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_name text;
BEGIN
    SELECT display_name INTO v_name FROM profiles WHERE id = NEW.created_by;
    INSERT INTO notifications (user_id, group_id, type, title, body, resource_type, resource_id)
    SELECT gm.user_id, NEW.group_id, 'playlist_created', 'Nueva playlist',
           COALESCE(v_name, 'Alguien') || ' ha creado "' || NEW.name || '"', 'playlist', NEW.id
    FROM group_members gm
    WHERE gm.group_id = NEW.group_id AND gm.user_id <> NEW.created_by;
    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'notify_group_on_playlist failed: %', SQLERRM;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_playlists_notify_group ON playlists;
CREATE TRIGGER trg_playlists_notify_group
AFTER INSERT ON playlists
FOR EACH ROW EXECUTE FUNCTION public.notify_group_on_playlist();

CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications(user_id, read, created_at DESC);

-- ------------------------------------------------------------
-- Make yourself app admin (run once with your own email):
--   INSERT INTO user_roles (user_id, role)
--   SELECT id, 'admin' FROM auth.users WHERE email = 'tu@email.com'
--   ON CONFLICT DO NOTHING;
-- ------------------------------------------------------------
