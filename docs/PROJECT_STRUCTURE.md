# Project Structure Guide

## Core app code

- `src/app`: router, providers, global stores.
- `src/components`: reusable UI and feature components.
- `src/pages`: route-level pages.
- `src/services`: data access and business logic.
- `src/lib`: constants, validators, utils, Supabase client.
- `src/types`: shared TypeScript interfaces.

## Data and backend resources

- `supabase/migrations`: SQL schema and policies.
- `supabase/*.sql`: operational SQL scripts.

## Team/process files

- `.github/`: PR template, issue templates, CODEOWNERS, workflows.
- `docs/`: collaboration and onboarding docs.
- `CONTRIBUTING.md`: contribution rules and review flow.
