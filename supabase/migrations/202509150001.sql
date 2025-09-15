-- 1) Core entities (normalize if already present)
create table if not exists treatment_plans (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references cases(id) on delete cascade,
  schedule jsonb not null default '[]',                     -- [{sessionIndex, planned_date, goals[], phase, status}]
  goals jsonb not null default '[]',                        -- [{id, text, target_metric?, importance?}]
  created_by uuid not null references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists session_notes (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references cases(id) on delete cascade,
  therapist_id uuid not null references profiles(id),
  session_index int not null,                               -- 1..N relative to plan
  phase text,                                               -- e.g. "acute", "maintenance"
  content jsonb not null default '{}'::jsonb,               -- tiptap/slate doc or rich text structured
  highlights jsonb not null default '[]',                   -- [{id, text, tag}]
  assigned_resource_ids uuid[] default '{}',
  autosaved_at timestamptz,
  locked boolean not null default false,                    -- true after End Session
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(case_id, session_index)                            -- one per session by default
);

create table if not exists client_activities (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references profiles(id),
  case_id uuid references cases(id) on delete cascade,
  session_phase text,                                       -- "between S2–S3" etc
  kind text not null,                                       -- "assessment" | "homework" | "feedback"
  payload jsonb not null default '{}',                      -- flexible: links, answers, ratings
  occurred_at timestamptz not null default now(),
  created_by uuid references profiles(id)
);

create table if not exists assigned_resources (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references cases(id) on delete cascade,
  client_id uuid not null references profiles(id),
  resource_id uuid not null references resources(id),
  session_index int,                                        -- optional: associated session
  assigned_by uuid not null references profiles(id),
  status text not null default 'assigned',                  -- assigned | viewed | completed
  meta jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- supervision layer
create table if not exists supervision_flags (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references cases(id) on delete cascade,
  session_note_id uuid references session_notes(id) on delete set null,
  flagged_by uuid not null references profiles(id),
  reason text not null,
  created_at timestamptz not null default now()
);

create table if not exists supervision_feedback (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references cases(id) on delete cascade,
  session_note_id uuid references session_notes(id) on delete set null,
  supervisor_id uuid not null references profiles(id),
  score int,                                                -- optional: 1..5
  comments text,
  created_at timestamptz not null default now()
);

-- summary artifact (one per case, rolling updates)
create table if not exists case_summaries (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references cases(id) on delete cascade,
  title text not null,                                      -- “Case #ABC123 — Updated 2025-09-15”
  content jsonb not null default '{}'::jsonb,               -- structured doc (render in CaseSummary.tsx)
  last_highlight_ids uuid[] default '{}',
  updated_by uuid not null references profiles(id),
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (case_id)                                          -- single rolling summary per case
);

-- audit trail for edits
create table if not exists audit_events (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid not null references profiles(id),
  entity_type text not null,                                -- 'session_note' | 'assigned_resource' | 'summary'
  entity_id uuid not null,
  action text not null,                                     -- 'create' | 'update' | 'flag' | 'complete'
  diff jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
