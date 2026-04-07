# App Context

Snapshot date: 2026-04-07

## Product

The Appden is a private PWA for friend groups to:

- upload/share music
- play songs with a simplified global player
- collaborate on lyrics
- interact socially on songs
- track debts and payments
- share files and links
- publish internal changelog notes
- report bugs/improvements from the app

Core principles:

- private-by-default data model with Supabase RLS
- mobile-first usage
- group-scoped collaboration

## Tech stack

- Frontend: React 18 + TypeScript + Vite
- Styling: TailwindCSS + shared design tokens in `src/styles/globals.css`
- State: Zustand + React Query
- Routing: React Router
- Backend: Supabase (Auth, Postgres, Storage)
- PWA: `vite-plugin-pwa`
- Motion: `framer-motion`
- Audio engine: single global HTML audio path via `src/features/player`

## Runtime modules

### 1) Auth + session

- `src/app/providers/AuthProvider.tsx`
- `src/services/auth.service.ts`
- session storage key includes Supabase project ref:
  - `the-appden-auth:<projectRef>:v2`
- v1.5.3 hardening:
  - if group loading fails during bootstrap, keep authenticated session and fallback to empty groups (avoid forced re-login loops)

### 2) Music catalog + upload

- `src/services/songs.service.ts`
- `src/components/music/SongUploadForm.tsx`
- `src/components/music/SongArtistCreditsInput.tsx`
- `src/features/music/utils/artistCredits.ts`
- storage buckets used in code:
  - `avatars`
  - `covers`
  - `songs`
  - `files`
- `reports` (new, with fallback upload path to `files`)

v1.6.1 pre-launch hardening:

- `songsService.uploadSong(...)` now:
  - uploads audio/cover with explicit content types
  - stores group-scoped storage paths
  - cleans up storage objects if DB metadata insert fails
  - returns clearer user-facing errors for missing buckets / RLS / oversized payloads
- uploader ownership and upload feed activity are now expected to be created server-side by migration `011_song_upload_storage_hardening.sql`

v1.6.2 music-core simplification:

- upload form now focuses on:
  - audio file
  - optional cover
  - title
  - artist credits
  - optional album
- upload success no longer waits for automatic lyrics transcription
- if the user selected a cover and the cover upload fails, the whole upload now fails clearly instead of silently continuing with a partial result

v1.6.3 music catalog reliability:

- songs are now hydrated in phases:
  - base song rows
  - uploader profiles
  - owner links
  - artist credits
  - user favorites
  - signed audio/cover URLs
- artist metadata now supports:
  - compatibility summary string in `songs.artist_name`
  - structured rows in `song_artist_credits`
- upload/edit now support:
  - one artist or many artists
  - existing group users as artist credits
  - external manual artists without user accounts
- if migration `012_song_artist_credits.sql` is missing, the app falls back to the summary string and tolerates the missing relation without crashing

### 2.1) Playlists

- `src/services/playlists.service.ts`
- `src/pages/playlists/PlaylistsPage.tsx`
- `src/pages/playlists/PlaylistDetailPage.tsx`
- `src/components/playlists/PlaylistForm.tsx`

v1.6.3 playlist reliability:

- playlists list now resolves creator profile + song counts explicitly
- playlist detail now resolves songs through `songsService.getSongsByIds(...)`
- this avoids the old failure mode where playlist reads returned raw storage paths that were not playable in the global player
- playlists pages now expose explicit load/error/no-group states

### 3) Global player

- `src/features/player/*`
- integrated globally in:
  - `src/components/layout/AppLayout.tsx` via `MiniPlayer` + `FullPlayer`
- v1.6.2 music-core simplification:
  - single stable audio engine
  - no active crossfade / EQ processing in the listening flow
  - player surface now prioritizes:
    - play/pause
    - previous/next
    - progress
    - volume
    - queue
  - removed old experimental player components and debug surfaces

### 4) Lyrics

- `src/services/lyrics.service.ts`
- `src/services/asr.service.ts`
- `src/components/music/LyricsPanel.tsx`

### 5) Song social (refactored)

- `src/features/social/components/SongSocialPanel.tsx`
- `src/features/social/components/GroupActivityFeed.tsx`
- `src/features/social/services/social.service.ts`
- `src/features/social/services/activity-feed.service.ts`
- `src/features/social/hooks/useSongSocial.ts`

Capabilities:

- song likes
- nested comments/replies
- edit/delete own comments
- comment likes
- quick reactions (`fire`, `heart`, `headphones`)
- `@mention` suggestions
- timestamp tokens in comments (`[mm:ss]`)
- group activity feed
- group invitations (owner/admin invites non-members, invitee accepts/rejects)
- global user connections:
  - `friend_requests` + `friendships`
  - search users, send/accept/reject/cancel
  - reusable in group invite flow (`only connections` filter)

Compatibility wrappers kept:

- `src/services/song-social.service.ts`
- `src/services/group-activity.service.ts`
- `src/components/music/SongSocialPanel.tsx`
- `src/components/music/GroupActivityFeed.tsx`

### 6) Changelog

- `src/features/changelog/*`
- `src/pages/changelog/ChangelogPage.tsx`

Capabilities:

