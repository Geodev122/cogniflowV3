
## Deployment, logs and proxy rules (examples)

This section provides quick recipes to deploy the functions, check logs, and examples of how to strip the problematic `Role` header at several layers (edge CDN, reverse proxy, or application). Use the one that matches your environment.

### Deploying Supabase Edge Functions
- If you use the Supabase dashboard, upload or edit the function there and deploy.
- If you use the Supabase CLI (recommended for local/dev):
  - Install the CLI and login: `supabase login`
  - From the repository root where `supabase/` lives run:

```bash
supabase functions deploy whish-payment --project-ref <YOUR_PROJECT_REF>
supabase functions deploy admin-payment-request --project-ref <YOUR_PROJECT_REF>
# ...deploy other functions as needed
```

- Check function logs in the Supabase dashboard (Functions → Logs) or via CLI if supported.

### Viewing logs
- Supabase dashboard: navigate to Functions → select the function → Logs. Search for `incoming headers` and `Detected role-like header`.
- If you have centralized logging (Datadog / CloudWatch / Papertrail), configure your provider to ingest logs from the functions or the deploy environment.

### Cloudflare Worker example (strip header at edge)
If you host behind Cloudflare or use Cloudflare Workers, use a tiny Worker to remove role-like headers before proxying to your backend:

```js
addEventListener('fetch', event => {
  const req = event.request
  const headers = new Headers(req.headers)
  headers.delete('role')
  headers.delete('Role')
  headers.delete('x-postgrest-role')
  const forwarded = new Request(req.url, {
    method: req.method,
    headers: headers,
    body: req.body,
    redirect: 'follow'
  })
  event.respondWith(fetch(forwarded))
})
```

Deploy it as a Worker that sits in front of your Supabase endpoints/functions.

### NGINX reverse proxy example (strip header)
If you run an NGINX reverse proxy, you can clear the header when proxying requests:

```
location / {
    proxy_pass https://your-supabase-host;
    # Clear incoming header values so they don't reach upstream
    proxy_set_header Role "";
    proxy_set_header X-Postgrest-Role "";
    proxy_set_header role "";
    proxy_hide_header Role;
    proxy_hide_header X-Postgrest-Role;
}
```

This sets those headers to empty strings when proxying. Restart NGINX after updating the config.

### Netlify / Vercel / CDN edge examples
- Netlify: use a Netlify Edge Function to delete headers (similar to Cloudflare Worker approach). Netlify's `_headers` file controls response headers, not incoming request headers — you need an Edge Function to mutate the request.
- Vercel: write an Edge Middleware (Edge API Route) to remove the headers and forward the request.

### Express (app-level) middleware example
If you control a Node/Express gateway in front of Supabase, add a middleware early:

```js
app.use((req, res, next) => {
  delete req.headers.role
  delete req.headers['x-postgrest-role']
  next()
})
```

### Quick curl test (simulate problematic header)
From your terminal, send a request with a `Role: therapist` header to the function endpoint to reproduce and confirm diagnostics in logs:

```bash
curl -v -X POST 'https://<YOUR_SUPABASE_FUNCTION_URL>/whish-payment' \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer <token>' \
  -H 'Role: therapist' \
  -d '{"planId":"plan_xyz","userEmail":"you@example.com","userPhone":"555-0101"}'
```

Then check the function logs for `incoming headers` lines.

### Optional DB mitigation (again: not recommended long-term)
If you absolutely cannot remove the header at the edge quickly, the optional migration `supabase/migrations/20250920_add_therapist_db_role.sql` creates a DB role named `therapist` (NOLOGIN). This prevents Postgres from rejecting `SET ROLE 'therapist'`. Use with caution and remove once the header source is mitigated.

To apply via psql:

```sql
-- run in psql connected as a superuser
\i ./supabase/migrations/20250920_add_therapist_db_role.sql
```

Rollback migration (manual):
```sql
DROP ROLE IF EXISTS therapist;
```

### Reverting the function-level changes
- If you want to revert diagnostic logs and `safeFetch` wrappers, revert the commits/changes affecting `supabase/functions/*`. The changes were intentionally minimal and reversible.

## Troubleshooting
- If you don't see logs: ensure your function is deployed with the updated code and that you're checking logs for the correct function name and project.
- If `Role` header appears client-side (Network tab) and not server-side logs, it may be injected by a browser extension or a corporate proxy — check other machines or disable extensions.

If you'd like, I can:
- Provide a ready-to-deploy Cloudflare Worker or NGINX patch specific to your hosting provider.
- Create a small test harness script that sends a `Role` header and fetches logs to automate verification.

