# Repo Map

Snapshot date: 2026-04-07

## Root

- `README.md`: general project documentation
- `QUICK_START.md`: quick setup
- `CONTRIBUTING.md`: contribution rules
- `docs/*`: branching, onboarding, launch, GitHub setup
- QA docs:
  - `docs/QA_PRELAUNCH_AUDIT.md`
  - `docs/QA_FUNCTIONAL_MAP.md`
  - `docs/QA_TEST_CHECKLIST.md`
  - `docs/QA_SEEDING_GUIDE.md`
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
- `src/components/layout/Navigation.tsx`: floating 5-item bottom dock (mobile-safe centered grid)
- `src/components/ui/PageHeader.tsx`: reusable editorial hero/header block for key screens
- `src/components/ui/Toast.tsx`: animated toast system
- `src/components/ui/ConfirmDialog.tsx`: animated confirmation modal
- `src/components/ui/Button.tsx`: action primitive
- `src/components/ui/Card.tsx`: surface primitive
- `src/components/ui/Chip.tsx`: chip/toggle primitive
- `src/components/ui/Input.tsx`: field primitive
- `src/components/ui/Modal.tsx`: modal primitive
- `src/components/ui/Tabs.tsx`: section/tab navigation primitive
- `src/styles/globals.css`: design tokens, premium dark theme utilities, cards/buttons/forms
- `tailwind.config.js`: theme tokens + font families aligned with current visual system

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
- `src/features/social/services/connections.service.ts`
- `src/services/debts.service.ts`
- `src/services/debt-pro.service.ts`
- `src/services/files.service.ts`
- `src/services/share.service.ts`
- `src/services/shared-links.service.ts`
- `src/services/playlists.service.ts`
- music artist credit helpers:
  - `src/features/music/utils/artistCredits.ts`

Pre-launch critical files:

- `src/components/music/SongUploadForm.tsx`: upload modal and client validation
- `src/components/music/SongArtistCreditsInput.tsx`: structured one-or-many artist credit input
- `src/features/player/components/MiniPlayer.tsx`: mobile floating player dock above nav
- `src/features/player/components/FullPlayer.tsx`: immersive full-screen player
- `src/features/social/components/GroupActivityFeed.tsx`: premium social/activity feed card stack

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
  - `src/pages/reports/ReportsPage.tsx`
  - `src/pages/reports/ReportDetailPage.tsx`
- connections:
  - `src/pages/connections/ConnectionsPage.tsx`
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
  - `supabase/migrations/009_social_connections_reports_admin.sql`
  - `supabase/migrations/010_groups_rls_rpc_hardening.sql`
  - `supabase/migrations/011_song_upload_storage_hardening.sql`
  - `supabase/migrations/012_song_artist_credits.sql`
- changelog automation:
  - `scripts/generate-changelog-from-git.mjs`
  - QA seed system:
    - `scripts/qa-seed/shared.mjs`
    - `scripts/qa-seed/reset.mjs`
    - `scripts/qa-seed/fixtures.mjs`
    - `scripts/qa-seed/seed.mjs`
  - `.github/workflows/changelog-develop.yml`
  - `public/changelog.generated.json`

## UI integration note

The current premium visual layer was integrated from a Stitch export reference, but only as a design system merge:

- do not search for a parallel `stitch/` React app inside the repo
- the merged output lives directly in the current shell, shared components, and page JSX
