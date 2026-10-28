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

## Local runtime separation

- The Appden runs on `http://127.0.0.1:4173`.
- Do not reuse the CarCare development server or its port (`5173`).
- If the app remains on the session loading screen, check the browser console and
  verify that Supabase session, profile, and group bootstrap requests finish or
  time out instead of waiting indefinitely.
