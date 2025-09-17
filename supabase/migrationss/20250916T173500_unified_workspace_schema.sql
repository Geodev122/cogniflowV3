-- 20250916T173500_unified_workspace_schema.sql
-- Unified schema for Therapist Workspace + Case Management + Storage (MEDIUM security)
-- Idempotent: safe to re-run. Designed for Supabase Postgres.

begin;

------------------------------------------------------------
-- 0) Extensions & helper trigger
------------------------------------------------------------
create extension if not exists pgcrypto with schema public;

-- Generic updated_at trigger
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end$$;

------------------------------------------------------------
-- 1) Core identities (profiles). Adjust if you already have this table.
------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text check (role in ('therapist','client','admin')) default 'therapist',
  first_name text,
  last_name  text,
  professional_details jsonb,
  verification_status text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_profiles_updated_at on public.profiles;
create trigger trg_profiles_updated_at
before update on public.profiles
for each row execute procedure public.set_updated_at();

------------------------------------------------------------
-- 2) Cases
------------------------------------------------------------
create table if not exists public.cases (
  id uuid primary key default gen_random_uuid(),
  case_number text,
  status text default 'active',
  client_id uuid references public.profiles(id) on delete set null,
  therapist_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_cases_therapist on public.cases(therapist_id);
create index if not exists idx_cases_client on public.cases(client_id);

drop trigger if exists trg_cases_updated_at on public.cases;
create trigger trg_cases_updated_at
before update on public.cases
for each row execute procedure public.set_updated_at();

alter table public.cases enable row level security;

-- Re-create medium-security policies
drop policy if exists "cases select therapist" on public.cases;
drop policy if exists "cases ins therapist" on public.cases;
drop policy if exists "cases upd therapist" on public.cases;
drop policy if exists "cases del therapist" on public.cases;

create policy "cases select therapist"
on public.cases
for select
to authenticated
using (therapist_id = auth.uid());

create policy "cases ins therapist"
on public.cases
for insert
to authenticated
with check (therapist_id = auth.uid());

create policy "cases upd therapist"
on public.cases
for update
to authenticated
using (therapist_id = auth.uid())
with check (therapist_id = auth.uid());

create policy "cases del therapist"
on public.cases
for delete
to authenticated
using (therapist_id = auth.uid());

------------------------------------------------------------
-- 3) Treatment plan phases
------------------------------------------------------------
create table if not exists public.treatment_plan_phases (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.cases(id) on delete cascade,
  phase text not null,                         -- e.g. Intake / Assessment / Intervention
  planned_date timestamptz,
  session_index int,                           -- S1, S2, etc.
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_tpp_case on public.treatment_plan_phases(case_id);
create index if not exists idx_tpp_session_index on public.treatment_plan_phases(session_index);

drop trigger if exists trg_tpp_updated_at on public.treatment_plan_phases;
create trigger trg_tpp_updated_at
before update on public.treatment_plan_phases
for each row execute procedure public.set_updated_at();

alter table public.treatment_plan_phases enable row level security;

drop policy if exists "tpp select therapist" on public.treatment_plan_phases;
drop policy if exists "tpp ins therapist" on public.treatment_plan_phases;
drop policy if exists "tpp upd therapist" on public.treatment_plan_phases;
drop policy if exists "tpp del therapist" on public.treatment_plan_phases;

create policy "tpp select therapist"
on public.treatment_plan_phases
for select
to authenticated
using (
  case_id in (select id from public.cases where therapist_id = auth.uid())
);

create policy "tpp ins therapist"
on public.treatment_plan_phases
for insert
to authenticated
with check (
  case_id in (select id from public.cases where therapist_id = auth.uid())
);

create policy "tpp upd therapist"
on public.treatment_plan_phases
for update
to authenticated
using (
  case_id in (select id from public.cases where therapist_id = auth.uid())
)
with check (
  case_id in (select id from public.cases where therapist_id = auth.uid())
);

create policy "tpp del therapist"
on public.treatment_plan_phases
for delete
to authenticated
using (
  case_id in (select id from public.cases where therapist_id = auth.uid())
);

------------------------------------------------------------
-- 4) Session notes
------------------------------------------------------------
create table if not exists public.session_notes (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.cases(id) on delete cascade,
  therapist_id uuid not null references public.profiles(id) on delete set null,
  client_id uuid references public.profiles(id) on delete set null,
  session_index int,
  content jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Unique latest-per-case per therapist if desired; comment out if not needed:
-- create unique index if not exists uq_session_notes_case_therapist_session
--   on public.session_notes(case_id, therapist_id, session_index);

create index if not exists idx_sn_case on public.session_notes(case_id);
create index if not exists idx_sn_therapist on public.session_notes(therapist_id);
create index if not exists idx_sn_updated_at on public.session_notes(updated_at desc);

drop trigger if exists trg_sn_updated_at on public.session_notes;
create trigger trg_sn_updated_at
before update on public.session_notes
for each row execute procedure public.set_updated_at();

alter table public.session_notes enable row level security;

drop policy if exists "sn select therapist" on public.session_notes;
drop policy if exists "sn ins therapist" on public.session_notes;
drop policy if exists "sn upd therapist" on public.session_notes;
drop policy if exists "sn del therapist" on public.session_notes;

create policy "sn select therapist"
on public.session_notes
for select
to authenticated
using (
  therapist_id = auth.uid()
  or case_id in (select id from public.cases where therapist_id = auth.uid())
);

create policy "sn ins therapist"
on public.session_notes
for insert
to authenticated
with check (therapist_id = auth.uid());

create policy "sn upd therapist"
on public.session_notes
for update
to authenticated
using (therapist_id = auth.uid())
with check (therapist_id = auth.uid());

create policy "sn del therapist"
on public.session_notes
for delete
to authenticated
using (therapist_id = auth.uid());

------------------------------------------------------------
-- 5) Client activities (between sessions)
------------------------------------------------------------
create table if not exists public.client_activities (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.cases(id) on delete cascade,
  client_id uuid references public.profiles(id) on delete set null,
  type text not null,                          -- 'assessment' | 'journal' | 'homework' | ...
  title text,
  details text,
  occurred_at timestamptz,
  session_phase text,
  reviewed_at timestamptz,
  reviewed_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_ca_case on public.client_activities(case_id);
create index if not exists idx_ca_type on public.client_activities(type);

drop trigger if exists trg_ca_updated_at on public.client_activities;
create trigger trg_ca_updated_at
before update on public.client_activities
for each row execute procedure public.set_updated_at();

alter table public.client_activities enable row level security;

drop policy if exists "ca select therapist" on public.client_activities;
drop policy if exists "ca ins therapist" on public.client_activities;
drop policy if exists "ca upd therapist" on public.client_activities;
drop policy if exists "ca del therapist" on public.client_activities;

create policy "ca select therapist"
on public.client_activities
for select
to authenticated
using (case_id in (select id from public.cases where therapist_id = auth.uid()));

create policy "ca ins therapist"
on public.client_activities
for insert
to authenticated
with check (case_id in (select id from public.cases where therapist_id = auth.uid()));

create policy "ca upd therapist"
on public.client_activities
for update
to authenticated
using (case_id in (select id from public.cases where therapist_id = auth.uid()))
with check (case_id in (select id from public.cases where therapist_id = auth.uid()));

create policy "ca del therapist"
on public.client_activities
for delete
to authenticated
using (case_id in (select id from public.cases where therapist_id = auth.uid()));

------------------------------------------------------------
-- 6) Session agenda (queue from between-sessions)
------------------------------------------------------------
create table if not exists public.session_agenda (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.cases(id) on delete cascade,
  therapist_id uuid not null references public.profiles(id) on delete set null,
  source text,                      -- 'client_activity' | 'manual' | ...
  source_id uuid,
  title text,
  payload jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_sagenda_case on public.session_agenda(case_id);
create index if not exists idx_sagenda_therapist on public.session_agenda(therapist_id);

alter table public.session_agenda enable row level security;

drop policy if exists "agenda select therapist" on public.session_agenda;
drop policy if exists "agenda ins therapist" on public.session_agenda;
drop policy if exists "agenda del therapist" on public.session_agenda;

create policy "agenda select therapist"
on public.session_agenda
for select
to authenticated
using (
  therapist_id = auth.uid() or case_id in (select id from public.cases where therapist_id = auth.uid())
);

create policy "agenda ins therapist"
on public.session_agenda
for insert
to authenticated
with check (therapist_id = auth.uid());

create policy "agenda del therapist"
on public.session_agenda
for delete
to authenticated
using (therapist_id = auth.uid());

------------------------------------------------------------
-- 7) Resource library
------------------------------------------------------------
create table if not exists public.resource_library (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  category text,                 -- worksheet | educational | intervention | protocol
  content_type text,             -- pdf | video | audio | link
  therapist_owner_id uuid references public.profiles(id) on delete set null,
  is_public boolean not null default false,
  media_url text,
  storage_path text,
  external_url text,
  created_at timestamptz not null default now()
);

