-- rollback for 20250929_referrals_and_rpcs.sql
-- Drop functions and tables created by the migration if they exist

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'respond_referral_by_client') THEN
    DROP FUNCTION public.respond_referral_by_client(uuid, boolean);
  END IF;
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'respond_referral_by_therapist') THEN
    DROP FUNCTION public.respond_referral_by_therapist(uuid, boolean);
  END IF;
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'create_referral_request') THEN
    DROP FUNCTION public.create_referral_request(uuid, uuid, uuid, text, jsonb);
  END IF;

  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'referral_request_audits') THEN
    DROP TABLE public.referral_request_audits;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'referral_requests') THEN
    DROP TABLE public.referral_requests;
  END IF;
END$$;
