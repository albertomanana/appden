# Chat Context (Condensed Timeline)

This file captures decisions and incidents from this collaboration thread so future agents understand why the code looks like this.

## Timeline

1. Initial incidents reported:
- covers not previewing
- play/pause/next controls not working
- app worked mainly in incognito mode

2. Storage upload error reported:
- `StorageApiError: Bucket not found`
- root cause pointed to Supabase bucket mismatch

3. Bucket strategy aligned:
- bucket name standardized to `covers`
- requested refactor of old bucket references

4. SQL policy errors appeared in setup:
- `ERROR 42501 must be owner of table objects`
- `ERROR 42883 operator does not exist: text = uuid`

5. Practical fix patterns discussed:
- use dashboard-created bucket `covers`
- avoid ownership-only statements when role is limited
- cast `auth.uid()::text` when comparing against text fields in storage paths

6. Product expansion requests:
- advanced player experience
- lyrics automation and editing flow
- social layer
- debt automation and retention features
- mobile UI improvements

7. Context-pack strategy requested:
- maintain `agent-context/` as canonical cross-IDE and cross-AI memory

8. 2026-03-19 refactor execution:
- Phase 0 cleanup done first (`node_modules`, `dist`, `dev-dist`, `tmpclaude-*`, `netlify.toml`)
- deployment unified on Vercel (`netlify.toml` removed)
- ESLint config added so `npm run lint` now works
- social module refactored to `src/features/social` with compatibility wrappers
- social completion: edit own comments added, reactions maintained, mentions and nested replies preserved
- sharing upgraded with timestamp query (`?t=`) and deep-link handling
- new internal modules added: `src/features/changelog`, `src/features/reports`
- new routes added: `/changelog`, `/report`
- SQL migration `006_changelog_reports_social_hardening.sql` created

9. 2026-03-19 group invite gap closed:
- added owner-driven `group_invitations` flow for non-members
- incoming invites now shown on `GroupsPage` with accept/reject actions
- `GroupDetailPage` now includes search-based invitation panel
- SQL migration `007_group_invitations.sql` added (RLS + policies)

10. 2026-03-19 post-invite auth incident and fix:
- login/bootstrap started failing with `42P17 infinite recursion detected in policy for relation "groups"`
- root cause: policy dependency cycle between `groups` select policy and `group_invitations` policies
- SQL hotfix migration created: `008_fix_rls_groups_recursion.sql`
- auth bootstrap hardened: group loading errors no longer clear user session in `AuthProvider`

11. 2026-03-19 social/reports/changelog deep integration pass:
- added migration `009_social_connections_reports_admin.sql`
  - `group_role` expanded with `admin`
  - `groups` auto-owner membership trigger
  - manager (owner/admin) member/invitation policies
  - new global social tables: `friend_requests`, `friendships`
  - reports upgraded (`title`, `severity`, `reproduction_steps`, `updated_at`, global-auth visibility)
  - admin scaffolding: `user_roles`, `is_app_admin`, `report_notifications` + insert trigger
- new social page `/connections` with search + request/accept/reject + friends list
- reports rebuilt on `/reports` + `/reports/:reportId`; `/report` now redirects
- changelog switched to auto-generated git source:
  - `scripts/generate-changelog-from-git.mjs`
  - `.github/workflows/changelog-develop.yml`
  - `public/changelog.generated.json`
- removed noisy startup `console.log` lines from Supabase client/auth bootstrap path

12. 2026-03-20 compatibility hardening for partially migrated environments:
- `groups.service.createGroup()` no longer depends on `upsert` for owner membership
- owner membership insert now tolerates duplicate/existing rows created by DB trigger
- `groups.service.getGroups()` degrades gracefully if `group_members` query fails but owned groups are still readable
- `reports.service` now detects legacy reports schema and retries with old payload/query shape
- if legacy reports schema cannot support the new fields, service falls back without crashing the UI
- validated locally with `npm run lint` and `npm run build`

13. 2026-03-20 v1.5.5 hotfix pass for login/groups/PWA:
- new migration `010_groups_rls_rpc_hardening.sql`
  - adds `is_group_member`, redefines `is_group_owner` / `is_group_manager`
  - replaces recursive `groups` and `group_members` policies
  - adds atomic RPC `create_group_with_owner(name, description)`
- `groups.service` now prefers direct `groups` reads and RPC-based creation
- `group_invitations.service` accepts invites with plain insert + duplicate tolerance
- `connections.service` stopped using `upsert` for friend requests and now re-creates requests safely after reject/cancel
- `LoginPage` now redirects automatically once auth state becomes authenticated, avoiding the "login twice" feel after session bootstrap lag
- real PWA icons were added under `public/icons/`, plus `apple-touch-icon.png` and `masked-icon.svg`
- verified locally:
  - `npm run lint`
  - `npm run build`
  - `npm run changelog:generate`

