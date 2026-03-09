-- ============================================================
-- The Appden - Complete Database Migrations
-- Run this in Supabase SQL Editor (or via CLI)
-- ============================================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ── ENUMS ────────────────────────────────────────────────────

CREATE TYPE group_role AS ENUM ('owner', 'member');

CREATE TYPE debt_status AS ENUM ('pending', 'partial', 'paid');

CREATE TYPE debt_currency AS ENUM ('EUR', 'USD', 'GBP', 'MXN');

CREATE TYPE file_category AS ENUM ('image', 'document');

CREATE TYPE shared_link_visibility AS ENUM ('private', 'limited');

CREATE TYPE shared_link_resource_type AS ENUM ('song', 'playlist', 'debt', 'file');

CREATE TYPE notification_type AS ENUM (
  'song_added', 'debt_created', 'debt_paid', 'playlist_created', 'file_uploaded'
);

-- ── PROFILES ─────────────────────────────────────────────────
-- Auto-created when a new auth.user signs up via trigger.

CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
    display_name TEXT NOT NULL CHECK (
        length(display_name) BETWEEN 2 AND 60
    ),
    username TEXT UNIQUE CHECK (
        username ~ '^[a-z0-9_]{3,30}$'
    ),
    avatar_url TEXT,
    bio TEXT CHECK (length(bio) <= 200),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Trigger: create profile on auth.user insert
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, display_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1))
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ── GROUPS ───────────────────────────────────────────────────

