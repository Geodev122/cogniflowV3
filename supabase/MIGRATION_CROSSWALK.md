# Migration ↔ Code Crosswalk (generated)

This file maps the key SQL migrations in `supabase/migrations/` to the database objects they create (tables, functions, roles, extensions), and lists which frontend/backend code files reference those objects. Use this to identify missing creators for code-referenced tables and to decide which migrations are safe to archive/delete.

---

## How to read this file
- Left column: migration filename
- Middle column: DB objects created/ensured by that migration
- Right column: key code files referencing those DB objects (not exhaustive, but main hits found via repo grep)

Notes:
- The migrations are idempotent (use IF NOT EXISTS / information_schema guards) unless otherwise noted.
- Demo/seed migrations were moved to `supabase/migrations/archived/`; this crosswalk lists them as archived where applicable.

---

## Migration -> Created Objects (selected, most relevant)

- `20250920120000_consolidated_schema.sql`
  - Creates core tables: `profiles`, `therapist_client_relations`, `client_profiles`, `cases`, `treatment_plans`, `therapy_goals`, `appointments`, `session_notes`, `assessment_templates`, `assessment_instances`, `assessment_responses`, `assessment_scores`, `assessment_library`, `cbt_worksheets`, `therapeutic_exercises`, `progress_tracking`, `assessment_reports`, `practice_analytics`, `resource_library`, `communication_logs`, `in_between_sessions`, `audit_logs`, `support_ticket_*` (categories, tags, tickets, messages, watchers, events)
  - Extensions: `pgcrypto`, `pg_trgm`
  - No RLS policies enabled here (policies handled separately)
  - Code references: lots — core app code, `src/hooks/useAuth.ts`, `src/components/dashboard/OverviewTab.tsx`, `src/pages/therapist/TherapistDashboard.tsx`

- `20250927_add_roles_and_profiles.sql`
  - Creates `public.roles`, `public.profiles` (authoritative per-user role storage variant), `public.user_roles`, `public.role_changes`
  - Functions/triggers: `public.get_user_role()`, `public.public_create_profile_for_auth_user()`, `public.log_role_change()`
  - Adds many RLS policies on `profiles` and related objects
  - Code references: `src/hooks/useAuth.ts`, role-based checks in many components; `supabase/README_ROLES.md`

- `20250927_create_dashboard_tables.sql`
  - Creates: `appointments`, `therapist_client_relations`, `session_notes`, `payments`, `resource_library` (lightweight)
  - Indexes for these tables
  - Code references: `src/components/dashboard/OverviewTab.tsx`, `src/pages/therapist/TherapistDashboard.tsx`

- `20250927_create_messages_table.sql` and `20250927_adjust_schema_for_therapist_features.sql`
  - Create/ensure `public.messages` table and policies
  - Code references: `src/components/dashboard/OverviewTab.tsx`, messaging UI

- `20250927_create_resources.sql`
  - Creates `public.resources` (CE / resource courses) with sample seeds
  - Code references: CE/continuing education pages and `LicensingCompliance.tsx`

- `20250927_ensure_assessment_library.sql`, `20250919000000_create_assessment_library.sql`, `20250927_add_is_active_assessment_library.sql`
  - Create/ensure `assessment_library` and related policies (allow therapists read all; allow users their own assessments)
  - Code references: assessment pages (`src/components/assessment/*`, `AssessmentLibrary.tsx`, `AssessmentRenderer.tsx`)

- `20250927_create_ce_completions_if_missing.sql`
  - Creates `public.ce_completions`
  - Code references: `src/components/therapist/LicensingCompliance.tsx` and CE pages

- `20250927_create_custom_forms.sql`
  - Creates `public.custom_forms` and owner/public policies
  - Code references: forms pages/components

- `20250927_create_gamified_apps.sql`, `20250927_create_app_sessions.sql`, `20250927_create_app_progress.sql`
  - Creates `public.gamified_apps`, `public.app_sessions`, `public.app_progress` with RLS owner policies
  - Code references: `src/components/GameExercise.tsx`, gamified app pages

- `20250920000000_ce_lms.sql`
  - Creates `ce_courses`, `ce_enrollments`, `ce_progress`
  - Code references: continuing education pages

