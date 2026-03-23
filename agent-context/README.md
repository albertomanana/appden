# The Appden Agent Context Pack

Snapshot date: 2026-03-23
Release: v1.6.0

This folder contains a reusable context pack so any developer or AI agent can work on The Appden from another IDE/model without losing project and conversation context.

## What is inside

- `APP_CONTEXT.md`: product and architecture context.
- `CHAT_CONTEXT.md`: key decisions and incidents from this chat thread.
- `FEATURE_STATUS_1_43.md`: roadmap item tracking (1-43).
- `SUPABASE_CONTEXT.md`: migrations, buckets, RLS, storage troubleshooting.
- `WORKFLOW_GITHUB_CONTEXT.md`: collaboration workflow and GitHub standards.
- `RUNBOOK.md`: local setup, QA checks, launch/deploy steps.
- `KNOWN_ISSUES.md`: current risks and troubleshooting notes.
- `REPO_MAP.md`: practical map of important files/folders.
- `AGENT_PLAYBOOK.md`: operating rules for custom coding agents.
- `OPEN_ACTIONS.md`: prioritized follow-up tasks.
- `MACHINE_CONTEXT.json`: machine-readable condensed context.
- `prompts/`: reusable prompt templates for other models/IDEs.

Recent additions tracked in this snapshot:

- refactor to `src/features/social`
- new feature modules: `src/features/changelog`, `src/features/reports`
- new routes: `/changelog`, `/reports`
- new migration: `006_changelog_reports_social_hardening.sql`
- social group invitations flow: `007_group_invitations.sql`
- RLS recursion/login hotfix: `008_fix_rls_groups_recursion.sql`
- auth bootstrap hardening in `AuthProvider` (do not force logout on group fetch failure)
- social + reports hardening migration: `009_social_connections_reports_admin.sql`
- definitive groups RLS/RPC hotfix: `010_groups_rls_rpc_hardening.sql`
- new routes: `/connections`, `/reports`, `/reports/:reportId` (`/report` kept as redirect)
- automatic changelog pipeline from git commits on `develop`:
  - script: `scripts/generate-changelog-from-git.mjs`
  - workflow: `.github/workflows/changelog-develop.yml`
  - generated source file: `public/changelog.generated.json`
- PWA asset hotfix:
  - real icons created under `public/icons/`
  - `public/apple-touch-icon.png`
  - `public/masked-icon.svg`
- Stitch visual integration pass for v1.6:
  - design source treated as visual system, not replacement app
  - shell upgraded in `src/components/layout/AppLayout.tsx`
  - dock navigation upgraded in `src/components/layout/Navigation.tsx`
  - shared editorial header component added: `src/components/ui/PageHeader.tsx`
  - visual primitives refreshed in `tailwind.config.js` and `src/styles/globals.css`
  - animated feedback now uses `framer-motion`
  - premium UI pass applied to dashboard, music, groups, connections, reports, changelog, debts and profile

## Recommended reading order

1. `APP_CONTEXT.md`
2. `REPO_MAP.md`
3. `SUPABASE_CONTEXT.md`
4. `FEATURE_STATUS_1_43.md`
5. `CHAT_CONTEXT.md`
6. `AGENT_PLAYBOOK.md`

## Maintenance rule

When shipping relevant changes, update this folder in the same PR:

- feature or architecture changes -> update `APP_CONTEXT.md` and `FEATURE_STATUS_1_43.md`
- infra/db/storage changes -> update `SUPABASE_CONTEXT.md` and `RUNBOOK.md`
- major decisions from collaboration/chat -> append to `CHAT_CONTEXT.md`
- new blockers -> update `KNOWN_ISSUES.md`

## Important

- Do not copy `.env.local` secrets into this folder.
- This pack documents expected behavior; always verify against source code before refactors.
