// src/hooks/useAuth.ts
import { useState, useEffect, useCallback } from 'react'
import type { User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'

type AppRole = 'therapist' | 'client' | 'admin' | 'supervisor'

interface Profile {
  id: string
  role: AppRole
  first_name: string
  last_name: string
  email: string
  whatsapp_number?: string | null
  professional_details?: any | null
  verification_status?: string | null
}

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const buildFallbackProfile = (u: User): Profile => ({
    id: u.id,
  // Prefer role present in user_metadata (JWT custom claim) if available (case-insensitive)
  // Normalize to lowercase to match DB values like 'therapist'/'client'
  role: (((u.user_metadata && ((u.user_metadata as any).role || (u.user_metadata as any).user_role)) || 'client') as string).toLowerCase() as AppRole,
    first_name: (u.user_metadata && ((u.user_metadata as any).first_name || (u.user_metadata as any).given_name)) || 'User',
    last_name: (u.user_metadata && ((u.user_metadata as any).last_name || (u.user_metadata as any).family_name)) || '',
    email: u.email || (u.user_metadata && (u.user_metadata as any).email) || '',
    whatsapp_number: null,
    professional_details: null,
    verification_status: null,
  })

  const fetchProfile = useCallback(async (u: User) => {
    try {
      // First try DB
      // profiles table uses a separate identity PK; query by user_id
      const { data, error: dbErr } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', u.id)
        .maybeSingle()

      if (dbErr) {
        // log and continue to fallback
        console.warn('[useAuth] profiles query error; using auth metadata fallback', dbErr)
      }

      if (data) {
        // normalize DB shape to expected Profile (tolerant to differing column names)
        const p = data as any
        const roleVal = (p.user_role || p.role || p.role_name || p.userRole || '').toString()
        // Normalize to lowercase values used in the DB (therapist/client/…)
        const normalizedRole = roleVal
          ? (['therapist', 'client', 'admin', 'supervisor'].find(r => r.toLowerCase() === roleVal.toLowerCase()) || roleVal.toLowerCase())
          : 'client'
        setProfile({
          id: String(p.id),
          role: normalizedRole as AppRole,
          first_name: p.first_name || p.given_name || '',
          last_name: p.last_name || p.family_name || '',
          email: p.email || u.email || '',
          whatsapp_number: p.whatsapp_number || null,
          professional_details: p.professional_details || null,
          verification_status: p.verification_status || null,
        })
        setError(null)
        return
      }

  // If profile missing, try to use JWT custom claim role first, else fallback to defaults
  setProfile(buildFallbackProfile(u))
      setError(null)
    } catch (e) {
      console.error('[useAuth] fetchProfile error', e)
      setProfile(buildFallbackProfile(u)) // still give a usable profile
      setError(null)
    }
  }, [])

  useEffect(() => {
    let mounted = true

    const initializeAuth = async () => {
      try {
        setError(null)
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
        if (!mounted) return

        if (sessionError) {
          console.error('[useAuth] session error:', sessionError)
          setError('Failed to get session')
          setUser(null)
          setProfile(null)
          setLoading(false)
          return
        }

        const sessionUser: User | null = sessionData?.session?.user ?? null
        if (sessionUser) {
          setUser(sessionUser)
          await fetchProfile(sessionUser)
        } else {
          setUser(null)
          setProfile(null)
        }
      } catch (e) {
        console.error('[useAuth] initializeAuth error', e)
        if (mounted) {
          setError(`Authentication error: ${e instanceof Error ? e.message : 'Unknown error'}`)
          setUser(null)
          setProfile(null)
        }
      } finally {
        if (mounted) setLoading(false)
      }
    }

    initializeAuth()

    // Listen for auth changes
    let debounce: number | undefined
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return
      window.clearTimeout(debounce)
      debounce = window.setTimeout(async () => {
        try {
          setError(null)
          if (session?.user) {
            setUser(session.user)
            await fetchProfile(session.user)
          } else {
            setUser(null)
            setProfile(null)
          }
        } catch (e) {
          console.error('[useAuth] onAuthStateChange error', e)
          setError(`Auth state change error: ${e instanceof Error ? e.message : 'Unknown error'}`)
        }
      }, 120)
    })

    return () => {
      mounted = false
      if (debounce) window.clearTimeout(debounce)
      sub.subscription.unsubscribe()
    }
  }, [fetchProfile])

  const signIn = async (email: string, password: string) => {
    setError(null)
    setLoading(true)
    try {
      const { error: e } = await supabase.auth.signInWithPassword({ email, password })
      if (e) throw e
    } catch (e) {
      setLoading(false)
      throw e
    }
  }

  const signUp = async (
    email: string,
    password: string,
    firstName: string,
    lastName: string,
    role: AppRole | string
  ) => {
    setError(null)
    setLoading(true)
    try {
      const { data, error: e } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { first_name: firstName, last_name: lastName, role } }
      })
      if (e) throw e

      if (data.user) {
        // Insert authoritative profile row. Use user_id reference to auth.users id
        // Ensure we write the role in lowercase to match DB constraints
        const roleVal = (role as string).toString().toLowerCase()
        const { error: profileErr } = await supabase
          .from('profiles')
          .insert({
            user_id: data.user.id,
            user_role: roleVal,
            created_at: new Date().toISOString(),
          })
        if (profileErr) throw profileErr
      }
    } catch (e) {
      setLoading(false)
      throw e
    }
  }

  const signOut = async () => {
    setError(null)
    const { error: e } = await supabase.auth.signOut()
    if (e) throw e
  }

  return {
    user,
    profile,
    loading,
    error,
    signIn,
    signUp,
    signOut,
  }
}