CREATE TABLE groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
    name TEXT NOT NULL CHECK (length(name) BETWEEN 2 AND 80),
    description TEXT CHECK (length(description) <= 500),
    avatar_url TEXT,
    created_by UUID NOT NULL REFERENCES profiles (id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE group_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
    group_id UUID NOT NULL REFERENCES groups (id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles (id) ON DELETE CASCADE,
    role group_role NOT NULL DEFAULT 'member',
    joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (group_id, user_id)
);

CREATE INDEX idx_group_members_group_id ON group_members (group_id);

CREATE INDEX idx_group_members_user_id ON group_members (user_id);

-- ── SONGS ────────────────────────────────────────────────────

CREATE TABLE songs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
    group_id UUID NOT NULL REFERENCES groups (id) ON DELETE CASCADE,
    uploaded_by UUID NOT NULL REFERENCES profiles (id),
    title TEXT NOT NULL CHECK (
        length(title) BETWEEN 1 AND 100
    ),
    artist_name TEXT NOT NULL CHECK (
        length(artist_name) BETWEEN 1 AND 100
    ),
    album_name TEXT CHECK (length(album_name) <= 100),
    cover_url TEXT,
    audio_url TEXT NOT NULL,
    duration_seconds NUMERIC(10, 2),
    file_size BIGINT CHECK (file_size > 0),
    mime_type TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_songs_group_id ON songs (group_id);

CREATE INDEX idx_songs_uploaded_by ON songs (uploaded_by);

CREATE INDEX idx_songs_created_at ON songs (group_id, created_at DESC);

-- ── FAVORITES ────────────────────────────────────────────────

CREATE TABLE favorites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
    user_id UUID NOT NULL REFERENCES profiles (id) ON DELETE CASCADE,
    song_id UUID NOT NULL REFERENCES songs (id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (user_id, song_id)
);

CREATE INDEX idx_favorites_user_id ON favorites (user_id);

CREATE INDEX idx_favorites_song_id ON favorites (song_id);

-- ── PLAYLISTS ────────────────────────────────────────────────

CREATE TABLE playlists (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
    group_id UUID NOT NULL REFERENCES groups (id) ON DELETE CASCADE,
    created_by UUID NOT NULL REFERENCES profiles (id),
    name TEXT NOT NULL CHECK (length(name) BETWEEN 1 AND 80),
    description TEXT CHECK (length(description) <= 300),
    cover_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE playlist_songs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
    playlist_id UUID NOT NULL REFERENCES playlists (id) ON DELETE CASCADE,
    song_id UUID NOT NULL REFERENCES songs (id) ON DELETE CASCADE,
    position INTEGER NOT NULL DEFAULT 0,
    added_by UUID NOT NULL REFERENCES profiles (id),
    added_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (playlist_id, song_id)
);

CREATE INDEX idx_playlists_group_id ON playlists (group_id);

CREATE INDEX idx_playlist_songs_playlist ON playlist_songs (playlist_id, position);

-- ── DEBTS ────────────────────────────────────────────────────

CREATE TABLE debts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
    group_id UUID NOT NULL REFERENCES groups (id) ON DELETE CASCADE,
    creditor_id UUID NOT NULL REFERENCES profiles (id), -- who lent
    debtor_id UUID NOT NULL REFERENCES profiles (id), -- who owes
    amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
    currency debt_currency NOT NULL DEFAULT 'EUR',
    concept TEXT NOT NULL CHECK (
        length(concept) BETWEEN 1 AND 200
    ),
    status debt_status NOT NULL DEFAULT 'pending',
    amount_paid NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (amount_paid >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CHECK (creditor_id <> debtor_id),
    CHECK (amount_paid <= amount)
);

CREATE TABLE debt_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
    debt_id UUID NOT NULL REFERENCES debts (id) ON DELETE CASCADE,
    amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
    note TEXT CHECK (length(note) <= 200),
    paid_by UUID NOT NULL REFERENCES profiles (id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_debts_group_id ON debts (group_id);

CREATE INDEX idx_debts_creditor ON debts (creditor_id);

CREATE INDEX idx_debts_debtor ON debts (debtor_id);

CREATE INDEX idx_debts_status ON debts (group_id, status);

CREATE INDEX idx_debt_payments_debt ON debt_payments (debt_id);

-- ── FILES ────────────────────────────────────────────────────

CREATE TABLE files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
    group_id UUID NOT NULL REFERENCES groups (id) ON DELETE CASCADE,
    uploaded_by UUID NOT NULL REFERENCES profiles (id),
    name TEXT NOT NULL CHECK (
        length(name) BETWEEN 1 AND 200
    ),
    file_url TEXT NOT NULL,
    file_size BIGINT CHECK (file_size > 0),
    mime_type TEXT,
    category file_category NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_files_group_id ON files (group_id);

-- ── SHARED LINKS ─────────────────────────────────────────────

CREATE TABLE shared_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
    token TEXT UNIQUE NOT NULL,
    resource_type shared_link_resource_type NOT NULL,
    resource_id UUID NOT NULL,
    created_by UUID NOT NULL REFERENCES profiles (id) ON DELETE CASCADE,
    visibility shared_link_visibility NOT NULL DEFAULT 'private',
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_shared_links_token ON shared_links (token);

CREATE INDEX idx_shared_links_resource ON shared_links (resource_id, resource_type);

-- ── NOTIFICATIONS ────────────────────────────────────────────

CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
    user_id UUID NOT NULL REFERENCES profiles (id) ON DELETE CASCADE,
    group_id UUID NOT NULL REFERENCES groups (id) ON DELETE CASCADE,
    type notification_type NOT NULL,
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    read BOOLEAN NOT NULL DEFAULT false,
    resource_type shared_link_resource_type,
    resource_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_notifications_user_id ON notifications (
    user_id,
    read,
    created_at DESC
);

-- ── UPDATED_AT TRIGGERS ──────────────────────────────────────

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_groups_updated_at
  BEFORE UPDATE ON groups
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_playlists_updated_at
  BEFORE UPDATE ON playlists
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_debts_updated_at
  BEFORE UPDATE ON debts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- ROW LEVEL SECURITY (RLS) - CRITICAL FOR PRIVACY
-- ============================================================
-- All tables have RLS enabled by default. Tables must have explicit policies.
-- Principle: Data is private by default. Users can only see/modify their own data
-- or data within their groups.

-- ── PROFILES ──────────────────────────────────────────────

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- System (via trigger) can insert new profiles on auth signup
CREATE POLICY "profiles_insert_system" ON profiles
    FOR INSERT
    WITH CHECK (true);

-- Any authenticated user can read any profile (needed for joins)
-- but only the owner can modify theirs
CREATE POLICY "profiles_select_all" ON profiles
    FOR SELECT
    USING (auth.role() = 'authenticated');

CREATE POLICY "profiles_update_own" ON profiles
    FOR UPDATE
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles_delete_own" ON profiles
    FOR DELETE
    USING (auth.uid() = id);

-- ── GROUPS ────────────────────────────────────────────────

ALTER TABLE groups ENABLE ROW LEVEL SECURITY;

-- Users can see groups they're a member of
CREATE POLICY "groups_select_own" ON groups
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM group_members
            WHERE group_members.group_id = groups.id
              AND group_members.user_id = auth.uid()
        )
        OR groups.created_by = auth.uid()
    );

-- Only group owner can update/delete
CREATE POLICY "groups_update_owner" ON groups
    FOR UPDATE
    USING (groups.created_by = auth.uid());

CREATE POLICY "groups_delete_owner" ON groups
    FOR DELETE
    USING (groups.created_by = auth.uid());