- route `/changelog`
- current version + release notes timeline
- item types: `feature`, `fix`, `improvement`, `update`
- primary source:
  - Supabase `changelog_entries` when real rows exist
  - fallback: generated git JSON (`public/changelog.generated.json`)
- automation:
  - `scripts/generate-changelog-from-git.mjs`
  - `.github/workflows/changelog-develop.yml`
- final fallback source: localStorage compatibility path

### 7) Reports

- `src/features/reports/*`
- `src/pages/reports/ReportsPage.tsx`
- `src/pages/reports/ReportDetailPage.tsx`

Capabilities:

- routes `/reports` and `/reports/:reportId` (`/report` redirects)
- form fields: type, title, description, reproduction_steps, severity, optional image
- public-in-app visibility for authenticated users
- statuses: `open`, `in_review`, `resolved`, `closed`
- admin-ready model:
  - `user_roles` (`admin`)
  - `report_notifications` + unread counter
- Supabase table source: `reports`

## Route map

Router: `src/app/router/index.tsx`

Main protected routes:

- `/` dashboard
- `/music`, `/music/:songId`
- `/playlists`, `/playlists/:playlistId`
- `/favorites`
- `/connections`
- `/changelog`
- `/reports`, `/reports/:reportId`
- `/debts`, `/debts/:debtId`
- `/groups`, `/groups/:groupId`
- `/notifications`
- `/files`

Public routes:

- `/login`
- `/register`
- `/reset-password`
- `/shared/:token`

## UI system snapshot (v1.6)

The current visual layer is no longer a loose set of page-specific styles. It is now organized around a shared shell and premium dark design system inspired by the Stitch export.

Key UI primitives:

- `src/components/layout/AppLayout.tsx`: fixed black translucent top bar + player-aware shell
- `src/components/layout/Navigation.tsx`: Stitch-like 5-item floating bottom dock
- `src/components/ui/PageHeader.tsx`: editorial hero header reused by key product pages
- `src/components/ui/Toast.tsx`: motion-powered toast system
- `src/components/ui/ConfirmDialog.tsx`: motion-powered destructive confirmation modal
- `src/components/ui/Button.tsx`: shared action primitive
- `src/components/ui/Card.tsx`: shared dark surface primitive
- `src/components/ui/Chip.tsx`: pill filters/toggles
- `src/components/ui/Input.tsx`: shared field primitive
- `src/components/ui/Modal.tsx`: shared modal shell
- `src/components/ui/Tabs.tsx`: shared secondary navigation primitive
- `src/styles/globals.css`: typography, cards, buttons, inputs, glass surfaces, hero utilities
- `tailwind.config.js`: updated tokens for surface blacks, blue/violet accents, editorial fonts

Important design decision:

- the Stitch export was not imported as a parallel frontend
- it was treated as a visual reference system
- existing routes, services, auth, stores, queries and Supabase contracts remain the source of truth
- after the aggressive rebuild, visual priority is explicitly Stitch-first:
  - open editorial headers instead of boxed hero cards
  - a single floating bottom dock replaces the previous sidebar-first mental model
  - secondary routes are exposed through tabs and section hubs instead of a dense primary nav

v1.6.1 pre-launch shell refinements:

- bottom dock rebuilt to a 5-column centered grid to prevent mobile overflow and right-shift
- mobile toasts now stack centered above the dock instead of competing with it from the right edge
- mini player now shares the same horizontal grid and safe-area rhythm as the dock
- social feed upgraded from a flat list to a featured-card + timeline layout
- full player received another polish pass for stronger hierarchy and more immersive presentation

v1.6.2 music-core UI simplification:

- `MusicPage` now centers the core library flow:
  - search
  - upload
  - play all
  - song list
- `GroupActivityFeed` was removed from the main music library page to reduce noise around the music flow
- `SongDetailPage` now uses a stable static background instead of cover-driven palette extraction

## Current quality snapshot

- `npm run build`: pass
- `npm run lint`: pass
- `npx tsc --noEmit`: pass
- bundle warning remains: main chunk over 500 kB
- known production prerequisites:
  - migration `011_song_upload_storage_hardening.sql` for stable upload/storage ownership flow
  - migration `012_song_artist_credits.sql` for structured multi-artist persistence

## QA readiness additions

- reusable QA seed scripts:
  - `scripts/qa-seed/shared.mjs`
  - `scripts/qa-seed/reset.mjs`
  - `scripts/qa-seed/fixtures.mjs`
  - `scripts/qa-seed/seed.mjs`
- QA docs:
  - `docs/QA_PRELAUNCH_AUDIT.md`
  - `docs/QA_FUNCTIONAL_MAP.md`
  - `docs/QA_TEST_CHECKLIST.md`
  - `docs/QA_SEEDING_GUIDE.md`
- current local workspace note:
  - seed scripts are implemented and syntax-validated
  - actual seed execution still requires `SUPABASE_SERVICE_ROLE_KEY`

## Recent runtime verification

- local browser smoke completed:
  - login page render
  - register page render
  - `/music` auth gate redirect
- full authenticated end-to-end smoke is still pending from this machine because the target Supabase project required email confirmation and then hit signup email rate limiting during QA account creation
