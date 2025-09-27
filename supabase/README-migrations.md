Applying new demo migrations to a Supabase project

This repository contains development/demo-only SQL migrations under `supabase/migrations/`.

Prerequisites
- Install the Supabase CLI or use the Supabase web SQL editor.
- Authenticate the CLI: `supabase login` and `supabase link --project-ref <your-project-ref>`

PowerShell-friendly deployment (recommended for local dev):

# 1) Inspect the migration file(s)
Get-Content .\supabase\migrations\20250927_demo_sessions_and_onboarding.sql

# 2) Apply with the Supabase CLI (runs the SQL against your project's DB)
supabase db query --file .\supabase\migrations\20250927_demo_sessions_and_onboarding.sql

# Alternative: run via psql (if you have DB URL)
# $env:PGPASSWORD="<password>"; psql "$env:SUPABASE_DB_URL" -f .\supabase\migrations\20250927_demo_sessions_and_onboarding.sql

Verification
- Visit Supabase Studio -> Table Editor and confirm rows exist in `support_sessions` and `therapist_onboardings` for `demo-therapist-0001`.
- In the app, log in as the demo therapist (use the demo profile or create a session) and verify the Therapist Dashboard shows the demo session and onboarding state.

Notes
- These demo migrations are idempotent and create minimal tables if missing to avoid failure on databases that lack those tables.
- Do NOT run these in production unless you intend to seed demo content.