-- Only group members can insert (through app logic)
CREATE POLICY "groups_insert_auth" ON groups
    FOR INSERT
    WITH CHECK (groups.created_by = auth.uid());

-- ── GROUP MEMBERS ─────────────────────────────────────────

ALTER TABLE group_members ENABLE ROW LEVEL SECURITY;

-- Users can see members of groups they're part of
CREATE POLICY "group_members_select" ON group_members
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM group_members gm
            WHERE gm.group_id = group_members.group_id
              AND gm.user_id = auth.uid()
        )
    );

-- Group owner can manage members
CREATE POLICY "group_members_insert_owner" ON group_members
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM groups
            WHERE groups.id = group_members.group_id
              AND groups.created_by = auth.uid()
        )
    );

CREATE POLICY "group_members_delete_owner" ON group_members
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM groups
            WHERE groups.id = group_members.group_id
              AND groups.created_by = auth.uid()
        )
    );

-- ── SONGS ─────────────────────────────────────────────────

ALTER TABLE songs ENABLE ROW LEVEL SECURITY;

-- Users can read songs from groups they're members of
CREATE POLICY "songs_select_group_member" ON songs
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM group_members
            WHERE group_members.group_id = songs.group_id
              AND group_members.user_id = auth.uid()
        )
    );

-- Users can upload songs to their groups
CREATE POLICY "songs_insert_group_member" ON songs
    FOR INSERT
    WITH CHECK (
        songs.uploaded_by = auth.uid()
        AND EXISTS (
            SELECT 1 FROM group_members
            WHERE group_members.group_id = songs.group_id
              AND group_members.user_id = auth.uid()
        )
    );

-- Uploader can delete their own songs
CREATE POLICY "songs_delete_owner" ON songs
    FOR DELETE
    USING (songs.uploaded_by = auth.uid());

-- ── FAVORITES ────────────────────────────────────────────

ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;

-- Users can only see/manage their own favorites
CREATE POLICY "favorites_select_own" ON favorites
    FOR SELECT
    USING (favorites.user_id = auth.uid());

CREATE POLICY "favorites_insert_own" ON favorites
    FOR INSERT
    WITH CHECK (favorites.user_id = auth.uid());

CREATE POLICY "favorites_delete_own" ON favorites
    FOR DELETE
    USING (favorites.user_id = auth.uid());

-- ── PLAYLISTS ────────────────────────────────────────────

ALTER TABLE playlists ENABLE ROW LEVEL SECURITY;

-- Users can see playlists in their groups
CREATE POLICY "playlists_select_group_member" ON playlists
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM group_members
            WHERE group_members.group_id = playlists.group_id
              AND group_members.user_id = auth.uid()
        )
    );

-- Members can create playlists in their groups
CREATE POLICY "playlists_insert_group_member" ON playlists
    FOR INSERT
    WITH CHECK (
        playlists.created_by = auth.uid()
        AND EXISTS (
            SELECT 1 FROM group_members
            WHERE group_members.group_id = playlists.group_id
              AND group_members.user_id = auth.uid()
        )
    );

-- Creator can update/delete their playlists
CREATE POLICY "playlists_update_creator" ON playlists
    FOR UPDATE
    USING (playlists.created_by = auth.uid());

CREATE POLICY "playlists_delete_creator" ON playlists
    FOR DELETE
    USING (playlists.created_by = auth.uid());

-- ── PLAYLIST SONGS ────────────────────────────────────────

ALTER TABLE playlist_songs ENABLE ROW LEVEL SECURITY;

-- Users can see songs in playlists they can access
CREATE POLICY "playlist_songs_select" ON playlist_songs
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM playlists
            WHERE playlists.id = playlist_songs.playlist_id
              AND EXISTS (
                SELECT 1 FROM group_members
                WHERE group_members.group_id = playlists.group_id
                  AND group_members.user_id = auth.uid()
            )
        )
    );

-- Group members can add songs to playlists (via app)
CREATE POLICY "playlist_songs_insert" ON playlist_songs
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM playlists
            WHERE playlists.id = playlist_songs.playlist_id
              AND EXISTS (
                SELECT 1 FROM group_members
                WHERE group_members.group_id = playlists.group_id
                  AND group_members.user_id = auth.uid()
            )
        )
        AND playlist_songs.added_by = auth.uid()
    );

-- Creator of playlist can remove songs
CREATE POLICY "playlist_songs_delete" ON playlist_songs
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM playlists
            WHERE playlists.id = playlist_songs.playlist_id
              AND playlists.created_by = auth.uid()
        )
    );

