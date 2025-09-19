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
    role: (u.user_metadata?.role || 'client') as AppRole,
    first_name: u.user_metadata?.first_name || 'User',
    last_name: u.user_metadata?.last_name || '',
    email: u.email || '',
    whatsapp_number: null,
    professional_details: null,
    verification_status: null,
  })

  const fetchProfile = useCallback(async (u: User) => {
    try {
      // First try DB
      const { data, error: dbErr } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', u.id)
        .maybeSingle()

      if (dbErr) {
        // log and continue to fallback
        console.warn('[useAuth] profiles query error; using auth metadata fallback', dbErr)
      }

      if (data) {
        setProfile(data as Profile)
        setError(null)
        return
      }

      // Fallback to auth metadata if row is missing
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
        const sessionPromise = supabase.auth.getSession()
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Session timeout')), 12000)
        )
        const result = (await Promise.race([sessionPromise, timeoutPromise])) as any
        if (!mounted) return

        const sessionUser: User | null = result?.data?.session?.user ?? null
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
          setError('Failed to initialize authentication')
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
          if (session?.user) {
            setUser(session.user)
            await fetchProfile(session.user)
          } else {
            setUser(null)
            setProfile(null)
          }
        } catch (e) {
          console.error('[useAuth] onAuthStateChange error', e)
          setError('Authentication error occurred')
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
    role: AppRole
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
        const { error: profileErr } = await supabase
          .from('profiles')
          .insert({
            id: data.user.id,
            email,
            first_name: firstName,
            last_name: lastName,
            role,
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
