-- === Patch assessment_templates so the app can read template items ===

-- 0) Create table if it doesn't exist (minimal columns; will add more below)
do $$ begin
  if not exists (select 1 from information_schema.tables
                 where table_schema='public' and table_name='assessment_templates') then
    create table public.assessment_templates (
      id uuid primary key default gen_random_uuid(),
      name text not null,
      created_at timestamptz not null default now()
    );
  end if;
end $$;

-- 1) Ensure expected columns exist
do $$ begin
  -- JSON schema for renderer
  if not exists (select 1 from information_schema.columns
                 where table_schema='public' and table_name='assessment_templates' and column_name='schema') then
    alter table public.assessment_templates add column "schema" jsonb;
  end if;

  -- meta bits we use in the UI
  if not exists (select 1 from information_schema.columns
                 where table_schema='public' and table_name='assessment_templates' and column_name='abbreviation') then
    alter table public.assessment_templates add column abbreviation text;
  end if;

  if not exists (select 1 from information_schema.columns
                 where table_schema='public' and table_name='assessment_templates' and column_name='description') then
    alter table public.assessment_templates add column description text;
  end if;

  if not exists (select 1 from information_schema.columns
                 where table_schema='public' and table_name='assessment_templates' and column_name='is_active') then
    alter table public.assessment_templates add column is_active boolean not null default true;
  end if;

  if not exists (select 1 from information_schema.columns
                 where table_schema='public' and table_name='assessment_templates' and column_name='version') then
    alter table public.assessment_templates add column version int not null default 1;
  end if;

  if not exists (select 1 from information_schema.columns
                 where table_schema='public' and table_name='assessment_templates' and column_name='scoring') then
    alter table public.assessment_templates add column scoring jsonb;
  end if;

  -- helper (optional) count of items inside schema
  if not exists (select 1 from information_schema.columns
                 where table_schema='public' and table_name='assessment_templates' and column_name='items_count') then
    alter table public.assessment_templates add column items_count int;
  end if;
end $$;

-- 2) Initialize schema if null (so length() calls won't fail)
update public.assessment_templates
   set "schema" = coalesce("schema", jsonb_build_object('items', jsonb_build_array()));

-- 3) Backfill items_count from schema.items (if column exists)
update public.assessment_templates
   set items_count = coalesce(jsonb_array_length("schema"->'items'), 0)
 where items_count is null;

-- 4) Add a small index to help library browsing
do $$ begin
  if not exists (select 1 from pg_indexes where schemaname='public' and indexname='idx_templates_active') then
    create index idx_templates_active on public.assessment_templates(is_active, name);
  end if;
end $$;

-- 5) (Re)create a helper function the one-shot might rely on, quoting "schema"
create or replace function public.fn_template_items_count(tpl jsonb)
returns integer language sql immutable as $$
  select coalesce(jsonb_array_length(tpl->'items'), 0)::int
$$;

-- 6) Optional sanity: ensure every row has an integer items_count
update public.assessment_templates
   set items_count = coalesce(jsonb_array_length("schema"->'items'), 0);
