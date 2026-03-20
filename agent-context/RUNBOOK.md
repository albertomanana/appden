# Runbook

Snapshot date: 2026-03-20

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

4. Run SQL migrations in Supabase SQL Editor (001 -> 010).

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
- migrations `008_fix_rls_groups_recursion.sql`, `009_social_connections_reports_admin.sql`, and `010_groups_rls_rpc_hardening.sql` applied
- song upload works (audio + cover)
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
- play/pause/next/previous in mini and full player
- open song detail:
  - lyrics tab
  - social tab (add/edit/delete comment)
- share song link with timestamp (`?t=`)
- open `/changelog`
- open `/connections` and complete one request cycle
- submit `/reports` with and without image
- open `/reports/:reportId` and change status (admin/creator)
- verify browser no longer reports missing `/icons/icon-192x192.png`
- create debt and payment
- export CSV/JSON in debt insights
