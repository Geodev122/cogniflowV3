Optional DB role mitigation and diagnostics

When you see runtime errors like: role "therapist" does not exist

Possible causes:
- A request header (for example `x-postgrest-role` or `Role`) was injected by a browser extension, proxy, or CDN. PostgREST will interpret these as a SET ROLE instruction and fail if the role doesn't exist.
- A server-side function or migration attempted to SET ROLE to an application-level role.

Recommended steps (in order):
1. Reproduce the failing request and capture request headers:
   - Open DevTools -> Network -> select failing request -> Headers -> copy Request Headers and paste them here.
   - Test in an incognito/private window with extensions disabled. If the header disappears, a browser extension was the cause.

2. Run the migration(s) after applying the updated migration that tolerates missing CREATE ROLE privileges.
   - If your DB user can't create roles (managed providers), the migration will now log a NOTICE and continue.

3. If the header is injected by an upstream proxy/CDN, remove the header at the edge. If that's not immediately possible, you may apply the optional `20250920_add_therapist_db_role.sql` to create a NOLOGIN role named `therapist` as a short-term mitigation.
   - Note: Creating DB roles should be a last resort for multi-tenant/managed systems. Prefer removing the harmful header.

4. If the error persists after step 1/2, collect the full SQL error output from psql or Supabase SQL editor and paste it here (do not redact). This will allow targeted fixes to any failing migration statements.

If you want, paste the failing request headers here and I'll analyze them and propose the minimal fix (client-side header-stripper vs migration-based mitigation).