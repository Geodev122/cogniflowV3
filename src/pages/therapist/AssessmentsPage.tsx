// src/pages/therapist/AssessmentsPage.tsx
import React, { useEffect, useMemo } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { ClipboardList, ChevronRight, ChevronLeft, AlertTriangle } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { supabase } from '../../lib/supabase'
import AssessmentWorkspace from '../../components/assessment/AssessmentWorkspace'

const AssessmentsPage: React.FC = () => {
  const navigate = useNavigate()
  const { instanceId } = useParams<{ instanceId?: string }>()
  const { profile, loading: authLoading } = useAuth()

  const isTherapist = useMemo(() => {
    return profile?.role ? profile.role === 'therapist' : !!profile
  }, [profile])

  useEffect(() => {
    if (!profile) return
    const writeLastSeen = async () => {
      try {
        await supabase.from('user_last_seen').upsert({
          user_id: profile.id,
          page: 'therapist_assessments',
          context: instanceId ? { instanceId } : null,
          seen_at: new Date().toISOString(),
        })
      } catch {}
    }
    writeLastSeen()
  }, [profile, instanceId])

  if (authLoading) {
    return (
      <div className="h-[60vh] grid place-items-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="max-w-lg mx-auto mt-16">
        <div className="bg-white border border-gray-200 rounded-xl p-6 text-center">
          <AlertTriangle className="w-8 h-8 text-amber-600 mx-auto mb-2" />
          <h2 className="text-lg font-semibold text-gray-900 mb-1">You’re not signed in</h2>
          <p className="text-sm text-gray-600 mb-4">Please sign in to access assessments.</p>
          <button
            onClick={() => navigate('/login')}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700"
          >
            Go to sign in
          </button>
        </div>
      </div>
    )
  }

  if (!isTherapist) {
    return (
      <div className="max-w-lg mx-auto mt-16">
        <div className="bg-white border border-gray-200 rounded-xl p-6 text-center">
          <AlertTriangle className="w-8 h-8 text-red-600 mx-auto mb-2" />
          <h2 className="text-lg font-semibold text-gray-900 mb-1">Access restricted</h2>
          <p className="text-sm text-gray-600">This area is for therapists only.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full grid grid-rows-[auto_1fr]">
      <div className="border-b border-gray-200 bg-white/80 backdrop-blur">
        <div className="px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate(-1)}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded border text-sm hover:bg-gray-50"
              title="Back"
            >
              <ChevronLeft className="w-4 h-4" />
              Back
            </button>
            <div className="mx-2 h-5 w-px bg-gray-200" />
            <ClipboardList className="w-5 h-5 text-blue-600" />
            <h1 className="text-lg font-semibold text-gray-900">Assessments</h1>
          </div>

          <nav className="hidden sm:flex items-center text-sm text-gray-500">
            <Link to="/therapist" className="hover:text-gray-700">Therapist</Link>
            <ChevronRight className="w-4 h-4 mx-1 text-gray-400" />
            <span className="text-gray-700">Assessments</span>
            {instanceId ? (
              <>
                <ChevronRight className="w-4 h-4 mx-1 text-gray-400" />
                <span className="text-gray-700">Instance</span>
              </>
            ) : null}
          </nav>
        </div>
      </div>

      <div className="min-h-0">
        <AssessmentWorkspace
          initialInstanceId={instanceId}
          onClose={() => navigate('/therapist')}
        />
      </div>
    </div>
  )
}

export default AssessmentsPage
