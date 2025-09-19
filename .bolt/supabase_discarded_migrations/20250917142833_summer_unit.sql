-- =========================================
-- Migration: fix missing tables/columns + RLS
-- Safe & idempotent (can be re-run)
-- =========================================
begin;

-- UUIDs for gen_random_uuid()
create extension if not exists pgcrypto;

-- -------------------------------------------------
-- 1) Ensure public.cases exists (with needed cols)
-- -------------------------------------------------
create table if not exists public.cases (
  id               uuid primary key default gen_random_uuid(),
  case_number      text,
  status           text,
  client_id        uuid,
  therapist_id     uuid,
  current_phase    text default 'intake',
  diagnosis_codes  text[] default '{}'::text[],
  formulation      text,
  intake_data      jsonb  default '{}'::jsonb,
  data             jsonb  default '{}'::jsonb,
  treatment_plan   jsonb  default '{}'::jsonb,
  created_at       timestamptz default now(),
  updated_at       timestamptz default now()
);

-- Make sure the columns you rely on exist (idempotent)
alter table public.cases add column if not exists current_phase   text default 'intake';
alter table public.cases add column if not exists diagnosis_codes text[] default '{}'::text[];
alter table public.cases add column if not exists formulation     text;
alter table public.cases add column if not exists intake_data     jsonb default '{}'::jsonb;
alter table public.cases add column if not exists data            jsonb default '{}'::jsonb;
alter table public.cases add column if not exists treatment_plan  jsonb default '{}'::jsonb;

-- -------------------------------------------------
-- 2) profiles: add phone/city/country (guarded copy)
-- -------------------------------------------------
alter table public.profiles add column if not exists phone   text;
alter table public.profiles add column if not exists city    text;
alter table public.profiles add column if not exists country text;

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='profiles' and column_name='whatsapp_number'
  ) then
    -- copy only where phone is null
    update public.profiles
       set phone = whatsapp_number
     where phone is null and whatsapp_number is not null;
  end if;
end$$;

-- -------------------------------------------------
-- 3) appointments: add appointment_date/location
--     and backfill from start_time if present
-- -------------------------------------------------
alter table public.appointments add column if not exists appointment_date timestamptz;
alter table public.appointments add column if not exists location         text;

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='appointments' and column_name='start_time'
  ) then
    update public.appointments
       set appointment_date = start_time
     where appointment_date is null and start_time is not null;
  end if;
end$$;

-- -------------------------------------------------
-- 4) Tables needed by FE features (with FK to cases)
-- -------------------------------------------------

-- client_requests
create table if not exists public.client_requests (
  id           uuid primary key default gen_random_uuid(),
  client_id    uuid not null references public.profiles(id) on delete cascade,
  therapist_id uuid references public.profiles(id) on delete set null,
  case_id      uuid references public.cases(id) on delete cascade,
  type         text not null check (type in ('end_therapy','referral','complaint','question')),
  message      text,
  status       text not null default 'open' check (status in ('open','in_review','resolved','closed')),
  created_at   timestamptz default now(),
  updated_at   timestamptz default now(),
  resolved_at  timestamptz,
  resolved_by  uuid references public.profiles(id)
);
alter table public.client_requests enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='client_requests' and policyname='client_requests_client_manage') then
    create policy "client_requests_client_manage"
      on public.client_requests for all to authenticated
      using (client_id = auth.uid())
      with check (client_id = auth.uid());
  end if;

  if not exists (select 1 from pg_policies where schemaname='public' and tablename='client_requests' and policyname='client_requests_therapist_read') then
    create policy "client_requests_therapist_read"
      on public.client_requests for select to authenticated
      using (therapist_id = auth.uid());
  end if;
end$$;

-- therapist_case_relations
create table if not exists public.therapist_case_relations (
  id           uuid primary key default gen_random_uuid(),
  case_id      uuid not null references public.cases(id) on delete cascade,
  therapist_id uuid not null references public.profiles(id) on delete cascade,
  role         text default 'collaborating' check (role in ('primary','collaborating','supervising','consulting')),
  created_at   timestamptz default now(),
  unique(case_id, therapist_id)
);
alter table public.therapist_case_relations enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='therapist_case_relations' and policyname='therapist_case_relations_manage') then
    create policy "therapist_case_relations_manage"
      on public.therapist_case_relations for all to authenticated
      using (therapist_id = auth.uid())
      with check (therapist_id = auth.uid());
  end if;
end$$;

-- supervision_flags (assumes session_notes exists)
create table if not exists public.supervision_flags (
  id             uuid primary key default gen_random_uuid(),
  case_id        uuid not null references public.cases(id) on delete cascade,
  therapist_id   uuid not null references public.profiles(id) on delete cascade,
  session_note_id uuid references public.session_notes(id) on delete set null,
  flagged_by     uuid not null references public.profiles(id),
  reason         text not null,
  status         text default 'open' check (status in ('open','in_review','resolved')),
  created_at     timestamptz default now(),
  resolved_at    timestamptz,
  resolved_by    uuid references public.profiles(id)
);
alter table public.supervision_flags enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='supervision_flags' and policyname='supervision_flags_therapist_manage') then
    create policy "supervision_flags_therapist_manage"
      on public.supervision_flags for all to authenticated
      using (therapist_id = auth.uid())
      with check (therapist_id = auth.uid());
  end if;