create index if not exists idx_rl_owner on public.resource_library(therapist_owner_id);
create index if not exists idx_rl_public on public.resource_library(is_public);

alter table public.resource_library enable row level security;

drop policy if exists "rl select" on public.resource_library;
drop policy if exists "rl ins owner" on public.resource_library;
drop policy if exists "rl upd owner" on public.resource_library;
drop policy if exists "rl del owner" on public.resource_library;

create policy "rl select"
on public.resource_library
for select
to authenticated
using (is_public = true or therapist_owner_id = auth.uid());

create policy "rl ins owner"
on public.resource_library
for insert
to authenticated
with check (therapist_owner_id = auth.uid());

create policy "rl upd owner"
on public.resource_library
for update
to authenticated
using (therapist_owner_id = auth.uid())
with check (therapist_owner_id = auth.uid());

create policy "rl del owner"
on public.resource_library
for delete
to authenticated
using (therapist_owner_id = auth.uid());

------------------------------------------------------------
-- 8) Supervision flags & Case summaries
------------------------------------------------------------
create table if not exists public.supervision_flags (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.cases(id) on delete cascade,
  therapist_id uuid references public.profiles(id) on delete set null,
  status text not null default 'open',       -- open | resolved
  reason text,
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

create index if not exists idx_sf_case on public.supervision_flags(case_id);
create index if not exists idx_sf_status on public.supervision_flags(status);

alter table public.supervision_flags enable row level security;

drop policy if exists "sf select therapist" on public.supervision_flags;
drop policy if exists "sf ins therapist" on public.supervision_flags;
drop policy if exists "sf upd therapist" on public.supervision_flags;

create policy "sf select therapist"
on public.supervision_flags
for select
to authenticated
using (case_id in (select id from public.cases where therapist_id = auth.uid()));

create policy "sf ins therapist"
on public.supervision_flags
for insert
to authenticated
with check (case_id in (select id from public.cases where therapist_id = auth.uid()));

create policy "sf upd therapist"
on public.supervision_flags
for update
to authenticated
using (case_id in (select id from public.cases where therapist_id = auth.uid()))
with check (case_id in (select id from public.cases where therapist_id = auth.uid()));

-- Summaries
create table if not exists public.case_summaries (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null unique references public.cases(id) on delete cascade,
  title text,
  last_highlight text,
  updated_by uuid references public.profiles(id) on delete set null,
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_cs_updated_at on public.case_summaries;
create trigger trg_cs_updated_at
before update on public.case_summaries
for each row execute procedure public.set_updated_at();

alter table public.case_summaries enable row level security;

drop policy if exists "cs select therapist" on public.case_summaries;
drop policy if exists "cs upsert therapist" on public.case_summaries;

create policy "cs select therapist"
on public.case_summaries
for select
to authenticated
using (case_id in (select id from public.cases where therapist_id = auth.uid()));

create policy "cs upsert therapist"
on public.case_summaries
for all
to authenticated
using (case_id in (select id from public.cases where therapist_id = auth.uid()))
with check (case_id in (select id from public.cases where therapist_id = auth.uid()));

------------------------------------------------------------
-- 9) Therapist-client relations
------------------------------------------------------------
create table if not exists public.therapist_client_relations (
  id uuid primary key default gen_random_uuid(),
  therapist_id uuid not null references public.profiles(id) on delete cascade,
  client_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (therapist_id, client_id)
);

alter table public.therapist_client_relations enable row level security;

-- Remove conflicting legacy policy names then re-add
drop policy if exists "tcr therapist read"   on public.therapist_client_relations;
drop policy if exists "tcr therapist insert" on public.therapist_client_relations;
drop policy if exists "tcr therapist update" on public.therapist_client_relations;
drop policy if exists "tcr therapist delete" on public.therapist_client_relations;

create policy "tcr therapist read"
on public.therapist_client_relations
for select
to authenticated
using (therapist_id = auth.uid());

create policy "tcr therapist insert"
on public.therapist_client_relations
for insert
to authenticated
with check (therapist_id = auth.uid());

create policy "tcr therapist update"
on public.therapist_client_relations
for update
to authenticated
using (therapist_id = auth.uid())
with check (therapist_id = auth.uid());

create policy "tcr therapist delete"
on public.therapist_client_relations
for delete
to authenticated
using (therapist_id = auth.uid());

------------------------------------------------------------
-- 10) Appointments (for dashboard "today")
------------------------------------------------------------
create table if not exists public.appointments (
  id uuid primary key default gen_random_uuid(),
  therapist_id uuid not null references public.profiles(id) on delete set null,
  client_id uuid references public.profiles(id) on delete set null,
  case_id uuid references public.cases(id) on delete set null,
  title text,
  notes text,
  status text,                        -- scheduled | done | cancelled | ...
  start_time timestamptz not null,
  end_time   timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_appt_therapist_time on public.appointments(therapist_id, start_time);
create index if not exists idx_appt_case on public.appointments(case_id);

alter table public.appointments enable row level security;

drop policy if exists "appts select therapist" on public.appointments;
drop policy if exists "appts write therapist" on public.appointments;

create policy "appts select therapist"
on public.appointments
for select
to authenticated
using (therapist_id = auth.uid());

create policy "appts write therapist"
on public.appointments
for all
to authenticated
using (therapist_id = auth.uid())
with check (therapist_id = auth.uid());

------------------------------------------------------------
-- 11) Assessments
------------------------------------------------------------
create table if not exists public.assessment_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  abbreviation text,
  created_at timestamptz not null default now()
);

