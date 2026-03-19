# Open Actions (Next Improvements)

## High priority before broader launch

1. Apply Supabase migrations `006_changelog_reports_social_hardening.sql`, `007_group_invitations.sql`, and `008_fix_rls_groups_recursion.sql` in target projects.
2. Create/verify storage bucket `reports` policies in production and test image uploads.
3. Run full normal-browser session test (non-incognito) on at least 2 devices.
4. Confirm cover rendering behavior on portrait and landscape images.
5. Validate login + groups bootstrap after migration 008 (no forced second login).

## Medium priority

1. Reduce initial bundle size warning (manual chunks/lazy boundaries).
2. Improve continue-listening UX (visible resume prompt/modal).
3. Complete production push pipeline (service worker push + backend trigger).
4. Continue cleaning encoding inconsistencies in old docs/UI labels.

## Team/process

1. Add CI checks (`npm run build` + `npm run lint`) on PR.
2. Keep `agent-context` updated in every major PR/session.
