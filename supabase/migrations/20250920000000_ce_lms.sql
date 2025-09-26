-- Migration: Continuing Education LMS tables
-- Created: 2025-09-20

create table if not exists ce_courses (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  provider text,
  hours numeric,
  content_url text,
  content_type text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists ce_enrollments (
  id uuid primary key default gen_random_uuid(),
  course_id uuid references ce_courses(id) on delete cascade,
  user_id uuid references profiles(id) on delete cascade,
  enrolled_at timestamptz default now(),
  completed boolean default false,
  progress jsonb default '{}'::jsonb
);

create table if not exists ce_progress (
  id uuid primary key default gen_random_uuid(),
  enrollment_id uuid references ce_enrollments(id) on delete cascade,
  step_key text,
  completed_at timestamptz,
  meta jsonb default '{}'
);

-- optional indexes
create index if not exists idx_ce_enrollments_user on ce_enrollments(user_id);
create index if not exists idx_ce_enrollments_course on ce_enrollments(course_id);
