import React, { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import SessionBoard, { SessionBoardHandle } from '../therapist/SessionBoard'
import { ClipboardList, Flag, LogOut, ChevronDown } from 'lucide-react'

type CaseItem = {
  id: string
  case_number?: string | null
  client_id?: string | null
  client?: { first_name?: string | null; last_name?: string | null } | null
  status?: string | null
}

export default function Workspace() {
  const { caseId: routeCaseId } = useParams<{ caseId: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const { profile } = useAuth()

  // Cases for dropdown
  const [cases, setCases] = useState<CaseItem[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedCaseId, setSelectedCaseId] = useState<string>(routeCaseId || '')

  // Guard state mirrors SessionBoard
  const sessionRef = useRef<SessionBoardHandle | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [isDirty, setIsDirty] = useState(false)

  // ===== Load therapist cases =====
  useEffect(() => {
    const run = async () => {
      if (!profile?.id) {
        setCases([])
        setLoading(false)
        return
      }
      setLoading(true)
      setError(null)
      try {
        const { data, error } = await supabase
          .from('cases')
          .select(`
            id,
            case_number,
            client_id,
            status,
            client:profiles!cases_client_id_fkey ( first_name, last_name )
          `)
          .eq('therapist_id', profile.id)
          .eq('status', 'active')
          .order('created_at', { ascending: false })

        if (error) throw error
        setCases((data ?? []) as CaseItem[])
      } catch (e) {
        console.error('[Workspace] fetch cases error:', e)
        setCases([])
        setError('Failed to load cases.')
      } finally {
        setLoading(false)
      }
    }
    run()
  }, [profile])

  // Keep selected in sync with route
  useEffect(() => {
    setSelectedCaseId(routeCaseId || '')
  }, [routeCaseId])

  // ===== Window/tab close guard =====
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (isSaving || isDirty) {
        e.preventDefault()
        e.returnValue = ''
      }
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [isSaving, isDirty])

  // ===== In-app navigation guard helper =====
  const confirmLeave = useCallback(async () => {
    // If nothing to protect, allow
    if (!isSaving && !isDirty) return true

    const wantsToLeave = window.confirm(
      isSaving
        ? 'Notes are still saving. Are you sure you want to leave the Workspace now?'
        : 'You have unsaved changes. Save before leaving the Workspace?'
    )

    if (!wantsToLeave) return false

    // Try to save if dirty
    if (isDirty && sessionRef.current) {
      const ok = await sessionRef.current.saveNow()
      // proceed regardless (we asked already)
      return ok || true
    }
    return true
  }, [isSaving, isDirty])

  // Wrap navigate with guard
  const guardedNavigate = useCallback(
    async (to: string) => {
      const ok = await confirmLeave()
      if (ok) navigate(to)
    },
    [confirmLeave, navigate]
  )

  // Dropdown change handler
  const onChangeCase = useCallback(
    async (newId: string) => {
      if (!newId || newId === selectedCaseId) return
      const ok = await confirmLeave()
      if (!ok) return
      setSelectedCaseId(newId)
      navigate(`/cases/${newId}/workspace`)
    },
    [confirmLeave, navigate, selectedCaseId]
  )

  // For “Save & Exit” button
  const handleSaveAndExit = useCallback(async () => {
    if (sessionRef.current) {
      const ok = await sessionRef.current.saveNow()
      // go back to Case Overview (or dashboard), pick Case Overview:
      if (ok && selectedCaseId) navigate(`/cases/${selectedCaseId}`)
    }
  }, [navigate, selectedCaseId])

  const current = useMemo(() => cases.find((c) => c.id === selectedCaseId) || null, [cases, selectedCaseId])

  return (
    <div className="h-full flex flex-col">
      {/* Case Context Header */}
      <div className="sticky top-0 z-20 bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ClipboardList className="w-5 h-5 text-blue-600" />
            <div>
              <h1 className="text-lg font-semibold text-gray-900">Therapist Workspace</h1>
              <p className="text-xs text-gray-500">
                {isSaving ? 'Saving…' : isDirty ? 'Unsaved changes' : 'All changes saved'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Switch Case */}
            <div className="relative">
              {loading ? (
                <div className="px-3 py-2 text-sm rounded-lg border">Loading cases…</div>
              ) : error ? (
                <div className="px-3 py-2 text-sm rounded-lg border text-red-600">{error}</div>
              ) : (
                <select
                  value={selectedCaseId}
                  onChange={(e) => onChangeCase(e.target.value)}
                  className="px-3 py-2 text-sm rounded-lg border focus:ring-2 focus:ring-blue-500"
                >
                  <option value="" disabled>
                    Select a case…
                  </option>
                  {cases.map((c) => {
                    const name = `${c.client?.first_name ?? ''} ${c.client?.last_name ?? ''}`.trim()
                    const cn = c.case_number ? `Case ${c.case_number}` : `Case ${c.id.slice(0, 6)}…`
                    return (
                      <option key={c.id} value={c.id}>
                        {name ? `${name} — ${cn}` : cn}
                      </option>
                    )
                  })}
                </select>
              )}
            </div>

            {/* Flag Case (stub write to supervision_flags; wire later if you want) */}
            <button
              onClick={() => alert('Flagged for supervision (wire to supervision_flags).')}
              className="px-3 py-2 text-sm rounded-lg border hover:bg-gray-50 inline-flex items-center gap-1"
            >
              <Flag className="w-4 h-4 text-amber-600" /> Flag Case
            </button>

            {/* Save & Exit */}
            <button
              onClick={handleSaveAndExit}
              className="px-3 py-2 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700 inline-flex items-center gap-1"
            >
              <LogOut className="w-4 h-4" /> Save & Exit
            </button>
          </div>
        </div>
      </div>

      {/* Timeline (stub) */}
      {selectedCaseId ? (
        <div className="border-b">
          <div className="max-w-7xl mx-auto px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="font-medium text-gray-900">Session Progress Timeline</div>
              <button
                onClick={() => window.alert('Add Note action (hook to session_notes create).')}
                className="text-sm px-3 py-1.5 rounded border hover:bg-gray-50"
              >
                + Add Note
              </button>
            </div>
            <div className="mt-2 h-2 rounded bg-gray-100">
              {/* Replace with real phases rendering */}
              <div className="h-2 rounded bg-blue-300 w-1/3"></div>
            </div>
          </div>
        </div>
      ) : null}

      {/* Body */}
      <div className="flex-1 min-h-0">
        {!selectedCaseId ? (
          <div className="h-full grid place-items-center px-4">
            <div className="text-center">
              <p className="text-sm text-gray-600">Pick a case from the dropdown to open the Workspace.</p>
            </div>
          </div>
        ) : (
          <div className="max-w-7xl mx-auto p-4 lg:p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* In-Between Sessions (sidebar stub) */}
            <div className="bg-white border rounded-xl p-4 space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="font-medium text-gray-900">In-Between Sessions</h3>
                <button className="text-xs px-2 py-1 rounded border hover:bg-gray-50 inline-flex items-center gap-1">
                  Filter <ChevronDown className="w-3 h-3" />
                </button>
              </div>
              <p className="text-sm text-gray-500">Homework, journals, interim assessments…</p>
              <div className="text-xs text-gray-400">Stub list (wire to client_activities)</div>
            </div>

            {/* Session Board (main) */}
            <div className="lg:col-span-2 bg-white border rounded-xl">
              <SessionBoard
                ref={sessionRef}
                defaultCaseId={current?.id || ''}
                defaultClientId={current?.client_id || ''}
                onSavingChange={setIsSaving}
                onDirtyChange={setIsDirty}
                onSavedOnce={handleSaveAndExit}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