-- ── DEBTS ─────────────────────────────────────────────────

ALTER TABLE debts ENABLE ROW LEVEL SECURITY;

-- Users can see debts they're involved in (as creditor or debtor)
-- or debts in their group
CREATE POLICY "debts_select_involved" ON debts
    FOR SELECT
    USING (
        debts.creditor_id = auth.uid()
        OR debts.debtor_id = auth.uid()
        OR EXISTS (
            SELECT 1 FROM group_members
            WHERE group_members.group_id = debts.group_id
              AND group_members.user_id = auth.uid()
        )
    );

-- Group members can create debts
CREATE POLICY "debts_insert_group_member" ON debts
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM group_members
            WHERE group_members.group_id = debts.group_id
              AND group_members.user_id = auth.uid()
        )
    );

-- Creditor can update their debts
CREATE POLICY "debts_update_creditor" ON debts
    FOR UPDATE
    USING (debts.creditor_id = auth.uid());

-- Creditor can delete their debts
CREATE POLICY "debts_delete_creditor" ON debts
    FOR DELETE
    USING (debts.creditor_id = auth.uid());

-- ── DEBT PAYMENTS ─────────────────────────────────────────

ALTER TABLE debt_payments ENABLE ROW LEVEL SECURITY;

-- Involved parties and group members can see payments
CREATE POLICY "debt_payments_select" ON debt_payments
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM debts
            WHERE debts.id = debt_payments.debt_id
              AND (
                debts.creditor_id = auth.uid()
                OR debts.debtor_id = auth.uid()
                OR EXISTS (
                    SELECT 1 FROM group_members
                    WHERE group_members.group_id = debts.group_id
                      AND group_members.user_id = auth.uid()
                )
            )
        )
    );

-- Debtor can record payments
CREATE POLICY "debt_payments_insert_debtor" ON debt_payments
    FOR INSERT
    WITH CHECK (
        debt_payments.paid_by = auth.uid()
        AND EXISTS (
            SELECT 1 FROM debts
            WHERE debts.id = debt_payments.debt_id
              AND debts.debtor_id = auth.uid()
        )
    );

-- ── FILES ────────────────────────────────────────────────

ALTER TABLE files ENABLE ROW LEVEL SECURITY;

-- Group members can see files in their groups
CREATE POLICY "files_select_group_member" ON files
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM group_members
            WHERE group_members.group_id = files.group_id
              AND group_members.user_id = auth.uid()
        )
    );

-- Group members can upload files
CREATE POLICY "files_insert_group_member" ON files
    FOR INSERT
    WITH CHECK (
        files.uploaded_by = auth.uid()
        AND EXISTS (
            SELECT 1 FROM group_members
            WHERE group_members.group_id = files.group_id
              AND group_members.user_id = auth.uid()
        )
    );

-- Uploader can delete their files
CREATE POLICY "files_delete_owner" ON files
    FOR DELETE
    USING (files.uploaded_by = auth.uid());

-- ── SHARED LINKS ──────────────────────────────────────────

ALTER TABLE shared_links ENABLE ROW LEVEL SECURITY;

-- Any authenticated user can read shared links (to resolve them)
-- This is safe because checking visibility/expiry is done at app level
CREATE POLICY "shared_links_select_auth" ON shared_links
    FOR SELECT
    USING (auth.role() = 'authenticated');

-- Any authenticated user can create shared links for resources they own
CREATE POLICY "shared_links_insert_auth" ON shared_links
    FOR INSERT
    WITH CHECK (shared_links.created_by = auth.uid());

-- Creator can delete their shared links
CREATE POLICY "shared_links_delete_owner" ON shared_links
    FOR DELETE
    USING (shared_links.created_by = auth.uid());

-- ── NOTIFICATIONS ────────────────────────────────────────

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Users can only see their own notifications
CREATE POLICY "notifications_select_own" ON notifications
    FOR SELECT
    USING (notifications.user_id = auth.uid());

-- Only system can insert (via trigger/function)
CREATE POLICY "notifications_insert_system" ON notifications
    FOR INSERT
    WITH CHECK (false); -- Blocked at row level, use triggers instead

-- Users can mark their notifications as read
CREATE POLICY "notifications_update_own" ON notifications
    FOR UPDATE
    USING (notifications.user_id = auth.uid())
    WITH CHECK (notifications.user_id = auth.uid());

-- Users can delete their notifications
CREATE POLICY "notifications_delete_own" ON notifications
    FOR DELETE
    USING (notifications.user_id = auth.uid());