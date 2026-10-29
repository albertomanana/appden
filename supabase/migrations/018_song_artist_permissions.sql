-- ============================================================
-- Migration 018 - Credited artists can edit their songs
--
-- Safe to run more than once. Apply AFTER 012 and 016.
--
-- Until now only the uploader could update a song or its artist
-- credits. In a friend group the artists ARE the members, so anyone
-- credited on a song (song_artist_credits.profile_id) or listed in
-- song_owners can now edit its metadata and credits. Deleting the
-- song is still reserved to the uploader.
-- ============================================================

CREATE OR REPLACE FUNCTION public.can_edit_song(p_song_id UUID, p_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (SELECT 1 FROM songs s WHERE s.id = p_song_id AND s.uploaded_by = p_user_id)
        OR EXISTS (SELECT 1 FROM song_owners so WHERE so.song_id = p_song_id AND so.user_id = p_user_id)
        OR EXISTS (SELECT 1 FROM song_artist_credits c WHERE c.song_id = p_song_id AND c.profile_id = p_user_id);
$$;

REVOKE ALL ON FUNCTION public.can_edit_song(UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_edit_song(UUID, UUID) TO authenticated;

-- songs: uploader, owners and credited artists can update (must stay in a group they belong to).
DROP POLICY IF EXISTS "songs_update_uploader" ON songs;
DROP POLICY IF EXISTS "songs_update_editors" ON songs;
CREATE POLICY "songs_update_editors" ON songs
    FOR UPDATE
    USING (can_edit_song(songs.id, auth.uid()))
    WITH CHECK (can_edit_song(songs.id, auth.uid()) AND is_group_member(songs.group_id, auth.uid()));

-- song_artist_credits: same editors can add, change or remove credits.
DROP POLICY IF EXISTS "song_artist_credits_insert_uploader" ON song_artist_credits;
DROP POLICY IF EXISTS "song_artist_credits_insert_editors" ON song_artist_credits;
CREATE POLICY "song_artist_credits_insert_editors" ON song_artist_credits
    FOR INSERT
    WITH CHECK (
        COALESCE(song_artist_credits.added_by, auth.uid()) = auth.uid()
        AND can_edit_song(song_artist_credits.song_id, auth.uid())
    );

DROP POLICY IF EXISTS "song_artist_credits_update_uploader" ON song_artist_credits;
DROP POLICY IF EXISTS "song_artist_credits_update_editors" ON song_artist_credits;
CREATE POLICY "song_artist_credits_update_editors" ON song_artist_credits
    FOR UPDATE
    USING (can_edit_song(song_artist_credits.song_id, auth.uid()))
    WITH CHECK (can_edit_song(song_artist_credits.song_id, auth.uid()));

DROP POLICY IF EXISTS "song_artist_credits_delete_uploader" ON song_artist_credits;
DROP POLICY IF EXISTS "song_artist_credits_delete_editors" ON song_artist_credits;
CREATE POLICY "song_artist_credits_delete_editors" ON song_artist_credits
    FOR DELETE
    USING (can_edit_song(song_artist_credits.song_id, auth.uid()));