- `20250927_consolidated_additions.sql` (new)
  - Creates small/missed tables: `session_agenda`, `therapist_profiles`, `membership_plans`, `subscriptions`, `support_sessions`, `therapist_onboardings`
  - Code references: `src/components/dashboard/OverviewTab.tsx` (support_sessions/onboarding references), several therapist pages

- `20250920_add_therapist_db_role.sql`
  - Attempts to create NOLOGIN DB role `therapist` (guarded and tolerant of permission errors)
  - Purpose: mitigation for external header-induced SET ROLE errors

- Demo/seed migrations (archived)
  - `supabase/migrations/archived/20250918061118_broad_glade.sql` — large demo dataset (profiles, clients, appointments, resources, subscriptions, therapist_licenses, assessments, etc.)
  - `supabase/migrations/archived/20250925_demo_therapist_seed.sql` — demo support_sessions/onboardings
  - `supabase/migrations/archived/20250927_demo_sessions_and_onboarding.sql` — demo onboarding/support
  - `supabase/migrations/archived/20250926165650_odd_leaf.sql` — CE LMS / seed content (archived)

---

## Table -> Key Code References (selected)

Below are the primary table names and the most relevant code files that reference them (examples found via repo grep). This helps identify which code will break if the corresponding table is missing.

- profiles
  - src/hooks/useAuth.ts
  - src/components/dashboard/OverviewTab.tsx
  - src/components/therapist/LicensingCompliance.tsx
  - src/pages/therapist/TherapistDashboard.tsx

- appointments
  - src/components/dashboard/OverviewTab.tsx
  - src/pages/therapist/TherapistDashboard.tsx

- therapist_client_relations
  - src/components/dashboard/OverviewTab.tsx
  - src/pages/therapist/TherapistDashboard.tsx

- session_notes
  - src/components/dashboard/OverviewTab.tsx

- messages
  - src/components/dashboard/OverviewTab.tsx
  - messaging UI components (search results)

- resource_library / resources
  - src/pages/therapist/TherapistDashboard.tsx
  - src/components/therapist/ResourceLibrary (or similar)

- ce_completions / ce_courses / ce_enrollments
  - src/components/therapist/LicensingCompliance.tsx

- therapist_licenses
  - src/components/therapist/LicensingCompliance.tsx

- assessment_library / assessment_templates / assessment_instances
  - src/components/assessment/*
  - src/pages/therapist/TherapistDashboard.tsx

- gamified_apps / app_sessions / app_progress
  - src/components/GameExercise.tsx

- custom_forms
  - src/components/PsychometricForm.tsx (and other dynamic forms components)

- subscriptions / membership_plans
  - billing/payment pages and membership management components (admin/membership files)

- support_sessions / therapist_onboardings
  - demo/onboarding components and dashboard overview

---

## Recommended immediate actions
1. Run the consolidated migrations in a staging / fresh DB and capture output. Steps:
   - Use the Supabase SQL editor or psql to run the migrations in order. `20250920120000_consolidated_schema.sql` first, then `20250927_consolidated_additions.sql`, then the remaining 20250927_* files.
   - Capture any errors and share the psql / Supabase output if failures happen.

2. Validate frontend runtime after migrations are applied (start dev server and navigate therapist pages). If you still see "role \"therapist\" does not exist", confirm whether the client is sending role-like headers (we added a header strip in `src/lib/supabase.ts`). Test in Incognito with extensions disabled.

3. Confirm archival deletion: I moved demo seed migrations to `supabase/migrations/archived/` and replaced active originals with pointers. If you want, I can permanently delete the active archived payloads (or keep them archived). Advise before permanent deletion.

---

## Next step I can take now (pick one)
- A: Proceed to generate a fuller CSV export mapping every migration file in `supabase/migrations/` to all created objects (more verbose). (I'll run repo-wide scans and write a real CSV.)
- B: Produce a step-by-step staging runbook (psql/Supabase SQL editor commands) and the exact order to run migrations and the checks to run after each.
- C: If you confirm, I'll finalize Option C by permanently removing demo migration payloads from the active `supabase/migrations/` folder (they are already copied to `archived/`) and update `MIGRATION_VALIDATION.md` with the plan.

Tell me which you want next. If you pick A, I'll produce the full CSV-style export now.
