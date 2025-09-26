Migration Validation Plan

Purpose
-------
This document explains how to validate the consolidated migration and how to reconcile it with existing per-feature migrations in `supabase/migrations/`.

Prerequisites
-------------
- PostgreSQL 13+ (Supabase uses Postgres; match your target server version)
- `psql` or supabase CLI access to a test/staging database
- A clean database (no existing tables) or a dedicated schema for testing

Steps
-----
1. Create a fresh database (local or staging). Example (psql):

   psql -c "CREATE DATABASE cogniflow_test;"

2. Run consolidated migration:

   psql -d cogniflow_test -f supabase/migrations/20250920120000_consolidated_schema.sql

   Expected: All tables created with no errors.

3. Inspect schema quickly:

   psql -d cogniflow_test -c "\dt public.*"
   psql -d cogniflow_test -c "SELECT tablename FROM pg_tables WHERE schemaname='public';"

4. Apply any feature-specific migrations that include policies or functions (run in order):
   - review and run the original migration files in `supabase/migrations/` that define RLS policies, functions, triggers, and data seeds. These were preserved in the repository and should be executed after confirming the base schema.
   - run each migration one at a time and observe for errors. If a migration errors due to missing columns, it indicates the consolidated schema needs to be adjusted or the migration is out-of-order.

5. Run basic smoke tests:
   - Insert a `profiles` row and a related `client_profiles`, create a `case`, assign a `treatment_plan`, create an `assessment_instance`, add `assessment_responses`, and ensure FK constraints work.
   - Check sample RLS policies (if applied) with an authenticated role and confirm `SELECT`/`INSERT` behavior.

6. Validation checklist:
   - [ ] All required tables exist
   - [ ] FK constraints and indexes are present
   - [ ] Idempotency: re-running the consolidated migration runs without fatal errors
   - [ ] Functions/triggers from previous migrations are created and usable
   - [ ] Seed/demo data (if needed) can be applied without conflicts

Edge cases & notes
------------------
- RLS policies may expect certain functions or roles; run them in a safe staging environment.
- Demo seed scripts in older migrations insert into `auth.users` and set `encrypted_password` values. Avoid running those against a production `auth` schema unless intended.
- If your deployment uses a managed Supabase instance, prefer applying per-feature policy migrations through the Supabase migration runner to avoid `SECURITY DEFINER` surprises.

Rollback strategy
-----------------
- For testing: drop the test DB and recreate.
- For production: Always back up DB before running migrations. Use `pg_dump` or Supabase backup features.

Contact
-------
For anything ambiguous in the migration scripts, contact the developer who provided the demo SQL blocks or open an issue with the migration filename and the error trace.
