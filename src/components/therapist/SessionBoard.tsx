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
import {
  ClipboardList,
  ListChecks,
  CheckCircle2,
  Trash2,
  RefreshCw,
} from 'lucide-react'
import confirmAsync from '../../utils/confirm'
import { useToast } from '../../components/ui/Toast'

type QuickResource = {
  id: string
  title: string
  content_type: string | null
  category: string | null
}

type AgendaItem = {
  id: string
  case_id: string
  therapist_id: string
  source?: string | null
  source_id?: string | null
  title: string
  payload?: any
  created_at?: string | null
  completed_at?: string | null
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

const fmt = (d?: string | null) => (d ? new Date(d).toLocaleString() : 'n/a')

const SessionBoard = forwardRef<SessionBoardHandle, Props>(function SessionBoard(
  { defaultCaseId = '', defaultClientId = '', onSavingChange, onDirtyChange, onSavedOnce },
  ref
) {
  const { profile } = useAuth()
  const therapistId = profile?.id ?? null
  const { push } = useToast()

  // keep props in sync
  const [clientId, setClientId] = useState<string>(defaultClientId)
  const [caseId, setCaseId] = useState<string>(defaultCaseId)
  useEffect(() => setCaseId(defaultCaseId), [defaultCaseId])
  useEffect(() => setClientId(defaultClientId), [defaultClientId])

  // Notes
  const [content, setContent] = useState<string>('')
  const [saving, setSaving] = useState<boolean>(false)
  const [saveInfo, setSaveInfo] = useState<string | null>(null)
  const saveInfoTimer = useRef<number | null>(null)
  const lastSaved = useRef<string>('') // for dirty tracking

  // Quick resources
  const [resources, setResources] = useState<QuickResource[]>([])
  const [resourcesLoading, setResourcesLoading] = useState<boolean>(false)
  const [resourcesError, setResourcesError] = useState<string | null>(null)

  // Session agenda
  const [agenda, setAgenda] = useState<AgendaItem[]>([])
  const [agendaLoading, setAgendaLoading] = useState<boolean>(false)
  const [agendaError, setAgendaError] = useState<string | null>(null)

  const canSave = useMemo(() => !!therapistId && !!caseId, [therapistId, caseId])
  const dirty = useMemo(() => content.trim() !== lastSaved.current.trim(), [content])

  useEffect(() => onSavingChange?.(saving), [saving, onSavingChange])
  useEffect(() => onDirtyChange?.(dirty), [dirty, onDirtyChange])

  const showSaveInfo = useCallback((msg: string) => {
    setSaveInfo(msg)
    if (saveInfoTimer.current) window.clearTimeout(saveInfoTimer.current)
    saveInfoTimer.current = window.setTimeout(() => setSaveInfo(null), 3000)
  }, [])

  /* =========================
     Load last draft for (therapist, case)
  ========================= */
  useEffect(() => {
    const loadDraft = async () => {
      if (!therapistId || !caseId) {
        lastSaved.current = ''
        setContent('')
        return
      }
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
          lastSaved.current = ''
          setContent('')
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
        lastSaved.current = ''
        setContent('')
      }
    }
    void loadDraft()
  }, [therapistId, caseId])

  /* =========================
     Fetch quick resources (public)
  ========================= */
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

        if (error) throw error
        if (!cancelled) setResources((data ?? []) as QuickResource[])
      } catch (e) {
        console.error('[SessionBoard] resources fetch error:', e)
        if (!cancelled) {
          setResourcesError('Failed to load resources.')
          setResources([])
        }
      } finally {
        if (!cancelled) setResourcesLoading(false)
      }
    }
    void fetchResources()
    return () => { cancelled = true }
  }, [])

  /* =========================
     Session Agenda: fetch / toggle / remove
  ========================= */
  const loadAgenda = useCallback(async () => {
    if (!therapistId || !caseId) {
      setAgenda([])
      return
    }
    try {
      setAgendaLoading(true)
      setAgendaError(null)
      const { data, error } = await supabase
        .from('session_agenda') // adjust if your table is named differently
        .select('id, case_id, therapist_id, source, source_id, title, payload, created_at, completed_at')
        .eq('case_id', caseId)
        .eq('therapist_id', therapistId)
        .order('created_at', { ascending: false })

      if (error) throw error
      setAgenda((data ?? []) as AgendaItem[])
    } catch (e) {
      console.error('[SessionBoard] agenda fetch error:', e)
      setAgenda([])
      setAgendaError('Failed to load session agenda.')
    } finally {
      setAgendaLoading(false)
    }
  }, [therapistId, caseId])

  useEffect(() => { void loadAgenda() }, [loadAgenda])

  const markAgendaDone = async (id: string, complete: boolean) => {
    try {
      const { error } = await supabase
        .from('session_agenda')
        .update({ completed_at: complete ? new Date().toISOString() : null })
        .eq('id', id)
      if (error) throw error
      await loadAgenda()
    } catch (e) {
      console.error('[SessionBoard] markAgendaDone error:', e)
      push({ message: 'Could not update agenda item.', type: 'error' })
    }
  }

  const removeAgendaItem = async (id: string) => {
    const ok = await confirmAsync({ title: 'Remove agenda item', description: 'Remove this agenda item?' })
    if (!ok) return
    try {
      const { error } = await supabase.from('session_agenda').delete().eq('id', id)
      if (error) throw error
      await loadAgenda()
    } catch (e) {
      console.error('[SessionBoard] removeAgendaItem error:', e)
      push({ message: 'Could not remove agenda item.', type: 'error' })
    }
  }

  /* =========================
     Core save routine
  ========================= */
  const persist = useCallback(
    async (text: string, opts?: { finalize?: boolean }) => {
      if (!canSave) return false
      if (!text.trim()) {
        // nothing to save, but treat as success so guard can let you exit
        showSaveInfo('Nothing to save')
        return true
      }
      setSaving(true)
      try {
        // Ensure you have a unique index on (therapist_id, case_id)
        // Optional columns: finalized boolean, finalized_at timestamptz
        const payload: any = {
          therapist_id: therapistId,
          client_id: clientId || null,
          case_id: caseId || null,
          content: text,
          updated_at: new Date().toISOString(),
        }
        if (opts?.finalize) {
          payload.finalized = true
          payload.finalized_at = new Date().toISOString()
        }

        const { error } = await supabase
          .from('session_notes')
          .upsert(payload as any, { onConflict: 'therapist_id,case_id' } as any)

        if (error) throw error

        lastSaved.current = text
        showSaveInfo(opts?.finalize ? 'Session finalized' : 'Saved')
        onSavedOnce?.()
        return true
      } catch (e) {
        console.error('[SessionBoard] save error:', e)
        showSaveInfo('Save failed')
        return false
      } finally {
        setSaving(false)
      }
    },
    [canSave, therapistId, clientId, caseId, onSavedOnce, showSaveInfo]
  )

  // Autosave (debounced)
  useEffect(() => {
    if (!dirty) return
    const t = window.setTimeout(() => {
      if (content.trim()) void persist(content)
    }, 600)
    return () => window.clearTimeout(t)
  }, [content, dirty, persist])

  // Expose imperative API to Workspace guard
  useImperativeHandle(ref, () => ({
    saveNow: async () => await persist(content),
    isSaving: () => saving,
    isDirty: () => dirty,
  }))

  // Attach resource (just appends a reference line to the note for now)
  const attach = (r: QuickResource) => {
    setContent((prev) =>
      `${prev}${prev ? '\n\n' : ''}[Attached Resource] ${r.title} (${r.content_type ?? 'other'}/${r.category ?? 'general'})`
    )
  }

  return (
    <div className="p-4 lg:p-6 max-w-7xl mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ClipboardList className="w-6 h-6 text-blue-600" />
          <h2 className="text-2xl font-bold text-gray-900">Session Board</h2>
        </div>
        <div className="text-xs text-gray-500">
          {!therapistId
            ? 'Sign in required'
            : saving
            ? 'Saving…'
            : dirty
            ? 'Unsaved changes'
            : (saveInfo || 'Idle')}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left column: Session Agenda */}
        <div className="bg-white border rounded-lg shadow-sm p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <ListChecks className="w-4 h-4 text-blue-600" />
              <div className="text-sm font-semibold text-gray-900">Session Agenda</div>
            </div>
            <button
              onClick={() => void loadAgenda()}
              className="text-xs inline-flex items-center gap-1 text-gray-600 hover:text-gray-900"
              title="Refresh agenda"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Refresh
            </button>
          </div>

          {!caseId ? (
            <div className="text-sm text-gray-500">Select a case to view agenda.</div>
          ) : agendaLoading ? (
            <div className="text-sm text-gray-500">Loading agenda…</div>
          ) : agendaError ? (
            <div className="text-sm text-red-600">{agendaError}</div>
          ) : agenda.length === 0 ? (
            <div className="text-sm text-gray-500">No queued items yet.</div>
          ) : (
            <div className="space-y-2">
              {agenda.map((a) => {
                const completed = !!a.completed_at
                return (
                  <div key={a.id} className="border rounded p-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className={`text-sm font-medium ${completed ? 'line-through text-gray-400' : 'text-gray-900'}`}>
                          {a.title}
                        </div>
                        <div className="text-[11px] text-gray-500">
                          {a.source ? `${a.source} • ` : ''}{fmt(a.created_at)}
                        </div>
                        {a.payload?.details && (
                          <div className="text-xs text-gray-700 mt-1 line-clamp-3">
                            {a.payload.details}
                          </div>
                        )}
                      </div>

                      <div className="shrink-0 flex items-center gap-1">
                        <button
                          onClick={() => markAgendaDone(a.id, !completed)}
                          className={`px-2 py-1 text-xs rounded inline-flex items-center gap-1 ${
                            completed
                              ? 'border text-gray-700 hover:bg-gray-50'
                              : 'bg-green-600 text-white hover:bg-green-700'
                          }`}
                          title={completed ? 'Mark as pending' : 'Mark completed'}
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          {completed ? 'Undo' : 'Done'}
                        </button>
                        <button
                          onClick={() => removeAgendaItem(a.id)}
                          className="px-2 py-1 text-xs rounded border text-gray-700 hover:bg-gray-50 inline-flex items-center gap-1"
                          title="Remove"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          Remove
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* Quick Resources (compact, under agenda) */}
          <div className="mt-5 pt-4 border-t">
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
                rows={16}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Live session notes…"
                className="w-full border rounded p-3 text-sm"
              />

              <div className="mt-3 flex items-center justify-end gap-2">
                <button
                  onClick={async () => {
                    const ok = await persist(content, { finalize: true })
                    if (ok) {
                      // Optional: auto-complete all pending agenda items on finalize
                      try {
                        if (agenda.some(a => !a.completed_at)) {
                          await supabase
                            .from('session_agenda')
                            .update({ completed_at: new Date().toISOString() })
                            .eq('case_id', caseId)
                            .eq('therapist_id', therapistId)
                            .is('completed_at', null as any)
                        }
                        await loadAgenda()
                      } catch (e) {
                        console.warn('[SessionBoard] finalize agenda complete warn:', e)
                      }
                    }
                  }}
                  className="px-3 py-2 text-sm rounded-lg border border-gray-300 hover:bg-gray-50 inline-flex items-center gap-2"
                  title="Finalize this session and mark agenda complete"
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
