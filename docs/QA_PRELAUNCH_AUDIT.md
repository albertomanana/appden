# QA Prelaunch Audit

Date: 2026-03-26
Project: The Appden
Scope: React, TypeScript, Supabase, PostgreSQL, PWA, RLS, Storage, prelaunch QA readiness

## Executive Summary

The Appden is no longer in a demo state. It has real product breadth, real Supabase coupling, and enough production-facing complexity that silent failure modes matter more than missing polish.

The strongest parts today are:

- the main app shell and mobile navigation
- the music browsing/player baseline
- the breadth of Supabase-backed modules already present
- the overall route/module coverage

The most important remaining launch risks are:

1. notifications UI is not connected to backend data
2. several modules can silently fall back to `localStorage`, which can mask missing tables or broken backend flows during QA
3. avatar storage still relies on fragile signed-URL persistence semantics
4. the app still depends heavily on migrations `010` and `011` being applied everywhere
5. a few modules/pages remain structurally older and harder to validate safely

## Fixed In This Intervention

These were real issues in the current codebase and were corrected as part of this pass:

1. `src/services/files.service.ts`
Severity: High
Impact: broke functionality, silent bad data risk
Fix:
- file uploads now persist the storage path instead of an unresolved async result
- file records now return signed URLs for storage-backed files
- storage objects are cleaned up if DB metadata insert fails
- delete flow now best-effort removes stored objects too

2. `src/features/changelog/services/changelog.service.ts`
Severity: High
Impact: broke QA visibility of seeded changelog data
Fix:
- service now prefers Supabase entries when real rows exist
- generated JSON remains a fallback instead of always shadowing DB data

3. Song upload flow already hardened in the current worktree
Severity: High
Impact: false-success UX, noisy backend failures
Fix already present in repo state:
- upload no longer depends on fragile client-side follow-up inserts for `song_owners` and `group_activity`
- storage cleanup now happens if the `songs` insert fails
- migration `011_song_upload_storage_hardening.sql` now codifies buckets, storage policies and trigger-backed sync

## Prioritized Findings

| Severity | Impact | Finding | Recommendation |
| --- | --- | --- | --- |
| Critical | Breaks functionality, deployment risk | `NotificationsPage` is disconnected from the real `notifications` table and currently reflects client-session state instead of backend truth. | Wire the notifications page/store to Supabase reads/writes before launch, or explicitly hide/de-scope the module. |
| High | Technical debt, QA masking | Several services can silently fall back to `localStorage` when backend relations/tables are missing, making broken environments look partially healthy. | Add explicit QA warnings/telemetry for fallback mode and treat fallback as non-launchable behavior in staging/prod checks. |
| High | Breaks UX, deployment risk | Avatar handling still stores signed URLs in `profiles.avatar_url`; signed links expire and are not consistently re-signed across joined profile views. | Store stable storage paths instead of signed URLs, then sign on read. Revisit avatar bucket visibility rules with social/profile requirements. |
| High | Deployment risk | Migrations `010_groups_rls_rpc_hardening.sql` and `011_song_upload_storage_hardening.sql` are operationally required for stable auth/group/music flows. | Treat `001-011` as mandatory baseline. Add an environment readiness checklist before any QA session. |
| High | Breaks UX, technical debt | The product still contains backend-dependent modules whose UI can appear “alive” even if the backing schema is incomplete. This is especially visible in social, reports, changelog and debt-pro fallbacks. | Document fallback boundaries, add runtime warnings in QA mode, and verify seeded/staging environments with real tables only. |
| High | Technical debt | Avatar/profile, debt-pro and social/report services are oversized and mix compatibility logic with domain logic. | Split service layers by capability and by backend source. Start with `debt-pro.service.ts`, `social.service.ts`, `reports.service.ts`, `songs.service.ts`. |
| Medium | Breaks functionality | Shared file route/preview is still incomplete and does not yet provide a polished or fully trustworthy file access flow. | Finish shared file resolution and improve missing/expired/not-supported states. |
| Medium | Breaks UX | `GroupsPage` still does per-group member counting with extra requests, which can degrade perceived performance on bigger datasets. | Replace N+1 counting with a single query or server-side aggregate view/RPC. |
| Medium | Technical debt | Secondary/detail flows remain visually and structurally older than the main shell. | Continue refactor pass on `SongDetailPage`, `DebtDetailPage`, `MemberProfilePage`, auth pages and playlist detail flows. |
| Medium | Breaks UX | A legacy/duplicate player surface still exists (`SpotifyMusicPlayer.tsx`) and increases maintenance ambiguity. | Remove or clearly archive the legacy player path once the current player is fully canonical. |
| Medium | Technical debt | Mojibake/encoding artifacts still appear in older files and strings. | Normalize source encoding and clean remaining affected docs/UI strings before public launch. |
| Low | Deployment risk | Main build still emits a bundle-size warning. | Add route-level code splitting for heavier player/social surfaces after functional launch blockers are cleared. |

## Module-Specific Notes

### Auth

- core session bootstrap is much safer after group RLS hardening
- risk remains tightly coupled to migrations `010` and `011`
- normal-browser vs incognito behavior should still be tested on stale clients

### Groups

- create/list/member flows exist and are meaningful
- invitations, permissions and owner/admin semantics exist in schema and UI
- performance and RLS coupling remain the main risks

### Social

- connections, friend requests, group friend requests, comments, likes and reactions all exist
- backend shape is richer than the perceived UX maturity
- fallback masking is the biggest QA trap

### Music / Player / Upload

- this is one of the strongest modules in the product
- recent hardening removed the worst upload false-success behavior
- still needs heavy device testing around player, cover rendering and safe areas

### Debts

- base debt flow is real
- pro layer exists with reminders, installments, goals, permissions and badges
- service layer is heavy and should be treated as regression-prone

### Reports / Changelog

- both modules have real schema and UI
- reports have admin notification triggers in DB
- changelog now surfaces seeded DB entries correctly
- some UX/admin polish still remains

## Recommended Launch Gate

The Appden is suitable for a serious QA phase with seeded data now, but not yet for blind public launch without:

1. verifying migrations `001-011` in the target Supabase project
2. deciding whether notifications ship or are explicitly hidden
3. resolving or accepting the avatar signed-URL design risk
4. running full device QA on auth, groups, upload, player, debts and reports
