-- 1) Safety / prerequisites
begin;

-- Extension for gen_random_uuid() if you use it anywhere
create extension if not exists "pgcrypto";

-- 2) Make sure the anchor table exists
create table if not exists public.cases (
  id uuid primary key default gen_random_uuid(),
  therapist_id uuid,
  client_id uuid,
  status text,
  case_number text,
  created_at timestamptz not null default now()
);

-- 3) Ensure case_id exists where our app expects it
alter table if exists public.session_notes          add column if not exists case_id uuid;
alter table if exists public.supervision_flags      add column if not exists case_id uuid;
alter table if exists public.client_activities      add column if not exists case_id uuid;
alter table if exists public.session_agenda         add column if not exists case_id uuid;
alter table if exists public.treatment_plan_phases  add column if not exists case_id uuid;
alter table if exists public.case_summaries         add column if not exists case_id uuid;
alter table if exists public.appointments           add column if not exists case_id uuid;
alter table if exists public.assessment_instances   add column if not exists case_id uuid;

-- 4) Add foreign keys to cases(id) if they’re not already present
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'session_notes_case_id_fkey') then
    alter table public.session_notes
      add constraint session_notes_case_id_fkey
      foreign key (case_id) references public.cases(id) on delete cascade;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'supervision_flags_case_id_fkey') then
    alter table public.supervision_flags
      add constraint supervision_flags_case_id_fkey
      foreign key (case_id) references public.cases(id) on delete cascade;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'client_activities_case_id_fkey') then
    alter table public.client_activities
      add constraint client_activities_case_id_fkey
      foreign key (case_id) references public.cases(id) on delete cascade;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'session_agenda_case_id_fkey') then
    alter table public.session_agenda
      add constraint session_agenda_case_id_fkey
      foreign key (case_id) references public.cases(id) on delete cascade;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'treatment_plan_phases_case_id_fkey') then
    alter table public.treatment_plan_phases
      add constraint treatment_plan_phases_case_id_fkey
      foreign key (case_id) references public.cases(id) on delete cascade;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'case_summaries_case_id_fkey') then
    alter table public.case_summaries
      add constraint case_summaries_case_id_fkey
      foreign key (case_id) references public.cases(id) on delete cascade;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'appointments_case_id_fkey') then
    alter table public.appointments
      add constraint appointments_case_id_fkey
      foreign key (case_id) references public.cases(id) on delete set null;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'assessment_instances_case_id_fkey') then
    alter table public.assessment_instances
      add constraint assessment_instances_case_id_fkey
      foreign key (case_id) references public.cases(id) on delete set null;
  end if;
end$$;

-- 5) Helpful indexes (no CONCURRENTLY inside transactions)
create index if not exists idx_session_notes_case_id          on public.session_notes(case_id);
create index if not exists idx_supervision_flags_case_id      on public.supervision_flags(case_id);
create index if not exists idx_client_activities_case_id      on public.client_activities(case_id);
create index if not exists idx_session_agenda_case_id         on public.session_agenda(case_id);
create index if not exists idx_treatment_plan_phases_case_id  on public.treatment_plan_phases(case_id);
create index if not exists idx_case_summaries_case_id         on public.case_summaries(case_id);
create index if not exists idx_appointments_case_id           on public.appointments(case_id);
create index if not exists idx_assessment_instances_case_id   on public.assessment_instances(case_id);

commit;
