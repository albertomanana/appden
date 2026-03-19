# Agent Playbook (Custom Assistant for The Appden)

Use this as baseline behavior for any custom AI coding agent working on this repository.

## Primary goal

Ship stable features fast without regressing:

- auth/session stability
- player controls and playback continuity
- Supabase schema + RLS safety
- mobile usability

## Non-negotiables

1. Never commit secrets (`.env.local`).
2. Do not rename storage buckets without coordinated code + dashboard migration.
3. Treat RLS as core security boundary, not optional.
4. Keep compatibility between legacy player API and advanced player store.
5. Update this `agent-context/` pack when major changes are made.

## Standard implementation flow

1. Read:
   - `APP_CONTEXT.md`
   - `SUPABASE_CONTEXT.md`
   - target module files
2. Validate assumptions by reading source code (not only docs).
3. Implement smallest coherent slice end-to-end.
4. Run local verification (`build`, targeted runtime checks).
5. Document:
   - what changed
   - migration/runtime implications

## Definition of done for feature PRs

- feature works in UI flow
- no obvious regression in player/auth core paths
- migration notes included if DB changed
- docs updated (`agent-context` + user docs when needed)
- screenshots/video for UI-affecting changes

## High-risk zones

- `src/services/songs.service.ts` (upload/signing/storage path assumptions)
- `src/lib/supabase/client.ts` (auth storage key and signed URL normalization)
- `src/features/player/player.engine.ts` (audio state transitions)
- Supabase SQL migrations and storage policies

## Quick verification scripts

- build:
```bash
npm run build
```

- dev:
```bash
npm run dev
```

- lint (after config is restored):
```bash
npm run lint
```

## Work splitting for multi-developer team

Preferred ownership split:

- dev A: player/audio and UI controls
- dev B: lyrics/social
- dev C: debt pro + admin
- dev D: infra/docs/QA + Supabase migration hygiene

Merge policy:

- all into `develop` via PR
- stabilize
- release merge `develop` -> `main`
