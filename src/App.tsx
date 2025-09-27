import React from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './hooks/useAuth'
import { ToastProvider } from './components/ui/Toast'
import { ProtectedRoute } from './components/therapist/ProtectedRoute'

// Auth (therapist-facing auth screens)
import { Login } from './pages/therapist/Login'
import { Register } from './pages/therapist/Register'

/**
 * lazyWithRetry:
 * - fixes transient “Failed to fetch dynamically imported module” issues
 *   by retrying once after a short delay, which is common with Vite HMR or flaky networks.
 */
const lazyWithRetry = <T extends React.ComponentType<any>>(
  factory: () => Promise<{ default: T }>
) => {
  let loaded = false
  return React.lazy(async () => {
    try {
      const mod = await factory()
      loaded = true
      return mod
    } catch (err) {
      // If the first attempt failed due to a transient fetch error, retry once
      const isChunkError =
        err instanceof Error &&
        /Loading chunk|Failed to fetch dynamically imported module|Importing a module script failed/.test(err.message)
      if (!loaded && isChunkError) {
        await new Promise((r) => setTimeout(r, 500))
        return factory()
      }
      throw err
    }
  })
}

// Therapist stack (lazy to speed TTI)
const TherapistDashboard = lazyWithRetry(() => import('./pages/therapist/TherapistDashboard'))
const AssessmentsPage    = lazyWithRetry(() => import('./pages/therapist/AssessmentsPage'))
const CaseArchives       = lazyWithRetry(() => import('./pages/therapist/CaseArchives'))

// NEW: Practice Management Workspace (shell) + Case Summary
const Workspace   = lazyWithRetry(() => import('./pages/therapist/workspace/Workspace'))
const CaseSummary = lazyWithRetry(() => import('./pages/therapist/CaseSummary'))

// Client stack (mobile-first)
const ClientHome               = lazyWithRetry(() => import('./pages/client/ClientHome'))
const ClientAssessments        = lazyWithRetry(() => import('./pages/client/Assessments'))
const ClientAssessmentPlayer   = lazyWithRetry(() => import('./pages/client/AssessmentPlayer'))
const ClientProfile            = lazyWithRetry(() => import('./pages/client/Profile'))

// Support / Tickets (the dashboard links here)
const SupportTickets           = lazyWithRetry(() => import('./pages/SupportTickets'))
const ContinuingCourses        = lazyWithRetry(() => import('./pages/therapist/continuing/CoursesPage'))
const ContinuingCourseDetail   = lazyWithRetry(() => import('./pages/therapist/continuing/CourseDetail'))

const LoadingSpinner = ({ message = 'Loading...' }: { message?: string }) => (
  <div className="min-h-screen flex items-center justify-center bg-gray-50">
    <div className="text-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
      <p className="text-gray-600">{message}</p>
    </div>
  </div>
)

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error?: Error }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props)
    this.state = { hasError: false }
  }
  static getDerivedStateFromError(error: Error) { return { hasError: true, error } }
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
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"/>
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Initializing Thera-PY...</p>
          <p className="text-sm text-gray-500 mt-2">Please wait while we load your session</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="text-red-600 mb-4">
            <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"/>
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Connection Error</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <div className="text-sm text-gray-500 mb-4">
            This might be a temporary issue. Please try refreshing the page.
          </div>
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
      <ToastProvider>
        <Router>
          <React.Suspense fallback={<LoadingSpinner message="Loading page..." />}>
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
              path="/therapist/assessments"
              element={
                <ProtectedRoute role="therapist">
                  <AssessmentsPage />
                </ProtectedRoute>
              }
            />
            {/* Deep link to a specific instance (AssessmentsPage reads :instanceId) */}
            <Route
              path="/therapist/assessments/:instanceId"
              element={
                <ProtectedRoute role="therapist">
                  <AssessmentsPage />
                </ProtectedRoute>
              }
            />

            {/* Case Archives */}
            <Route
              path="/therapist/archives"
              element={
                <ProtectedRoute role="therapist">
                  <CaseArchives />
                </ProtectedRoute>
              }
            />

            {/* NEW: Practice Management Workspace & Case Summary */}
            <Route
              path="/therapist/workspace"
              element={
                <ProtectedRoute role="therapist">
                  <Workspace />
                </ProtectedRoute>
              }
            />
            <Route
              path="/therapist/workspace/:caseId"
              element={
                <ProtectedRoute role="therapist">
                  <Workspace />
                </ProtectedRoute>
              }
            />
            <Route
              path="/therapist/case-summary/:caseId"
              element={
                <ProtectedRoute role="therapist">
                  <CaseSummary />
                </ProtectedRoute>
              }
            />

            {/* Support / Tickets page the dashboard navigates to */}
            <Route
              path="/support/tickets"
              element={
                <ProtectedRoute role="therapist">
                  <SupportTickets />
                </ProtectedRoute>
              }
            />

            {/* Continuing education (courses + detail) */}
            <Route
              path="/therapist/continuing"
              element={
                <ProtectedRoute role="therapist">
                  <ContinuingCourses />
                </ProtectedRoute>
              }
            />
            <Route
              path="/therapist/continuing/:id"
              element={
                <ProtectedRoute role="therapist">
                  <ContinuingCourseDetail />
                </ProtectedRoute>
              }
            />

            {/* Client stack */}
            <Route
              path="/client"
              element={
                <ProtectedRoute role="client">
                  <ClientHome />
                </ProtectedRoute>
              }
            />
            <Route
              path="/client/assessments"
              element={
                <ProtectedRoute role="client">
                  <ClientAssessments />
                </ProtectedRoute>
              }
            />
            <Route
              path="/client/assessments/:instanceId"
              element={
                <ProtectedRoute role="client">
                  <ClientAssessmentPlayer />
                </ProtectedRoute>
              }
            />
            <Route
              path="/client/profile"
              element={
                <ProtectedRoute role="client">
                  <ClientProfile />
                </ProtectedRoute>
              }
            />

            {/* Root redirect */}
            <Route
              path="/"
              element={
                user && profile
                  ? <Navigate to={(profile.role ?? '').toString().toLowerCase() === 'therapist' || (profile.role ?? '').toString().toLowerCase() === 'admin' || (profile.role ?? '').toString().toLowerCase() === 'supervisor' ? '/therapist' : '/client'} replace />
                  : <Navigate to="/login" replace />
              }
            />

            {/* Catch-all */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </React.Suspense>
      </Router>
      </ToastProvider>
    </ErrorBoundary>
  )
}
