# Supabase Context

Snapshot date: 2026-03-20

## Environment variables

Expected in `.env.local`:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- optional:
  - `VITE_ASR_TRANSCRIBE_ENDPOINT`
  - `VITE_LYRICS_TRANSLATE_ENDPOINT`

## Migrations (run order)

1. `supabase/migrations/001_initial_schema.sql`
2. `supabase/migrations/002_song_lyrics_social.sql`
3. `supabase/migrations/003_lyrics_social_pro_features.sql`
4. `supabase/migrations/004_debts_pro_retention_admin.sql`
5. `supabase/migrations/005_social_friends_song_owners.sql`
6. `supabase/migrations/006_changelog_reports_social_hardening.sql`
7. `supabase/migrations/007_group_invitations.sql`
8. `supabase/migrations/008_fix_rls_groups_recursion.sql`
9. `supabase/migrations/009_social_connections_reports_admin.sql`
10. `supabase/migrations/010_groups_rls_rpc_hardening.sql`

## Storage buckets

Code expects these private buckets:

- `avatars`
- `covers`
- `songs`
- `files`
- `reports` (new; reports service falls back to `files` if bucket is missing)

New social invitation table:

- `group_invitations` (owner invites non-members; invitee can accept/reject)
- `friend_requests` and `friendships` (global user connections)

Admin/report extensions:

- `user_roles` (global `admin` role)
- `report_notifications` (admin unread queue on report creation trigger)

References:

- `src/lib/supabase/client.ts` (`STORAGE_BUCKETS`)
- `supabase-storage-setup.sql`
- `supabase/migrations/006_changelog_reports_social_hardening.sql`
- `supabase/migrations/007_group_invitations.sql`
- `supabase/migrations/008_fix_rls_groups_recursion.sql`
- `supabase/migrations/009_social_connections_reports_admin.sql`
- `supabase/migrations/010_groups_rls_rpc_hardening.sql`

## Critical historical incident

Issue: `StorageApiError: Bucket not found` while uploading covers.

Final naming decision:

- cover bucket name must be `covers` everywhere (dashboard + code + policies)

## Policy and SQL troubleshooting

### Error: `must be owner of table objects` (42501)

Meaning:

- executing ownership-sensitive statements on `storage.objects` with a role that is not table owner

Practical fix:

- create buckets from Supabase Storage UI
- manage bucket policies from Storage Policy UI, or run SQL with owner role
- avoid ownership-only `ALTER TABLE storage.objects` operations with limited roles

### Error: `operator does not exist: text = uuid` (42883)

Meaning:

- type mismatch in policy conditions

Fix pattern:

- cast `auth.uid()` when compared against text columns:
  - `auth.uid()::text`

### Error: `infinite recursion detected in policy for relation "groups"` (42P17)

Meaning:

- RLS policies created a dependency cycle between `groups` and `group_members` / `group_invitations`

Fix pattern:

- use SECURITY DEFINER helpers (`is_group_member`, `is_group_owner`, `is_group_manager`)
- replace recursive policies on `groups` and `group_members`
- create groups through `create_group_with_owner(...)` so owner membership is created atomically
- apply `010_groups_rls_rpc_hardening.sql` as the definitive fix

### Role model notes (after migration 010)

- `group_role` now supports `owner`, `admin`, `member`
- `groups` insert auto-creates owner membership row via trigger
- `create_group_with_owner(name, description)` is the preferred creation path from the app
- `groups` and `group_members` policies now rely on SECURITY DEFINER helpers instead of recursive subqueries
- owner/admin can manage members and invitations (owner-only operations remain restricted where applicable)
- reports are readable by all authenticated users in-app
- report status management is creator-or-admin

## Signed URL behavior

- app uses signed URLs for private buckets
- helper: `getStorageUrl(bucket, path)` in `src/lib/supabase/client.ts`
- function normalizes URLs and plain paths and retries path variants

## Missing-table fallback strategy in services

Several services intentionally degrade to localStorage if migration tables are missing:

- `lyrics.service.ts`
- `src/features/social/services/social.service.ts`
- `src/features/social/services/activity-feed.service.ts`
- `src/features/changelog/services/changelog.service.ts`
- `src/features/reports/services/reports.service.ts`
- `debt-pro.service.ts`

Detection pattern:

- checks relation errors (`42p01`, `pgrst205`, `does not exist`)

Implication:

- app can appear to work partially even when DB setup is incomplete
- production launch must verify migrations are fully applied

## Pre-launch DB checklist

- all 10 migrations executed in target project
- all 5 storage buckets exist with correct names (`reports` optional but recommended)
- storage policies allow authenticated read/upload where expected
- user can:
  - upload song + cover
  - fetch signed URLs for song and cover
  - login and load groups without recursion errors
  - create a group through the app without a second manual owner insert
  - use `/connections` to send/accept requests
  - open `/reports` and `/reports/:id`, create reports without mandatory group
  - see admin unread report counter once `user_roles` contains at least one admin
  - open `/changelog` with auto-generated commit feed
  - use social/changelog/reports routes without relation errors
