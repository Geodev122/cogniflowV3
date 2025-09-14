-- Recalculate instance.progress whenever responses change
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

-- When an instance is marked completed, ensure a results row exists
create or replace function public.ensure_result_on_complete()
returns trigger language plpgsql as $$
begin
  if new.status = 'completed' and (old.status is distinct from 'completed') then
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
