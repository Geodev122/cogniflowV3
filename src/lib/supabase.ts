// src/lib/supabase.ts
import { createClient, type PostgrestError } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

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
  headers.delete('role')
  headers.delete('Role')
  headers.delete('x-postgrest-role')
  nextInit.headers = headers
  return fetch(input, nextInit)
}

/**
 * Singleton Supabase browser client.
 * - PKCE flow for SPA
 * - Persist session in storage, auto-refresh enabled
 */
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
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
