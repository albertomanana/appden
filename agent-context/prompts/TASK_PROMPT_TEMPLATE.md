# Task Prompt Template

Use this template when asking another model/agent to implement something in The Appden.

## Prompt

Project: The Appden (React + TS + Supabase)

Required context files to read first:

1. `agent-context/APP_CONTEXT.md`
2. `agent-context/REPO_MAP.md`
3. `agent-context/SUPABASE_CONTEXT.md`
4. `agent-context/FEATURE_STATUS_1_43.md`
5. `agent-context/CHAT_CONTEXT.md`

Task:

[Describe exact feature/bugfix]

Constraints:

- Keep compatibility with existing advanced player and legacy bridge.
- Do not change storage bucket names.
- Do not introduce secrets in repo.
- If SQL is required, provide migration-safe SQL and rollback notes.

Deliver:

- code changes integrated in existing architecture
- verification commands and results
- list of manual deployment steps (if any)
