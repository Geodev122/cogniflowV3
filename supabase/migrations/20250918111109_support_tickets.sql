-- db/support_tickets.sql
-- Support / Tickets module
-- Safe to run multiple times (idempotent).
BEGIN;

-- ---------------------------------------------------------------------
-- Extensions
-- ---------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS pgcrypto;  -- for gen_random_uuid()

-- ---------------------------------------------------------------------
-- Enumerations via CHECKs (avoid hard enums for easier migrations)
-- ---------------------------------------------------------------------
-- status: open -> pending -> resolved -> closed
-- priority: low, medium, high, urgent

-- ---------------------------------------------------------------------
-- Core reference tables
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.support_ticket_categories (
  key              TEXT PRIMARY KEY,                             -- e.g. 'billing', 'bug'
  name             TEXT NOT NULL,
  description      TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tags (free-form but curated)
CREATE TABLE IF NOT EXISTS public.support_ticket_tags (
  key         TEXT PRIMARY KEY,                                  -- e.g. 'phq9', 'appointments'
  label       TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------
-- Tickets
-- ---------------------------------------------------------------------
CREATE SEQUENCE IF NOT EXISTS public.support_ticket_seq;

CREATE TABLE IF NOT EXISTS public.support_tickets (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_number     TEXT UNIQUE,                                 -- e.g. SUP-2025-0001
  requester_id      UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  assignee_id       UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  category_key      TEXT REFERENCES public.support_ticket_categories(key) ON DELETE SET NULL,
  status            TEXT NOT NULL DEFAULT 'open'
                      CHECK (status IN ('open','pending','resolved','closed')),
  priority          TEXT NOT NULL DEFAULT 'medium'
                      CHECK (priority IN ('low','medium','high','urgent')),
  subject           TEXT NOT NULL,
  description       TEXT NOT NULL,
  metadata          JSONB NOT NULL DEFAULT '{}'::jsonb,
  last_activity_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  closed_at         TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- full text search
  search            tsvector
);

-- Messages (conversation thread)
CREATE TABLE IF NOT EXISTS public.support_ticket_messages (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id      UUID NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  sender_id      UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  body           TEXT NOT NULL,
  is_internal    BOOLEAN NOT NULL DEFAULT FALSE,                 -- internal note (not visible to requester)
  attachments    JSONB NOT NULL DEFAULT '[]'::jsonb,             -- [{name, url, size}]
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Watchers (anyone following the ticket)
CREATE TABLE IF NOT EXISTS public.support_ticket_watchers (
  ticket_id   UUID NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  profile_id  UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  added_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (ticket_id, profile_id)
);

-- Tag mapping
CREATE TABLE IF NOT EXISTS public.support_ticket_tag_map (
  ticket_id  UUID NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  tag_key    TEXT NOT NULL REFERENCES public.support_ticket_tags(key) ON DELETE CASCADE,
  PRIMARY KEY (ticket_id, tag_key)
);

-- Audit / events
CREATE TABLE IF NOT EXISTS public.support_ticket_events (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id   UUID NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  actor_id    UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  event_type  TEXT NOT NULL,                                     -- created, message_added, assigned, status_changed, tag_added, tag_removed, closed, reopened
  payload     JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------
-- Triggers & functions
-- ---------------------------------------------------------------------

-- Ticket number: SUP-YYYY-#####
CREATE OR REPLACE FUNCTION public.fn_support_ticket_number()
RETURNS TEXT LANGUAGE plpgsql AS $$
DECLARE
  seq BIGINT;
BEGIN
  SELECT nextval('public.support_ticket_seq') INTO seq;
  RETURN 'SUP-' || to_char(NOW(), 'YYYY') || '-' || lpad(seq::text, 5, '0');
END$$;

-- Maintain ticket_number, updated_at, search vector
CREATE OR REPLACE FUNCTION public.fn_support_ticket_bi_bu()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.ticket_number IS NULL THEN
      NEW.ticket_number := public.fn_support_ticket_number();
    END IF;
    NEW.updated_at := NOW();
    NEW.search := setweight(to_tsvector('simple', coalesce(NEW.subject,'')), 'A')
                  || setweight(to_tsvector('simple', coalesce(NEW.description,'')), 'B');
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    NEW.updated_at := NOW();
    NEW.search := setweight(to_tsvector('simple', coalesce(NEW.subject,'')), 'A')
                  || setweight(to_tsvector('simple', coalesce(NEW.description,'')), 'B');
    RETURN NEW;
  END IF;
  RETURN NEW;
END$$;

DROP TRIGGER IF EXISTS trg_support_ticket_bi_bu ON public.support_tickets;
CREATE TRIGGER trg_support_ticket_bi_bu
BEFORE INSERT OR UPDATE ON public.support_tickets
FOR EACH ROW EXECUTE FUNCTION public.fn_support_ticket_bi_bu();

-- When a message is added, bump last_activity and create event
CREATE OR REPLACE FUNCTION public.fn_support_ticket_message_ai()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  UPDATE public.support_tickets
     SET last_activity_at = NEW.created_at
   WHERE id = NEW.ticket_id;

  INSERT INTO public.support_ticket_events (ticket_id, actor_id, event_type, payload, created_at)
  VALUES (NEW.ticket_id, NEW.sender_id, 'message_added',
          jsonb_build_object('message_id', NEW.id, 'is_internal', NEW.is_internal),
          NEW.created_at);
  RETURN NEW;
END$$;

DROP TRIGGER IF EXISTS trg_support_ticket_message_ai ON public.support_ticket_messages;
CREATE TRIGGER trg_support_ticket_message_ai
AFTER INSERT ON public.support_ticket_messages
FOR EACH ROW EXECUTE FUNCTION public.fn_support_ticket_message_ai();

-- Event helper for status changes / assignments
CREATE OR REPLACE FUNCTION public.fn_support_ticket_log(
  p_ticket_id UUID, p_actor_id UUID, p_event TEXT, p_payload JSONB DEFAULT '{}'::jsonb
) RETURNS VOID LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO public.support_ticket_events (ticket_id, actor_id, event_type, payload)
  VALUES (p_ticket_id, p_actor_id, p_event, coalesce(p_payload,'{}'::jsonb));
END$$;

-- Assign helper
CREATE OR REPLACE FUNCTION public.fn_support_assign(
  p_ticket_id UUID, p_assignee_id UUID, p_actor_id UUID
) RETURNS VOID LANGUAGE plpgsql AS $$
DECLARE v_prev UUID;
BEGIN
  SELECT assignee_id INTO v_prev FROM public.support_tickets WHERE id = p_ticket_id FOR UPDATE;
  UPDATE public.support_tickets SET assignee_id = p_assignee_id WHERE id = p_ticket_id;
  PERFORM public.fn_support_ticket_log(p_ticket_id, p_actor_id, 'assigned',
          jsonb_build_object('from', v_prev, 'to', p_assignee_id));
END$$;

-- Status helper
CREATE OR REPLACE FUNCTION public.fn_support_set_status(
  p_ticket_id UUID, p_status TEXT, p_actor_id UUID, p_reason TEXT DEFAULT NULL
) RETURNS VOID LANGUAGE plpgsql AS $$
DECLARE v_prev TEXT;
BEGIN
  IF p_status NOT IN ('open','pending','resolved','closed') THEN
    RAISE EXCEPTION 'Invalid status %', p_status;
  END IF;

  SELECT status INTO v_prev FROM public.support_tickets WHERE id = p_ticket_id FOR UPDATE;

  UPDATE public.support_tickets
     SET status = p_status,
         closed_at = CASE WHEN p_status IN ('resolved','closed') THEN NOW() ELSE NULL END
   WHERE id = p_ticket_id;

  PERFORM public.fn_support_ticket_log(
    p_ticket_id, p_actor_id, 'status_changed',
    jsonb_build_object('from', v_prev, 'to', p_status, 'reason', p_reason)
  );
END$$;

-- Public API: create ticket (by requester)
CREATE OR REPLACE FUNCTION public.fn_support_create_ticket(
  p_requester_id UUID,
  p_subject TEXT,
  p_description TEXT,
  p_category_key TEXT DEFAULT NULL,
  p_priority TEXT DEFAULT 'medium',
  p_initial_message TEXT DEFAULT NULL
) RETURNS UUID LANGUAGE plpgsql AS $$
DECLARE v_id UUID;
BEGIN
  IF p_priority NOT IN ('low','medium','high','urgent') THEN
    RAISE EXCEPTION 'Invalid priority %', p_priority;
  END IF;

  INSERT INTO public.support_tickets (requester_id, subject, description, category_key, priority)
  VALUES (p_requester_id, p_subject, p_description, p_category_key, p_priority)
  RETURNING id INTO v_id;

  PERFORM public.fn_support_ticket_log(v_id, p_requester_id, 'created',
          jsonb_build_object('priority', p_priority, 'category', p_category_key));

  IF p_initial_message IS NOT NULL AND length(btrim(p_initial_message)) > 0 THEN
    INSERT INTO public.support_ticket_messages (ticket_id, sender_id, body, is_internal)
    VALUES (v_id, p_requester_id, p_initial_message, FALSE);
  END IF;

  RETURN v_id;
END$$;

-- ---------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_support_tickets_requester ON public.support_tickets(requester_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_assignee  ON public.support_tickets(assignee_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_status    ON public.support_tickets(status);
CREATE INDEX IF NOT EXISTS idx_support_tickets_priority  ON public.support_tickets(priority);
CREATE INDEX IF NOT EXISTS idx_support_tickets_activity  ON public.support_tickets(last_activity_at DESC);
CREATE INDEX IF NOT EXISTS idx_support_tickets_search    ON public.support_tickets USING GIN (search);
CREATE INDEX IF NOT EXISTS idx_support_tickets_metadata  ON public.support_tickets USING GIN (metadata);

CREATE INDEX IF NOT EXISTS idx_support_messages_ticket   ON public.support_ticket_messages(ticket_id);
CREATE INDEX IF NOT EXISTS idx_support_messages_sender   ON public.support_ticket_messages(sender_id);

-- ---------------------------------------------------------------------
-- Views for UI
-- ---------------------------------------------------------------------

-- Latest message per ticket (for preview/snippet)
DROP VIEW IF EXISTS public.v_support_ticket_latest_message;
CREATE VIEW public.v_support_ticket_latest_message AS
SELECT m.ticket_id,
       m.id        AS message_id,
       left(regexp_replace(m.body, '\s+', ' ', 'g'), 180) AS message_preview,
       m.created_at AS message_created_at,
       m.is_internal
FROM public.support_ticket_messages m
JOIN LATERAL (
  SELECT id FROM public.support_ticket_messages mm
  WHERE mm.ticket_id = m.ticket_id
  ORDER BY mm.created_at DESC
  LIMIT 1
) lm ON lm.id = m.id;

-- Ticket list (joined & summarized)
DROP VIEW IF EXISTS public.v_support_ticket_list;
CREATE VIEW public.v_support_ticket_list AS
SELECT
  t.id,
  t.ticket_number,
  t.status,
  t.priority,
  t.subject,
  t.category_key,
  t.created_at,
  t.updated_at,
  t.last_activity_at,
  req.id   AS requester_id,
  req.email AS requester_email,
  (req.first_name || ' ' || req.last_name) AS requester_name,
  ass.id   AS assignee_id,
  ass.email AS assignee_email,
  (ass.first_name || ' ' || ass.last_name) AS assignee_name,
  COALESCE(lm.message_preview, '') AS latest_message_preview,
  lm.message_created_at
FROM public.support_tickets t
JOIN public.profiles req ON req.id = t.requester_id
LEFT JOIN public.profiles ass ON ass.id = t.assignee_id
LEFT JOIN public.v_support_ticket_latest_message lm ON lm.ticket_id = t.id;

-- Messages thread for a ticket (ordered)
DROP VIEW IF EXISTS public.v_support_ticket_thread;
CREATE VIEW public.v_support_ticket_thread AS
SELECT
  m.ticket_id,
  m.id AS message_id,
  m.body,
  m.is_internal,
  m.attachments,
  m.created_at,
  p.id   AS sender_id,
  p.email AS sender_email,
  (p.first_name || ' ' || p.last_name) AS sender_name
FROM public.support_ticket_messages m
JOIN public.profiles p ON p.id = m.sender_id
ORDER BY m.created_at ASC;

-- ---------------------------------------------------------------------
-- Seed reference data
-- ---------------------------------------------------------------------
-- Categories
INSERT INTO public.support_ticket_categories (key, name, description)
VALUES
  ('billing','Billing & Payments','Invoices, refunds, and payment issues'),
  ('bug','Bug Report','App issues and defects'),
  ('feature','Feature Request','New capability or enhancement'),
  ('account','Account & Access','Login, password, permissions'),
  ('clinical-data','Clinical Data','Assessments, cases, PHI handling'),
  ('other','Other','General inquiries')
ON CONFLICT (key) DO UPDATE
  SET name = EXCLUDED.name, description = EXCLUDED.description, updated_at = NOW();

-- Tags
INSERT INTO public.support_ticket_tags (key, label) VALUES
  ('phq9','PHQ-9'),
  ('gad7','GAD-7'),
  ('appointments','Appointments'),
  ('mobile','Mobile'),
  ('workspace','Workspace')
ON CONFLICT (key) DO UPDATE SET label = EXCLUDED.label;

-- ---------------------------------------------------------------------
-- Sample data wired into your existing profiles & cases
-- (using the same IDs/emails from your seed set)
-- ---------------------------------------------------------------------

-- Look up some known profile IDs by email
WITH actors AS (
  SELECT
    MAX(CASE WHEN email = 'maria.garcia@email.com' THEN id END) AS maria_id,
    MAX(CASE WHEN email = 'sarah.johnson@therapist.com' THEN id END) AS sarah_id,
    MAX(CASE WHEN email = 'emily.rodriguez@therapist.com' THEN id END) AS emily_id,
    MAX(CASE WHEN email = 'chris.brown@email.com' THEN id END) AS chris_id
  FROM public.profiles
),
create_samples AS (
  -- Ticket 1: Maria opens a Billing ticket
  INSERT INTO public.support_tickets (requester_id, assignee_id, category_key, status, priority, subject, description, metadata, created_at)
  SELECT
    maria_id,
    sarah_id,                -- routing to Dr. Sarah for now (use a support profile if available)
    'billing',
    'open',
    'high',
    'Incorrect invoice total for March',
    'Hi team, my March invoice seems to include two sessions that were canceled. Could you review and adjust?',
    '{"source":"app","case_number":"CASE-2024-002"}'::jsonb,
    '2024-03-20 09:10:00'
  FROM actors
  ON CONFLICT (ticket_number) DO NOTHING
  RETURNING id
),
seed_msgs AS (
  INSERT INTO public.support_ticket_messages (ticket_id, sender_id, body, is_internal, created_at)
  SELECT t.id, p.id,
         'Thanks Maria — I''m checking this with billing now. We''ll update the invoice shortly.',
         FALSE, '2024-03-20 10:00:00'
  FROM create_samples t
  JOIN public.profiles p ON p.email = 'sarah.johnson@therapist.com'
  RETURNING 1
)
INSERT INTO public.support_ticket_tag_map (ticket_id, tag_key)
SELECT t.id, x.tag
FROM public.support_tickets t
CROSS JOIN LATERAL (VALUES ('appointments'), ('workspace')) AS x(tag)
WHERE t.subject = 'Incorrect invoice total for March'
ON CONFLICT DO NOTHING;

-- Ticket 2: Christopher reports a bug; Emily replies with internal note then public reply
WITH a AS (
  SELECT
    MAX(CASE WHEN email='chris.brown@email.com' THEN id END)  AS chris_id,
    MAX(CASE WHEN email='emily.rodriguez@therapist.com' THEN id END) AS emily_id
  FROM public.profiles
),
t2 AS (
  INSERT INTO public.support_tickets (requester_id, assignee_id, category_key, status, priority, subject, description, metadata, created_at)
  SELECT chris_id, emily_id, 'bug', 'open', 'medium',
         'Mobile breathing exercise freezes after 5 minutes',
         'The breathing exercise sometimes freezes and the timer stops around minute 5-6.',
         '{"platform":"ios","version":"1.4.2"}'::jsonb, '2024-04-02 12:40:00'
  FROM a
  ON CONFLICT (ticket_number) DO NOTHING
  RETURNING id
),
t2_notes AS (
  INSERT INTO public.support_ticket_messages (ticket_id, sender_id, body, is_internal, created_at)
  SELECT t.id, a.emily_id,
         'Internal: can reproduce on iOS 17.3. Suspect audio session conflict. Creating bug ticket for devs.',
         TRUE, '2024-04-02 13:05:00'
  FROM t2 t CROSS JOIN a
  RETURNING 1
)
INSERT INTO public.support_ticket_messages (ticket_id, sender_id, body, is_internal, created_at)
SELECT t.id, a.emily_id,
       'Thanks for reporting! We''re able to reproduce and are working on a fix. In the meantime, if it freezes, backing out and reopening the exercise should work.',
       FALSE, '2024-04-02 13:20:00'
FROM t2 t CROSS JOIN a
RETURNING 1;

-- ---------------------------------------------------------------------
-- Convenience queries (for your app; keep as comments)
-- ---------------------------------------------------------------------
-- -- List tickets visible to a requester:
-- SELECT * FROM public.v_support_ticket_list
-- WHERE requester_email = 'maria.garcia@email.com'
-- ORDER BY last_activity_at DESC;

-- -- Inbox for an assignee (support/therapist):
-- SELECT * FROM public.v_support_ticket_list
-- WHERE assignee_email = 'sarah.johnson@therapist.com'
--   AND status IN ('open','pending')
-- ORDER BY
--   CASE priority WHEN 'urgent' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 ELSE 4 END,
--   last_activity_at DESC;

-- -- Ticket detail + thread:
-- SELECT * FROM public.v_support_ticket_list WHERE ticket_number = 'SUP-2025-00001';
-- SELECT * FROM public.v_support_ticket_thread WHERE ticket_id = '<uuid>';

COMMIT;
