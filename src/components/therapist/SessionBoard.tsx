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
import AssessmentWorkspace from '../assessment/AssessmentWorkspace'
import { InBetweenSessions } from './InBetweenSessions'
import {
  ClipboardList,
  ListChecks,
  CheckCircle2,
  Trash2,
  RefreshCw,
} from 'lucide-react'
import confirmAsync from '../../utils/confirm'
import { useToast } from '../../components/ui/Toast'
import { loadJsPDF } from '../../lib/loadJspdf'

type ResourceRow = {
  id: string
  title: string
  description?: string | null
  content_type?: string | null
  category?: string | null
  is_public: boolean
  therapist_owner_id?: string | null
  media_url?: string | null
  storage_path?: string | null
  external_url?: string | null
  created_at?: string
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
  // Quick resources removed — SessionBoard uses the resource search modal only

  // Session agenda is now rendered by Workspace; SessionBoard keeps only local agenda actions
  const [agenda, setAgenda] = useState<AgendaItem[]>([])
  const [agendaLoading, setAgendaLoading] = useState<boolean>(false)
  const [agendaError, setAgendaError] = useState<string | null>(null)

  // Session history / current session tracking
  const [sessionHistory, setSessionHistory] = useState<Array<{ id: string; session_index?: number | null; updated_at?: string | null }>>([])
  const [sessionNoteId, setSessionNoteId] = useState<string | null>(null)
  const [sessionIndex, setSessionIndex] = useState<number | null>(null)

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
      // If no case selected, clear
      if (!therapistId || !caseId) {
        lastSaved.current = ''
        setContent('')
        setSessionHistory([])
        setSessionNoteId(null)
        setSessionIndex(null)
        return
      }

      try {
        // Load recent session history for dropdown
        const { data: hist, error: hErr } = await supabase
          .from('session_notes')
          .select('id, session_index, updated_at')
          .eq('therapist_id', therapistId)
          .eq('case_id', caseId)
          .order('updated_at', { ascending: false })
          .limit(30)

        if (hErr) throw hErr
        setSessionHistory((hist ?? []) as any)

        // If a specific sessionNoteId is set, load that; otherwise load latest draft as before
        if (sessionNoteId) {
          const { data, error } = await supabase
            .from('session_notes')
            .select('id, content, session_index')
            .eq('id', sessionNoteId)
            .maybeSingle()
          if (error) throw error
          if (data?.content) {
            const text = typeof data.content === 'string' ? data.content : JSON.stringify(data.content)
            lastSaved.current = text
            setContent(text)
            setSessionIndex(data.session_index ?? null)
          } else {
            lastSaved.current = ''
            setContent('')
          }
          return
        }

        // load latest draft (most recent row) if present
        const { data, error } = await supabase
          .from('session_notes')
          .select('id, content, session_index')
          .eq('therapist_id', therapistId)
          .eq('case_id', caseId)
          .order('updated_at', { ascending: false })
          .limit(1)
          .maybeSingle()

        if (error) {
          console.warn('[SessionBoard] loadDraft error:', error.message)
          lastSaved.current = ''
          setContent('')
          setSessionNoteId(null)
          setSessionIndex(null)
          return
        }

        if (data?.content) {
          const text = typeof data.content === 'string' ? data.content : JSON.stringify(data.content)
          lastSaved.current = text
          setContent(text)
          setSessionNoteId(data.id)
          setSessionIndex(data.session_index ?? null)
        } else {
          lastSaved.current = ''
          setContent('')
          setSessionNoteId(null)
          setSessionIndex(null)
        }
      } catch (e) {
        console.warn('[SessionBoard] loadDraft exception:', e)
        lastSaved.current = ''
        setContent('')
        setSessionHistory([])
        setSessionNoteId(null)
        setSessionIndex(null)
      }
    }
    void loadDraft()
  }, [therapistId, caseId, sessionNoteId])

  /* quick resource list removed to avoid duplicate mini-library in the board */

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

  // Load a specific session note into the editor (from history dropdown)
  const loadSessionById = useCallback(async (id: string | null) => {
    if (!id) return
    try {
      const { data, error } = await supabase
        .from('session_notes')
        .select('id, content, session_index')
        .eq('id', id)
        .maybeSingle()
      if (error) throw error
      if (data?.content) {
        const text = typeof data.content === 'string' ? data.content : JSON.stringify(data.content)
        lastSaved.current = text
        setContent(text)
        setSessionNoteId(data.id)
        setSessionIndex(data.session_index ?? null)
      }
    } catch (e) {
      console.error('[SessionBoard] loadSessionById error:', e)
      push({ message: 'Could not load selected session.', type: 'error' })
    }
  }, [])

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
        // If we are editing a specific session note (sessionNoteId), update by id.
        if (sessionNoteId) {
          const payload: any = {
            content: text,
            updated_at: new Date().toISOString(),
          }
          if (opts?.finalize) {
            payload.finalized = true
            payload.finalized_at = new Date().toISOString()
          }
          const { error } = await supabase.from('session_notes').update(payload as any).eq('id', sessionNoteId)
          if (error) throw error
        } else {
          // Fallback: upsert draft by therapist+case
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
        }

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
    [canSave, therapistId, clientId, caseId, onSavedOnce, showSaveInfo, sessionNoteId]
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

  // Resource attachments should be created via the resource search modal and agenda entries

  const [showAgenda, setShowAgenda] = useState<boolean>(true)

  // Internal resource search modal (used when header dispatches 'open-resource-library')
  const ResourceSearchModal: React.FC<{ open: boolean; onClose: () => void }> = ({ open, onClose }) => {
    const [query, setQuery] = useState('')
    const [results, setResults] = useState<ResourceRow[]>([])
    const [loadingR, setLoadingR] = useState(false)

    const search = async (q: string) => {
      setLoadingR(true)
      try {
        const { data, error } = await supabase
          .from('resource_library')
          .select('id, title, description, content_type, category, media_url, external_url, is_public')
          .ilike('title', `%${q}%`)
          .order('created_at', { ascending: false })
          .limit(50)
        if (error) throw error
        setResults((data ?? []) as ResourceRow[])
      } catch (e) {
        console.error('[SessionBoard::ResourceSearchModal] search error:', e)
        push({ message: 'Resource search failed.', type: 'error' })
        setResults([])
      } finally {
        setLoadingR(false)
      }
    }

    const assign = async (r: ResourceRow) => {
      if (!caseId || !therapistId) return push({ message: 'Select a case before assigning resources.', type: 'error' })
      try {
        const payload = {
          case_id: caseId,
          therapist_id: therapistId,
          source: 'resource',
          source_id: r.id,
          title: `Resource: ${r.title}`,
          payload: { resource: r },
          created_at: new Date().toISOString(),
        }
        const { error } = await supabase.from('session_agenda').insert(payload as any)
        if (error) throw error
        push({ message: 'Assigned resource to session agenda.', type: 'success' })
        onClose()
        await loadAgenda()
      } catch (e) {
        console.error('[SessionBoard::ResourceSearchModal] assign error:', e)
        push({ message: 'Could not assign resource (check RLS).', type: 'error' })
      }
    }

    if (!open) return null
    return (
      <div className="fixed inset-0 z-50">
        <div className="absolute inset-0 bg-black/40" onClick={onClose} />
        <div className="absolute left-1/2 top-12 transform -translate-x-1/2 w-full max-w-3xl bg-white shadow-xl border rounded-lg">
          <div className="p-4 border-b flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">Search Resources</h3>
            <button onClick={onClose} className="text-gray-500">Close</button>
          </div>
          <div className="p-4">
            <div className="flex gap-2 mb-3">
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by title…" className="flex-1 px-3 py-2 border rounded" />
              <button onClick={() => void search(query)} className="px-3 py-2 rounded bg-blue-600 text-white">Search</button>
            </div>
            {loadingR ? (
              <div className="text-sm text-gray-500">Searching…</div>
            ) : results.length === 0 ? (
              <div className="text-sm text-gray-500">No results. Try another term or create a new resource.</div>
            ) : (
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {results.map(r => (
                  <div key={r.id} className="border rounded p-3 flex items-start justify-between">
                    <div>
                      <div className="text-sm font-medium text-gray-900">{r.title}</div>
                      <div className="text-xs text-gray-500">{r.content_type ?? 'other'} • {r.category ?? 'general'}</div>
                      {r.description ? <div className="text-sm text-gray-700 mt-1">{r.description.slice(0,200)}</div> : null}
                    </div>
                    <div className="flex flex-col gap-2">
                      <button onClick={() => void assign(r)} className="px-3 py-1 rounded bg-blue-600 text-white text-sm">Assign</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div className="mt-4 text-right">
              {/* Create new removed — resource creation is handled from a dedicated admin flow */}
            </div>
          </div>
        </div>
      </div>
    )
  }


  // Listen for header or other components requesting the resource library open
  useEffect(() => {
    const h = () => setShowResourceSearch(true)
    window.addEventListener('open-resource-library', h as any)
    return () => window.removeEventListener('open-resource-library', h as any)
  }, [])

  const [showResourceSearch, setShowResourceSearch] = useState(false)

  return (
    <div className="w-full h-full space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ClipboardList className="w-6 h-6 text-blue-600" />
          <h2 className="text-2xl font-bold text-gray-900">Session Board</h2>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => setShowAgenda(s => !s)} className="px-2 py-1 text-xs rounded border">{showAgenda ? 'Hide Agenda' : 'Show Agenda'}</button>
          <div className="text-xs text-gray-500">
            {!caseId ? 'Select a case from the header to enable sessions' : !therapistId ? 'Sign in required' : saving ? 'Saving…' : dirty ? 'Unsaved changes' : (saveInfo || 'Idle')}
          </div>
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left column: Session Agenda (kept but can be hidden) */}
        {showAgenda && (
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
                {/* Quick Resources removed — use the full Resource Library via the header or the resource search modal */}
          </div>
        )}

  {/* Note editor */}
  <div className={`${showAgenda ? 'lg:col-span-2' : 'lg:col-span-3'} bg-white border rounded-lg shadow-sm p-4`}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-3 items-center">
            <div>
              {/* Session history dropdown and new session control */}
              {caseId ? (
                <div className="flex items-center gap-2">
                  <select
                    value={sessionNoteId ?? ''}
                    onChange={(e) => {
                      const id = e.target.value || null
                      setSessionNoteId(id)
                      void loadSessionById(id)
                    }}
                    className="px-3 py-2 border rounded text-sm"
                  >
                    <option value="">Latest / Draft</option>
                    {sessionHistory.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.session_index ? `S${s.session_index}` : new Date(s.updated_at || '').toLocaleString()}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={async () => {
                      // start new session: determine next index and insert a new note row
                      try {
                        const { data: last } = await supabase
                          .from('session_notes')
                          .select('session_index')
                          .eq('therapist_id', therapistId)
                          .eq('case_id', caseId)
                          .order('session_index', { ascending: false })
                          .limit(1)
                          .maybeSingle()
                        const nextIndex = (last?.session_index ?? 0) + 1
                        const { data, error } = await supabase
                          .from('session_notes')
                          .insert({ therapist_id: therapistId, case_id: caseId, client_id: clientId || null, content: '', session_index: nextIndex, created_at: new Date().toISOString(), updated_at: new Date().toISOString() } as any)
                          .select('id')
                          .maybeSingle()
                        if (error) throw error
                        if (data?.id) {
                          setSessionNoteId(data.id)
                          setSessionIndex(nextIndex)
                          setContent('')
                          push({ message: 'Started new session', type: 'success' })
                        }
                      } catch (e) {
                        console.error('[SessionBoard] startNewSession error:', e)
                        push({ message: 'Could not start a new session.', type: 'error' })
                      }
                    }}
                    className="px-3 py-2 text-sm rounded border hover:bg-gray-50"
                  >
                    New Session
                  </button>
                </div>
              ) : (
                <div className="text-sm text-gray-500">Select a case from the header to enable sessions.</div>
              )}
            </div>

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
                        const ok = await persist(content)
                        if (ok) push({ message: 'Saved', type: 'success' })
                      }}
                      disabled={!caseId || !therapistId}
                      className="px-3 py-2 text-sm rounded-lg border border-gray-300 hover:bg-gray-50"
                    >
                      Save
                    </button>

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

                <button
                  onClick={async () => {
                    if (!caseId) return push({ message: 'Select a case first', type: 'info' })
                    // Export recent notes and activities for this case
                    try {
                      const [{ data: notes, error: nErr }, { data: acts, error: aErr }] = await Promise.all([
                        supabase
                          .from('session_notes')
                          .select('id, case_id, therapist_id, content, created_at, updated_at, session_index')
                          .eq('case_id', caseId)
                          .order('updated_at', { ascending: false })
                          .limit(30),
                        supabase
                          .from('client_activities')
                          .select('id, case_id, client_id, type, title, details, occurred_at, session_phase, reviewed_at, reviewed_by')
                          .eq('case_id', caseId)
                          .order('occurred_at', { ascending: false })
                          .limit(50),
                      ])
                      if (nErr || aErr) throw nErr || aErr

                      // Load jsPDF via helper which normalizes CJS/ESM shapes
                      const jsPDF = await loadJsPDF()
                      if (!jsPDF) {
                        push({ message: 'PDF export requires the "jspdf" package. Install with `npm i jspdf`.', type: 'info' })
                        return
                      }
                      const doc = new jsPDF()
                      let y = 14
                      const line = (txt: string) => { doc.text(txt, 14, y); y += 6 }
                      doc.setFont('helvetica', 'bold'); doc.setFontSize(14)
                      line(`Case Summary — ${caseId}`)
                      doc.setFont('helvetica', 'normal'); doc.setFontSize(10)
                      line(`Generated: ${new Date().toLocaleString()}`)
                      y += 4
                      doc.setFont('helvetica', 'bold'); line('Recent Session Notes')
                      doc.setFont('helvetica', 'normal')
                      ;(notes ?? []).slice(0, 20).forEach((n: any) => {
                        const txt = typeof n.content === 'string' ? n.content : JSON.stringify(n.content)
                        const head = `${new Date(n.updated_at || n.created_at).toLocaleString()} — S${n.session_index ?? '•'}`
                        line(head)
                        const chunks = txt.slice(0, 800).match(/.{1,90}(\s|$)/g) || []
                        chunks.forEach((c: string) => { line(c.trim()) })
                        y += 2
                        if (y > 280) { doc.addPage(); y = 14 }
                      })
                      doc.save(`case-summary-${caseId}.pdf`)
                    } catch (e) {
                      console.error('[SessionBoard] export error', e)
                      push({ message: 'Export failed. Check console for details.', type: 'error' })
                    }
                  }}
                  className="px-3 py-2 text-sm rounded-lg border hover:bg-gray-50"
                >
                  Export Summary
                </button>
              </div>
            </>
          )}
        </div>
        {/* Right column: Assessments & In-Between panel (embedded) */}
        <div className={`hidden lg:block bg-white border rounded-lg shadow-sm p-4 ${showAgenda ? '' : 'lg:col-span-3'}`}>
          {caseId ? (
            <div className="space-y-4">
              <div>
                <AssessmentWorkspace />
              </div>
              <div>
                <InBetweenSessions caseFile={{ client: { id: clientId } }} onUpdate={() => { void loadAgenda() }} />
              </div>
            </div>
          ) : (
            <div className="text-sm text-gray-500">Select a case to enable assessments & in-between tasks.</div>
          )}
        </div>
      </div>
    </div>
  )
})

export default SessionBoard
