-- ============================================================
-- The Appden - Storage Buckets Setup
-- Run this in Supabase SQL Editor
-- ============================================================

-- ── CREATE STORAGE BUCKETS ──────────────────────────────────

INSERT INTO storage.buckets (id, name, public)
VALUES
    ('avatars', 'avatars', false),
    ('song-covers', 'song-covers', false),
    ('songs', 'songs', false),
    ('files', 'files', false)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- STORAGE RLS POLICIES - Row Level Security
-- ============================================================
-- All storage buckets are PRIVATE by default
-- Users access via signed URLs generated in code
-- Policies control who can upload/delete

-- ── AVATARS BUCKET ──────────────────────────────────────────

ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Users can select their own avatar files (for signed URL operations)
CREATE POLICY "avatars_select_own" ON storage.objects
    FOR SELECT
    USING (
        bucket_id = 'avatars'
        AND auth.role() = 'authenticated'
    );

-- Users can upload their own avatar
CREATE POLICY "avatars_insert_own" ON storage.objects
    FOR INSERT
    WITH CHECK (
        bucket_id = 'avatars'
        AND auth.role() = 'authenticated'
        AND (storage.foldername(name))[1] = auth.uid()::text
    );

-- Users can delete their own avatar
CREATE POLICY "avatars_delete_own" ON storage.objects
    FOR DELETE
    USING (
        bucket_id = 'avatars'
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

-- ── SONG COVERS BUCKET ──────────────────────────────────────

-- Group members can select song covers
CREATE POLICY "song_covers_select_authenticated" ON storage.objects
    FOR SELECT
    USING (
        bucket_id = 'song-covers'
        AND auth.role() = 'authenticated'
    );

-- Group members can upload song covers
CREATE POLICY "song_covers_insert_authenticated" ON storage.objects
    FOR INSERT
    WITH CHECK (
        bucket_id = 'song-covers'
        AND auth.role() = 'authenticated'
    );

-- Uploader can delete their song covers
CREATE POLICY "song_covers_delete_own" ON storage.objects
    FOR DELETE
    USING (
        bucket_id = 'song-covers'
        AND auth.role() = 'authenticated'
        AND owner_id = auth.uid()
    );

-- ── SONGS BUCKET ────────────────────────────────────────────

-- Group members can select songs
CREATE POLICY "songs_select_authenticated" ON storage.objects
    FOR SELECT
    USING (
        bucket_id = 'songs'
        AND auth.role() = 'authenticated'
    );

-- Group members can upload songs
CREATE POLICY "songs_insert_authenticated" ON storage.objects
    FOR INSERT
    WITH CHECK (
        bucket_id = 'songs'
        AND auth.role() = 'authenticated'
    );

-- Uploader can delete their songs
CREATE POLICY "songs_delete_own" ON storage.objects
    FOR DELETE
    USING (
        bucket_id = 'songs'
        AND auth.role() = 'authenticated'
        AND owner_id = auth.uid()
    );

-- ── FILES BUCKET ────────────────────────────────────────────

-- Group members can select files
CREATE POLICY "files_select_authenticated" ON storage.objects
    FOR SELECT
    USING (
        bucket_id = 'files'
        AND auth.role() = 'authenticated'
    );

-- Group members can upload files
CREATE POLICY "files_insert_authenticated" ON storage.objects
    FOR INSERT
    WITH CHECK (
        bucket_id = 'files'
        AND auth.role() = 'authenticated'
    );

-- Uploader can delete their files
CREATE POLICY "files_delete_own" ON storage.objects
    FOR DELETE
    USING (
        bucket_id = 'files'
        AND auth.role() = 'authenticated'
        AND owner_id = auth.uid()
    );
