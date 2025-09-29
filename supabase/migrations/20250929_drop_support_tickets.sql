-- Idempotent migration to drop support ticket related schema
-- Generated: 2025-09-29

-- Acquire an advisory lock to serialize this migration run and avoid relation deadlocks
-- Uses a stable 64-bit key. Adjust if you have other migrations that also use advisory locks.
SELECT pg_advisory_lock(1234567890123456789);

-- Drop triggers safely
DROP TRIGGER IF EXISTS trg_support_ticket_message_ai ON public.support_ticket_messages;
DROP TRIGGER IF EXISTS trg_support_ticket_bi_bu ON public.support_tickets;

-- Drop views
DROP VIEW IF EXISTS public.v_support_ticket_thread;
DROP VIEW IF EXISTS public.v_support_ticket_list;
DROP VIEW IF EXISTS public.v_support_ticket_latest_message;

-- Drop tables (order: dependents first)
-- Drop tables (dependents first). Use CASCADE to ensure any remaining dependents are removed.
-- Drop tables (dependents first). To avoid deadlocks, wait for other sessions to release locks
DO $$
DECLARE
	tbl TEXT;
	rec RECORD;
	rel_oid OID;
	other_locks INT;
	tries INT;
	max_tries INT := 120; -- roughly 60s with 0.5s sleep
BEGIN
		FOR rec IN
			SELECT vname FROM (VALUES
				('public.support_ticket_tag_map'),
				('public.support_ticket_watchers'),
				('public.support_ticket_messages'),
				('public.support_ticket_events'),
				('public.support_tickets'),
				('public.support_ticket_tags'),
				('public.support_ticket_categories')
			) AS v(vname)
		LOOP
			tbl := rec.vname;

		-- skip if the relation does not exist
		IF to_regclass(tbl) IS NULL THEN
			CONTINUE;
		END IF;

		rel_oid := (to_regclass(tbl))::oid;
		tries := 0;

		LOOP
			SELECT count(*) INTO other_locks
			FROM pg_locks l
			WHERE l.relation = rel_oid
				AND l.granted
				AND l.pid <> pg_backend_pid();

			IF other_locks = 0 THEN
				-- safe to drop
				EXECUTE format('DROP TABLE IF EXISTS %s CASCADE', tbl);
				EXIT;
			END IF;

			tries := tries + 1;
			IF tries >= max_tries THEN
				RAISE EXCEPTION 'Timeout waiting to drop % — other sessions hold locks', tbl;
			END IF;
			PERFORM pg_sleep(0.5);
		END LOOP;
	END LOOP;
END$$ LANGUAGE plpgsql;

-- Drop sequence used for ticket numbers if present
DROP SEQUENCE IF EXISTS public.support_ticket_seq;

-- Drop functions (match signatures from original migration)
DROP FUNCTION IF EXISTS public.fn_support_ticket_number();
DROP FUNCTION IF EXISTS public.fn_support_ticket_bi_bu();
DROP FUNCTION IF EXISTS public.fn_support_ticket_message_ai();
DROP FUNCTION IF EXISTS public.fn_support_ticket_log(uuid, uuid, text, jsonb);
DROP FUNCTION IF EXISTS public.fn_support_assign(uuid, uuid, uuid);
DROP FUNCTION IF EXISTS public.fn_support_set_status(uuid, text, uuid, text);
DROP FUNCTION IF EXISTS public.fn_support_create_ticket(uuid, text, text, text, text, text);
DROP FUNCTION IF EXISTS public.fn_pick_profile_id(text, text);

-- Release advisory lock
SELECT pg_advisory_unlock(1234567890123456789);
