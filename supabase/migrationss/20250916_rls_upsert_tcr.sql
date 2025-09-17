-- Idempotent RLS (re)definition for therapist_client_relations
-- - Drops conflicting policies if they exist
-- - Recreates a canonical set (select/insert/update/delete)
-- - Keeps the table's RLS enabled

begin;

-- 0) Safety: table may or may not exist depending on your branch
create table if not exists public.therapist_client_relations (
  id uuid primary key default gen_random_uuid(),
  therapist_id uuid not null,
  client_id uuid not null,
  relation_type text default 'primary',
  created_at timestamptz not null default now()
);

-- 1) Enable RLS (noop if already enabled)
alter table public.therapist_client_relations enable row level security;

-- 2) Drop any legacy/conflicting policies by name (no error if missing)
drop policy if exists "tcr therapist select" on public.therapist_client_relations;
drop policy if exists "tcr therapist insert" on public.therapist_client_relations;
drop policy if exists "tcr therapist update" on public.therapist_client_relations;
drop policy if exists "tcr therapist delete" on public.therapist_client_relations;

-- 3) Recreate canonical policies
-- Therapists can see/insert/update/delete rows where they are the therapist
create policy "tcr therapist select"
on public.therapist_client_relations
for select
to authenticated
using ( therapist_id = auth.uid() );

create policy "tcr therapist insert"
on public.therapist_client_relations
for insert
to authenticated
with check ( therapist_id = auth.uid() );

create policy "tcr therapist update"
on public.therapist_client_relations
for update
to authenticated
using ( therapist_id = auth.uid() )
with check ( therapist_id = auth.uid() );

create policy "tcr therapist delete"
on public.therapist_client_relations
for delete
to authenticated
using ( therapist_id = auth.uid() );

commit;
