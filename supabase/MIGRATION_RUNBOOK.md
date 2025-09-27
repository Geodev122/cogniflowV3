Migration Runbook — Safe staging execution

Purpose: run the consolidated, idempotent migrations in a staging (or fresh) Postgres database and validate each step. The commands below use psql from PowerShell; they also include validation SQL snippets you can copy into the Supabase SQL editor if you prefer.

Prerequisites
- psql CLI available and reachable to your staging DB.
- Connection details: host, port, dbname, user, password. Set them as environment variables in PowerShell before running the script: PGHOST, PGPORT, PGDATABASE, PGUSER, and PGPASSWORD.
- Recommended: run in a fresh/staging DB (not production). Take a DB dump/backups before running in production.

Overview (safe execution order)
1. `20250920120000_consolidated_schema.sql` (core tables + extensions)
2. `20250920123000_policies_and_indexes.sql` (indexes + placeholder policies)
3. `20250927_add_roles_and_profiles.sql` (profiles, user_roles, helper functions & triggers)
4. `20250928_add_profile_columns.sql` and `20250928_fix_profiles_backfill.sql` (profile column fixes/backfills)
5. `20250920_add_therapist_db_role.sql` (optional mitigation, tolerant of limited privileges)
6. `20250927_consolidated_additions.sql` (small/missed tables: subscriptions, onboarding, etc.)
7. Feature migrations (idempotent):
   - `20250927_create_dashboard_tables.sql`
   - `20250927_create_messages_table.sql`
   - `20250927_create_resources.sql`
   - `20250927_create_ce_completions_if_missing.sql`
   - `20250927_create_custom_forms.sql`
   - `20250927_create_gamified_apps.sql`
   - `20250927_create_app_sessions.sql`
   - `20250927_create_app_progress.sql`
   - `20250927_ensure_assessment_library.sql` and `20250919000000_create_assessment_library.sql` (assessment library)
8. Optional / archived demo migrations: do NOT run unless intentionally seeding demo data. They are copied to `supabase/migrations/archived/`.

PowerShell (single-file run example)
Set your environment variables and run a single migration file with ON_ERROR_STOP so psql aborts on first error. Example (set your vars first):

```powershell
#$env assignment example (replace values):
#$env:PGHOST = 'db.example.supabase.co'
#$env:PGPORT = '5432'
#$env:PGDATABASE = 'postgres'
#$env:PGUSER = 'postgres'
#$env:PGPASSWORD = 'your_password_here'

# Run a single migration file and stop on error
psql "postgresql://$($env:PGUSER)@$($env:PGHOST):$($env:PGPORT)/$($env:PGDATABASE)" -v ON_ERROR_STOP=1 -f .\supabase\migrations\20250920120000_consolidated_schema.sql
```

PowerShell (run the full ordered list)
Copy/paste this block (after setting your env vars). It runs migrations in sequence and logs output to `migration-run.log`. If any file exits with an error, the loop stops and you can inspect the log.

```powershell
$files = @(
  'supabase/migrations/20250920120000_consolidated_schema.sql',
  'supabase/migrations/20250920123000_policies_and_indexes.sql',
  'supabase/migrations/20250927_add_roles_and_profiles.sql',
  'supabase/migrations/20250928_add_profile_columns.sql',
  'supabase/migrations/20250928_fix_profiles_backfill.sql',
  'supabase/migrations/20250920_add_therapist_db_role.sql',
  'supabase/migrations/20250927_consolidated_additions.sql',
  'supabase/migrations/20250927_create_dashboard_tables.sql',
  'supabase/migrations/20250927_create_messages_table.sql',
  'supabase/migrations/20250927_create_resources.sql',
  'supabase/migrations/20250927_create_ce_completions_if_missing.sql',
  'supabase/migrations/20250927_create_custom_forms.sql',
  'supabase/migrations/20250927_create_gamified_apps.sql',
  'supabase/migrations/20250927_create_app_sessions.sql',
  'supabase/migrations/20250927_create_app_progress.sql',
  'supabase/migrations/20250927_ensure_assessment_library.sql',
  'supabase/migrations/20250919000000_create_assessment_library.sql'
)

$log = 'migration-run.log'
if (Test-Path $log) { Remove-Item $log }

foreach ($f in $files) {
  Write-Host "Running migration: $f"
  try {
    psql "postgresql://$($env:PGUSER)@$($env:PGHOST):$($env:PGPORT)/$($env:PGDATABASE)" -v ON_ERROR_STOP=1 -f $f *> $log -Append
    Write-Host "OK: $f"

    # Quick validation (table/function exist) - write a short check per file
    # Append verification output to the same log
    "-- Verification after $f --" | Out-File -FilePath $log -Append
  } catch {
    Write-Host "ERROR while running $f -- check $log" -ForegroundColor Red
    break
  }
}

Write-Host "Done. See $log for full output"
```

