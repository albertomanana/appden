# Chat Context (Condensed Timeline)

This file captures decisions and incidents from this collaboration thread so future agents understand why the code looks like this.

## Timeline

1. Initial incidents reported:
- covers not previewing
- play/pause/next controls not working
- app worked mainly in incognito mode

2. Storage upload error reported:
- `StorageApiError: Bucket not found`
- root cause pointed to Supabase bucket mismatch

3. Bucket strategy aligned:
- bucket name standardized to `covers`
- requested refactor of old bucket references

4. SQL policy errors appeared in setup:
- `ERROR 42501 must be owner of table objects`
- `ERROR 42883 operator does not exist: text = uuid`

5. Practical fix patterns discussed:
- use dashboard-created bucket `covers`
- avoid ownership-only statements when role is limited
- cast `auth.uid()::text` when comparing against text fields in storage paths

6. Product expansion requests:
- advanced player experience
- lyrics automation and editing flow
- social layer
- debt automation and retention features
- mobile UI improvements

7. Context-pack strategy requested:
- maintain `agent-context/` as canonical cross-IDE and cross-AI memory

8. 2026-03-19 refactor execution:
- Phase 0 cleanup done first (`node_modules`, `dist`, `dev-dist`, `tmpclaude-*`, `netlify.toml`)
- deployment unified on Vercel (`netlify.toml` removed)
- ESLint config added so `npm run lint` now works
- social module refactored to `src/features/social` with compatibility wrappers
- social completion: edit own comments added, reactions maintained, mentions and nested replies preserved
- sharing upgraded with timestamp query (`?t=`) and deep-link handling
- new internal modules added: `src/features/changelog`, `src/features/reports`
- new routes added: `/changelog`, `/report`
- SQL migration `006_changelog_reports_social_hardening.sql` created

9. 2026-03-19 group invite gap closed:
- added owner-driven `group_invitations` flow for non-members
- incoming invites now shown on `GroupsPage` with accept/reject actions
- `GroupDetailPage` now includes search-based invitation panel
- SQL migration `007_group_invitations.sql` added (RLS + policies)

10. 2026-03-19 post-invite auth incident and fix:
- login/bootstrap started failing with `42P17 infinite recursion detected in policy for relation "groups"`
- root cause: policy dependency cycle between `groups` select policy and `group_invitations` policies
- SQL hotfix migration created: `008_fix_rls_groups_recursion.sql`
- auth bootstrap hardened: group loading errors no longer clear user session in `AuthProvider`

11. 2026-03-19 social/reports/changelog deep integration pass:
- added migration `009_social_connections_reports_admin.sql`
  - `group_role` expanded with `admin`
  - `groups` auto-owner membership trigger
  - manager (owner/admin) member/invitation policies
  - new global social tables: `friend_requests`, `friendships`
  - reports upgraded (`title`, `severity`, `reproduction_steps`, `updated_at`, global-auth visibility)
  - admin scaffolding: `user_roles`, `is_app_admin`, `report_notifications` + insert trigger
- new social page `/connections` with search + request/accept/reject + friends list
- reports rebuilt on `/reports` + `/reports/:reportId`; `/report` now redirects
- changelog switched to auto-generated git source:
  - `scripts/generate-changelog-from-git.mjs`
  - `.github/workflows/changelog-develop.yml`
  - `public/changelog.generated.json`
- removed noisy startup `console.log` lines from Supabase client/auth bootstrap path

## Locked decisions

- storage cover bucket name is `covers`
- keep buckets private and use signed URLs
- preserve group privacy through RLS as default posture
- keep advanced player modular under `src/features/player`
- keep social/changelog/reports modular under `src/features/*`
- keep collaboration workflow PR-first (no direct push to `main`)

## Things future agents must remember

- There are legacy and advanced player layers; changes must keep compatibility with existing pages.
- Multiple services include localStorage fallbacks when DB tables are missing.
- `src/services/song-social.service.ts` and `src/services/group-activity.service.ts` are wrappers to feature services.
- `agent-context` must be updated in each relevant PR/session.
