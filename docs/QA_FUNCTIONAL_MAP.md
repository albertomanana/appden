# QA Functional Map

Date: 2026-03-26

## Status Legend

- `Complete`: feature is credible end-to-end for QA and not obviously placeholder-only
- `Partial`: real implementation exists, but there are known gaps, fragile edges or unresolved dependencies
- `Broken`: route/module exists but does not currently reflect real backend behavior correctly
- `Backend-dependent`: usable only if the expected Supabase schema/migrations are present

## Module Matrix

| Module | Status | Notes |
| --- | --- | --- |
| Auth | Partial, backend-dependent | Login/session flow is real, but strongly depends on group/auth RLS migrations being correct. |
| Profile | Partial | Profile page/editing exists. Avatar storage design is still fragile because signed URLs are persisted. |
| Groups | Partial, backend-dependent | Group creation, membership, invitations and manager roles exist. Performance and RLS coupling remain sensitive. |
| Friends / Social Connections | Partial, backend-dependent | Global friend requests/friendships and group friend requests exist. Good model coverage, but UX maturity is uneven. |
| Music Library | Partial | Group songs, artist filtering, favorites and details exist. Strong module, but still needs heavy cross-device QA. |
| Song Upload | Partial, backend-dependent | Recently hardened. Still depends on storage buckets/policies and migration `011`. |
| Playlists | Partial | Core list/detail/add-song behavior exists. Some playlist/detail surfaces still feel older than the main shell. |
| Favorites | Partial | Real DB-backed favorites flow exists and is seedable. Needs heavier empty-state and sync testing. |
| Player | Partial | Mini/full player, queue and persistence exist. Continue-listening and legacy-player cleanup remain unfinished. |
| Comments / Likes / Reactions | Partial | Schema and UI exist, plus feed linkage. Needs density/performance/device QA. |
| Lyrics | Partial, backend-dependent | Real tables and editing flows exist, but they have not yet had the same hardening/testing depth as music/player. |
| Debts | Partial, backend-dependent | Core debts/payments are real and useful. Pro layer is rich but monolithic and regression-prone. |
| Debt Pro (reminders/installments/goals/permissions/badges) | Partial, backend-dependent | Good schema coverage, but fallback behavior and service size make it a high-QA surface. |
| Reports | Partial, backend-dependent | Real schema, statuses and admin notification trigger exist. Still needs operational/admin QA depth. |
| Changelog | Partial | Real module with generated fallback and now DB-first behavior when rows exist. Good for QA after seeding. |
| Files | Partial | Real upload/list/delete behavior exists and was hardened in this pass. Shared preview route is still incomplete. |
| Shared Links / Shared Page | Partial | Route exists, but file-preview behavior and missing-resource explanations still need work. |
| Notifications | Broken | Backend table exists, but current UI is session-store driven and not wired to Supabase data. |
| Settings / Roles | Partial, backend-dependent | `user_roles` and manager semantics exist in DB, but user-facing settings/admin UX is still light. |
| PWA | Partial | Manifest/service worker setup is real and improved, but stale-cache behavior still needs real-device verification. |

## Modules That Can Look More Finished Than They Are

These are the most important QA traps:

1. Social
Because fallback storage can keep parts of the UX populated even if some backend relations are missing.

2. Reports
Because the service includes compatibility logic and the page may still feel usable in a partially migrated environment.

3. Changelog
Because generated JSON can make the feature appear alive even if DB rows are missing.

4. Debt Pro
Because reminders/installments/goals/permissions have fallback behavior and a very large service surface.

## Visual-Only Risk Areas

These are not fake features, but they are the places most likely to feel “complete enough” visually before deep QA:

- notifications
- shared file preview
- some detail pages and secondary flows

## Best Current QA Entry Points

If the goal is to explore real product behavior quickly, the best seeded starting points are:

1. `Launch House` for music, playlists, comments, reactions and dense activity
2. `Balance Club` for debts, partial/full payments, reminders and reports
3. `Late Checkout` for files, changelog and mixed coordination flows
4. `Quiet Drafts` for owner-only/empty-state behavior
5. `Sol Orbit` for no-group onboarding states
