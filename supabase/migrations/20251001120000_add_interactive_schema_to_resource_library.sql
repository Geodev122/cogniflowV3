-- Safe, idempotent migration to add interactive_schema and course_manifest JSONB columns
-- to resource_library. This is additive and will not modify existing data.

BEGIN;

ALTER TABLE IF EXISTS resource_library
  ADD COLUMN IF NOT EXISTS interactive_schema JSONB,
  ADD COLUMN IF NOT EXISTS course_manifest JSONB;

COMMIT;
