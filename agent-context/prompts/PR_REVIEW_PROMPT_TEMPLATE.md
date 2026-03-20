# PR Review Prompt Template

Review this PR for The Appden with a bug-risk and regression-first mindset.

Read context first:

- `agent-context/APP_CONTEXT.md`
- `agent-context/SUPABASE_CONTEXT.md`
- `agent-context/FEATURE_STATUS_1_43.md`

Review priorities:

1. Functional regressions in auth/player/music upload/debt flows
2. Security/RLS/storage policy risks
3. Type safety and runtime edge cases
4. Mobile UX breakages
5. Missing tests or missing manual validation notes

Output format:

1. Findings ordered by severity
2. File + line references for each finding
3. Open questions/assumptions
4. Short summary of risk level
