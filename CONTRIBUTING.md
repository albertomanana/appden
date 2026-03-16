# Contributing Guide

## Branch strategy

- `main`: production-ready branch, protected.
- `develop`: integration branch for upcoming release.
- Short-lived feature branches from `develop`:
  - `feat/<area>-<short-name>`
  - `fix/<area>-<short-name>`
  - `chore/<short-name>`

Examples:

- `feat/player-synced-lyrics`
- `fix/auth-refresh-loop`
- `chore/update-storage-policies`

## Commit convention

Use conventional commits:

- `feat(player): add synchronized lyrics editor`
- `fix(storage): use covers bucket for signed urls`
- `refactor(auth): simplify session bootstrap`

## Pull request flow

1. Open issue first (bug/feature/task) unless it is a tiny fix.
2. Create branch from `develop`.
3. Keep PRs focused (one objective per PR).
4. Fill PR template completely.
5. Request review from code owners.
6. Merge using `Squash and merge`.

## Definition of done

- Feature works locally.
- No secrets included.
- Docs updated if behavior or setup changes.
- SQL changes include rollback notes when applicable.
- PR has screenshots or short video for UI changes.

## Review expectations

- Prioritize correctness, regressions, and security.
- Keep comments concrete with file/line references.
- Resolve all conversations before merge.

## Security rules

- Never commit `.env.local` or secrets.
- Use least privilege in Supabase policies.
- Avoid broad `SELECT` policies without group/user constraints.
