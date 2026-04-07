# QA Test Checklist

Date: 2026-03-26

## Markers

- `[BLOCKER]`: must pass before launch
- `[RECOMMENDED]`: should be covered in serious QA
- `[AUTO LATER]`: good candidate for automation after current stabilization

## A. Functional Manual Testing

### Auth

- `[BLOCKER]` Register a new user and confirm profile trigger creates a usable profile row.
- `[BLOCKER]` Login with an existing user and verify session persistence after hard refresh.
- `[BLOCKER]` Logout and confirm protected routes redirect correctly.
- `[RECOMMENDED]` Test login on a stale browser session vs fresh/incognito session.
- `[RECOMMENDED]` Test reset-password flow if enabled in the current environment.
- `[AUTO LATER]` Add session persistence and redirect tests with Playwright/Cypress.

### Profile

- `[BLOCKER]` Open profile page and confirm existing profile data renders without null crashes.
- `[RECOMMENDED]` Edit display name, username and bio and confirm DB persistence after refresh.
- `[RECOMMENDED]` Test profile with incomplete data: missing username, missing bio, missing avatar.
- `[RECOMMENDED]` Upload/change avatar and verify it remains valid after refresh and after some time passes.
- `[AUTO LATER]` Add profile update contract tests against Supabase.

### Groups

- `[BLOCKER]` List groups for a seeded user and verify membership-based visibility.
- `[BLOCKER]` Create a new group and confirm creator becomes owner immediately.
- `[BLOCKER]` Open group detail and verify members load correctly.
- `[RECOMMENDED]` Invite a user, accept/reject/cancel invitation and verify final visibility/state.
- `[RECOMMENDED]` Promote/demote members where UI supports it and verify permissions.
- `[RECOMMENDED]` Test owner-only group and pending-invite user behavior.
- `[AUTO LATER]` Add RPC/integration tests for `create_group_with_owner(...)`.

### Friends / Social

- `[RECOMMENDED]` Review incoming/outgoing global friend requests in all statuses.
- `[RECOMMENDED]` Accept a pending friend request and confirm friendship appears.
- `[RECOMMENDED]` Review group friend requests and verify state transitions.
- `[RECOMMENDED]` Verify fallback-free behavior in a fully migrated environment.
- `[AUTO LATER]` Add request-status transition tests.

### Music

- `[BLOCKER]` List songs in a seeded active group and verify uploader/owner/favorite context renders.
- `[BLOCKER]` Open song detail and confirm metadata, comments and reactions load.
- `[BLOCKER]` Upload a new song end-to-end: storage write, DB row, feed row, playback.
- `[BLOCKER]` Upload a song with and without a cover.
- `[BLOCKER]` Validate unsupported file-type error behavior.
- `[RECOMMENDED]` Verify songs by owner/artist filters.
- `[RECOMMENDED]` Confirm seeded song without cover renders graceful fallback UI.
- `[AUTO LATER]` Add integration coverage for song insert + trigger-backed owner/activity sync.

### Playlists

- `[BLOCKER]` List playlists for an active group and open playlist detail.
- `[RECOMMENDED]` Add/remove songs from a playlist and verify order persists.
- `[RECOMMENDED]` Test empty playlist rendering with seeded owner-only/quiet group data.
- `[AUTO LATER]` Add playlist CRUD tests.

### Favorites / Comments / Reactions

- `[BLOCKER]` Favorite/unfavorite a song and verify state after refresh.
- `[RECOMMENDED]` Like a song, add a reaction and confirm feed impact.
- `[RECOMMENDED]` Create top-level and reply comments.
- `[RECOMMENDED]` Like a comment and confirm counts update correctly.
- `[AUTO LATER]` Add optimistic-update tests for comments/reactions/favorites.

### Player

- `[BLOCKER]` Start playback from song list.
- `[BLOCKER]` Verify mini player appears and can expand to full player.
- `[BLOCKER]` Test next/previous/pause/resume/seek/queue behavior.
- `[RECOMMENDED]` Refresh during playback and confirm persistence/rehydration behavior.
- `[RECOMMENDED]` Test playback with cover present and cover missing.
- `[AUTO LATER]` Add player-store persistence tests.

### Debts

- `[BLOCKER]` List debts in `Balance Club` and `Late Checkout`.
- `[BLOCKER]` Open debt detail and verify creditor/debtor/payment history renders.
- `[BLOCKER]` Create a debt and register a payment.
- `[BLOCKER]` Verify partial-payment and fully-paid transitions.
- `[RECOMMENDED]` Review reminders, installments, goals, badges and permissions in seeded groups.
- `[RECOMMENDED]` Test debtor/creditor permission boundaries.
- `[AUTO LATER]` Add debt status transition tests and aggregate summary assertions.

### Reports

- `[BLOCKER]` List reports with mixed statuses and severities.
- `[BLOCKER]` Create a report with and without image.
- `[RECOMMENDED]` Update report status where role allows it.
- `[RECOMMENDED]` Verify admin notification rows are created in DB for seeded admin.
- `[AUTO LATER]` Add report creation + admin notification trigger tests.

### Changelog

