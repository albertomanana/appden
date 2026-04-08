# Runbook

Snapshot date: 2026-04-07

## Local development

1. Install dependencies:
```bash
npm install
```

2. Create env file:
```bash
copy .env.example .env.local
```

3. Fill `.env.local` with Supabase URL and anon key.
   For QA seeding you also need:
   - `SUPABASE_SERVICE_ROLE_KEY`
   - optional: `QA_SEED_EMAIL_DOMAIN`, `QA_SEED_DEFAULT_PASSWORD`

4. Run SQL migrations in Supabase SQL Editor (001 -> 012).

5. Ensure storage buckets exist:
- `avatars`
- `covers`
- `songs`
- `files`
- `reports` (recommended)

6. Start app:
```bash
npm run dev
```

7. Open:
- `http://localhost:5173`

## Build and quality

Build:
```bash
npm run build
```

Current result at snapshot date:

- build passes
- warning about large chunk size (main bundle > 500 kB)

Lint:
```bash
npm run lint
```

Current result at snapshot date:

- lint passes

## QA seeding

Commands:

```bash
npm run seed:qa
npm run seed:qa:fresh
npm run seed:qa:reset
```

Reference docs:

- `docs/QA_SEEDING_GUIDE.md`
- `docs/QA_TEST_CHECKLIST.md`
- `docs/QA_PRELAUNCH_AUDIT.md`
- `docs/QA_MANUAL_SMOKE_ES.md`

Important:

- run seeding only against a dedicated QA/staging Supabase project
- the current seed namespace uses:
  - emails ending in `@<QA_SEED_EMAIL_DOMAIN>`
  - group names prefixed with `QA Seed:`

Manual fallback when `SUPABASE_SERVICE_ROLE_KEY` is not available:

- use `supabase/seeds/qa_manual_smoke_reset.sql`
- then run `supabase/seeds/qa_manual_smoke_seed.sql` in Supabase SQL Editor
- this creates temporary groups named `QA Temp:%` using existing profiles instead of creating auth users

## Incognito-only symptom recovery flow

If app works only in incognito:

1. open login page
2. click `Reparar sesion local (si solo funciona en incognito)`
3. this triggers:
   - local auth storage cleanup
   - cache cleanup
   - service worker unregister
4. reload and login again

Code paths:

- `src/pages/auth/LoginPage.tsx`
- `src/services/auth.service.ts` (`hardResetClientState`)

## Supabase launch checks

Before sharing app with friends:

- registration and login work in normal browser tab
- migrations `008_fix_rls_groups_recursion.sql`, `009_social_connections_reports_admin.sql`, `010_groups_rls_rpc_hardening.sql`, `011_song_upload_storage_hardening.sql`, and `012_song_artist_credits.sql` applied
- song upload works (audio + cover)
- song upload does not emit stray 500s after success because ownership/activity sync is now server-side
- if cover upload fails, the UI now fails clearly instead of silently creating a song without cover
- song artist credits support:
  - one artist
  - multiple artists
  - mix of existing users + external manual names
- cover and song URLs open (signed URL generated)
- social/changelog/report routes work without relation errors
- group creation works through `create_group_with_owner(...)`
- `/connections` flow works (send + accept + reject)
- `/reports` list/detail works and creation is possible even without active group
- RLS limits data to group members

## Admin bootstrap (when your user exists)

Run once in Supabase SQL Editor (as project owner):

```sql
insert into user_roles (user_id, role, created_by)
values ('<TU_USER_ID_UUID>', 'admin', '<TU_USER_ID_UUID>')
on conflict (user_id, role) do nothing;
```

Then re-login and confirm:

- report badge appears in navigation for admin
- admin can change report status in `/reports` and `/reports/:reportId`

## Changelog automation

Local generation:

```bash
npm run changelog:generate
```

CI generation:

- workflow: `.github/workflows/changelog-develop.yml`
- trigger: push to `develop`
- output file consumed by app: `public/changelog.generated.json`
- verified locally at snapshot date with `npm run changelog:generate`

## Deploy (Vercel only)

- import GitHub repo
- set env vars
- build command: `npm run build`
- output: `dist`
- `vercel.json` is present
- `netlify.toml` removed intentionally

## Smoke test checklist (post deploy)

- login/register
- create group
- reload after login and confirm groups bootstrap does not force a second login
- upload song + cover
- upload song without cover
- confirm upload either:
  - appears in the list and feed, or
  - fails with a clear error toast and no orphaned storage files
- play/pause/next/previous in mini and full player
- open the full player and verify only the essential controls remain visible
- create/edit a song with:
  - one profile-linked artist
  - multiple profile-linked artists
  - at least one external manual artist
- open song detail:
  - lyrics tab
  - social tab (add/edit/delete comment)
- confirm artist credits render consistently in:
  - library cards
  - song detail
  - playlist detail
- share song link with timestamp (`?t=`)
- open `/changelog`
- open `/connections` and complete one request cycle
- submit `/reports` with and without image
- open `/reports/:reportId` and change status (admin/creator)
- verify browser no longer reports missing `/icons/icon-192x192.png`
- verify bottom dock is centered on mobile and does not overflow horizontally
- create debt and payment
- export CSV/JSON in debt insights
- if using seeded QA data, also validate:
  - owner-only group
  - empty playlist
  - user with no groups
  - partial/full debt states

## Browser smoke note

Latest local verification pass:

- login page render: verified
- register page render: verified
- `/music` auth gate redirect: verified

Open limitation:

- full authenticated browser smoke against the current Supabase project still needs a confirmed QA account or relaxed staging auth because signup confirmation + rate limiting blocked fresh-session verification

## Scroll sanity check

After the latest shell follow-up:

- protected routes should scroll inside the `AppLayout` internal scroll container
- wheel scrolling should also work inside the major modal overlays

If desktop wheel scrolling still feels dead:

1. verify there is no stale service worker/client cache
2. hard refresh after deploy
3. inspect `src/components/layout/AppLayout.tsx` and confirm the internal `overflow-y-auto` shell is present
