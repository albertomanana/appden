-- ============================================================
-- The Appden - Reset cover bucket to "covers" only
-- Run this in Supabase SQL Editor
-- ============================================================

-- Optional cleanup: remove legacy "song-covers" bucket if it exists.
-- Note: deleting from storage.objects removes files from that bucket.
DELETE FROM storage.objects WHERE bucket_id = 'song-covers';
DELETE FROM storage.buckets WHERE id = 'song-covers';

-- Ensure required buckets
INSERT INTO storage.buckets (id, name, public)
VALUES
    ('avatars', 'avatars', false),
    ('songs', 'songs', false),
    ('covers', 'covers', false),
    ('files', 'files', false)
ON CONFLICT (id) DO NOTHING;

ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Recreate unified policies for covers bucket
DROP POLICY IF EXISTS "music_covers_select_authenticated" ON storage.objects;
CREATE POLICY "music_covers_select_authenticated" ON storage.objects
    FOR SELECT
    USING (
        bucket_id = 'covers'
        AND auth.role() = 'authenticated'
    );

DROP POLICY IF EXISTS "music_covers_insert_authenticated" ON storage.objects;
CREATE POLICY "music_covers_insert_authenticated" ON storage.objects
    FOR INSERT
    WITH CHECK (
        bucket_id = 'covers'
        AND auth.role() = 'authenticated'
    );

DROP POLICY IF EXISTS "music_covers_delete_own" ON storage.objects;
CREATE POLICY "music_covers_delete_own" ON storage.objects
    FOR DELETE
    USING (
        bucket_id = 'covers'
        AND auth.role() = 'authenticated'
        AND owner_id = auth.uid()
    );
