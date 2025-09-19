
CREATE TABLE "public"."assessment_library" (
    "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
    "name" text NOT NULL,
    "description" text,
    "questions" jsonb,
    "created_at" timestamp with time zone NOT NULL DEFAULT now(),
    "updated_at" timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE "public"."assessment_library" OWNER TO "postgres";

ALTER TABLE ONLY "public"."assessment_library"
    ADD CONSTRAINT "assessment_library_pkey" PRIMARY KEY ("id");

ALTER TABLE "public"."assessment_library" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow therapists to read all assessments" ON "public"."assessment_library" FOR SELECT TO "authenticated" USING (
  (
    (
      SELECT
        profiles.role
      FROM
        profiles
      WHERE
        (profiles.id = auth.uid())
    ) = 'therapist'::text
  )
);

CREATE POLICY "Allow users to read their own assessments" ON "public"."assessment_library" FOR SELECT TO "authenticated" USING (
  (
    auth.uid() IN (
      SELECT
        assessment_instances.user_id
      FROM
        assessment_instances
      WHERE
        (assessment_instances.assessment_id = assessment_library.id)
    )
  )
);
