-- ====== EXTENSIONS ======

create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- ====== ENUMS ======

do $$ begin
  create type public.assessment_status as enum ('assigned','in_progress','completed','expired','cancelled');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.reminder_frequency as enum ('none','daily','weekly','before_due');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.appointment_type as enum ('in_person','video','phone','other');
exception when duplicate_object then null; end $$;

-- ====== HELPERS ======
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- ====== PROFILES ======
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  role text check (role in ('therapist','client')) not null default 'client',
  first_name text,
  last_name text,
  whatsapp_number text,
  professional_details jsonb,
  verification_status text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_profiles_role on public.profiles(role);
create index if not exists idx_profiles_name on public.profiles((lower(coalesce(first_name,'')||' '||coalesce(last_name,''))));
drop trigger if exists trg_profiles_updated on public.profiles;
create trigger trg_profiles_updated before update on public.profiles
for each row execute function public.set_updated_at();

-- ====== THERAPIST–CLIENT RELATIONS ======
create table if not exists public.therapist_client_relations (
  id uuid primary key default gen_random_uuid(),
  therapist_id uuid not null references public.profiles(id) on delete cascade,
  client_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (therapist_id, client_id)
);
create index if not exists idx_tcr_therapist on public.therapist_client_relations(therapist_id);
create index if not exists idx_tcr_client on public.therapist_client_relations(client_id);

-- ====== ASSESSMENT TEMPLATES ======
create table if not exists public.assessment_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  abbreviation text,
  description text,
  version text not null default '1.0.0',
  is_active boolean not null default true,
  schema jsonb not null,
  scoring jsonb,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_templates_active on public.assessment_templates(is_active);
drop trigger if exists trg_templates_updated on public.assessment_templates;
create trigger trg_templates_updated before update on public.assessment_templates
for each row execute function public.set_updated_at();

