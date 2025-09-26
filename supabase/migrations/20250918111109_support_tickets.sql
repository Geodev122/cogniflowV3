/* Archived: original content moved to supabase/migrations/archived/20250918111109_support_tickets.sql */

-- File archived on 2025-09-20. See archived copy for full content.
  metadata         JSONB NOT NULL DEFAULT '{}'::jsonb,
  last_activity_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  closed_at        TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  search           tsvector
);

CREATE TABLE IF NOT EXISTS public.support_ticket_messages (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id   UUID NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  sender_id   UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  body        TEXT NOT NULL,
  is_internal BOOLEAN NOT NULL DEFAULT FALSE,
  attachments JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.support_ticket_watchers (
  ticket_id  UUID NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  added_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (ticket_id, profile_id)
);

CREATE TABLE IF NOT EXISTS public.support_ticket_tag_map (
  ticket_id UUID NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  tag_key   TEXT NOT NULL REFERENCES public.support_ticket_tags(key) ON DELETE CASCADE,
  PRIMARY KEY (ticket_id, tag_key)
);

CREATE TABLE IF NOT EXISTS public.support_ticket_events (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id  UUID NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  actor_id   UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,                     -- created, message_added, assigned, status_changed, ...
  payload    JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------
-- Functions & triggers
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_support_ticket_number()
RETURNS TEXT LANGUAGE plpgsql AS $$
DECLARE seq BIGINT;
BEGIN
  SELECT nextval('public.support_ticket_seq') INTO seq;
  RETURN 'SUP-' || to_char(NOW(),'YYYY') || '-' || lpad(seq::text,5,'0');
END$$;

CREATE OR REPLACE FUNCTION public.fn_support_ticket_bi_bu()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.ticket_number IS NULL THEN
      NEW.ticket_number := public.fn_support_ticket_number();
    END IF;
  END IF;
  NEW.updated_at := NOW();
  NEW.search := setweight(to_tsvector('simple', coalesce(NEW.subject,'')), 'A')
             || setweight(to_tsvector('simple', coalesce(NEW.description,'')), 'B');
  RETURN NEW;
END$$;

DROP TRIGGER IF EXISTS trg_support_ticket_bi_bu ON public.support_tickets;
CREATE TRIGGER trg_support_ticket_bi_bu
BEFORE INSERT OR UPDATE ON public.support_tickets
FOR EACH ROW EXECUTE FUNCTION public.fn_support_ticket_bi_bu();

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

CREATE OR REPLACE FUNCTION public.fn_support_ticket_log(
  p_ticket_id UUID, p_actor_id UUID, p_event TEXT, p_payload JSONB DEFAULT '{}'::jsonb
) RETURNS VOID LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO public.support_ticket_events (ticket_id, actor_id, event_type, payload)
  VALUES (p_ticket_id, p_actor_id, p_event, coalesce(p_payload,'{}'::jsonb));
END$$;

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
CREATE INDEX IF NOT EXISTS idx_support_tickets_activity  ON public.support_tickets(last_activity_at);
CREATE INDEX IF NOT EXISTS idx_support_tickets_search    ON public.support_tickets USING GIN (search);
CREATE INDEX IF NOT EXISTS idx_support_tickets_metadata  ON public.support_tickets USING GIN (metadata);

CREATE INDEX IF NOT EXISTS idx_support_messages_ticket   ON public.support_ticket_messages(ticket_id);
CREATE INDEX IF NOT EXISTS idx_support_messages_sender   ON public.support_ticket_messages(sender_id);

-- ---------------------------------------------------------------------
-- Views
-- ---------------------------------------------------------------------
DROP VIEW IF EXISTS public.v_support_ticket_latest_message;
CREATE VIEW public.v_support_ticket_latest_message AS
SELECT m.ticket_id,
       m.id AS message_id,
       left(regexp_replace(m.body, '\s+', ' ', 'g'), 180) AS message_preview,
       m.created_at AS message_created_at,
       m.is_internal
FROM public.support_ticket_messages m
JOIN LATERAL (
  SELECT id
  FROM public.support_ticket_messages mm
  WHERE mm.ticket_id = m.ticket_id
  ORDER BY mm.created_at DESC
  LIMIT 1
) lm ON lm.id = m.id;

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
  req.id    AS requester_id,
  req.email AS requester_email,
  (req.first_name || ' ' || req.last_name) AS requester_name,
  ass.id    AS assignee_id,
  ass.email AS assignee_email,
  (ass.first_name || ' ' || ass.last_name) AS assignee_name,
  COALESCE(lm.message_preview, '') AS latest_message_preview,
  lm.message_created_at
FROM public.support_tickets t
JOIN public.profiles req ON req.id = t.requester_id
LEFT JOIN public.profiles ass ON ass.id = t.assignee_id
LEFT JOIN public.v_support_ticket_latest_message lm ON lm.ticket_id = t.id;

DROP VIEW IF EXISTS public.v_support_ticket_thread;
CREATE VIEW public.v_support_ticket_thread AS
SELECT
  m.ticket_id,
  m.id AS message_id,
  m.body,
  m.is_internal,
  m.attachments,
  m.created_at,
  p.id    AS sender_id,
  p.email AS sender_email,
  (p.first_name || ' ' || p.last_name) AS sender_name
FROM public.support_ticket_messages m
JOIN public.profiles p ON p.id = m.sender_id
ORDER BY m.created_at ASC;

-- ---------------------------------------------------------------------
-- Seed reference data
-- ---------------------------------------------------------------------
INSERT INTO public.support_ticket_categories (key, name, description) VALUES
  ('billing','Billing & Payments','Invoices, refunds, and payment issues'),
  ('bug','Bug Report','App issues and defects'),
  ('feature','Feature Request','New capability or enhancement'),
  ('account','Account & Access','Login, password, permissions'),
  ('clinical-data','Clinical Data','Assessments, cases, PHI handling'),
  ('other','Other','General inquiries')
ON CONFLICT (key) DO UPDATE
  SET name = EXCLUDED.name, description = EXCLUDED.description, updated_at = NOW();

INSERT INTO public.support_ticket_tags (key, label) VALUES
  ('phq9','PHQ-9'),
  ('gad7','GAD-7'),
  ('appointments','Appointments'),
  ('mobile','Mobile'),
  ('workspace','Workspace')
ON CONFLICT (key) DO UPDATE SET label = EXCLUDED.label;

-- ---------------------------------------------------------------------
-- Helper: safe profile pickers (avoid NULLs)
-- ---------------------------------------------------------------------
-- Grabs a profile id by email; falls back to a client, then therapist, then any profile.
CREATE OR REPLACE FUNCTION public.fn_pick_profile_id(p_email TEXT, p_role_hint TEXT DEFAULT NULL)
RETURNS UUID LANGUAGE sql STABLE AS $$
  WITH by_email AS (
    SELECT id FROM public.profiles WHERE email = p_email LIMIT 1
  ), by_role AS (
    SELECT id FROM public.profiles
     WHERE ($2 IS NULL OR role = $2)
     ORDER BY created_at
     LIMIT 1
  ), any_profile AS (
    SELECT id FROM public.profiles ORDER BY created_at LIMIT 1
  )
  SELECT id FROM by_email
  UNION ALL
  SELECT id FROM by_role WHERE NOT EXISTS (SELECT 1 FROM by_email)
  UNION ALL
  SELECT id FROM any_profile WHERE NOT EXISTS (SELECT 1 FROM by_email)
                              AND NOT EXISTS (SELECT 1 FROM by_role)
  LIMIT 1;
$$;

-- ---------------------------------------------------------------------
-- Idempotent sample tickets (now with safe fallbacks)
-- ---------------------------------------------------------------------

-- Ticket 1: Billing question from Maria -> assigned to Sarah
WITH ids AS (
  SELECT
    public.fn_pick_profile_id('maria.garcia@email.com', 'client')  AS req_id,
    public.fn_pick_profile_id('sarah.johnson@therapist.com','therapist') AS asg_id
),
ins_ticket AS (
  INSERT INTO public.support_tickets (requester_id, assignee_id, category_key, status, priority, subject, description, metadata, created_at)
  SELECT req_id, asg_id, 'billing', 'open', 'high',
         'Incorrect invoice total for March',
         'Hi team, my March invoice seems to include two sessions that were canceled. Could you review and adjust?',
         '{"source":"app","case_number":"CASE-2024-002"}'::jsonb,
         '2024-03-20 09:10:00'
  FROM ids
  WHERE (SELECT req_id FROM ids) IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM public.support_tickets t
      WHERE t.subject = 'Incorrect invoice total for March'
        AND t.requester_id = (SELECT req_id FROM ids)
    )
  RETURNING id
),
the_ticket AS (
  SELECT id FROM ins_ticket
  UNION ALL
  SELECT id FROM public.support_tickets
  WHERE subject = 'Incorrect invoice total for March'
    AND requester_id = public.fn_pick_profile_id('maria.garcia@email.com','client')
)
INSERT INTO public.support_ticket_messages (ticket_id, sender_id, body, is_internal, created_at)
SELECT t.id, public.fn_pick_profile_id('sarah.johnson@therapist.com','therapist'),
       'Thanks Maria — I''m checking this with billing now. We''ll update the invoice shortly.',
       FALSE, '2024-03-20 10:00:00'
FROM the_ticket t
WHERE NOT EXISTS (
  SELECT 1 FROM public.support_ticket_messages m
  WHERE m.ticket_id = t.id
    AND m.body LIKE 'Thanks Maria — I''m checking this with billing now.%'
);

-- Tag the ticket (idempotent)
WITH t AS (
  SELECT id FROM public.support_tickets
  WHERE subject = 'Incorrect invoice total for March'
)
INSERT INTO public.support_ticket_tag_map (ticket_id, tag_key)
SELECT t.id, x.tag
FROM t
CROSS JOIN (VALUES ('appointments'), ('workspace')) AS x(tag)
ON CONFLICT DO NOTHING;

-- Ticket 2: Bug report from Chris -> internal note + public reply by Emily
WITH ids AS (
  SELECT
    public.fn_pick_profile_id('chris.brown@email.com','client')  AS req_id,
    public.fn_pick_profile_id('emily.rodriguez@therapist.com','therapist') AS asg_id
),
ins_ticket AS (
  INSERT INTO public.support_tickets (requester_id, assignee_id, category_key, status, priority, subject, description, metadata, created_at)
  SELECT req_id, asg_id, 'bug', 'open', 'medium',
         'Mobile breathing exercise freezes after 5 minutes',
         'The breathing exercise sometimes freezes and the timer stops around minute 5-6.',
         '{"platform":"ios","version":"1.4.2"}'::jsonb,
         '2024-04-02 12:40:00'
  FROM ids
  WHERE (SELECT req_id FROM ids) IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM public.support_tickets t
      WHERE t.subject = 'Mobile breathing exercise freezes after 5 minutes'
        AND t.requester_id = (SELECT req_id FROM ids)
    )
  RETURNING id
),
the_ticket AS (
  SELECT id FROM ins_ticket
  UNION ALL
  SELECT id FROM public.support_tickets
  WHERE subject = 'Mobile breathing exercise freezes after 5 minutes'
    AND requester_id = public.fn_pick_profile_id('chris.brown@email.com','client')
)
-- internal note (only once)
INSERT INTO public.support_ticket_messages (ticket_id, sender_id, body, is_internal, created_at)
SELECT t.id, public.fn_pick_profile_id('emily.rodriguez@therapist.com','therapist'),
       'Internal: can reproduce on iOS 17.3. Suspect audio session conflict. Creating bug ticket for devs.',
       TRUE, '2024-04-02 13:05:00'
FROM the_ticket t
WHERE NOT EXISTS (
  SELECT 1 FROM public.support_ticket_messages m
  WHERE m.ticket_id = t.id
    AND m.is_internal = TRUE
    AND m.body LIKE 'Internal: can reproduce on iOS 17.3.%'
);

-- public reply (only once)
WITH t AS (
  SELECT id FROM public.support_tickets
  WHERE subject = 'Mobile breathing exercise freezes after 5 minutes'
),
sender AS (
  SELECT public.fn_pick_profile_id('emily.rodriguez@therapist.com','therapist') AS emily_id
)
INSERT INTO public.support_ticket_messages (ticket_id, sender_id, body, is_internal, created_at)
SELECT t.id, s.emily_id,
       'Thanks for reporting! We''re able to reproduce and are working on a fix. In the meantime, if it freezes, backing out and reopening the exercise should work.',
       FALSE, '2024-04-02 13:20:00'
FROM t CROSS JOIN sender s
WHERE s.emily_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.support_ticket_messages m
    WHERE m.ticket_id = t.id
      AND m.is_internal = FALSE
      AND m.body LIKE 'Thanks for reporting! We''re able to reproduce%'
  );

COMMIT;
