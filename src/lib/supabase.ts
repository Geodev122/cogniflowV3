// src/lib/supabase.ts
import { createClient, type PostgrestError } from '@supabase/supabase-js'
// NOTE: `src/types/database.ts` is intentionally left empty in some dev setups
// (types generated from Supabase may be missing). Using a generic here tightly
// couples the client to that generated type; when it's empty it causes dozens
// of type errors across the app. To keep DX smooth for local development
// without the generated `Database` type, we avoid passing the generic and
// allow the client to infer `any` for table operations. If you generate
// `src/types/database.ts` (via supabase gen types), you can replace
// `createClient<any>` with `createClient<Database>` and re-enable strict typing.

// Pull from Vite env (client-safe)
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    '[supabase] Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY. ' +
      'Create a .env file based on .env.example and restart dev server.'
  )
}

/**
 * Defensive safeFetch wrapper for browser client: strip role-like headers
 */
const safeFetch = (input: RequestInfo, init?: RequestInit) => {
  const nextInit: RequestInit = { ...(init || {}) }
  const headers = new Headers(nextInit.headers as HeadersInit)

  // Aggressively remove any role-like headers injected by extensions/proxies
  // that could cause PostgREST to attempt SET ROLE '<role>' and fail when
  // that DB role does not exist (common in preview/proxy environments).
  // Remove common variants and any header that looks like a PostgREST role header.
  const toDelete: string[] = []
  headers.forEach((v, k) => {
    const lk = k.toLowerCase()
    if (
      lk === 'role' ||
      lk === 'x-postgrest-role' ||
      lk === 'x-role' ||
      lk.includes('postgrest-role') ||
      lk.includes('user-role') ||
      lk.includes('supabase-role') ||
      /role/i.test(lk)
    ) {
      toDelete.push(k)
    }
  })
  toDelete.forEach(h => headers.delete(h))

  // Set a conservative default PostgREST role for browser requests. This prevents
  // PostgREST from trying to SET ROLE to custom DB roles (like 'therapist') that
  // may not exist in the target environment. If you have an edge/proxy that
  // must forward a role, handle it server-side where you control roles.
  if (!headers.has('x-postgrest-role')) headers.set('x-postgrest-role', 'authenticated')

  if (toDelete.length && import.meta.env.DEV) {
    console.warn('[safeFetch] removed role-like headers:', toDelete, 'for request', input)
    try { console.debug('[safeFetch] remaining headers:', Array.from(headers.entries())) } catch (_) {}
  }

  nextInit.headers = headers
  return fetch(input, nextInit)
}

/**
 * Singleton Supabase browser client.
 * - PKCE flow for SPA
 * - Persist session in storage, auto-refresh enabled
 */
export const supabase = createClient<any>(supabaseUrl, supabaseAnonKey, {
  fetch: safeFetch,
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    flowType: 'pkce',
    debug: import.meta.env.DEV, // Enable debug logging in development
  },
  global: {
    headers: {
      'X-Client-Info': 'thera-py-web',
      // Default PostgREST role for client requests. This avoids PostgREST trying
      // to set a DB role like 'therapist' which might not exist in some envs
      // and would cause errors like "role \"therapist\" does not exist".
      'x-postgrest-role': 'authenticated'
    },
  },
})

/**
 * onAuthStateChange passthrough so callers can unsubscribe easily.
 * Usage:
 *   const { data: sub } = onAuthStateChange((event, session) => {...})
 *   return () => sub.subscription.unsubscribe()
 */
export const onAuthStateChange = supabase.auth.onAuthStateChange.bind(supabase.auth)

/**
 * Small helpers to normalize Supabase error handling across the app.
 * Never return { data, error } pairs to components.
 */

// Many rows helper
export async function expectMany<T>(
  p: Promise<{ data: T[] | null; error: PostgrestError | null; count?: number | null }>
): Promise<{ rows: T[]; count?: number | null }> {
  const { data, error, count } = await p
  if (error) throw normalizePgError(error)
  return { rows: data ?? [], count: count ?? null }
}

// Single row helper
export async function expectOne<T>(
  p: Promise<{ data: T | null; error: PostgrestError | null }>
): Promise<T> {
  const { data, error } = await p
  if (error) throw normalizePgError(error)
  if (!data) throw new Error('Not found')
  return data
}

// Generic run helper (for inserts/updates/deletes that return data or null)
export async function run<T>(
  p: Promise<{ data: T | null; error: PostgrestError | null }>
): Promise<T | null> {
  const { data, error } = await p
  if (error) throw normalizePgError(error)
  return data ?? null
}

function normalizePgError(error: PostgrestError): Error {
  const msg = `[supabase] ${error.code ?? 'ERR'}: ${error.message}`
  const e = new Error(msg)
  ;(e as any).hint = error.hint
  ;(e as any).details = error.details
  return e
}
