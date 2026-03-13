# New Contributor Onboarding

## Day 1 checklist

1. Clone repository.
2. Install Node 20.
3. Run `npm ci`.
4. Copy `.env.example` to `.env.local` and fill Supabase keys.
5. Run `npm run dev`.
6. Read:
   - `README.md`
   - `CONTRIBUTING.md`
   - `docs/BRANCHING.md`

## First PR checklist

1. Create branch from `develop`.
2. Open an issue and link it in PR.
3. Keep PR under ~400 lines when possible.
4. Add screenshots for UI changes.
5. Request review from code owner.

## Team agreements

- Small PRs merge faster.
- SQL changes must include rollback notes.
- Never commit secrets.
- Respect naming conventions for branches and commits.
