-- Enable required extensions
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- ========= Enums =========
do $$ begin
  create type public.assessment_status as enum ('assigned','in_progress','completed','expired','cancelled');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.reminder_frequency as enum ('none','daily','weekly','before_due');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.appointment_type as enum ('in_person','video','phone','other');
exception when duplicate_object then null; end $$;

-- ========= Profiles =========
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  role text check (role in ('therapist','client')) not null default 'client',
  first_name text,
  last_name text,
  whatsapp_number text,
  professional_details jsonb,
  verification_status text,              -- e.g. 'pending','verified','rejected'
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_profiles_role on public.profiles(role);
create index if not exists idx_profiles_name on public.profiles((lower(coalesce(first_name,'')||' '||coalesce(last_name,''))));

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists trg_profiles_updated on public.profiles;
create trigger trg_profiles_updated
before update on public.profiles
for each row execute function public.set_updated_at();

-- ========= Therapist-Client Relations =========
create table if not exists public.therapist_client_relations (
  id uuid primary key default gen_random_uuid(),
  therapist_id uuid not null references public.profiles(id) on delete cascade,
  client_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (therapist_id, client_id)
);

create index if not exists idx_tcr_therapist on public.therapist_client_relations(therapist_id);
create index if not exists idx_tcr_client on public.therapist_client_relations(client_id);

-- ========= Assessment Templates =========
create table if not exists public.assessment_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  abbreviation text,
  description text,
  version text not null default '1.0.0',
  is_active boolean not null default true,
  schema jsonb not null,     -- { items: [ {id,type,label,options...}, ... ] }
  scoring jsonb,             -- arbitrary rules used by the app
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_templates_active on public.assessment_templates(is_active);

drop trigger if exists trg_templates_updated on public.assessment_templates;
create trigger trg_templates_updated
before update on public.assessment_templates
for each row execute function public.set_updated_at();

-- ========= Assessment Instances =========
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
create trigger trg_ai_updated
before update on public.assessment_instances
for each row execute function public.set_updated_at();

-- ========= Assessment Responses =========
create table if not exists public.assessment_responses (
  id uuid primary key default gen_random_uuid(),
  instance_id uuid not null references public.assessment_instances(id) on delete cascade,
  item_id text not null,
  payload jsonb,                       -- the user’s answer (any shape)
  answered_at timestamptz not null default now(),
  unique (instance_id, item_id)
);

create index if not exists idx_ar_instance on public.assessment_responses(instance_id);
create index if not exists idx_ar_item on public.assessment_responses(instance_id, item_id);

-- ========= Assessment Results =========
create table if not exists public.assessment_results (
  id uuid primary key default gen_random_uuid(),
  instance_id uuid not null unique references public.assessment_instances(id) on delete cascade,
  score jsonb,
  alerts jsonb,               -- e.g. [{type:'critical'|'warning', message:'...'}]
  interpretation text,
  created_at timestamptz not null default now()
);

-- ========= Cases =========
create table if not exists public.cases (
  id uuid primary key default gen_random_uuid(),
  case_code text not null unique,
  client_id uuid not null references public.profiles(id) on delete cascade,
  therapist_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'active',     -- active|closed|archived
  data jsonb,                                -- formulation, plan, sessions, etc.
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_cases_therapist on public.cases(therapist_id);
create index if not exists idx_cases_client on public.cases(client_id);
create index if not exists idx_cases_status on public.cases(status);

drop trigger if exists trg_cases_updated on public.cases;
create trigger trg_cases_updated
before update on public.cases
for each row execute function public.set_updated_at();

-- ========= Appointments =========
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

-- ========= Documents =========
create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  case_id uuid references public.cases(id) on delete set null,
  url text not null,
  type text not null,               -- license, worksheet, export, etc.
  meta jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_docs_owner on public.documents(owner_id);
create index if not exists idx_docs_case on public.documents(case_id);

-- ========= Resources =========
create table if not exists public.resources (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  kind text not null,               -- psychometric|worksheet|education|legal|template|link|file
  tags text[] default '{}',
  url text,                         -- external or storage public URL
  meta jsonb,
  visibility text not null default 'therapist',  -- therapist|client|admin|public
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists idx_resources_kind on public.resources(kind);
create index if not exists idx_resources_visibility on public.resources(visibility);

-- ========= Admin Announcements (for VIP/Training) =========
create table if not exists public.admin_announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text,
  kind text not null default 'news',       -- news|vip|training
  starts_at timestamptz,
  ends_at timestamptz,
  audience text[] default '{therapist}',
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

-- ========= Tickets (support) =========
create table if not exists public.tickets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  subject text not null,
  body text,
  status text not null default 'open',
  created_at timestamptz not null default now()
);

-- ========= Last Seen =========
create table if not exists public.user_last_seen (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  page text not null,
  seen_at timestamptz not null default now()
);
