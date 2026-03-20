# Open Actions (Next Improvements)

## High priority before broader launch

1. Apply Supabase migration `010_groups_rls_rpc_hardening.sql` in all target projects after 001-009.
2. Create/verify storage bucket `reports` policies in production and test image uploads.
3. Run full normal-browser session test (non-incognito) on at least 2 devices.
4. Confirm cover rendering behavior on portrait and landscape images.
5. Validate login + groups bootstrap after migrations 008/009/010 (no forced second login; owner membership auto-created by RPC/trigger).
6. Assign first real admin user in `user_roles` and validate unread report notifications.
7. Enable and verify GitHub workflow `changelog-develop.yml` can push generated changelog updates.
8. Validate a fresh deploy serves the new PWA icons/manifest without cached 404s.

## Medium priority

1. Reduce initial bundle size warning (manual chunks/lazy boundaries).
2. Improve continue-listening UX (visible resume prompt/modal).
3. Complete production push pipeline (service worker push + backend trigger).
4. Continue cleaning encoding inconsistencies in old docs/UI labels.

## Team/process

1. Add CI checks (`npm run build` + `npm run lint`) on PR.
2. Keep `agent-context` updated in every major PR/session.