create table if not exists public.assessment_instances (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.assessment_templates(id) on delete cascade,
  client_id uuid references public.profiles(id) on delete set null,
  therapist_id uuid not null references public.profiles(id) on delete set null,
  title text,
  status text,                           -- assigned | in_progress | completed | expired | cancelled
  assigned_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_ai_therapist on public.assessment_instances(therapist_id);
create index if not exists idx_ai_client on public.assessment_instances(client_id);

create table if not exists public.assessment_scores (
  id uuid primary key default gen_random_uuid(),
  instance_id uuid not null references public.assessment_instances(id) on delete cascade,
  severity_level text,
  interpretation_description text,
  calculated_at timestamptz not null default now()
);

create index if not exists idx_as_instance on public.assessment_scores(instance_id);

alter table public.assessment_templates enable row level security;
alter table public.assessment_instances enable row level security;
alter table public.assessment_scores    enable row level security;

drop policy if exists "tpl read all auth" on public.assessment_templates;
drop policy if exists "tpl insert therapist" on public.assessment_templates;

create policy "tpl read all auth"
on public.assessment_templates
for select
to authenticated
using (true);

create policy "tpl insert therapist"
on public.assessment_templates
for insert
to authenticated
with check (true);

drop policy if exists "ai therapist read" on public.assessment_instances;
drop policy if exists "ai therapist write" on public.assessment_instances;

create policy "ai therapist read"
on public.assessment_instances
for select
to authenticated
using (therapist_id = auth.uid());

create policy "ai therapist write"
on public.assessment_instances
for all
to authenticated
using (therapist_id = auth.uid())
with check (therapist_id = auth.uid());

drop policy if exists "as therapist read" on public.assessment_scores;
drop policy if exists "as therapist write" on public.assessment_scores;

create policy "as therapist read"
on public.assessment_scores
for select
to authenticated
using (
  instance_id in (select id from public.assessment_instances where therapist_id = auth.uid())
);

create policy "as therapist write"
on public.assessment_scores
for all
to authenticated
using (
  instance_id in (select id from public.assessment_instances where therapist_id = auth.uid())
)
with check (
  instance_id in (select id from public.assessment_instances where therapist_id = auth.uid())
);

------------------------------------------------------------
-- 12) Storage buckets + MEDIUM security on storage.objects
------------------------------------------------------------
-- Create buckets with compatibility for projects without the jsonb overload
do $$
begin
  -- resource_files
  begin
    perform storage.create_bucket('resource_files', false);
  exception
    when undefined_function then
      insert into storage.buckets (id, public)
      values ('resource_files', false)
      on conflict (id) do nothing;
  end;

  -- documents
  begin
    perform storage.create_bucket('documents', false);
  exception
    when undefined_function then
      insert into storage.buckets (id, public)
      values ('documents', false)
      on conflict (id) do nothing;
  end;
