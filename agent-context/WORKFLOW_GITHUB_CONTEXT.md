# Workflow and GitHub Context

## Branching model

- long-lived:
  - `main` (production-ready)
  - `develop` (integration)
- short-lived:
  - `feat/<scope>-<name>`
  - `fix/<scope>-<name>`
  - `refactor/<scope>-<name>`
  - `chore/<name>`

Reference:

- `docs/BRANCHING.md`
- `CONTRIBUTING.md`

## Pull request policy

- PR-first flow (no direct push to `main`)
- keep PR scope focused
- use conventional commits
- include screenshots/videos for UI changes

Template:

- `.github/pull_request_template.md`

## Ownership and review

- CODEOWNERS present:
  - `.github/CODEOWNERS`
- critical folders already assigned to owner

## Existing CI baseline

- workflow:
  - `.github/workflows/install-check.yml`
- current check:
  - installs dependencies (`npm ci`)

## Changelog automation workflow

- workflow:
  - `.github/workflows/changelog-develop.yml`
- trigger:
  - push to `develop`
  - manual `workflow_dispatch`
- action:
  - run `npm run changelog:generate`
  - update `public/changelog.generated.json`
  - auto-commit `chore(changelog): update from develop [skip ci]` only when file changes
- required permission:
  - `contents: write` (workflow-level)

## Suggested branch protections (as documented)

Main:

- require PR before merge
- at least 1 approval
- require CODEOWNERS review
- dismiss stale approvals
- conversation resolution required
- restrict direct pushes

Develop:

- require PR
- at least 1 approval
- conversation resolution

Reference:

- `docs/GITHUB_SETUP.md`

## Team scaling notes

Documented future team structure:

- `appden-admins`
- `appden-maintainers`
- `appden-contributors`

When adding collaborators:

1. grant least privilege
2. enforce PR-only to protected branches
3. keep issue templates + labels active
