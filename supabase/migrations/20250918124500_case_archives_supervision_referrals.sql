-- 20250918124500_case_archives_supervision_referrals.sql

-- ===== Enums =====
do $$
begin
  if not exists (select 1 from pg_type where typname = 'case_status') then
    create type case_status as enum ('open','active','paused','closed','archived');
  end if;
end$$;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'supervision_status') then
    create type supervision_status as enum ('pending','accepted','rejected','cancelled');
  end if;
end$$;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'referral_status') then
    create type referral_status as enum ('pending','accepted','declined','cancelled');
  end if;
end$$;

-- ===== cases table columns (archive support) =====
alter table if exists public.cases
  add column if not exists status case_status not null default 'open',
  add column if not exists archived_at timestamptz,
  add column if not exists closed_at   timestamptz,
  add column if not exists last_session_at timestamptz;

create index if not exists idx_cases_status on public.cases(status);
create index if not exists idx_cases_archived_at on public.cases(archived_at);

-- Auto timestamps on status changes
create or replace function public.set_case_timestamps()
returns trigger
language plpgsql
as $$
begin
  if new.status = 'archived' and new.archived_at is null then
    new.archived_at := now();
  end if;
  if new.status = 'closed' and new.closed_at is null then
    new.closed_at := now();
  end if;
  return new;
end;
$$;

drop trigger if exists trg_case_timestamps on public.cases;
create trigger trg_case_timestamps
before update on public.cases
for each row
when (old.status is distinct from new.status)
execute function public.set_case_timestamps();

-- ===== supervision_requests =====
create table if not exists public.supervision_requests (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.cases(id) on delete cascade,
  requester_id uuid not null,      -- therapist (auth.uid())
  supervisor_id uuid,              -- optional pre-selected supervisor
  notes text,
  status supervision_status not null default 'pending',
  created_at timestamptz not null default now(),
  decided_at timestamptz
);

create index if not exists idx_supervision_case on public.supervision_requests(case_id);
create index if not exists idx_supervision_requester on public.supervision_requests(requester_id);
create index if not exists idx_supervision_supervisor on public.supervision_requests(supervisor_id);

-- ===== case_referrals =====
create table if not exists public.case_referrals (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.cases(id) on delete cascade,
  from_therapist_id uuid not null,
  to_therapist_id uuid not null,
  reason text,
  status referral_status not null default 'pending',
  created_at timestamptz not null default now(),
  decided_at timestamptz
);

create index if not exists idx_referrals_case on public.case_referrals(case_id);
create index if not exists idx_referrals_to on public.case_referrals(to_therapist_id);
create index if not exists idx_referrals_from on public.case_referrals(from_therapist_id);

-- ===== optional audit logs =====
create table if not exists public.case_audit_logs (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.cases(id) on delete cascade,
  actor_id uuid not null,
  action text not null,              -- e.g., 'ARCHIVE','REOPEN','SUPERVISION_REQUEST','REFERRAL_REQUEST','REFERRAL_ACCEPT'
  payload jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_audit_case on public.case_audit_logs(case_id);
create index if not exists idx_audit_actor on public.case_audit_logs(actor_id);

-- ===== resources table enhancements for CE =====
alter table if exists public.resources
  add column if not exists provider text,
  add column if not exists hours numeric,
  add column if not exists content_type text,
  add column if not exists category text,
  add column if not exists url text;

-- ===== helper functions for role checks (via profiles.role) =====
create or replace function public.is_supervisor() returns boolean
language sql stable
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and (p.role = 'supervisor' or p.role = 'admin')
  );
$$;

create or replace function public.is_admin() returns boolean
language sql stable
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.role = 'admin'
  );
$$;

-- ===== RLS =====
alter table public.supervision_requests enable row level security;
alter table public.case_referrals enable row level security;
alter table public.case_audit_logs enable row level security;
-- cases should already have RLS enabled in your project; if not:
-- alter table public.cases enable row level security;

-- ---- policies: cases (owner therapist or supervisor/admin)
drop policy if exists cases_select_policy on public.cases;
create policy cases_select_policy on public.cases
for select
to authenticated
using (
  therapist_id = auth.uid()
  or public.is_supervisor()
  or public.is_admin()
);

drop policy if exists cases_update_policy on public.cases;
create policy cases_update_policy on public.cases
for update
to authenticated
using (
  therapist_id = auth.uid()
  or public.is_supervisor()
  or public.is_admin()
)
with check (
  therapist_id = auth.uid()
  or public.is_supervisor()
  or public.is_admin()
);

-- ---- policies: supervision_requests
drop policy if exists supervision_select_policy on public.supervision_requests;
create policy supervision_select_policy on public.supervision_requests
for select
to authenticated
using (
  requester_id = auth.uid()
  or supervisor_id = auth.uid()
  or public.is_supervisor()
  or public.is_admin()
);

drop policy if exists supervision_insert_policy on public.supervision_requests;
create policy supervision_insert_policy on public.supervision_requests
for insert
to authenticated
with check ( requester_id = auth.uid() );

drop policy if exists supervision_update_policy on public.supervision_requests;
create policy supervision_update_policy on public.supervision_requests
for update
to authenticated
using (
  supervisor_id = auth.uid()
  or public.is_supervisor()
  or public.is_admin()
)
with check (
  supervisor_id = auth.uid()
  or public.is_supervisor()
  or public.is_admin()
);

-- ---- policies: case_referrals
drop policy if exists referrals_select_policy on public.case_referrals;
create policy referrals_select_policy on public.case_referrals
for select
to authenticated
using (
  from_therapist_id = auth.uid()
  or to_therapist_id = auth.uid()
  or public.is_supervisor()
  or public.is_admin()
);

drop policy if exists referrals_insert_policy on public.case_referrals;
create policy referrals_insert_policy on public.case_referrals
for insert
to authenticated
with check ( from_therapist_id = auth.uid() );

drop policy if exists referrals_update_policy on public.case_referrals;
create policy referrals_update_policy on public.case_referrals
for update
to authenticated
using (
  to_therapist_id = auth.uid()
  or public.is_supervisor()
  or public.is_admin()
)
with check (
  to_therapist_id = auth.uid()
  or public.is_supervisor()
  or public.is_admin()
);

-- ---- policies: case_audit_logs (read: owner or supervisor/admin; write: any authenticated to log their own actions)
drop policy if exists audit_select_policy on public.case_audit_logs;
create policy audit_select_policy on public.case_audit_logs
for select
to authenticated
using (
  exists (
    select 1 from public.cases c
    where c.id = case_audit_logs.case_id
      and (
        c.therapist_id = auth.uid()
        or public.is_supervisor()
        or public.is_admin()
      )
  )
);

drop policy if exists audit_insert_policy on public.case_audit_logs;
create policy audit_insert_policy on public.case_audit_logs
for insert
to authenticated
with check ( actor_id = auth.uid() );

-- Done
