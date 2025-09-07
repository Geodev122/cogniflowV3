// src/App.tsx
import React from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { Login } from './pages/Login'
import { Register } from './pages/Register'
import { ProtectedRoute } from './components/ProtectedRoute'
import { useAuth } from './hooks/useAuth'

// --- Lazy pages (top-level) ---
const TherapistDashboard = React.lazy(() => import('./pages/TherapistDashboard'))
const ClientDashboard = React.lazy(() => import('./pages/ClientDashboard'))
const ProgressMetrics = React.lazy(() => import('./pages/ProgressMetrics'))

// --- Lazy therapist tools (component pages) ---
const ClientManagement = React.lazy(() =>
  import('./components/therapist/ClientManagement').then(m => ({ default: m.ClientManagement }))
)
const SessionManagement = React.lazy(() =>
  import('./components/therapist/SessionManagement').then(m => ({ default: m.SessionManagement }))
)
const CaseManagement = React.lazy(() =>
  import('./components/therapist/CaseManagement').then(m => ({ default: m.CaseManagement }))
)
// CommunicationTools has a default export already
const CommunicationTools = React.lazy(() => import('./components/therapist/CommunicationTools'))

// --- Preload helpers ---
const preloadTherapistArea = () => {
  import('./pages/TherapistDashboard')
  import('./pages/ProgressMetrics')
  import('./components/therapist/ClientManagement').then(m => m)
  import('./components/therapist/SessionManagement').then(m => m)
  import('./components/therapist/CaseManagement').then(m => m)
  import('./components/therapist/CommunicationTools').then(m => m)
}

const preloadClientArea = () => {
  import('./pages/ClientDashboard')
}

// --- Loading states ---
const LoadingSpinner = ({ message = 'Loading...' }: { message?: string }) => (
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

function App() {
  const { user, profile, loading, error } = useAuth()

  // Preload by role once authenticated
  React.useEffect(() => {
    if (!user || !profile) return
    if (profile.role === 'therapist') preloadTherapistArea()
    if (profile.role === 'client') preloadClientArea()
  }, [user, profile])

  if (loading) return <LoadingSpinner message="Initializing Thera-PY..." />

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
        <React.Suspense fallback={<LoadingSpinner message="Loading page..." />}>
          <Routes>
            {/* Auth */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />

            {/* Therapist area */}
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
              path="/metrics"
              element={
                <ProtectedRoute role="therapist">
                  <ProgressMetrics />
                </ProtectedRoute>
              }
            />

            {/* Client area */}
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

export default App
