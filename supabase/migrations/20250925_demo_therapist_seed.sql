-- Demo migration: seed demo data for therapist dashboard modules
-- NOTE: Intended for development/demo only. Not for production.

BEGIN;

-- Create a demo therapist profile (if not exists)
INSERT INTO public.profiles (id, email, first_name, last_name, role, created_at)
SELECT 'demo-therapist-0001', 'demo.therapist@example.com', 'Demo', 'Therapist', 'therapist', now()
WHERE NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = 'demo-therapist-0001');

-- Sample clinic rental
INSERT INTO public.clinic_rentals (id, therapist_id, location, price_per_hour, available_from, available_to, is_active, created_at)
VALUES ('rental-demo-1', 'demo-therapist-0001', 'Demo Clinic, 123 Demo St', 25.00, now(), now() + interval '30 days', true, now())
ON CONFLICT (id) DO NOTHING;

-- VIP opportunity
INSERT INTO public.vip_offers (id, title, body, cta_label, cta_url, target_audience, expires_on, is_active, created_at)
VALUES ('vip-demo-1', 'Demo Supervision Group', 'Monthly supervision sample', 'Join', 'https://example.com', ARRAY['therapist'], now() + interval '90 days', true, now())
ON CONFLICT (id) DO NOTHING;

-- Continuing education resource
INSERT INTO public.resources (id, title, provider, hours, description, url, content_type, category, created_at)
VALUES ('ce-demo-1', 'Demo CBT Refresher', 'Demo Provider', 4, 'Short refresher on CBT practices', 'https://example.com/ce', 'course', 'educational', now())
ON CONFLICT (id) DO NOTHING;

-- Enroll demo therapist to CE
INSERT INTO public.ce_enrollments (id, course_id, user_id, created_at)
VALUES ('ceenroll-demo-1', 'ce-demo-1', 'demo-therapist-0001', now())
ON CONFLICT (id) DO NOTHING;

-- Mark completion (credits)
INSERT INTO public.ce_completions (id, therapist_id, course_id, hours, completed_at)
VALUES ('cecomp-demo-1', 'demo-therapist-0001', 'ce-demo-1', 4, now())
ON CONFLICT (id) DO NOTHING;

COMMIT;