- `[BLOCKER]` Open changelog and confirm seeded DB entries render.
- `[RECOMMENDED]` Verify generated changelog fallback only appears when DB has no rows.
- `[RECOMMENDED]` Check a group with no dedicated changelog activity to validate sparse state.
- `[AUTO LATER]` Add source-precedence tests for Supabase vs generated JSON fallback.

### Files

- `[BLOCKER]` List files in `Late Checkout` and `Launch House`.
- `[BLOCKER]` Upload a new file and verify DB row + URL + cleanup-on-failure behavior.
- `[RECOMMENDED]` Delete a file and confirm record/storage cleanup path.
- `[RECOMMENDED]` Test image vs document category rendering.
- `[RECOMMENDED]` Validate shared file route for missing/invalid states.
- `[AUTO LATER]` Add file upload/delete integration tests.

### Notifications

- `[BLOCKER]` Decide whether the module ships, hides or gets rewired before launch.
- `[RECOMMENDED]` Verify backend `notifications` rows exist for seeded scenarios.
- `[AUTO LATER]` Once rewired, add DB-to-UI notification feed tests.

## B. UI / UX Testing

### Responsive / Layout

- `[BLOCKER]` Test all main pages on narrow mobile width.
- `[BLOCKER]` Confirm there is no horizontal overflow on dashboard, music, groups, debts, reports and files.
- `[BLOCKER]` Verify bottom dock stays centered with and without mini player.
- `[BLOCKER]` Verify safe-area padding on iPhone-style viewports.
- `[RECOMMENDED]` Test tablet width and landscape orientation.
- `[AUTO LATER]` Add visual regression snapshots for core routes.

### Navigation / Shell

- `[BLOCKER]` Navigate through primary routes using the dock.
- `[BLOCKER]` Verify back/forward browser behavior across protected routes.
- `[RECOMMENDED]` Confirm page headers, empty states and shell spacing stay consistent.
- `[AUTO LATER]` Add route smoke tests.

### Forms / Feedback

- `[BLOCKER]` Validate upload, debt and report forms for loading/error/success states.
- `[BLOCKER]` Confirm toasts do not overlap the dock or hide critical actions.
- `[RECOMMENDED]` Check confirm dialogs and modal focus/close behavior.
- `[RECOMMENDED]` Verify empty states on no-group, empty-playlist and no-activity scenarios.
- `[AUTO LATER]` Add form submission/error automation for highest-risk flows.

### Accessibility Basics

- `[RECOMMENDED]` Check keyboard navigation on auth, upload, reports and debt forms.
- `[RECOMMENDED]` Verify visible focus states on buttons/inputs/tabs.
- `[RECOMMENDED]` Confirm images/covers/avatars have sane fallback behavior.
- `[AUTO LATER]` Run axe/lighthouse accessibility checks in CI.

## C. Technical / Integration Testing

### Supabase Auth / DB / RLS

- `[BLOCKER]` Confirm migrations `001-011` are applied in the QA/staging project.
- `[BLOCKER]` Verify group reads do not recurse or fail under normal login bootstrap.
- `[BLOCKER]` Validate protected reads/writes for groups, songs, debts, reports and files.
- `[RECOMMENDED]` Verify admin role behavior in `user_roles`.
- `[AUTO LATER]` Add schema-readiness and RLS smoke tests.

### Storage / Uploads

- `[BLOCKER]` Verify buckets `avatars`, `covers`, `songs`, `files`, `reports` exist.
- `[BLOCKER]` Test audio upload with DB insert failure simulation if possible.
- `[BLOCKER]` Test file upload with DB insert failure simulation if possible.
- `[RECOMMENDED]` Verify signed URL refresh behavior after session refresh.
- `[AUTO LATER]` Add storage policy smoke tests with service-role and client-role contexts.

### Build / Deploy / PWA

- `[BLOCKER]` Run `npm run lint`.
- `[BLOCKER]` Run `npx tsc --noEmit`.
- `[BLOCKER]` Run `npm run build`.
- `[RECOMMENDED]` Verify SPA rewrites and protected-route boot behavior on deployed Vercel preview.
- `[RECOMMENDED]` Check manifest, icons and service worker update behavior on a real browser.
- `[AUTO LATER]` Add CI gates for lint/typecheck/build and a deployed smoke suite.

### Environment / Seed

- `[BLOCKER]` Confirm `SUPABASE_SERVICE_ROLE_KEY` is available before running the seed scripts.
- `[BLOCKER]` Run `npm run seed:qa:fresh` in a safe QA project and verify counts.
- `[RECOMMENDED]` Re-run smoke tests after reseeding.
- `[AUTO LATER]` Add a CI-safe dry validation path for seed structure and maybe fixture counts.

## Launch Blocking Subset

If time is short, these are the minimum tests that should not be skipped:

1. auth login/logout/session restore
2. group list/detail/create
3. song upload end-to-end
4. song playback mini/full player
5. debt list/detail/payment transition
6. report create/list/status visibility
7. file upload/list/delete basic flow
8. changelog rendering from Supabase
9. mobile dock + toast + safe-area verification
10. lint, typecheck, build, migrations `001-011`
