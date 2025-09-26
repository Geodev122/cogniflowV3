-- Migration: Continuing Education lessons
-- Created: 2025-09-20

create table if not exists ce_lessons (
  id uuid primary key default gen_random_uuid(),
  course_id uuid references ce_courses(id) on delete cascade,
  title text not null,
  slug text,
  content jsonb default '{}'::jsonb,
  position integer default 0,
  duration_minutes integer default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_ce_lessons_course on ce_lessons(course_id);
