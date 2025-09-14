// src/App.tsx
import React from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { Login } from './pages/therapist/Login'
import { Register } from './pages/therapist/Register'
import { ProtectedRoute } from './components/therapist/ProtectedRoute'
import { useAuth } from './hooks/useAuth'

// --- Lazy pages (top-level stacks) ---
const TherapistDashboard = React.lazy(() =>
  import('./pages/therapist/TherapistDashboard').then(m => ({ default: m.default ?? m }))
)

// NOTE: Repo currently has ClientDashboard under /pages/therapist.
// We’ll move it in a later phase; for now keep it working:
const ClientDashboard = React.lazy(() =>
  import('./pages/therapist/ClientDashboard').then(m => ({ default: m.default ?? m }))
)

// This page exists in repo under /pages/therapist; we’ll remove later per plan
const ProgressMetricsPage = React.lazy(() =>
  import('./pages/therapist/ProgressMetrics').then(m => ({ default: m.default ?? m }))
)

// --- Therapist feature routes (component pages) ---
const ClientManagement = React.lazy(() =>
  import('./components/therapist/ClientManagement').then(m => ({ default: (m as any).ClientManagement ?? m.default }))
)
const SessionManagement = React.lazy(() =>
  import('./components/therapist/SessionManagement').then(m => ({ default: (m as any).SessionManagement ?? m.default }))
)
const CaseManagement = React.lazy(() =>
  import('./components/therapist/CaseManagement').then(m => ({ default: (m as any).CaseManagement ?? m.default }))
)
const CommunicationTools = React.lazy(() =>
  import('./components/therapist/CommunicationTools').then(m => ({ default: (m as any).default ?? m }))
)

// --- Therapist Assessments workspace (route page) ---
const AssessmentsPage = React.lazy(() =>
  import('./pages/therapist/AssessmentsPage').then(m => ({ default: m.default ?? m }))
)

// --- Loading screen ---
const Loading = ({ message = 'Loading…' }: { message?: string }) => (
  <div className="min-h-screen flex items-center justify-center bg-gray-50">
    <div className="text-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
      <p className="text-gray-600">{message}</p>
    </div>
  </div>
)

// --- Error boundary ---
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error?: Error }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props)
    this.state = { hasError: false }
  }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error }
  }
  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('App Error:', error, errorInfo)
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center max-w-md mx-auto p-6">
            <div className="text-red-600 mb-4">
              <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Something went wrong</h2>
            <p className="text-gray-600 mb-4">Please refresh the page to try again.</p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Refresh Page
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

export default function App() {
  const { user, profile, loading, error } = useAuth()

  // Preload the relevant area once authenticated
  React.useEffect(() => {
    if (!user || !profile) return
    if (profile.role === 'therapist') {
      import('./pages/therapist/TherapistDashboard')
      import('./pages/therapist/AssessmentsPage')
      import('./components/therapist/ClientManagement')
      import('./components/therapist/SessionManagement')
      import('./components/therapist/CaseManagement')
      import('./components/therapist/CommunicationTools')
    } else if (profile.role === 'client') {
      // TODO: when we move client pages into /pages/client, preload them here
      import('./pages/therapist/ClientDashboard')
    }
  }, [user, profile])

  if (loading) return <Loading message="Initializing Thera-PY…" />

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="text-red-600 mb-4">
            <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Connection Error</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <ErrorBoundary>
      <Router>
        <React.Suspense fallback={<Loading message="Loading page…" />}>
          <Routes>
            {/* Auth */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />

            {/* Therapist stack */}
            <Route
              path="/therapist"
              element={
                <ProtectedRoute role="therapist">
                  <TherapistDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/therapist/clients"
              element={
                <ProtectedRoute role="therapist">
                  <ClientManagement />
                </ProtectedRoute>
              }
            />
            <Route
              path="/therapist/sessions"
              element={
                <ProtectedRoute role="therapist">
                  <SessionManagement />
                </ProtectedRoute>
              }
            />
            <Route
              path="/therapist/cases"
              element={
                <ProtectedRoute role="therapist">
                  <CaseManagement />
                </ProtectedRoute>
              }
            />
            <Route
              path="/therapist/comms"
              element={
                <ProtectedRoute role="therapist">
                  <CommunicationTools />
                </ProtectedRoute>
              }
            />
            <Route
              path="/therapist/assessments"
              element={
                <ProtectedRoute role="therapist">
                  <AssessmentsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/therapist/assessments/:instanceId"
              element={
                <ProtectedRoute role="therapist">
                  <AssessmentsPage />
                </ProtectedRoute>
              }
            />
            {/* (Legacy) standalone metrics page – will be removed later */}
            <Route
              path="/metrics"
              element={
                <ProtectedRoute role="therapist">
                  <ProgressMetricsPage />
                </ProtectedRoute>
              }
            />

            {/* Client stack (temporary import path) */}
            <Route
              path="/client"
              element={
                <ProtectedRoute role="client">
                  <ClientDashboard />
                </ProtectedRoute>
              }
            />

            {/* Root redirect */}
            <Route
              path="/"
              element={
                user && profile ? (
                  <Navigate to={profile.role === 'therapist' ? '/therapist' : '/client'} replace />
                ) : (
                  <Navigate to="/login" replace />
                )
              }
            />

            {/* Catch-all */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </React.Suspense>
      </Router>
    </ErrorBoundary>
  )
}
