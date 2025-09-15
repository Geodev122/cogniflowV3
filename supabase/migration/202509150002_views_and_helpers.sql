-- Convenience view: my clients for a therapist
create or replace view public.v_my_clients as
select r.therapist_id, r.client_id
from public.therapist_client_relations r;

-- Today appointments (server time)
create or replace view public.v_today_appointments as
select a.*
from public.appointments a
where a.appointment_date::date = now()::date;

-- Helper to count template items (expects schema->'items' array)
create or replace function public.template_item_count(t_id uuid)
returns integer language sql stable as $$
  select coalesce(jsonb_array_length(schema->'items'), 0)::int
  from public.assessment_templates
  where id = t_id
$$;