end$$;

-- supervision_threads
create table if not exists public.supervision_threads (
  id           uuid primary key default gen_random_uuid(),
  therapist_id uuid not null references public.profiles(id) on delete cascade,
  supervisor_id uuid references public.profiles(id) on delete set null,
  case_id      uuid references public.cases(id) on delete set null,
  title        text not null,
  description  text,
  status       text default 'open' check (status in ('open','in_progress','resolved','closed')),
  priority     text default 'normal' check (priority in ('low','normal','high','urgent')),
  created_at   timestamptz default now(),
  updated_at   timestamptz default now(),
  resolved_at  timestamptz
);
alter table public.supervision_threads enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='supervision_threads' and policyname='supervision_threads_therapist_manage') then
    create policy "supervision_threads_therapist_manage"
      on public.supervision_threads for all to authenticated
      using (therapist_id = auth.uid())
      with check (therapist_id = auth.uid());
  end if;
end$$;

-- therapist_licenses
create table if not exists public.therapist_licenses (
  id               uuid primary key default gen_random_uuid(),
  therapist_id     uuid not null references public.profiles(id) on delete cascade,
  license_name     text not null,
  license_number   text,
  issuing_authority text,
  country          text not null,
  state_province   text,
  file_path        text not null,
  expires_on       date,
  status           text default 'submitted' check (status in ('submitted','under_review','approved','rejected','expired')),
  verified_at      timestamptz,
  verified_by      uuid references public.profiles(id),
  notes            text,
  created_at       timestamptz default now(),
  updated_at       timestamptz default now()
);
alter table public.therapist_licenses enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='therapist_licenses' and policyname='therapist_licenses_own_manage') then
    create policy "therapist_licenses_own_manage"
      on public.therapist_licenses for all to authenticated
      using (therapist_id = auth.uid())
      with check (therapist_id = auth.uid());
  end if;
end$$;

-- subscriptions
create table if not exists public.subscriptions (
  id                     uuid primary key default gen_random_uuid(),
  user_id                uuid not null references public.profiles(id) on delete cascade,
  stripe_subscription_id text unique,
  plan_name              text not null,
  status                 text not null check (status in ('active','past_due','canceled','trialing','inactive')),
  current_period_start   timestamptz,
  current_period_end     timestamptz,
  cancel_at_period_end   boolean default false,
  created_at             timestamptz default now(),
  updated_at             timestamptz default now()
);
alter table public.subscriptions enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='subscriptions' and policyname='subscriptions_own_access') then
    create policy "subscriptions_own_access"
      on public.subscriptions for all to authenticated
      using (user_id = auth.uid())
      with check (user_id = auth.uid());
  end if;
end$$;

-- invoices
create table if not exists public.invoices (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references public.profiles(id) on delete cascade,
  stripe_invoice_id text unique,
  number           text,
  amount_due       integer,
  currency         text default 'usd',
  status           text check (status in ('paid','open','void','uncollectible')),
  hosted_invoice_url text,
  invoice_pdf      text,
  created_at       timestamptz default now()
);
alter table public.invoices enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='invoices' and policyname='invoices_own_access') then
    create policy "invoices_own_access"
      on public.invoices for select to authenticated
      using (user_id = auth.uid());
  end if;
end$$;

-- vip_offers
create table if not exists public.vip_offers (
  id              uuid primary key default gen_random_uuid(),
  title           text not null,
  body            text,
  cta_label       text,
  cta_url         text,
  target_audience text[] default array['therapist']::text[],
  expires_on      date,
  is_active       boolean default true,
  created_by      uuid references public.profiles(id),
  created_at      timestamptz default now()
);
alter table public.vip_offers enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='vip_offers' and policyname='vip_offers_read_all') then
    create policy "vip_offers_read_all"
      on public.vip_offers for select to authenticated
      using (is_active = true and (expires_on is null or expires_on >= current_date));
  end if;
end$$;

-- clinic_spaces
create table if not exists public.clinic_spaces (
  id                 uuid primary key default gen_random_uuid(),
  admin_id           uuid references public.profiles(id) on delete set null,
  name               text not null,
  description        text,
  location           text not null,
  amenities          text[],
  pricing_hourly     numeric(10,2),
  pricing_daily      numeric(10,2),
  tailored_available boolean default false,
  whatsapp           text,
  external_managed   boolean default false,
  active             boolean default true,
  images             text[],
  created_at         timestamptz default now(),
  updated_at         timestamptz default now()
);
alter table public.clinic_spaces enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='clinic_spaces' and policyname='clinic_spaces_read_active') then
    create policy "clinic_spaces_read_active"
      on public.clinic_spaces for select to authenticated
      using (active = true);
  end if;

  if not exists (select 1 from pg_policies where schemaname='public' and tablename='clinic_spaces' and policyname='clinic_spaces_admin_manage') then
    create policy "clinic_spaces_admin_manage"
      on public.clinic_spaces for all to authenticated
      using (admin_id = auth.uid())
      with check (admin_id = auth.uid());
  end if;
