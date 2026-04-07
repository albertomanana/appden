# Known Issues and Risks

## 1) Login/social bootstrap can fail if migrations 010 and 011 are not applied

Symptom:

- auth/session appears established but group bootstrap triggers server error
- Supabase can return `42P17 infinite recursion detected in policy for relation "groups"`
- group creation can fail or only work partially if the app still uses legacy two-step insert logic
- social/report actions can fail with relation/policy errors if migrations `009_social_connections_reports_admin.sql` / `010_groups_rls_rpc_hardening.sql` are not applied
- song uploads can fail or emit noisy secondary 500s if `011_song_upload_storage_hardening.sql` is missing

Impact:

- users may fail to enter the app or feel they need to login twice
- upload testing in Vercel can look flaky even when the UI appears correct

Suggested fix:

- apply `supabase/migrations/008_fix_rls_groups_recursion.sql`
- apply `supabase/migrations/009_social_connections_reports_admin.sql`
- apply `supabase/migrations/010_groups_rls_rpc_hardening.sql`
- apply `supabase/migrations/011_song_upload_storage_hardening.sql`
- verify the app can call `create_group_with_owner(...)` successfully
- verify song upload finishes without extra `POST /song_owners` / `POST /group_activity` failures

Current mitigation in app code:

- group creation is now more tolerant when the owner membership row already exists or `group_members` query is flaky
- `groups.service` now prefers the atomic RPC path and direct `groups` reads
- song upload now cleans storage files if the `songs` insert fails
- the upload UI no longer fires fragile extra client-side writes for owner/activity sync
- reports service now retries against legacy schema instead of hard failing immediately
- login page redirects again once auth state settles, reducing the "second login" symptom

## 1.1) Multi-artist persistence requires migration 012

Symptom:

- song upload/edit appears to work, but structured artist credits do not persist
- songs fall back to the plain summary string only

Impact:

- multiple artists cannot be represented professionally
- profile-linked artist credits are lost after reload

Suggested fix:

- apply `supabase/migrations/012_song_artist_credits.sql`

Current mitigation in app code:

- `songs.artist_name` still stores a compatibility summary
- the app tolerates the missing relation instead of crashing, but the richer artist model remains partially disabled

## 2) Incognito-only behavior can still happen on stale clients

Symptom:

- app/session works in incognito but fails in normal tab

Current mitigation:

- login page includes local repair action that clears auth storage, caches, and service workers

Residual risk:

- stale service worker or stale auth storage after environment/project changes

## 3) Cover rendering can look "incomplete"

Symptom:

- cover exists but appears cropped or partially visible

Likely causes:

- UI uses fixed square container with `object-cover`
- signed URL expired/invalid and browser recycles stale resource
- corrupted image metadata

Where to inspect:

- `src/components/music/SongCard.tsx`
- `src/pages/music/SongDetailPage.tsx`
- `src/features/player/components/MiniPlayer.tsx`
- `src/features/player/components/FullPlayer.tsx`

## 3.1) Cover upload should now fail clearly instead of degrading silently

Current status:

- if the user selects a cover and the cover upload fails, `songsService.uploadSong(...)` now aborts the whole operation and cleans the already uploaded audio when possible

Why this matters:

- previous behavior could look like a successful upload with a mysteriously missing portada
- the current behavior is stricter but much easier to debug during QA

## 4) Some pro features are still partial

- push notifications:
  - permission and local notification path exists
  - full backend push/email pipeline not complete
- continue listening:
  - snapshot logic exists
  - resume prompt UX can be improved

## 5) Bundle size warning in production build

Symptom:

- Vite warns about large chunk size (`index` chunk)

Impact:

- possible slower first load on weak mobile networks

Suggested fix:

- more route-level or feature-level code splitting
- analyze heavy modules and lazy-load non-critical panels
- note: v1.6 added `framer-motion` for premium feedback/animation, so future chunk work should preserve motion on high-value surfaces while lazy-loading heavier secondary panels
- after the v1.6.2 music-core simplification, the bundle is slightly smaller but the main chunk warning still exists

