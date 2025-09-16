import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  forwardRef,
  useImperativeHandle,
} from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { ClipboardList } from 'lucide-react'

type QuickResource = {
  id: string
  title: string
  content_type: string | null
  category: string | null
}

export type SessionBoardHandle = {
  saveNow: () => Promise<boolean>
  isSaving: () => boolean
  isDirty: () => boolean
}

type Props = {
  defaultCaseId?: string
  defaultClientId?: string
  onSavingChange?: (saving: boolean) => void
  onDirtyChange?: (dirty: boolean) => void
  onSavedOnce?: () => void // optional hook for Save & Exit flows
}

const SessionBoard = forwardRef<SessionBoardHandle, Props>(function SessionBoard(
  { defaultCaseId = '', defaultClientId = '', onSavingChange, onDirtyChange, onSavedOnce },
  ref
) {
  const { profile } = useAuth()
  const therapistId = profile?.id ?? null

  // Local inputs for scoping the note
  const [clientId, setClientId] = useState<string>(defaultClientId)
  const [caseId, setCaseId] = useState<string>(defaultCaseId)

  // Note content & save states
  const [content, setContent] = useState<string>('')
  const [saving, setSaving] = useState<boolean>(false)
  const [saveInfo, setSaveInfo] = useState<string | null>(null)
  const saveInfoTimer = useRef<number | null>(null)

  // Dirty tracking (compare against lastSavedContent)
  const lastSaved = useRef<string>('') // last successfully saved content

  // Quick resources list (public)
  const [resources, setResources] = useState<QuickResource[]>([])
  const [resourcesLoading, setResourcesLoading] = useState<boolean>(false)
  const [resourcesError, setResourcesError] = useState<string | null>(null)

  const canSave = useMemo(() => !!therapistId && !!caseId, [therapistId, caseId])
  const dirty = useMemo(() => content.trim() !== lastSaved.current.trim(), [content])

  useEffect(() => {
    onSavingChange?.(saving)
  }, [saving, onSavingChange])

  useEffect(() => {
    onDirtyChange?.(dirty)
  }, [dirty, onDirtyChange])

  const showSaveInfo = useCallback((msg: string) => {
    setSaveInfo(msg)
    if (saveInfoTimer.current) window.clearTimeout(saveInfoTimer.current)
    saveInfoTimer.current = window.setTimeout(() => setSaveInfo(null), 3000)
  }, [])

  // ===== Load existing draft for (therapist, case) =====
  useEffect(() => {
    const loadDraft = async () => {
      if (!therapistId || !caseId) return
      try {
        const { data, error } = await supabase
          .from('session_notes')
          .select('id, content')
          .eq('therapist_id', therapistId)
          .eq('case_id', caseId)
          .order('updated_at', { ascending: false })
          .limit(1)
          .maybeSingle()

        if (error) {
          console.warn('[SessionBoard] loadDraft error:', error.message)
          return
        }
        if (data?.content) {
          const text = typeof data.content === 'string' ? data.content : JSON.stringify(data.content)
          lastSaved.current = text
          setContent(text)
        } else {
          lastSaved.current = ''
          setContent('')
        }
      } catch (e) {
        console.warn('[SessionBoard] loadDraft exception:', e)
      }
    }
    loadDraft()
  }, [therapistId, caseId])

  // ===== Fetch quick resources =====
  useEffect(() => {
    let cancelled = false
    const fetchResources = async () => {
      setResourcesLoading(true)
      setResourcesError(null)
      try {
        const { data, error } = await supabase
          .from('resource_library')
          .select('id, title, content_type, category')
          .eq('is_public', true)
          .order('created_at', { ascending: false })
          .limit(8)

        if (error) {
          console.error('[SessionBoard] resources fetch error:', error)
          if (!cancelled) {
            setResourcesError('Failed to load resources.')
            setResources([])
          }
          return
        }
        if (!cancelled) {
          setResources((data ?? []) as QuickResource[])
        }
      } catch (e) {
        console.error('[SessionBoard] resources fetch exception:', e)
        if (!cancelled) {
          setResourcesError('Failed to load resources.')
          setResources([])
        }
      } finally {
        if (!cancelled) setResourcesLoading(false)
      }
    }
    fetchResources()
    return () => {
      cancelled = true
    }
  }, [])

  // ===== Core save routine (reusable for autosave and saveNow) =====
  const persist = useCallback(
    async (text: string) => {
      if (!canSave) return false
      if (!text.trim()) return true // treat empty as "nothing to save"
      setSaving(true)
      try {
        const { error } = await supabase
          .from('session_notes')
          .upsert(
            {
              therapist_id: therapistId,
              client_id: clientId || null,
              case_id: caseId || null,
              content: text, // if jsonb, adapt accordingly
              updated_at: new Date().toISOString(),
            } as any,
            { onConflict: 'therapist_id,case_id' } as any
          )

        if (error) {
          console.error('[SessionBoard] save error:', error)
          showSaveInfo('Save failed')
          return false
        } else {
          lastSaved.current = text
          showSaveInfo('Saved')
          onSavedOnce?.()
          return true
        }
      } catch (e) {
        console.error('[SessionBoard] save exception:', e)
        showSaveInfo('Save failed')
        return false
      } finally {
        setSaving(false)
      }
    },
    [canSave, therapistId, clientId, caseId, onSavedOnce, showSaveInfo]
  )

  // ===== Autosave (debounced) =====
  useEffect(() => {
    if (!dirty) return
    const t = window.setTimeout(() => {
      // if still dirty after debounce, try save
      if (content.trim()) void persist(content)
    }, 600)
    return () => window.clearTimeout(t)
  }, [content, dirty, persist])

  // ===== Expose imperative API for Workspace =====
  useImperativeHandle(ref, () => ({
    saveNow: async () => {
      return await persist(content)
    },
    isSaving: () => saving,
    isDirty: () => dirty,
  }))

  // ===== Attach a resource (append a reference line) =====
  const attach = (r: QuickResource) => {
    setContent((prev) =>
      `${prev}${prev ? '\n\n' : ''}[Attached Resource] ${r.title} (${r.content_type ?? 'other'}/${r.category ?? 'general'})`
    )
  }

  return (
    <div className="p-4 lg:p-6 max-w-7xl mx-auto space-y-4">
      {/* Top row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ClipboardList className="w-6 h-6 text-blue-600" />
          <h2 className="text-2xl font-bold text-gray-900">Session Board</h2>
        </div>
        <div className="text-xs text-gray-500">
          {!therapistId ? 'Sign in required' : saving ? 'Saving…' : (dirty ? 'Unsaved changes' : (saveInfo || 'Idle'))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Resource drawer (compact quick access) */}
        <div className="bg-white border rounded-lg shadow-sm p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="text-sm font-semibold text-gray-900">Quick Resources</div>
            <button
              onClick={() => window.dispatchEvent(new CustomEvent('open-resource-library'))}
              className="text-xs text-blue-600 hover:underline"
            >
              Open Library
            </button>
          </div>

          {resourcesLoading ? (
            <div className="text-sm text-gray-500">Loading resources…</div>
          ) : resourcesError ? (
            <div className="text-sm text-red-600">{resourcesError}</div>
          ) : resources.length === 0 ? (
            <div className="text-sm text-gray-500">No resources available.</div>
          ) : (
            <div className="space-y-2">
              {resources.map((r) => (
                <div key={r.id} className="flex items-center justify-between border rounded p-2">
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-gray-900 truncate">{r.title}</div>
                    <div className="text-xs text-gray-500">
                      {r.content_type ?? 'other'} • {r.category ?? 'general'}
                    </div>
                  </div>
                  <button
                    onClick={() => attach(r)}
                    className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
                  >
                    Attach
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Note editor */}
        <div className="lg:col-span-2 bg-white border rounded-lg shadow-sm p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-3">
            <input
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              placeholder="Client ID"
              className="px-3 py-2 border rounded text-sm"
            />
            <input
              value={caseId}
              onChange={(e) => setCaseId(e.target.value)}
              placeholder="Case ID"
              className="px-3 py-2 border rounded text-sm"
            />
            <div className="text-xs text-gray-500 flex items-center md:justify-end">
              {new Date().toLocaleString()}
            </div>
          </div>

          {!therapistId ? (
            <div className="text-sm text-red-600">You must be signed in to save notes.</div>
          ) : (
            <>
              <textarea
                rows={14}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Live session notes…"
                className="w-full border rounded p-3 text-sm"
              />
              {/* Session controls inline (End Session & Save, Save & Exit) */}
              <div className="mt-3 flex items-center justify-end gap-2">
                <button
                  onClick={async () => {
                    const ok = await persist(content)
                    if (ok) {
                      // maybe add finalize flag/column in `session_notes` here
                    }
                  }}
                  className="px-3 py-2 text-sm rounded-lg border border-gray-300 hover:bg-gray-50"
                >
                  End Session & Save
                </button>
                <button
                  onClick={async () => {
                    const ok = await persist(content)
                    if (ok) onSavedOnce?.()
                  }}
                  className="px-3 py-2 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700"
                >
                  Save & Exit
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
})

export default SessionBoard