14. 2026-03-23 v1.6 Stitch-driven UI integration pass:
- audited Stitch export first and confirmed it was a design reference, not a drop-in React app
- integration strategy chosen:
  - keep business logic, routing, auth, stores and Supabase services untouched
  - transplant the visual language into shell, navigation, shared components and key screens
- added `framer-motion` and used it for:
  - upgraded toast transitions
  - upgraded confirm dialog transitions
  - animated changelog timeline
  - mini player entrance motion
- introduced shared editorial page hero component:
  - `src/components/ui/PageHeader.tsx`
- upgraded global visual system:
  - `tailwind.config.js`
  - `src/styles/globals.css`
- premium UI pass applied to:
  - `DashboardPage`
  - `MusicPage`
  - `GroupsPage`
  - `GroupDetailPage`
  - `ConnectionsPage`
  - `ReportsPage`
  - `ReportDetailPage`
  - `DebtsPage`
  - `ProfilePage`
  - `ChangelogPage`
- repeated UI components refreshed to align with the new shell:
  - `SongCard`
  - `GroupCard`
  - `DebtCard`
  - `GroupMemberList`
  - `ReportForm`
  - `ReportsList`
- validated locally after integration:
  - `npm run lint`
  - `npm run build`

15. 2026-03-23 aggressive Stitch-first rebuild follow-up:
- user requested a more dominant Stitch reconstruction instead of a conservative merge
- main shell changed again:
  - fixed top header now mirrors Stitch more closely
  - bottom nav reduced to 5 primary destinations
  - desktop sidebar pattern removed from the main experience
- page structure changed:
  - page headers are now open editorial sections instead of card-like hero blocks
  - new `Tabs` primitive added for secondary route access
- new UI primitives added:
  - `Button`
  - `Card`
  - `Chip`
  - `Input`
  - `Modal`
  - `Tabs`
- player UI rebuilt to align with the new shell:
  - `FullPlayer`
  - `PlayerControls`
  - `QueuePanel`
- supporting system/social surfaces rebuilt:
  - `GroupActivityFeed`
  - `GroupInvitationsPanel`
  - `GroupPermissionsPanel`
  - `FilesPage`
  - `NotificationsPage`
- validated again:
  - `npm run lint`
  - `npm run build`

16. 2026-03-23 pre-launch hardening pass:
- user requested a release-candidate style intervention before pushing to `main`
- diagnosed two concrete pre-launch issues from the current shell/logs:
  - bottom dock could shift/right-overflow on mobile because the nav items relied on free-width flex distribution, `min-width`s and active scaling
  - song upload could show a success toast while the browser still logged a `POST 500` from secondary follow-up writes
- shell fixes:
  - `Navigation.tsx` changed from loose flex spacing to a centered 5-column dock grid
  - mobile toast stack moved to a centered position above the dock
  - `MiniPlayer` now shares the same horizontal rhythm and safe-area spacing as the dock
  - `globals.css` now explicitly clips horizontal overflow at `html`, `body`, and `#root`
- upload fixes:
  - `songs.service.ts` now uploads with explicit content types, clearer error messages and storage cleanup on metadata failure
  - `SongUploadForm.tsx` no longer creates fragile client-side owner/activity follow-up writes
  - new migration `011_song_upload_storage_hardening.sql` now:
    - normalizes storage bucket policies
    - adds `is_song_owner(...)`
    - hardens `song_owners` RLS
    - auto-syncs uploader ownership + `song_uploaded` activity on `songs` insert
- premium polish:
  - `GroupActivityFeed` rebuilt into a featured-card + timeline feed
  - `FullPlayer` and `PlayerControls` received another hierarchy/immersion pass
- validated locally:
  - `npm run lint`
  - `npm run build`

17. 2026-03-26 QA audit + seed readiness pass:
- audited repo/module/schema status with explicit prelaunch focus on auth, groups, music upload, player, debts, reports, changelog, responsive shell and RLS/storage risks
- found and fixed a real files-module bug:
  - `src/services/files.service.ts` was persisting the result of an async URL helper incorrectly instead of a stable storage path
  - upload/delete now includes better storage cleanup behavior
- found and fixed changelog source precedence:
  - `src/features/changelog/services/changelog.service.ts` now prefers Supabase rows when present, then falls back to generated JSON/local fallback
- created reusable QA seed system:
  - `scripts/qa-seed/shared.mjs`
  - `scripts/qa-seed/reset.mjs`
  - `scripts/qa-seed/fixtures.mjs`
  - `scripts/qa-seed/seed.mjs`
- created QA docs:
  - `docs/QA_PRELAUNCH_AUDIT.md`
  - `docs/QA_FUNCTIONAL_MAP.md`
  - `docs/QA_TEST_CHECKLIST.md`
  - `docs/QA_SEEDING_GUIDE.md`
