# Branching Model

## Long-lived branches

- `main`: stable and releasable.
- `develop`: integration branch for next release.

## Short-lived branches

- `feat/<scope>-<name>`
- `fix/<scope>-<name>`
- `refactor/<scope>-<name>`
- `chore/<name>`

## Merge policy

- Features and fixes merge into `develop`.
- Release and hotfix PRs merge into `main`.
- Prefer `Squash and merge`.

## Naming examples

- `feat/music-synced-lyrics`
- `fix/player-next-prev-mobile`
- `refactor/auth-provider-bootstrap`

## Recommended release cycle

1. Build features in `develop`.
2. Stabilization PRs in `develop`.
3. Merge `develop` into `main`.
4. Tag release (`vX.Y.Z`).
