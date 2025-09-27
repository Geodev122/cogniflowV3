-- Create messages table (idempotent)
BEGIN;

CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id UUID, -- optional grouping
  sender_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  recipient_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  body text NOT NULL,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='messages' AND policyname='messages_therapist_manage'
  ) THEN
    CREATE POLICY messages_therapist_manage ON public.messages
      FOR ALL TO authenticated
      USING (sender_id = auth.uid() OR recipient_id = auth.uid())
      WITH CHECK (sender_id = auth.uid() OR recipient_id = auth.uid());
  END IF;
END$$;

COMMIT;
