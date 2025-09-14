// src/components/therapist/ProtectedRoute.tsx
import React from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'

type Role = 'therapist' | 'client'

type Props = {
  /** Require a specific role to access this route */
  role?: Role
  /** Where to redirect unauthenticated users (default: /login) */
  redirectTo?: string
  /** Optional fallback while auth/profile loads */
  fallback?: React.ReactNode
  children: React.ReactNode
}

/**
 * ProtectedRoute
 * - Waits for `useAuth()` to finish
 * - Redirects to /login if no user
 * - If `role` is specified, ensures `profile.role` matches; otherwise redirects to that role's home
 * - On errors: shows a simple retry block
 */
export const ProtectedRoute: React.FC<Props> = ({
  role,
  redirectTo = '/login',
  fallback,
  children,
}) => {
  const { user, profile, loading, error } = useAuth()
  const location = useLocation()

  // Loading state
  if (loading) {
    return (
      fallback ?? (
        <div className="min-h-screen grid place-items-center bg-gray-50">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-3" />
            <p className="text-gray-600">Checking your session…</p>
          </div>
        </div>
      )
    )
  }

  // Hard error (Supabase/network)
  if (error) {
    return (
      <div className="min-h-screen grid place-items-center bg-gray-50">
        <div className="bg-white border border-gray-200 rounded-xl p-6 text-center max-w-md">
          <h2 className="text-lg font-semibold text-gray-900 mb-1">Connection error</h2>
          <p className="text-sm text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  // Not signed in → send to login and preserve where we came from
  if (!user) {
    return <Navigate to={redirectTo} state={{ from: location }} replace />
  }

  // No profile yet (should be rare with your hook, but guard anyway)
  if (!profile) {
    return (
      <div className="min-h-screen grid place-items-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-3" />
          <p className="text-gray-600">Loading your profile…</p>
        </div>
      </div>
    )
  }

  // Role mismatch routing
  if (role && profile.role !== role) {
    // Send to their home area (therapist/client)
    const home = profile.role === 'therapist' ? '/therapist' : '/client'
    return <Navigate to={home} replace />
  }

  // All good
  return <>{children}</>
}

export default ProtectedRoute