end $$;

alter table storage.objects enable row level security;

-- Remove any legacy/conflicting policies first
drop policy if exists "rf read"   on storage.objects;
drop policy if exists "rf insert" on storage.objects;
drop policy if exists "rf update" on storage.objects;
drop policy if exists "rf delete" on storage.objects;

drop policy if exists "docs read"   on storage.objects;
drop policy if exists "docs insert" on storage.objects;
drop policy if exists "docs update" on storage.objects;
drop policy if exists "docs delete" on storage.objects;

-- Bucket: resource_files  (owner can read/write; others can read only if metadata.public = true)
create policy "rf read"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'resource_files'
  and (
    owner = auth.uid()
    or coalesce( (metadata->>'public')::boolean, false ) = true
  )
);

create policy "rf insert"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'resource_files'
  and owner = auth.uid()
);

create policy "rf update"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'resource_files'
  and owner = auth.uid()
)
with check (
  bucket_id = 'resource_files'
  and owner = auth.uid()
);

create policy "rf delete"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'resource_files'
  and owner = auth.uid()
);

-- Bucket: documents (same model)
create policy "docs read"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'documents'
  and (
    owner = auth.uid()
    or coalesce( (metadata->>'public')::boolean, false ) = true
  )
);

create policy "docs insert"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'documents'
  and owner = auth.uid()
);

create policy "docs update"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'documents'
  and owner = auth.uid()
)
with check (
  bucket_id = 'documents'
  and owner = auth.uid()
);

create policy "docs delete"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'documents'
  and owner = auth.uid()
);

commit;
