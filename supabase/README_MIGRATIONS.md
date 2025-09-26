Migration helper scripts

This folder contains helper scripts to manage and validate Supabase/Postgres migrations for the project.

Available scripts (run from project root):

- `npm run migrate:archive` — Runs `supabase/scripts/archive_old_migrations.ps1` to move all `.sql` migration files (except `20250920120000_consolidated_schema.sql`) into `supabase/migrations/archived/`.

- `npm run migrate:validate -- <STAGING_DB_URL>` — Runs `supabase/scripts/validate_migrations.ps1` to apply the consolidated migration to a staging database. Usage:

  ```powershell
  npm run migrate:validate -- "postgresql://user:password@host:5432/dbname"
  ```

Notes and safety precautions:
- Do NOT run the archive script in CI before you've verified preserved migration history if you rely on the original migration ordering for rollback.
- The validation script uses `psql` and expects `psql` to be installed and accessible in PATH. It is intended for staging environments only.
- The consolidated migration intentionally omits RLS/policy SECURITY DEFINER changes and demo seeds. Apply those feature-policy migrations manually in staging after review.