-- ====== ASSESSMENT INSTANCES ======
create table if not exists public.assessment_instances (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.assessment_templates(id) on delete restrict,
  client_id uuid not null references public.profiles(id) on delete cascade,
  therapist_id uuid not null references public.profiles(id) on delete cascade,
  title text,
  status public.assessment_status not null default 'assigned',
  assigned_at timestamptz not null default now(),
  due_date date,
  completed_at timestamptz,
  progress numeric check (progress >= 0 and progress <= 100) default 0,
  instructions text,
  reminder_frequency public.reminder_frequency not null default 'none',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_ai_therapist on public.assessment_instances(therapist_id);
create index if not exists idx_ai_client on public.assessment_instances(client_id);
create index if not exists idx_ai_template on public.assessment_instances(template_id);
create index if not exists idx_ai_status on public.assessment_instances(status);
create index if not exists idx_ai_assigned_at on public.assessment_instances(assigned_at desc);
drop trigger if exists trg_ai_updated on public.assessment_instances;
create trigger trg_ai_updated before update on public.assessment_instances
for each row execute function public.set_updated_at();

-- ====== ASSESSMENT RESPONSES ======
create table if not exists public.assessment_responses (
  id uuid primary key default gen_random_uuid(),
  instance_id uuid not null references public.assessment_instances(id) on delete cascade,
  item_id text not null,
  payload jsonb,
  answered_at timestamptz not null default now(),
  unique (instance_id, item_id)
);
create index if not exists idx_ar_instance on public.assessment_responses(instance_id);
create index if not exists idx_ar_item on public.assessment_responses(instance_id, item_id);

-- ====== ASSESSMENT RESULTS ======
create table if not exists public.assessment_results (
  id uuid primary key default gen_random_uuid(),
  instance_id uuid not null unique references public.assessment_instances(id) on delete cascade,
  score jsonb,
  alerts jsonb,
  interpretation text,
  created_at timestamptz not null default now()
);

-- ====== CASES ======
create table if not exists public.cases (
  id uuid primary key default gen_random_uuid(),
  case_code text not null unique,
  client_id uuid not null references public.profiles(id) on delete cascade,
  therapist_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'active',
  data jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_cases_therapist on public.cases(therapist_id);
create index if not exists idx_cases_client on public.cases(client_id);
create index if not exists idx_cases_status on public.cases(status);
drop trigger if exists trg_cases_updated on public.cases;
create trigger trg_cases_updated before update on public.cases
for each row execute function public.set_updated_at();

-- ====== APPOINTMENTS ======
create table if not exists public.appointments (
  id uuid primary key default gen_random_uuid(),
  therapist_id uuid not null references public.profiles(id) on delete cascade,
  client_id uuid not null references public.profiles(id) on delete cascade,
  appointment_date timestamptz not null,
  appointment_type public.appointment_type not null default 'other',
  notes text,
  created_at timestamptz not null default now()
);
create index if not exists idx_appt_therapist on public.appointments(therapist_id);
create index if not exists idx_appt_client on public.appointments(client_id);
create index if not exists idx_appt_date on public.appointments(appointment_date);

-- ====== DOCUMENTS ======
create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  case_id uuid references public.cases(id) on delete set null,
  url text not null,
  type text not null,
  meta jsonb,
  created_at timestamptz not null default now()
);
create index if not exists idx_docs_owner on public.documents(owner_id);
create index if not exists idx_docs_case on public.documents(case_id);

-- ====== RESOURCES ======
create table if not exists public.resources (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  kind text not null,
  tags text[] default '{}',
  url text,
  meta jsonb,
  visibility text not null default 'therapist',
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists idx_resources_kind on public.resources(kind);
create index if not exists idx_resources_visibility on public.resources(visibility);

-- ====== ANNOUNCEMENTS ======
create table if not exists public.admin_announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text,
  kind text not null default 'news',
  starts_at timestamptz,
  ends_at timestamptz,
  audience text[] default '{therapist}',
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

-- ====== TICKETS ======
create table if not exists public.tickets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  subject text not null,
  body text,
  status text not null default 'open',
  created_at timestamptz not null default now()
);

-- ====== LAST SEEN ======
create table if not exists public.user_last_seen (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  page text not null,
  seen_at timestamptz not null default now()
);

-- ====== VIEWS & HELPERS ======
create or replace view public.v_my_clients as
select r.therapist_id, r.client_id
from public.therapist_client_relations r;

create or replace view public.v_today_appointments as
select a.*
from public.appointments a
where a.appointment_date::date = now()::date;

create or replace function public.template_item_count(t_id uuid)
returns integer language sql stable as $$
  select coalesce(jsonb_array_length(schema->'items'), 0)::int
  from public.assessment_templates
  where id = t_id
$$;

-- ====== TRIGGERS ======
create or replace function public.recalc_instance_progress()
returns trigger language plpgsql as $$
declare
  total int;
  answered int;
  inst uuid;
begin
  if (tg_op = 'DELETE') then
    inst := old.instance_id;
  else
    inst := new.instance_id;
  end if;

  select public.template_item_count(ai.template_id) into total
  from public.assessment_instances ai where ai.id = inst;

  select count(*)::int into answered
  from public.assessment_responses
  where instance_id = inst;

  update public.assessment_instances
  set progress = case when total > 0 then least(100, round((answered::numeric / total::numeric) * 100)) else 0 end
  where id = inst;

  return null;
end $$;

drop trigger if exists trg_resp_progress_i on public.assessment_responses;
drop trigger if exists trg_resp_progress_u on public.assessment_responses;
drop trigger if exists trg_resp_progress_d on public.assessment_responses;

create trigger trg_resp_progress_i
after insert on public.assessment_responses
for each row execute function public.recalc_instance_progress();

create trigger trg_resp_progress_u
after update on public.assessment_responses
for each row execute function public.recalc_instance_progress();

create trigger trg_resp_progress_d
after delete on public.assessment_responses
for each row execute function public.recalc_instance_progress();

create or replace function public.ensure_result_on_complete()
returns trigger language plpgsql as $$
begin
  if new.status = 'completed'::public.assessment_status and (old.status is distinct from 'completed'::public.assessment_status) then
    insert into public.assessment_results (instance_id, score, alerts, interpretation)
    values (new.id, null, '[]'::jsonb, null)
    on conflict (instance_id) do nothing;

    update public.assessment_instances
      set completed_at = coalesce(new.completed_at, now())
    where id = new.id and completed_at is null;
  end if;
  return new;
end $$;

drop trigger if exists trg_ai_complete on public.assessment_instances;
create trigger trg_ai_complete
after update on public.assessment_instances
for each row execute function public.ensure_result_on_complete();

-- ====== RLS ======
alter table public.profiles enable row level security;
alter table public.therapist_client_relations enable row level security;
alter table public.assessment_templates enable row level security;
alter table public.assessment_instances enable row level security;
alter table public.assessment_responses enable row level security;
alter table public.assessment_results enable row level security;
alter table public.cases enable row level security;
alter table public.appointments enable row level security;
alter table public.documents enable row level security;
alter table public.resources enable row level security;
alter table public.admin_announcements enable row level security;
alter table public.tickets enable row level security;
alter table public.user_last_seen enable row level security;

drop policy if exists "profiles self and assigned read" on public.profiles;
create policy "profiles self and assigned read" on public.profiles
for select using (
  auth.uid() = id
  or exists (
    select 1 from public.therapist_client_relations r
    where r.therapist_id = auth.uid() and r.client_id = profiles.id
  )
  or (select role from public.profiles where id = auth.uid()) = 'therapist' and profiles.id = auth.uid()
);

drop policy if exists "profiles self update" on public.profiles;
create policy "profiles self update" on public.profiles
for update using (auth.uid() = id);

drop policy if exists "tcr read own edges" on public.therapist_client_relations;
create policy "tcr read own edges" on public.therapist_client_relations
for select using (auth.uid() = therapist_id or auth.uid() = client_id);

drop policy if exists "tcr therapist manage" on public.therapist_client_relations;
create policy "tcr therapist manage" on public.therapist_client_relations
for insert with check (auth.uid() = therapist_id);
create policy "tcr therapist delete" on public.therapist_client_relations
for delete using (auth.uid() = therapist_id);

drop policy if exists "templates read all" on public.assessment_templates;
create policy "templates read all" on public.assessment_templates
for select using (true);

drop policy if exists "templates manage creators" on public.assessment_templates;
create policy "templates manage creators" on public.assessment_templates
for all using (created_by = auth.uid() or (select role from public.profiles where id = auth.uid()) = 'therapist')
with check (created_by = auth.uid() or (select role from public.profiles where id = auth.uid()) = 'therapist');

drop policy if exists "instances read therapist or client" on public.assessment_instances;
create policy "instances read therapist or client" on public.assessment_instances
for select using (therapist_id = auth.uid() or client_id = auth.uid());

drop policy if exists "instances insert therapist" on public.assessment_instances;
create policy "instances insert therapist" on public.assessment_instances
for insert with check (therapist_id = auth.uid());

drop policy if exists "instances update owners" on public.assessment_instances;
create policy "instances update owners" on public.assessment_instances
for update using (therapist_id = auth.uid() or client_id = auth.uid());

drop policy if exists "instances delete therapist" on public.assessment_instances;
create policy "instances delete therapist" on public.assessment_instances
for delete using (therapist_id = auth.uid());

drop policy if exists "responses read owners" on public.assessment_responses;
create policy "responses read owners" on public.assessment_responses
for select using (
  exists(select 1 from public.assessment_instances ai where ai.id = assessment_responses.instance_id and (ai.client_id = auth.uid() or ai.therapist_id = auth.uid()))
);

drop policy if exists "responses upsert owners" on public.assessment_responses;
create policy "responses upsert owners" on public.assessment_responses
for all using (
  exists(select 1 from public.assessment_instances ai where ai.id = assessment_responses.instance_id and (ai.client_id = auth.uid() or ai.therapist_id = auth.uid()))
)
with check (
  exists(select 1 from public.assessment_instances ai where ai.id = assessment_responses.instance_id and (ai.client_id = auth.uid() or ai.therapist_id = auth.uid()))
);

drop policy if exists "results read owners" on public.assessment_results;
create policy "results read owners" on public.assessment_results
for select using (
  exists(select 1 from public.assessment_instances ai where ai.id = assessment_results.instance_id and (ai.client_id = auth.uid() or ai.therapist_id = auth.uid()))
);

drop policy if exists "results write therapist" on public.assessment_results;
create policy "results write therapist" on public.assessment_results
for all using (
  exists(select 1 from public.assessment_instances ai where ai.id = assessment_results.instance_id and ai.therapist_id = auth.uid())
)
with check (
  exists(select 1 from public.assessment_instances ai where ai.id = assessment_results.instance_id and ai.therapist_id = auth.uid())
);

drop policy if exists "cases read therapist or client" on public.cases;
create policy "cases read therapist or client" on public.cases
for select using (therapist_id = auth.uid() or client_id = auth.uid());

drop policy if exists "cases manage therapist" on public.cases;
create policy "cases manage therapist" on public.cases
for all using (therapist_id = auth.uid())
with check (therapist_id = auth.uid());

drop policy if exists "appts read therapist or client" on public.appointments;
create policy "appts read therapist or client" on public.appointments
for select using (therapist_id = auth.uid() or client_id = auth.uid());

drop policy if exists "appts manage therapist" on public.appointments;
create policy "appts manage therapist" on public.appointments
for all using (therapist_id = auth.uid())
with check (therapist_id = auth.uid());

drop policy if exists "docs read owner or therapist" on public.documents;
create policy "docs read owner or therapist" on public.documents
for select using (
  owner_id = auth.uid()
  or exists(select 1 from public.cases c where c.id = documents.case_id and c.therapist_id = auth.uid())
);

drop policy if exists "docs owner manage" on public.documents;
create policy "docs owner manage" on public.documents
for all using (owner_id = auth.uid())
with check (owner_id = auth.uid());

drop policy if exists "resources read by visibility" on public.resources;
create policy "resources read by visibility" on public.resources
for select using (
  visibility = 'public'
  or ((select role from public.profiles where id = auth.uid()) = 'therapist' and visibility in ('therapist','public'))
  or (visibility = 'client')
);

drop policy if exists "resources manage therapist" on public.resources;
create policy "resources manage therapist" on public.resources
for all using ((select role from public.profiles where id = auth.uid()) = 'therapist')
with check ((select role from public.profiles where id = auth.uid()) = 'therapist');

drop policy if exists "announcements read" on public.admin_announcements;
create policy "announcements read" on public.admin_announcements
for select using (true);

drop policy if exists "announcements manage therapist" on public.admin_announcements;
create policy "announcements manage therapist" on public.admin_announcements
for all using ((select role from public.profiles where id = auth.uid()) = 'therapist')
with check ((select role from public.profiles where id = auth.uid()) = 'therapist');

drop policy if exists "tickets read own" on public.tickets;
create policy "tickets read own" on public.tickets
for select using (user_id = auth.uid());

drop policy if exists "tickets manage own" on public.tickets;
create policy "tickets manage own" on public.tickets
for all using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "uls self manage" on public.user_last_seen;
create policy "uls self manage" on public.user_last_seen
for all using (user_id = auth.uid())
with check (user_id = auth.uid());

-- ====== STORAGE (optional but handy) ======
do $$
begin
  perform storage.create_bucket('documents',  jsonb_build_object('public', false));
exception when others then null;
end$$;

do $$
begin
  perform storage.create_bucket('public-resources', jsonb_build_object('public', true));
exception when others then null;
end$$;

-- Ensure legacy or partial schemas have the client_activities.kind column
-- This is defensive: it only runs if the table exists and the column is missing.
do $$
begin
  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'client_activities'
  ) then
    -- add the column with a safe default so existing rows are valid
    execute 'alter table public.client_activities add column if not exists kind text not null default ''homework''';
  end if;
exception when others then
  -- don't fail migrations on unexpected errors; log a notice for operators
  raise notice 'client_activities.kind ensure step skipped or failed: %', SQLERRM;
end$$;

