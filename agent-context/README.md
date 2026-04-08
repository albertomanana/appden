# The Appden Agent Context Pack

Snapshot date: 2026-04-07
Release: v1.6.3-music-catalog

This folder contains a reusable context pack so any developer or AI agent can work on The Appden from another IDE/model without losing project and conversation context.

## What is inside

- `APP_CONTEXT.md`: product and architecture context.
- `CHAT_CONTEXT.md`: key decisions and incidents from this chat thread.
- `FEATURE_STATUS_1_43.md`: roadmap item tracking (1-43).
- `SUPABASE_CONTEXT.md`: migrations, buckets, RLS, storage troubleshooting.
- `WORKFLOW_GITHUB_CONTEXT.md`: collaboration workflow and GitHub standards.
- `RUNBOOK.md`: local setup, QA checks, launch/deploy steps.
- `KNOWN_ISSUES.md`: current risks and troubleshooting notes.
- `REPO_MAP.md`: practical map of important files/folders.
- `AGENT_PLAYBOOK.md`: operating rules for custom coding agents.
- `OPEN_ACTIONS.md`: prioritized follow-up tasks.
- `MACHINE_CONTEXT.json`: machine-readable condensed context.
- `prompts/`: reusable prompt templates for other models/IDEs.

Recent additions tracked in this snapshot:

- refactor to `src/features/social`
- new feature modules: `src/features/changelog`, `src/features/reports`
- new routes: `/changelog`, `/reports`
- new migration: `006_changelog_reports_social_hardening.sql`
- social group invitations flow: `007_group_invitations.sql`
- RLS recursion/login hotfix: `008_fix_rls_groups_recursion.sql`
- auth bootstrap hardening in `AuthProvider` (do not force logout on group fetch failure)
- social + reports hardening migration: `009_social_connections_reports_admin.sql`
- definitive groups RLS/RPC hotfix: `010_groups_rls_rpc_hardening.sql`
- new routes: `/connections`, `/reports`, `/reports/:reportId` (`/report` kept as redirect)
- automatic changelog pipeline from git commits on `develop`:
  - script: `scripts/generate-changelog-from-git.mjs`
  - workflow: `.github/workflows/changelog-develop.yml`
  - generated source file: `public/changelog.generated.json`
- PWA asset hotfix:
  - real icons created under `public/icons/`
  - `public/apple-touch-icon.png`
  - `public/masked-icon.svg`
- Stitch visual integration pass for v1.6:
  - design source treated as visual system, not replacement app
  - shell upgraded in `src/components/layout/AppLayout.tsx`
  - dock navigation upgraded in `src/components/layout/Navigation.tsx`
  - shared editorial header component added: `src/components/ui/PageHeader.tsx`
  - visual primitives refreshed in `tailwind.config.js` and `src/styles/globals.css`
  - animated feedback now uses `framer-motion`
  - premium UI pass applied to dashboard, music, groups, connections, reports, changelog, debts and profile
- aggressive Stitch-first rebuild follow-up:
  - shell now uses a fixed top bar and a 5-item floating bottom dock as the default app navigation
  - new UI primitives added under `src/components/ui/`:
    - `Button.tsx`
    - `Card.tsx`
    - `Chip.tsx`
    - `Input.tsx`
    - `Modal.tsx`
    - `Tabs.tsx`
  - player UI rebuilt again (`FullPlayer`, `PlayerControls`, `QueuePanel`)
  - system pages (`FilesPage`, `NotificationsPage`) aligned with the same visual direction
- pre-launch hardening pass:
  - new migration: `011_song_upload_storage_hardening.sql`
  - bottom navigation rebuilt again to avoid mobile overflow/right-shift
  - toast stack repositioned above the dock on mobile
  - mini player spacing aligned with the dock and safe areas
  - song upload no longer depends on fragile client-side `song_owners` / `group_activity` follow-up writes
  - song upload now cleans storage files if DB metadata insert fails
  - social feed upgraded to a richer featured-card + timeline presentation
- QA readiness pass:
  - reusable Supabase seed system under `scripts/qa-seed/*`
  - docs added:
    - `docs/QA_PRELAUNCH_AUDIT.md`
    - `docs/QA_FUNCTIONAL_MAP.md`
    - `docs/QA_TEST_CHECKLIST.md`
    - `docs/QA_SEEDING_GUIDE.md`
  - manual SQL fallback for smoke testing without service-role access:
    - `supabase/seeds/qa_manual_smoke_seed.sql`
    - `supabase/seeds/qa_manual_smoke_reset.sql`
    - `docs/QA_MANUAL_SMOKE_ES.md`
  - files service hardened to persist real storage paths and clean up orphaned uploads
  - changelog service now prefers real Supabase rows before generated JSON fallback
- music-first simplification pass:
  - player engine reduced to a single stable audio path without active crossfade/EQ layers
  - full/mini player rebuilt around the essential controls only
  - old experimental/legacy player components removed (`MusicPlayer`, `SpotifyMusicPlayer`, `AudioDebug`, `PlayerIntegrationExample`, `player.equalizer`, dynamic cover palette extraction)
  - music library page simplified to search + upload + play
  - upload form simplified to direct metadata entry
  - upload no longer waits for auto-transcription after success
  - cover upload failures now fail clearly instead of silently continuing without portada
- music catalog + playlists reliability pass:
  - new migration: `012_song_artist_credits.sql`
  - songs service now hydrates songs in separate steps instead of one fragile mega-join
  - playlist detail now resolves playable songs through the hydrated songs pipeline
  - upload/edit flows support multiple artists:
    - existing user profiles
    - manual external artists
    - ordered mixed credits
  - music/playlists pages now show explicit load/error/no-group states instead of silently looking empty
  - browser smoke was run locally for login/register/auth-gate routes
  - full authenticated browser smoke remains blocked in this environment by Supabase email confirmation + signup rate limiting

## Recommended reading order

1. `APP_CONTEXT.md`
2. `REPO_MAP.md`
3. `SUPABASE_CONTEXT.md`
4. `FEATURE_STATUS_1_43.md`
5. `CHAT_CONTEXT.md`
6. `AGENT_PLAYBOOK.md`

## Maintenance rule

When shipping relevant changes, update this folder in the same PR:

- feature or architecture changes -> update `APP_CONTEXT.md` and `FEATURE_STATUS_1_43.md`
- infra/db/storage changes -> update `SUPABASE_CONTEXT.md` and `RUNBOOK.md`
- major decisions from collaboration/chat -> append to `CHAT_CONTEXT.md`
- new blockers -> update `KNOWN_ISSUES.md`

## Important

- Do not copy `.env.local` secrets into this folder.
- This pack documents expected behavior; always verify against source code before refactors.
