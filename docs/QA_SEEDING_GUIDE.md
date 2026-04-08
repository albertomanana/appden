# QA Seeding Guide

Date: 2026-03-26

## Purpose

The QA seed system creates a persistent, realistic Supabase dataset for exploring The Appden as a living product, not as an empty shell.

It is designed for:

- richer manual QA
- regression hunting before launch
- validating empty, sparse and high-density states
- resetting and repopulating the same QA namespace repeatedly

## Files

- `scripts/qa-seed/shared.mjs`
- `scripts/qa-seed/reset.mjs`
- `scripts/qa-seed/fixtures.mjs`
- `scripts/qa-seed/seed.mjs`

## Commands

```bash
npm run seed:qa
npm run seed:qa:fresh
npm run seed:qa:reset
```

## Environment Variables

Required:

- `SUPABASE_URL` or `VITE_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

Optional:

- `QA_SEED_EMAIL_DOMAIN`
- `QA_SEED_DEFAULT_PASSWORD`

Defaults:

- `QA_SEED_EMAIL_DOMAIN=qa.theappden.local`
- `QA_SEED_DEFAULT_PASSWORD=Launch2026!`

## Current Execution Status

In this workspace on 2026-03-26:

- `.env.local` contains a Supabase URL
- `.env.local` does not contain `SUPABASE_SERVICE_ROLE_KEY`
- runtime env also does not expose `SUPABASE_SERVICE_ROLE_KEY`

Result:

- the seed scripts were implemented and syntax-validated
- the seed was not executed against Supabase from this machine

## Manual Fallback Without Service Role

If you do not have `SUPABASE_SERVICE_ROLE_KEY` but you do have access to Supabase SQL Editor, use the manual smoke seed:

- `supabase/seeds/qa_manual_smoke_reset.sql`
- `supabase/seeds/qa_manual_smoke_seed.sql`
- `docs/QA_MANUAL_SMOKE_ES.md`

What it does:

- reuses existing `profiles`
- creates a temporary QA group visible to existing users
- creates playable songs using public sample MP3 URLs
- creates playlists, comments, reactions, debts, reports, files and changelog rows
- creates an additional sparse/empty-state group

Temporary namespace used by the manual SQL seed:

- groups named `QA Temp:%`
- friend requests with `message LIKE 'QA Temp:%'`

Recommended manual run order:

1. apply migrations `001-012`
2. run `qa_manual_smoke_reset.sql`
3. run `qa_manual_smoke_seed.sql`
4. login with any existing user
5. validate flows using `docs/QA_MANUAL_SMOKE_ES.md`

## What The Seed Creates

Expected dataset from the current fixture set:

- 16 users
- 1 admin user (`nova-admin@<QA_SEED_EMAIL_DOMAIN>`)
- 5 groups
- 23 group memberships
- 4 group invitations
- 8 global friend requests
- 4 friendships
- 4 group friend requests
- 32 songs
- 36 song-owner rows total after uploader ownership + extra contributors
- 6 lyric documents
- 10 playlists
- 93 favorites
- 123 song likes
- 93 reactions
- 40 comments
- 30 comment likes
- 12 debts
- 7 payments
- 2 reminders
- 6 installments
- 3 goals
- 3 badges
- 8 files
- 10 reports
- 8 changelog entries
- 5 backend notifications

## Seeded Personas

Notable seeded accounts:

- `nova-admin@<QA_SEED_EMAIL_DOMAIN>`: admin user
- `sol-orbit@<QA_SEED_EMAIL_DOMAIN>`: user without groups
- `leo-draft@<QA_SEED_EMAIL_DOMAIN>`: incomplete-profile user
- `nora-fresh@<QA_SEED_EMAIL_DOMAIN>`: low-activity/newer member
- `lucia-vega@<QA_SEED_EMAIL_DOMAIN>`: high-activity uploader with many songs

Default password:

- `Launch2026!` unless overridden by `QA_SEED_DEFAULT_PASSWORD`

## Seeded Group Purposes

- `QA Seed: Launch House`
Purpose: dense music/social/feed testing

- `QA Seed: Neon Basement`
Purpose: medium-density uploads, reports and social transitions

- `QA Seed: Balance Club`
Purpose: debts, partial/full payments, reminders, installments, goals, permissions

- `QA Seed: Late Checkout`
Purpose: files, changelog, mixed coordination and cross-feature QA

- `QA Seed: Quiet Drafts`
Purpose: owner-only/low-activity/empty-state validation

## Edge Scenarios Covered

- user with no groups
- owner-only group
- empty playlist
- song without cover
- incomplete profile
- low-activity/new user
- high-activity group
- partially paid debt
- fully paid debt
- overdue installment
- report without image
- group with no changelog entries of its own

## Important Limitations

1. A truly memberless group is not seeded
Reason:
The current schema/trigger model guarantees owner membership on group creation.

2. Backend notifications are seeded, but the current notifications UI is not wired to Supabase
Reason:
The route exists, but the current page/store is session-based.

3. Audio and file placeholders use safe external URLs
Reason:
The goal is to keep the repo lightweight while still exercising real UI states.

Placeholder strategy:

- song audio: public sample MP3 URLs
- file documents: public text/PDF URLs
- covers/images: `placehold.co`
- avatars: inline SVG data URLs stored in profile rows

## Recommended Run Order

1. Apply Supabase migrations `001-011`
2. Export or set `SUPABASE_SERVICE_ROLE_KEY`
3. Run `npm run seed:qa:fresh`
4. Login with seeded accounts
5. Execute the checklist in `docs/QA_TEST_CHECKLIST.md`

## Reset Behavior

`npm run seed:qa:reset` removes the QA namespace identified by:

- auth users ending in `@<QA_SEED_EMAIL_DOMAIN>`
- groups whose names start with `QA Seed:`

This is intended for dedicated QA/staging projects, not shared production data.
