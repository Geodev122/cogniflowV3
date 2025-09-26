Cogniflow V3 - Database Schema Summary

Generated: 2025-09-20

Overview
--------
This document summarizes the consolidated schema created in `supabase/migrations/20250920120000_consolidated_schema.sql`.
It is derived from an audit of existing migration files under `supabase/migrations/` and references found in the application code (`src/lib/supabase.ts`, types in `src/types/`).

Design Goals
------------
- Idempotent migrations: can be re-run safely.
- Clear ownership: `profiles` is the central user table (mirrors Supabase `auth.users`), other tables reference it by `UUID`.
- Separation of concerns: clinical entities (cases, treatment_plans, therapy_goals) separated from application features (support_tickets, resource_library).
- Performance: GIN indexes for JSON/GIST where appropriate, common FK columns indexed.

Top-level tables
----------------
- `profiles` (core user profiles)
  - id: UUID (PK)
  - role: TEXT (client/therapist/admin)
  - contact fields: `email`, `phone`, `whatsapp_number`
  - `created_by_therapist`: UUID (profiles.id)
  - professional details and metadata: JSONB columns
  - timestamps: `created_at`, `updated_at`

- `therapist_client_relations` (M:N via therapist->client)
  - PK: (therapist_id, client_id)
  - status, created_at
  - indexes on therapist_id and client_id

- `client_profiles` (clinical details)
  - client_id PK referencing `profiles(id)`
  - therapist_id FK
  - clinical fields (emergency contact, medical_history, risk_level)

- `cases` (treatment cases)
  - links client <-> therapist
  - `case_number` unique
  - JSONB fields: `formulation`, `treatment_plan`

- `treatment_plans`, `therapy_goals` (goal and plan tracking)
  - full JSONB for goals to allow flexible clinical structures

- `appointments`, `session_notes` (scheduling & notes)
  - appointment-date fields and durations
  - notes stored as `JSONB` to allow structured clinical content

- Assessments (`assessment_templates`, `assessment_instances`, `assessment_responses`, `assessment_scores`, `assessment_library`)
  - Templates and library allow reuse of clinical instruments
  - Instances reference templates and clients; responses link to instances
  - Scores stored separately for analytic queries

- Worksheets & Exercises (`cbt_worksheets`, `therapeutic_exercises`)
  - Structured JSONB content and progress tracking

- Progress and reports (`progress_tracking`, `assessment_reports`, `practice_analytics`)
  - Metric/value time series and analytic outputs

- Resources & communication (`resource_library`, `communication_logs`, `in_between_sessions`)

- Support module (`support_ticket_*` tables)
  - Ticketing system, messages, events and helper views exist in original migrations and are included in consolidated schema

- `audit_logs` for immutable audit trail

Indexes and performance
-----------------------
- FK columns indexed: cases.client_id, cases.therapist_id, appointments.*, therapist_client_relations.*
- GIN indexes for JSONB columns where needed (support_tickets.metadata is indexed in original migration)
- Full-text tsvector column `support_tickets.search` with GIN index (migration creates it)

RLS and security notes
----------------------
- The project had multiple migrations that created RLS policies and SECURITY DEFINER functions. To avoid privilege surprises, the consolidated migration intentionally leaves RLS policies disabled and keeps security policy statements in their original migrations. This prevents accidental privilege escalations when running a consolidated script in a different environment.
- Recommended: Apply RLS policies in a controlled migration after verifying function and policy behavior in a staging DB. Policies should be reviewed manually before running in production.

Assumptions made
----------------
- `profiles` is the canonical user table and `auth.users` integration is handled externally (Supabase managed). We created `profiles` with `id` as UUID but do not duplicate `auth.users` data automatically.
- JSONB is used for flexible clinical content to avoid tight coupling to UI shapes. This is intentional but can be normalized if query performance requires.
- Some fields present in sample migrations (detailed demo data) were not included as strict columns (they remain in JSONB) to keep the schema stable and avoid frequent migrations when UI needs change.

Next steps
----------
1. Run consolidated migration against a clean Postgres database to verify schema creation.
2. Run the original per-feature migrations in a staging DB to ensure policy and function statements apply correctly (they were left in place).
3. Add targeted indexes after profiling common queries with real data.

For details about the validation steps, see `MIGRATION_VALIDATION.md`.