- important remaining launch risks recorded explicitly:
  - notifications UI still not wired to backend `notifications`
  - localStorage fallbacks can mask missing backend tables during QA
  - avatars still persist signed URLs and should move to path-based storage

18. 2026-03-31 music-core simplification pass:
- user requested to reduce saturation and refocus the app on its core job: upload music and listen reliably
- the player was simplified aggressively:
  - `src/features/player/player.engine.ts` moved to a single stable audio path
  - crossfade/EQ-style audio complexity removed from the active listening flow
  - `FullPlayer`, `MiniPlayer`, `PlayerControls`, and `ProgressBar` now expose only the essential controls
- old or duplicate player surfaces removed:
  - `src/components/music/MusicPlayer.tsx`
  - `src/components/music/SpotifyMusicPlayer.tsx`
  - `src/components/music/AudioDebug.tsx`
  - `src/features/player/components/PlayerIntegrationExample.tsx`
  - `src/features/player/player.equalizer.ts`
  - `src/features/player/utils/colorExtraction.ts`
- music library simplified:
  - `MusicPage` now centers search, upload, play-all and the song list
  - `GroupActivityFeed` was removed from the main music screen to reduce noise
- upload simplified and hardened:
  - `SongUploadForm.tsx` no longer loads group members to suggest artist names
  - upload success no longer waits for auto-transcription
  - if cover upload fails, the whole upload fails clearly instead of silently degrading
- small playback UX fix:
  - pressing play on the current song card/detail toggles play/pause instead of forcibly requeueing
- validated locally:
  - `npx tsc --noEmit`
  - `npm run lint`
  - `npm run build`

19. 2026-04-07 music catalog + playlists reliability pass:
- user reported that uploaded songs were not appearing in the library, so they also could not be played
- playlists were also failing because playlist detail depended on nested raw song rows instead of fully hydrated playable songs
- artist modeling was too basic (`artist_name` only) for real music metadata needs
- execution performed:
  - `songs.service.ts` was reworked so song reads no longer depend on one fragile mega-join
  - song hydration now resolves base rows, profiles, owners, favorites, artist credits, and signed media URLs in separate steps
  - new structured multi-artist flow added:
    - `src/components/music/SongArtistCreditsInput.tsx`
    - `src/features/music/utils/artistCredits.ts`
    - migration `012_song_artist_credits.sql`
  - upload/edit forms now support one-or-many artists, mixing existing user profiles and external manual names
  - `playlists.service.ts` now resolves playlist songs through `songsService.getSongsByIds(...)` so playlist playback uses the same signed/hydrated media path as the music library
  - `MusicPage`, `PlaylistsPage`, and `PlaylistDetailPage` now expose clear load/error/no-group states instead of silently looking empty
- validation performed:
  - `npx tsc --noEmit`
  - `npm run lint`
  - `npm run build`
  - real browser smoke for login/register/auth-gate routes via Playwright/Chromium
- limitation recorded honestly:
  - full authenticated end-to-end browser smoke could not be completed from this machine because the target Supabase project required email confirmation and then hit signup email rate limiting during test account creation

20. 2026-04-07 scroll + interface cleanup follow-up:
- user reported a practical UX blocker: mouse-wheel scrolling was failing
- likely root cause was the protected shell relying on the document scroll with several aggressive overflow/fixed-layer decisions
- fixes applied:
  - `AppLayout` now owns a dedicated `overflow-y-auto` scroll container
  - protected-route navigation resets that container to top on route change
  - modal wrappers (`SongUploadForm`, `EditSongForm`, `PlaylistForm`, debt modals) now support wheel scrolling from the overlay container
  - music/playlists surfaces were cleaned visually to reduce density and improve consistency
- validated locally:
  - `npx tsc --noEmit`
  - `npm run lint`
  - `npm run build`

## Locked decisions

- storage cover bucket name is `covers`
- keep buckets private and use signed URLs
- preserve group privacy through RLS as default posture
- keep the global player modular under `src/features/player`, but prioritize simple playback over experimental audio features
- keep social/changelog/reports modular under `src/features/*`
- keep collaboration workflow PR-first (no direct push to `main`)

## Things future agents must remember

- The previous legacy/advanced player split has been collapsed toward a single simpler playback path; avoid reintroducing duplicate player implementations.
- The music catalog now expects playlist playback to go through hydrated song reads; avoid reintroducing raw nested playlist song payloads with unsigned storage paths.
- Multiple services include localStorage fallbacks when DB tables are missing.
- `src/services/song-social.service.ts` and `src/services/group-activity.service.ts` are wrappers to feature services.
- `agent-context` must be updated in each relevant PR/session.
- The Stitch export only provided one polished screen plus design rules; future UI work should continue adapting that system instead of trying to replace the app wholesale.
- For v1.6+, avoid reintroducing sidebar-first app shells unless product direction explicitly changes.
