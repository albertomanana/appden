# App Context

Snapshot date: 2026-03-23

## Product

The Appden is a private PWA for friend groups to:

- upload/share music
- play songs with an advanced global player
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
- Audio engine: Web Audio API via `src/features/player`

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
- storage buckets used in code:
  - `avatars`
  - `covers`
  - `songs`
  - `files`
  - `reports` (new, with fallback upload path to `files`)

### 3) Advanced player

- `src/features/player/*`
- integrated globally in:
  - `src/components/layout/AppLayout.tsx` via `MiniPlayer` + `FullPlayer`
- v1.6 visual integration:
  - floating dock-style mini player
  - shell-aware spacing for bottom navigation and safe areas

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
- primary source: generated git JSON (`public/changelog.generated.json`)
- automation:
  - `scripts/generate-changelog-from-git.mjs`
  - `.github/workflows/changelog-develop.yml`
- fallback source (legacy): `changelog_entries`

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

- `src/components/layout/AppLayout.tsx`: sticky glass top rail + player-aware shell
- `src/components/layout/Navigation.tsx`: desktop glass sidebar + floating bottom dock
- `src/components/ui/PageHeader.tsx`: editorial hero header reused by key product pages
- `src/components/ui/Toast.tsx`: motion-powered toast system
- `src/components/ui/ConfirmDialog.tsx`: motion-powered destructive confirmation modal
- `src/styles/globals.css`: typography, cards, buttons, inputs, glass surfaces, hero utilities
- `tailwind.config.js`: updated tokens for surface blacks, blue/violet accents, editorial fonts

Important design decision:

- the Stitch export was not imported as a parallel frontend
- it was treated as a visual reference system
- existing routes, services, auth, stores, queries and Supabase contracts remain the source of truth

## Current quality snapshot

- `npm run build`: pass
- `npm run lint`: pass
- bundle warning remains: main chunk over 500 kB
