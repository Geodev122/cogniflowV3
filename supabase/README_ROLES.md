# Roles & Profiles (Thera-Py)

This document explains the role model, RLS policies and deployment steps added in `20250927_add_roles_and_profiles.sql`.

Core model
- `public.roles` (optional normalization): seeded with Therapist, Client, Supervisor, Admin.
- `public.profiles`: authoritative per-user row. Fields:
  - `id` bigint identity
  - `user_id` uuid references `auth.users(id)`
  - `user_role` text in (Therapist, Client, Supervisor, Admin)
  - `created_at` timestamptz

Design notes
- Profiles are the single source of truth for role-based access.
- `user_roles` is provided if you later support multiple roles per user.
- We enable RLS on `profiles` and create explicit policies so DB enforces access.

Helper functions
- `public.get_user_role()` returns the role for `auth.uid()` and can be used in policy USING/WITH CHECK.

Signup & triggers
- A trigger `trg_create_profile_on_auth_user` is attached to `auth.users` to create a default `profiles` row (Client) when a new user is created. Review and restrict it if you need different defaults.

Backfill plan
1. Run the backfill query (manual):
   ```sql
   INSERT INTO public.profiles (user_id, user_role)
   SELECT u.id, 'Client' FROM auth.users u LEFT JOIN public.profiles p ON p.user_id = u.id WHERE p.user_id IS NULL;
   ```
2. Generate a CSV of users with no inferred role for manual review:
   ```sql
   SELECT u.id as auth_user_id, u.email, u.raw_user_meta_data
   FROM auth.users u
   LEFT JOIN public.profiles p ON p.user_id = u.id
   WHERE p.user_id IS NULL;
   ```

RLS policy verification checklist
- Ensure that for each role you test SELECT/INSERT/UPDATE/DELETE on `profiles` and user-owned tables.
- Admins should be able to manage roles; regular users must not be able to escalate themselves.

Deployment steps
1. Review migration `supabase/migrations/20250927_add_roles_and_profiles.sql` in staging.
2. Run migration using `supabase db query --file ...` or `psql` with a service role connection.
3. Run the backfill query (staging) and verify results.
4. Test auth flows, sign-up, and role-restricted pages.

Required approvals
- Decide role default for signups (currently 'Client').
- Decide whether admin-only UI should allow role assignments and who can do it.

Tests to add (integration/unit)
- Ensure signup flow creates `profiles` row with proper `user_role`.
- Simulate a Therapist user cannot access Admin routes.
- Simulate Admin can read/update any `profiles` row.
