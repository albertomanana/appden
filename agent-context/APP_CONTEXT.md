# App Context

Snapshot date: 2026-03-19

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
- Styling: TailwindCSS
- State: Zustand + React Query
- Routing: React Router
- Backend: Supabase (Auth, Postgres, Storage)
- PWA: `vite-plugin-pwa`
- Audio engine: Web Audio API via `src/features/player`

## Runtime modules

### 1) Auth + session

- `src/app/providers/AuthProvider.tsx`
- `src/services/auth.service.ts`
- session storage key includes Supabase project ref:
  - `the-appden-auth:<projectRef>:v2`

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
- group invitations (owner invites non-members, invitee accepts/rejects)

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
- item types: `feature`, `fix`, `improvement`
- Supabase table source: `changelog_entries`

### 7) Reports

- `src/features/reports/*`
- `src/pages/report/ReportPage.tsx`

Capabilities:

- route `/report`
- form fields: type, description, steps, optional image
- validation + loading/success feedback
- Supabase table source: `reports`

## Route map

Router: `src/app/router/index.tsx`

Main protected routes:

- `/` dashboard
- `/music`, `/music/:songId`
- `/playlists`, `/playlists/:playlistId`
- `/favorites`
- `/changelog`
- `/report`
- `/debts`, `/debts/:debtId`
- `/groups`, `/groups/:groupId`
- `/notifications`
- `/files`

Public routes:

- `/login`
- `/register`
- `/reset-password`
- `/shared/:token`

## Current quality snapshot

- `npm run build`: pass
- `npm run lint`: pass
- bundle warning remains: main chunk over 500 kB