## 6) Encoding inconsistencies in some files

Symptom:

- mojibake/garbled characters in selected markdown/UI strings

Impact:

- visual quality and maintainability

Suggested fix:

- enforce UTF-8 with editorconfig and pre-commit checks
- normalize affected files

## 7) Auto changelog workflow requires write-capable develop branch

Symptom:

- changelog workflow runs but cannot push `public/changelog.generated.json`

Likely causes:

- branch protection on `develop` blocks GitHub Actions bot push
- workflow permissions not set to `contents: write`

Suggested fix:

- keep `contents: write` in workflow
- allow bot pushes to `develop` for changelog update commit, or route via PR automation

## 8) PWA icon issue is resolved in-repo but stale clients may cache the old manifest

Symptom:

- browser still requests missing `/icons/icon-192x192.png` even after deploy

Suggested fix:

- hard refresh the site
- if needed, use the local session repair action to clear caches and service workers
- verify new deploy serves `apple-touch-icon.png`, `masked-icon.svg`, and `/icons/*`

## 9) Stitch export scope can be misunderstood by future agents

Symptom:

- agent expects a full exported React app from Stitch and tries to replace major parts of The Appden

Reality:

- the Stitch artifact used in v1.6 was mainly:
  - one polished screen
  - a `DESIGN.md`
  - visual tokens and layout cues

Safe approach:

- keep existing logic, routes, stores and Supabase integration
- reuse the design language through shared primitives and page-level adaptation
- avoid introducing a second competing UI system

## 10) Some secondary/detail pages may still show traces of the older visual system

Symptom:

- the main shell and major flows are Stitch-first, but some detail/auth pages can still look more legacy

Current status:

- rebuilt:
  - shell
  - dashboard
  - music
  - groups
  - connections
  - reports
  - changelog
  - profile
  - files
  - notifications
  - mini/full player
- still worth a follow-up pass:
  - auth
  - song/debt/member detail pages
  - playlist detail flows

## 10.1) Some player-era styling leftovers still exist at low priority

Current status:

- the functional player was simplified and old experimental components were removed
- some low-priority leftovers still exist in docs/global styles from the earlier richer player phase

Suggested fix:

- remove stale theme-specific CSS and old player README references in a cleanup PR once the core music flow is verified on staging

## 11) Notifications page is not yet backed by the real Supabase notifications table

Symptom:

- backend `notifications` rows can exist, but `/notifications` still reflects session-local UI state instead of DB state

Impact:

- feature can look functional in isolated testing while ignoring real backend data

Suggested fix:

- wire `NotificationsPage` and its store to Supabase reads/writes before launch, or de-scope/hide the route

## 12) Several modules can mask backend gaps through fallback storage

Symptom:

- social, reports, changelog, lyrics and debt-pro surfaces may still render data via local fallback paths when the target schema is incomplete

Impact:

- QA can pass on a partially broken environment

Suggested fix:

- treat fallback-backed behavior as non-launchable
- add explicit QA-mode warnings or telemetry when fallback paths activate

## 13) Avatar persistence still relies on fragile signed URLs

Symptom:

- avatars can expire or disappear across refreshes/time if a signed URL is stored directly in `profiles.avatar_url`

Impact:

- social/profile/avatar rendering may become inconsistent after time passes

Suggested fix:

- persist stable storage paths in DB and sign on read instead of storing signed URLs

## 14) Full authenticated smoke testing is currently blocked by Supabase signup confirmation/rate limits

Symptom:

- local browser smoke can open login/register/auth-gated routes
- creating a fresh temporary QA user from the current environment does not complete a usable authenticated session

Observed causes during the latest verification pass:

- signup requires email confirmation
- subsequent attempts hit signup email rate limiting

Impact:

- full browser verification of upload/library/playlists against the live backend cannot be completed from a fresh session alone

Suggested fix:

- keep at least one confirmed QA account available
- or disable email confirmation in dedicated staging
- or provide a service-role-assisted browser bootstrap flow
