# Known Issues and Risks

## 1) ESLint not configured

Symptom:

- `npm run lint` fails with "ESLint couldn't find a configuration file"

Impact:

- no automated lint gate in local workflow

Suggested fix:

- add project ESLint config (`.eslintrc.*` or `eslint.config.*`)
- wire lint check in CI after stabilization

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
