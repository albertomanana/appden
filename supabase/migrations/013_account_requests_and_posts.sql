-- ============================================================
-- Migration 013 - Account approval requests and simple posts table
-- Adds: profiles.is_approved (for future accounts), account_requests table,
--       posts table and simple post_likes table.
-- ============================================================

-- Add approval flag to profiles. New accounts will default to false (pending),
-- but we set existing profiles to TRUE so upgrading doesn't lock out current users.
ALTER TABLE IF EXISTS profiles
    ADD COLUMN IF NOT EXISTS is_approved boolean NOT NULL DEFAULT false;

-- Mark existing profiles as approved (upgrade path)
UPDATE profiles SET is_approved = true WHERE is_approved IS NULL OR is_approved = false;

-- After enabling existing to approved, change default for new rows to false
ALTER TABLE profiles ALTER COLUMN is_approved SET DEFAULT false;

-- Account requests table: created automatically via trigger when a new profile
-- is created with is_approved = false (sign-up requests)
CREATE TABLE IF NOT EXISTS account_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','cancelled')),
    message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    responded_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_account_requests_status ON account_requests(status, created_at DESC);

-- Trigger to create account_request when a profile is created and is_approved = false
CREATE OR REPLACE FUNCTION public.create_account_request_on_profile_insert()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    IF (NEW.is_approved = false) THEN
        INSERT INTO account_requests (profile_id, email, message)
        VALUES (NEW.id, NEW.username::text, NULL);
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_create_account_request ON profiles;
CREATE TRIGGER trg_create_account_request
AFTER INSERT ON profiles
FOR EACH ROW EXECUTE FUNCTION public.create_account_request_on_profile_insert();

-- Posts table (mini-twitter style)
CREATE TABLE IF NOT EXISTS posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    content TEXT NOT NULL CHECK (char_length(content) <= 280),
    visibility TEXT NOT NULL DEFAULT 'public' CHECK (visibility IN ('public','private','group')),
    group_id UUID NULL REFERENCES groups(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts(created_at DESC);

-- Post likes
CREATE TABLE IF NOT EXISTS post_likes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (post_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_post_likes_post ON post_likes(post_id);

-- Enable RLS for these tables to allow future per-row policies (projects using RLS)
ALTER TABLE IF EXISTS account_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS post_likes ENABLE ROW LEVEL SECURITY;

-- (Optional) simple policies: allow users to insert their own posts and likes,
-- allow select for authenticated users. Adjust in dashboard as needed.
DROP POLICY IF EXISTS posts_select_authenticated ON posts;
CREATE POLICY posts_select_authenticated ON posts
    FOR SELECT
    USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS posts_insert_owner ON posts;
CREATE POLICY posts_insert_owner ON posts
    FOR INSERT
    WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS post_likes_insert_owner ON post_likes;
CREATE POLICY post_likes_insert_owner ON post_likes
    FOR INSERT
    WITH CHECK (user_id = auth.uid());

-- RPC: approve_account_request(request_id, admin_user_id)
-- Sets account_requests.status = 'approved', sets profiles.is_approved = true
CREATE OR REPLACE FUNCTION public.approve_account_request(p_request_id UUID, p_admin_user_id UUID)
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
    UPDATE account_requests SET status = 'approved', responded_at = now() WHERE id = p_request_id;
    UPDATE profiles SET is_approved = true WHERE id = (SELECT profile_id FROM account_requests WHERE id = p_request_id);
    -- Optionally: insert an admin action audit row (omitted - extend as needed)
END;
$$;
