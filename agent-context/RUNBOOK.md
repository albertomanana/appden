# Runbook

Snapshot date: 2026-03-19

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

4. Run SQL migrations in Supabase SQL Editor (001 -> 008).

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
- migration `008_fix_rls_groups_recursion.sql` applied (prevents RLS recursion on groups)
- song upload works (audio + cover)
- cover and song URLs open (signed URL generated)
- social/changelog/report routes work without relation errors
- RLS limits data to group members

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
- upload song + cover
- play/pause/next/previous in mini and full player
- open song detail:
  - lyrics tab
  - social tab (add/edit/delete comment)
- share song link with timestamp (`?t=`)
- open `/changelog`
- submit `/report` with and without image
- create debt and payment
- export CSV/JSON in debt insights
