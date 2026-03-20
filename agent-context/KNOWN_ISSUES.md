# Known Issues and Risks

## 1) Login/social bootstrap can fail if migration 010 is not applied

Symptom:

- auth/session appears established but group bootstrap triggers server error
- Supabase can return `42P17 infinite recursion detected in policy for relation "groups"`
- group creation can fail or only work partially if the app still uses legacy two-step insert logic
- social/report actions can fail with relation/policy errors if migrations `009_social_connections_reports_admin.sql` / `010_groups_rls_rpc_hardening.sql` are not applied

Impact:

- users may fail to enter the app or feel they need to login twice

Suggested fix:

- apply `supabase/migrations/008_fix_rls_groups_recursion.sql`
- apply `supabase/migrations/009_social_connections_reports_admin.sql`
- apply `supabase/migrations/010_groups_rls_rpc_hardening.sql`
- verify the app can call `create_group_with_owner(...)` successfully

Current mitigation in app code:

- group creation is now more tolerant when the owner membership row already exists or `group_members` query is flaky
- `groups.service` now prefers the atomic RPC path and direct `groups` reads
- reports service now retries against legacy schema instead of hard failing immediately
- login page redirects again once auth state settles, reducing the "second login" symptom

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
