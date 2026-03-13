# GitHub Setup (Team-Ready)

Repository: `https://github.com/albertomanana/appden`

## 1) Collaborator roles

- Owner: full admin.
- Maintainer(s): write + merge rights.
- Contributor(s): write limited to branches, via PR.

As team grows, migrate to GitHub Teams:

- `appden-admins`
- `appden-maintainers`
- `appden-contributors`

## 2) Default branch

- Keep `main` as default branch.

## 3) Branch protection rules

Apply to `main`:

- Require pull request before merging.
- Require at least 1 approval.
- Require review from CODEOWNERS.
- Dismiss stale approvals on new commits.
- Require conversation resolution before merge.
- Restrict direct pushes to `main`.
- Include administrators.
- Allow squash merge only (optional but recommended).

Apply to `develop`:

- Require pull request before merging.
- Require at least 1 approval.
- Require conversation resolution.
- Restrict force pushes.

## 4) Required status checks

When stable checks are available, mark them required.
Current baseline workflow added in repo:

- `Install Check / install`

## 5) Repository settings

- Enable vulnerability alerts.
- Enable Dependabot security updates.
- Enable auto-delete head branches after merge.
- Disable merge commits if using squash strategy.

## 6) Labels

Create labels:

- `bug`
- `enhancement`
- `task`
- `priority:high`
- `priority:medium`
- `priority:low`
- `area:player`
- `area:auth`
- `area:supabase`
- `area:ui`

## 7) Milestones

- `MVP Stabilization`
- `Player Pro`
- `Lyrics v1`
- `Debt Pro`

## 8) Onboarding rule

No one pushes directly to `main`. All changes go through PR with template + review.
