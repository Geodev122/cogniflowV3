-- Enable RLS
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

-- profiles: user can read own; therapists can read assigned clients; admins (role via profile) can read all
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

-- therapist_client_relations: only involved therapist or client can see; only therapist can insert/delete their own links
drop policy if exists "tcr read own edges" on public.therapist_client_relations;
create policy "tcr read own edges" on public.therapist_client_relations
for select using (auth.uid() = therapist_id or auth.uid() = client_id);

drop policy if exists "tcr therapist manage" on public.therapist_client_relations;
create policy "tcr therapist manage" on public.therapist_client_relations
for insert with check (auth.uid() = therapist_id);
create policy "tcr therapist delete" on public.therapist_client_relations
for delete using (auth.uid() = therapist_id);

-- assessment_templates: readable by all authenticated; only admin/creator can modify
drop policy if exists "templates read all" on public.assessment_templates;
create policy "templates read all" on public.assessment_templates
for select using (true);

drop policy if exists "templates manage creators" on public.assessment_templates;
create policy "templates manage creators" on public.assessment_templates
for all using (created_by = auth.uid() or (select role from public.profiles where id = auth.uid()) = 'therapist')
with check (created_by = auth.uid() or (select role from public.profiles where id = auth.uid()) = 'therapist');

-- assessment_instances: therapist owns; client owns by client_id
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

-- assessment_responses: client or therapist on same instance
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

-- assessment_results: same visibility as instances
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

-- cases: therapist owner; client can read own
drop policy if exists "cases read therapist or client" on public.cases;
create policy "cases read therapist or client" on public.cases
for select using (therapist_id = auth.uid() or client_id = auth.uid());

drop policy if exists "cases manage therapist" on public.cases;
create policy "cases manage therapist" on public.cases
for all using (therapist_id = auth.uid())
with check (therapist_id = auth.uid());

-- appointments
drop policy if exists "appts read therapist or client" on public.appointments;
create policy "appts read therapist or client" on public.appointments
for select using (therapist_id = auth.uid() or client_id = auth.uid());

drop policy if exists "appts manage therapist" on public.appointments;
create policy "appts manage therapist" on public.appointments
for all using (therapist_id = auth.uid())
with check (therapist_id = auth.uid());

-- documents: owner or therapist on case
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

-- resources
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

-- admin_announcements: readable to all authenticated; only therapist (or admin) create
drop policy if exists "announcements read" on public.admin_announcements;
create policy "announcements read" on public.admin_announcements
for select using (true);

drop policy if exists "announcements manage therapist" on public.admin_announcements;
create policy "announcements manage therapist" on public.admin_announcements
for all using ((select role from public.profiles where id = auth.uid()) = 'therapist')
with check ((select role from public.profiles where id = auth.uid()) = 'therapist');

-- tickets
drop policy if exists "tickets read own" on public.tickets;
create policy "tickets read own" on public.tickets
for select using (user_id = auth.uid());

drop policy if exists "tickets manage own" on public.tickets;
create policy "tickets manage own" on public.tickets
for all using (user_id = auth.uid())
with check (user_id = auth.uid());

-- user_last_seen: self only
drop policy if exists "uls self manage" on public.user_last_seen;
create policy "uls self manage" on public.user_last_seen
for all using (user_id = auth.uid())
with check (user_id = auth.uid());
