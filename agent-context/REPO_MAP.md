# Repo Map

Snapshot date: 2026-03-19

## Root

- `README.md`: general project documentation
- `QUICK_START.md`: quick setup
- `CONTRIBUTING.md`: contribution rules
- `docs/*`: branching, onboarding, launch, GitHub setup
- `supabase/migrations/*`: DB schema and feature migrations
- `supabase-storage-setup.sql`: storage bucket/policy setup script
- `agent-context/*`: persistent cross-IDE/cross-agent context pack
- `src/*`: application code

## Frontend app core

- `src/main.tsx`: app bootstrap
- `src/App.tsx`: root composition
- `src/app/router/index.tsx`: route definitions
- `src/app/providers/AuthProvider.tsx`: auth bootstrap/guarding
- `src/components/layout/AppLayout.tsx`: authenticated app shell + player integration
- `src/components/layout/Navigation.tsx`: mobile bottom nav + desktop sidebar

## Feature modules (current target architecture)

- `src/features/player/*`
- `src/features/social/*`
- `src/features/changelog/*`
- `src/features/reports/*`

## State stores

- legacy compatibility:
  - `src/app/store/player.store.ts`
- advanced player:
  - `src/features/player/player.store.ts`
- auth/group/notifications:
  - `src/app/store/auth.store.ts`
  - `src/app/store/group.store.ts`
  - `src/app/store/notifications.store.ts`

## Services layer

Core services:

- `src/services/auth.service.ts`
- `src/services/profile.service.ts`
- `src/services/groups.service.ts`
- `src/services/songs.service.ts`
- `src/services/favorites.service.ts`
- `src/services/lyrics.service.ts`
- `src/services/asr.service.ts`
- `src/services/friends.service.ts`
- `src/services/debts.service.ts`
- `src/services/debt-pro.service.ts`
- `src/services/files.service.ts`
- `src/services/share.service.ts`
- `src/services/shared-links.service.ts`
- `src/services/playlists.service.ts`

Compatibility wrappers (redirect to feature modules):

- `src/services/song-social.service.ts`
- `src/services/group-activity.service.ts`

## Major pages

- auth:
  - `src/pages/auth/LoginPage.tsx`
  - `src/pages/auth/RegisterPage.tsx`
  - `src/pages/auth/ResetPasswordPage.tsx`
- music:
  - `src/pages/music/MusicPage.tsx`
  - `src/pages/music/SongDetailPage.tsx`
- changelog:
  - `src/pages/changelog/ChangelogPage.tsx`
- report:
  - `src/pages/report/ReportPage.tsx`
- debts:
  - `src/pages/debts/DebtsPage.tsx`
  - `src/pages/debts/DebtDetailPage.tsx`
- groups:
  - `src/pages/groups/GroupsPage.tsx`
  - `src/pages/groups/GroupDetailPage.tsx`
- others:
  - `src/pages/DashboardPage.tsx`
  - `src/pages/FilesPage.tsx`
  - `src/pages/NotificationsPage.tsx`
  - `src/pages/SharedPage.tsx`

## Supabase and schema

- client config:
  - `src/lib/supabase/client.ts`
- schema/migrations:
  - `supabase/migrations/001_initial_schema.sql`
  - `supabase/migrations/002_song_lyrics_social.sql`
  - `supabase/migrations/003_lyrics_social_pro_features.sql`
  - `supabase/migrations/004_debts_pro_retention_admin.sql`
  - `supabase/migrations/005_social_friends_song_owners.sql`
  - `supabase/migrations/006_changelog_reports_social_hardening.sql`
  - `supabase/migrations/007_group_invitations.sql`
  - `supabase/migrations/008_fix_rls_groups_recursion.sql`