Validation queries (run right after a migration file finishes)
- Confirm a table exists:

```sql
SELECT EXISTS (
  SELECT 1 FROM information_schema.tables
  WHERE table_schema = 'public' AND table_name = 'profiles'
);
```

- Confirm a function exists (example for `get_user_role`):

```sql
SELECT proname FROM pg_proc WHERE proname = 'get_user_role';
```

- Confirm policies for a table (example `profiles`):

```sql
SELECT * FROM pg_policies WHERE schemaname = 'public' AND tablename = 'profiles';
```

- Quick sanity: show a few rows from a newly created table (safe for small tables):

```sql
SELECT * FROM public.profiles LIMIT 10;
```

- Check for errors in the migration log (PowerShell):

```powershell
# Show last 200 lines containing 'ERROR' or 'FATAL'
Select-String -Path migration-run.log -Pattern 'ERROR','FATAL' -SimpleMatch | Select-Object -Last 200
```

Special notes & troubleshooting
- CREATE ROLE permission: the `20250920_add_therapist_db_role.sql` migration attempts to create a NOLOGIN role named `therapist` but is wrapped so it will RAISE NOTICE and continue on permission errors. If you get an error other than permission, capture it and share the log.
- RLS/policies: many policy creations use auth.uid() and helper functions like `get_user_role()`. If `get_user_role()` is missing or `profiles.user_id` columns are not set up, policy creation may skip or raise NOTICE; run the profile backfill steps (`20250928_fix_profiles_backfill.sql`) before enabling full policies.
- If psql is failing with encoding or lock errors, re-run the file with output redirected to capture the exact error and paste the snippet here.
- If you want to skip any migration (for now), comment it out in the $files list. Do not run archived demo files unless you intentionally want seeded demo data.

When to stop and ask for help
- If any migration file reports an error (not just NOTICE), stop and copy the last 200 lines of the `migration-run.log` and the failing SQL filename. I will analyze and produce a patch or a guarded alternative.

Rollback guidance
- Most migrations are idempotent and additive (IF NOT EXISTS). For destructive operations there are `rollback` files in the `supabase/migrations` set (for example `20250927_rollback_roles_and_profiles.sql` and `20250927_rollback_therapist_features.sql`). Use those only after careful review in staging.

Post-run checks (smoke test)
1. Start the frontend dev server and navigate to the therapist Dashboard pages that previously failed. Observe console errors.
2. Test a few DB queries from the app (e.g., Overview data): verify no "relation does not exist" or "role \"therapist\" does not exist" errors.
3. If you still see the role error, test from an Incognito window with extensions disabled and capture the outgoing request headers for the call that triggers the error (DevTools Network -> Inspect request headers). If a header like `x-postgrest-role: therapist` is present, we need to ensure the client-side fetch sanitization is applied and/or patch proxies/extensions.

What I can run or produce next
- If you want, I can (A) generate a one-shot PowerShell script that runs the ordered files and performs the validations automatically, capturing outputs to a structured JSON log; or (B) help triage any error output you paste here after you run the runbook in staging.

---

If you want the one-shot script (A), reply "Runbook script" and I'll add it to the repo as `supabase/run_migrations.ps1` and run a quick static lint on it. If you prefer to run manually first, run the ordered list above and paste the first failing log lines and file name and I'll take it from there.