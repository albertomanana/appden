# Open Actions (Next Improvements)

## High priority before broader launch

1. Apply Supabase migrations `001-012` in the target QA/staging project.
2. Add `SUPABASE_SERVICE_ROLE_KEY` to the QA environment and run `npm run seed:qa:fresh`.
3. Execute the blocker subset from `docs/QA_TEST_CHECKLIST.md`.
4. Wire `/notifications` to the real backend table or explicitly hide/de-scope the module.
5. Replace signed-avatar persistence with stable storage-path persistence.
6. Run full normal-browser session test (non-incognito) on at least 2 devices.
7. Validate upload end-to-end in production: audio upload, DB insert, feed appearance, signed playback URL.
8. Confirm bottom dock is centered on real mobile devices with and without the mini player visible.
9. Assign first real admin user in `user_roles` and validate unread report notifications.
10. Enable and verify GitHub workflow `changelog-develop.yml` can push generated changelog updates.
11. Run a focused authenticated music smoke test after the catalog/playlists reliability pass: upload without cover, upload with cover, play from list, play from detail, queue next/previous, reload and replay.
12. Verify the new artist-credit flow with:
   - single existing user artist
   - multiple existing user artists
   - mixed existing user + manual external artist
13. Keep one confirmed QA account available so browser smoke does not depend on live signup email confirmation/rate limits.

## Medium priority

1. Add explicit QA-mode warnings when fallback-to-localStorage paths activate.
2. Reduce initial bundle size warning (manual chunks/lazy boundaries).
3. Improve continue-listening UX (visible resume prompt/modal).
4. Complete production push pipeline (service worker push + backend trigger).
5. Continue cleaning encoding inconsistencies in old docs/UI labels.
6. Run a second-pass UI audit on remaining secondary pages (`FilesPage`, `NotificationsPage`, auth screens) so they match the new v1.6 shell more closely.
7. Continue the same aggressive Stitch-first pass on remaining detail/auth pages (`DebtDetailPage`, `MemberProfilePage`, auth screens`) to fully eliminate legacy visual remnants.
8. Consider code-splitting heavier player/social surfaces to reduce the main bundle warning before public launch.
9. Remove stale theme-specific player CSS and old player README notes left from the pre-v1.6.2 richer player phase.

## Team/process

1. Add CI checks (`npm run build` + `npm run lint`) on PR.
2. Keep `agent-context` updated in every major PR/session.