end$$;

-- clinic_rental_requests
create table if not exists public.clinic_rental_requests (
  id              uuid primary key default gen_random_uuid(),
  therapist_id    uuid not null references public.profiles(id) on delete cascade,
  space_id        uuid not null references public.clinic_spaces(id) on delete cascade,
  request_type    text not null check (request_type in ('hourly','daily','tailored')),
  preferred_date  date,
  duration_hours  integer,
  notes           text,
  status          text default 'new' check (status in ('new','approved','rejected','expired')),
  admin_response  text,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);
alter table public.clinic_rental_requests enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='clinic_rental_requests' and policyname='clinic_rental_requests_therapist_manage') then
    create policy "clinic_rental_requests_therapist_manage"
      on public.clinic_rental_requests for all to authenticated
      using (therapist_id = auth.uid())
      with check (therapist_id = auth.uid());
  end if;
end$$;

-- consents
create table if not exists public.consents (
  id           uuid primary key default gen_random_uuid(),
  client_id    uuid not null references public.profiles(id) on delete cascade,
  therapist_id uuid references public.profiles(id) on delete set null,
  case_id      uuid references public.cases(id) on delete set null,
  title        text not null,
  body         text,
  consent_type text default 'treatment' check (consent_type in ('treatment','privacy','communication','research')),
  signed_at    timestamptz,
  expires_at   timestamptz,
  created_at   timestamptz default now()
);
alter table public.consents enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='consents' and policyname='consents_client_manage') then
    create policy "consents_client_manage"
      on public.consents for all to authenticated
      using (client_id = auth.uid())
      with check (client_id = auth.uid());
  end if;

  if not exists (select 1 from pg_policies where schemaname='public' and tablename='consents' and policyname='consents_therapist_read') then
    create policy "consents_therapist_read"
      on public.consents for select to authenticated
      using (therapist_id = auth.uid());
  end if;
end$$;

-- -------------------------------------------------
-- 5) Indexes
-- -------------------------------------------------
create index if not exists idx_cases_current_phase          on public.cases(current_phase);
create index if not exists idx_cases_diagnosis_codes        on public.cases using gin(diagnosis_codes);
create index if not exists idx_profiles_phone               on public.profiles(phone);
create index if not exists idx_profiles_city                on public.profiles(city);
create index if not exists idx_profiles_country             on public.profiles(country);
create index if not exists idx_client_requests_status       on public.client_requests(status);
create index if not exists idx_client_requests_type         on public.client_requests(type);
create index if not exists idx_supervision_flags_status     on public.supervision_flags(status);
create index if not exists idx_supervision_threads_status   on public.supervision_threads(status);
create index if not exists idx_therapist_licenses_status    on public.therapist_licenses(status);
create index if not exists idx_therapist_licenses_expires   on public.therapist_licenses(expires_on);
create index if not exists idx_subscriptions_status         on public.subscriptions(status);
create index if not exists idx_clinic_rental_requests_status on public.clinic_rental_requests(status);

-- -------------------------------------------------
-- 6) Data backfills (safe)
-- -------------------------------------------------
-- profiles phone already handled above DO-block if whatsapp_number exists

-- sensible default for cases.current_phase based on status
update public.cases set current_phase='active' where current_phase is null and status='active';
update public.cases set current_phase='closed' where current_phase is null and status='closed';
update public.cases set current_phase='intake' where current_phase is null;

-- -------------------------------------------------
-- 7) updated_at trigger util + table triggers
-- -------------------------------------------------
create or replace function public.update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

do $$
begin
  if not exists (select 1 from pg_trigger where tgname='update_client_requests_updated_at') then
    create trigger update_client_requests_updated_at
      before update on public.client_requests
      for each row execute function public.update_updated_at_column();
  end if;

  if not exists (select 1 from pg_trigger where tgname='update_supervision_threads_updated_at') then
    create trigger update_supervision_threads_updated_at
      before update on public.supervision_threads
      for each row execute function public.update_updated_at_column();
  end if;

  if not exists (select 1 from pg_trigger where tgname='update_therapist_licenses_updated_at') then
    create trigger update_therapist_licenses_updated_at
      before update on public.therapist_licenses
      for each row execute function public.update_updated_at_column();
  end if;

  if not exists (select 1 from pg_trigger where tgname='update_subscriptions_updated_at') then
    create trigger update_subscriptions_updated_at
      before update on public.subscriptions
      for each row execute function public.update_updated_at_column();
  end if;

  if not exists (select 1 from pg_trigger where tgname='update_clinic_spaces_updated_at') then
    create trigger update_clinic_spaces_updated_at
      before update on public.clinic_spaces
      for each row execute function public.update_updated_at_column();
  end if;

  if not exists (select 1 from pg_trigger where tgname='update_clinic_rental_requests_updated_at') then
    create trigger update_clinic_rental_requests_updated_at
      before update on public.clinic_rental_requests
      for each row execute function public.update_updated_at_column();
  end if;
end$$;

commit;

