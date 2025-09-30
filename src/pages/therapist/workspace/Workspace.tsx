import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
} from 'react'
import { useParams, useNavigate } from 'react-router-dom'

// ✅ correct paths for /src/pages/therapist/workspace/Workspace.tsx
import { supabase } from '../../../lib/supabase'
import { useAuth } from '../../../hooks/useAuth'
import SessionBoard, { SessionBoardHandle } from '../../../components/therapist/SessionBoard'
import AssessmentWorkspace from '../../../components/assessment/AssessmentWorkspace'

import {
  ClipboardList, Flag, LogOut, FileText, AlertTriangle, X, Clock, ChevronRight,
  Plus, Shield, Globe, Download, RefreshCw
} from 'lucide-react'
import { useToast } from '../../../components/ui/Toast'
import ConfirmModal from '../../../components/ui/ConfirmModal'

/* =========================================================
   Types (adjust to your schema if needed)
========================================================= */

type CaseItem = {
  id: string
  case_number?: string | null
  client_id?: string | null
  status?: string | null
  client?: { first_name?: string | null; last_name?: string | null } | null
}

type PlanPhase = {
  id: string
  case_id?: string
  phase: string
  planned_date?: string | null
  session_index?: number | null
}

type SessionNote = {
  id: string
  case_id: string
  therapist_id: string
  session_index?: number | null
  content: string | any
  created_at?: string | null
  updated_at?: string | null
}

type ClientActivity = {
  id: string
  case_id: string
  client_id: string
  type: 'assessment' | 'journal' | 'homework' | string
  title?: string | null
  details?: string | null
  occurred_at?: string | null
  session_phase?: string | null
  reviewed_at?: string | null
  reviewed_by?: string | null
}

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

const fmt = (d?: string | null) => (d ? new Date(d).toLocaleString() : 'n/a')

/* =========================================================
   AI summary helper (optional Edge Function)
========================================================= */
async function getAIHighlightsOrFallback(texts: string[]): Promise<string> {
  try {
    const resp = await fetch('/functions/v1/ai_summarize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ texts }),
    })
    if (resp.ok) {
      const json = await resp.json()
      if (json?.summary) return json.summary as string
    }
  } catch {
    // ignore
  }
  const lines = texts
    .map(t => (typeof t === 'string' ? t : JSON.stringify(t)))
    .join('\n')
  const picks = lines
    .split('\n')
    .map(s => s.trim())
    .filter(Boolean)
    .slice(0, 8)
  return picks.length ? `• ${picks.join('\n• ')}` : 'No salient highlights could be extracted.'
}

/* =========================================================
   Drawer: Single note or paginated notes with AI summary
========================================================= */

const NotesDrawer: React.FC<{
  open: boolean
  onClose: () => void
  header: string
  mode: 'single' | 'phase'
  note?: SessionNote | null
  caseId: string
  sessionIndex?: number | null
}> = ({ open, onClose, header, mode, note, caseId, sessionIndex }) => {
  const [page, setPage] = useState(0)
  const [pageSize] = useState(5)
  const [loading, setLoading] = useState(false)
  const [items, setItems] = useState<SessionNote[]>([])
  const [aiSummary, setAiSummary] = useState<string>('')

  const loadPage = useCallback(async () => {
    if (mode !== 'phase' || sessionIndex == null) return
    try {
      setLoading(true)
      const from = page * pageSize
      const to = from + pageSize - 1
      const { data, error } = await supabase
        .from('session_notes')
        .select('id, case_id, therapist_id, content, created_at, updated_at, session_index')
        .eq('case_id', caseId)
        .eq('session_index', sessionIndex)
        .order('updated_at', { ascending: false })
        .range(from, to)

      if (error) throw error
      setItems((data ?? []) as SessionNote[])

      const texts = (data ?? []).map(n => (typeof n.content === 'string' ? n.content : JSON.stringify(n.content)))
      const sum = await getAIHighlightsOrFallback(texts)
      setAiSummary(sum)
    } catch (e) {
      console.error('[NotesDrawer] load page error:', e)
      setItems([])
      setAiSummary('Could not generate highlights.')
    } finally {
      setLoading(false)
    }
  }, [mode, page, pageSize, caseId, sessionIndex])

  useEffect(() => {
    if (open && mode === 'phase') {
      void loadPage()
    }
  }, [open, mode, page, loadPage])

  if (!open) return null

  const singleText =
    typeof note?.content === 'string'
      ? note?.content
      : note?.content
      ? JSON.stringify(note?.content, null, 2)
      : ''

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="absolute right-0 top-0 h-full w-full max-w-xl bg-white shadow-xl border-l flex flex-col">
        <div className="p-4 border-b flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-blue-600" />
            <h3 className="font-semibold text-gray-900">{header}</h3>
          </div>
          <button onClick={onClose} className="p-1 rounded hover:bg-gray-100">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {mode === 'single' ? (
          <div className="p-4 overflow-y-auto">
            <div className="text-xs text-gray-500 mb-2">
              Updated: {note?.updated_at ? new Date(note.updated_at).toLocaleString() : 'n/a'}
            </div>
            <textarea className="w-full h-[70vh] border rounded p-3 text-sm" defaultValue={singleText} readOnly />
          </div>
        ) : (
          <div className="flex-1 flex flex-col">
            <div className="p-4 border-b flex items-center justify-between">
              <div className="text-sm text-gray-600">All notes in session {sessionIndex}</div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage(p => Math.max(0, p - 1))}
                  className="px-2 py-1 text-xs border rounded disabled:opacity-50"
                  disabled={page === 0 || loading}
                >
                  Prev
                </button>
                <div className="text-xs text-gray-500">Page {page + 1}</div>
                <button
                  onClick={() => setPage(p => p + 1)}
                  className="px-2 py-1 text-xs border rounded disabled:opacity-50"
                  disabled={loading || items.length < pageSize}
                >
                  Next
                </button>
                <button
                  onClick={() => void loadPage()}
                  className="px-2 py-1 text-xs border rounded inline-flex items-center gap-1 disabled:opacity-50"
                  disabled={loading}
                  title="Refresh"
                >
                  <RefreshCw className="w-3 h-3" /> Refresh
                </button>
              </div>
            </div>

            <div className="p-4 space-y-3 overflow-y-auto">
              {loading ? (
                <div className="text-sm text-gray-500">Loading…</div>
              ) : items.length === 0 ? (
                <div className="text-sm text-gray-500">No notes found.</div>
              ) : (
                items.map(n => (
                  <div key={n.id} className="border rounded p-3">
                    <div className="flex items-center justify-between">
                      <div className="text-xs text-gray-500">{fmt(n.updated_at)}</div>
                      <div className="text-[11px] text-gray-400">#{n.id.slice(0, 6)}…</div>
                    </div>
                    <div className="mt-1 text-sm text-gray-800 whitespace-pre-wrap">
                      {(typeof n.content === 'string' ? n.content : JSON.stringify(n.content)).slice(0, 600)}
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="p-4 border-t">
              <div className="text-xs font-medium text-gray-700 mb-1">AI Highlights</div>
              <pre className="text-xs bg-gray-50 border rounded p-3 whitespace-pre-wrap">{aiSummary}</pre>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

/* =========================================================
   Timeline
========================================================= */

const SessionTimeline: React.FC<{
  caseId: string
  onOpenNote: (n: SessionNote, label: string) => void
  onOpenPhase: (sessionIndex: number | null, label: string) => void
}> = ({ caseId, onOpenNote, onOpenPhase }) => {
  const [phases, setPhases] = useState<PlanPhase[]>([])
  const [notesMap, setNotesMap] = useState<Record<string, SessionNote[]>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    const run = async () => {
      try {
        setLoading(true)
        setError(null)

        const { data: phasesRows, error: pErr } = await supabase
          .from('treatment_plan_phases')
          .select('id, case_id, phase, planned_date, session_index')
          .eq('case_id', caseId)
          .order('session_index', { ascending: true })

        if (pErr) throw pErr

        const { data: notesRows, error: nErr } = await supabase
          .from('session_notes')
          .select('id, case_id, therapist_id, content, created_at, updated_at, session_index')
          .eq('case_id', caseId)
          .order('updated_at', { ascending: false })

        if (nErr) throw nErr

        if (cancelled) return
        setPhases((phasesRows ?? []) as PlanPhase[])

        const byIndex: Record<string, SessionNote[]> = {}
        ;(notesRows ?? []).forEach((n: any) => {
          const key = n.session_index ? String(n.session_index) : 'misc'
          byIndex[key] = byIndex[key] ? [...byIndex[key], n] : [n]
        })
        setNotesMap(byIndex)
      } catch (e) {
        console.error('[SessionTimeline] error:', e)
        if (!cancelled) {
          setError('Failed to load timeline.')
          setPhases([])
          setNotesMap({})
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    run()
    return () => { cancelled = true }
  }, [caseId])

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-3">
        <div className="animate-pulse h-5 w-40 bg-gray-200 rounded" />
      </div>
    )
  }
  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-3">
        <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded p-2 text-sm">
          {error}
        </div>
      </div>
    )
  }

  return (
    <div className="border-b">
      <div className="max-w-7xl mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="font-medium text-gray-900">Session Progress Timeline</div>
        </div>

        <div className="mt-3 flex items-center gap-3 overflow-x-auto pb-2">
          {phases.length === 0 ? (
            <div className="text-sm text-gray-500">No treatment plan phases found.</div>
          ) : (
            phases.map((ph) => {
              const key = ph.session_index ? String(ph.session_index) : 'misc'
              const related = notesMap[key] || []
              const planned = ph.planned_date ? new Date(ph.planned_date).toLocaleDateString() : 'n/a'
              const hasDeviation = false

              return (
                <div key={ph.id} className="min-w-[240px] bg-white border rounded-lg p-3">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-medium text-gray-900">
                      {ph.session_index ? `S${ph.session_index}` : ph.phase}
                    </div>
                    {hasDeviation && (
                      <span className="inline-flex items-center text-xs text-red-600">
                        <AlertTriangle className="w-3.5 h-3.5 mr-1" /> Deviation
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-gray-500">{ph.phase}</div>
                  <div className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                    <Clock className="w-3.5 h-3.5" /> {planned}
                  </div>

                  <div className="mt-2 border-t pt-2">
                    {related.length === 0 ? (
                      <div className="text-xs text-gray-400">No notes</div>
                    ) : (
                      related.slice(0, 2).map((n) => (
                        <button
                          key={n.id}
                          onClick={() => onOpenNote(n, `Session ${ph.session_index ?? ph.phase}`)}
                          className="w-full text-left text-xs text-blue-700 hover:underline truncate"
                          title="Open note"
                        >
                          {(typeof n.content === 'string' ? n.content : JSON.stringify(n.content)).slice(0, 60)}…
                        </button>
                      ))
                    )}
                    {related.length > 2 && (
                      <div className="text-[11px] text-gray-500 mt-1">{related.length - 2} more…</div>
                    )}
                  </div>

                  <div className="mt-2 flex items-center gap-2">
                    <button
                      onClick={() => onOpenNote(related[0] || ({} as any), `Session ${ph.session_index ?? ph.phase}`)}
                      className="text-xs px-2 py-1 rounded border hover:bg-gray-50 inline-flex items-center gap-1"
                      disabled={related.length === 0}
                      title={related.length === 0 ? 'No notes to open' : 'Open latest note'}
                    >
                      Open latest <ChevronRight className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => onOpenPhase(ph.session_index ?? null, `Session ${ph.session_index ?? ph.phase} — All notes`)}
                      className="text-xs px-2 py-1 rounded bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100"
                    >
                      View all
                    </button>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}

/* =========================================================
   In-Between Sessions Panel
========================================================= */

const InBetweenPanel: React.FC<{
  caseId: string
  therapistId: string
}> = ({ caseId, therapistId }) => {
  const { push } = useToast()
  const [rows, setRows] = useState<ClientActivity[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<'all' | 'assessment' | 'journal' | 'homework'>('all')

  const load = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const { data, error } = await supabase
        .from('client_activities')
        .select('id, case_id, client_id, type, title, details, occurred_at, session_phase, reviewed_at, reviewed_by')
        .eq('case_id', caseId)
        .order('occurred_at', { ascending: false })

      if (error) throw error
      setRows((data ?? []) as ClientActivity[])
    } catch (e) {
      console.error('[InBetweenPanel] fetch error:', e)
      setRows([])
      setError('Failed to load activities.')
    } finally {
      setLoading(false)
    }
  }, [caseId])

  useEffect(() => { void load() }, [load])

  const filtered = useMemo(
    () => rows.filter(r => (filter === 'all' ? true : r.type === filter)),
    [rows, filter]
  )

  const markReviewed = async (id: string) => {
    try {
      const { error } = await supabase
        .from('client_activities')
        .update({ reviewed_at: new Date().toISOString(), reviewed_by: therapistId })
        .eq('id', id)
      if (error) throw error
      await load()
    } catch (e) {
      console.error('[InBetweenPanel] markReviewed error:', e)
      push({ message: 'Could not mark reviewed.', type: 'error' })
    }
  }

  const addToNextSession = async (row: ClientActivity) => {
    try {
      const payload = {
        case_id: row.case_id,
        therapist_id: therapistId,
        source: 'client_activity',
        source_id: row.id,
        title: row.title || `${row.type} item`,
        payload: {
          type: row.type,
          details: row.details,
          session_phase: row.session_phase,
          occurred_at: row.occurred_at,
        },
        created_at: new Date().toISOString(),
      }
      const { error } = await supabase.from('session_agenda').insert(payload as any)
      if (error) throw error
      push({ message: 'Added to next session', type: 'success' })
    } catch (e) {
      console.error('[InBetweenPanel] addToNextSession error:', e)
      push({ message: 'Could not add to next session (check table session_agenda & RLS).', type: 'error' })
    }
  }

  return (
    <div className="bg-white border rounded-xl p-4 space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="font-medium text-gray-900">In-Between Sessions</h3>
        <div className="flex items-center gap-2">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as any)}
            className="px-2 py-1 text-xs border rounded"
          >
            <option value="all">All</option>
            <option value="assessment">Assessments</option>
            <option value="journal">Journals</option>
            <option value="homework">Homework</option>
          </select>
          <button onClick={load} className="text-xs px-2 py-1 rounded border hover:bg-gray-50 inline-flex items-center gap-1">
            <RefreshCw className="w-3 h-3" /> Refresh
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-sm text-gray-500">Loading...</div>
      ) : error ? (
        <div className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded p-2">{error}</div>
      ) : filtered.length === 0 ? (
        <div className="text-sm text-gray-500">No activities.</div>
      ) : (
        <div className="space-y-2">
          {filtered.map((r) => (
            <div key={r.id} className="border rounded p-3">
              <div className="flex items-center justify-between">
                <div className="text-sm font-medium text-gray-900">
                  {r.title || (r.type[0].toUpperCase() + r.type.slice(1))}
                </div>
                <div className="text-xs text-gray-500">{fmt(r.occurred_at)}</div>
              </div>
              <div className="text-xs text-gray-500">
                {r.type} {r.session_phase ? `• ${r.session_phase}` : null}
              </div>
              {r.details ? <div className="text-sm text-gray-700 mt-1 whitespace-pre-wrap">{r.details}</div> : null}

              <div className="mt-2 flex items-center gap-2">
                <button
                  onClick={() => addToNextSession(r)}
                  className="text-xs px-2 py-1 rounded bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100"
                >
                  Add to Next Session
                </button>
                <button
                  onClick={() => markReviewed(r.id)}
                  className="text-xs px-2 py-1 rounded border hover:bg-gray-50"
                  disabled={!!r.reviewed_at}
                  title={r.reviewed_at ? `Reviewed: ${fmt(r.reviewed_at)}` : 'Mark reviewed'}
                >
                  {r.reviewed_at ? 'Reviewed' : 'Mark Reviewed'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/* =========================================================
   Quick "Create Resource" Modal with Public/Private toggle
========================================================= */

const CreateQuickResourceModal: React.FC<{
  ownerId: string
  onClose: () => void
  onCreated: (r: ResourceRow) => void
}> = ({ ownerId, onClose, onCreated }) => {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [contentType, setContentType] = useState('pdf')
  const [category, setCategory] = useState('worksheet')
  const [isPublic, setIsPublic] = useState(false)
  const [externalUrl, setExternalUrl] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [saving, setSaving] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return
    try {
      setSaving(true)
      let storage_path: string | null = null
      let media_url: string | null = null
      const ext_url = externalUrl.trim() || null

      if (file) {
        const key = `uploads/${Date.now()}_${file.name}`
        const { error: upErr } = await supabase.storage.from('resource_files').upload(key, file, {
          cacheControl: '3600',
          upsert: false,
        })
        if (upErr) throw upErr
        storage_path = key
        const { data: pub } = supabase.storage.from('resource_files').getPublicUrl(key)
        media_url = pub?.publicUrl || null
      }

      const { data, error } = await supabase
        .from('resource_library')
        .insert({
          title,
          description,
          category,
          content_type: contentType,
          therapist_owner_id: ownerId,
          is_public: isPublic,
          media_url: media_url || null,
          storage_path,
          external_url: ext_url,
        })
        .select('id, title, description, content_type, category, is_public, therapist_owner_id, media_url, storage_path, external_url, created_at')
        .single()

      if (error) throw error
      onCreated(data as ResourceRow)
      onClose()
    } catch (e) {
      console.error('[CreateQuickResourceModal] error:', e)
      push({ message: 'Could not create resource. Check storage bucket & RLS.', type: 'error' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="fixed inset-0 bg-gray-900/50" onClick={onClose} />
        <div className="relative bg-white rounded-xl shadow-xl max-w-2xl w-full">
          <form onSubmit={submit}>
            <div className="p-5 border-b flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Create Resource</h3>
              <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <label className="block">
                  <span className="block text-sm font-medium text-gray-700 mb-1">Title</span>
                  <input value={title} onChange={(e) => setTitle(e.target.value)} className="w-full px-3 py-2 border rounded" required />
                </label>
                <label className="block">
                  <span className="block text-sm font-medium text-gray-700 mb-1">Category</span>
                  <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full px-3 py-2 border rounded">
                    <option value="worksheet">Worksheet</option>
                    <option value="educational">Educational</option>
                    <option value="intervention">Intervention</option>
                    <option value="protocol">Protocol</option>
                  </select>
                </label>
              </div>

              <label className="block">
                <span className="block text-sm font-medium text-gray-700 mb-1">Description</span>
                <textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} className="w-full px-3 py-2 border rounded" />
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <label className="block">
                  <span className="block text-sm font-medium text-gray-700 mb-1">Content Type</span>
                  <select value={contentType} onChange={(e) => setContentType(e.target.value)} className="w-full px-3 py-2 border rounded">
                    <option value="pdf">PDF</option>
                    <option value="video">Video</option>
                    <option value="audio">Audio</option>
                    <option value="link">External Link</option>
                  </select>
                </label>

                <label className="block">
                  <span className="block text-sm font-medium text-gray-700 mb-1">Visibility</span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setIsPublic(false)}
                      className={`flex-1 px-3 py-2 border rounded inline-flex items-center gap-1 ${!isPublic ? 'bg-gray-900 text-white' : ''}`}
                    >
                      <Shield className="w-4 h-4" /> Private
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsPublic(true)}
                      className={`flex-1 px-3 py-2 border rounded inline-flex items-center gap-1 ${isPublic ? 'bg-blue-600 text-white' : ''}`}
                    >
                      <Globe className="w-4 h-4" /> Public
                    </button>
                  </div>
                </label>

                <label className="block">
                  <span className="block text-sm font-medium text-gray-700 mb-1">External URL</span>
                  <input value={externalUrl} onChange={(e) => setExternalUrl(e.target.value)} placeholder="https://…" className="w-full px-3 py-2 border rounded" />
                </label>
              </div>

              <label className="block">
                <span className="block text-sm font-medium text-gray-700 mb-1">Upload file (optional)</span>
                <input type="file" onChange={(e) => setFile(e.target.files?.[0] || null)} className="w-full text-sm" />
              </label>
            </div>

            <div className="p-5 border-t flex justify-end gap-2">
              <button type="button" onClick={onClose} className="px-4 py-2 border rounded">Cancel</button>
              <button type="submit" disabled={saving || !title.trim()} className="px-6 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50">
                {saving ? 'Saving…' : 'Create'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

/* =========================================================
   Resource Search / Assign Modal
   - search resource_library by title/category
   - assign selected resource to current case/client by inserting session_agenda with source=resource
========================================================= */

const ResourceSearchModal: React.FC<{
  open: boolean
  onClose: () => void
  caseId?: string
  clientId?: string | null
  therapistId?: string | null
  onCreateNew?: () => void
}> = ({ open, onClose, caseId, clientId, therapistId, onCreateNew }) => {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<ResourceRow[]>([])
  const [loading, setLoading] = useState(false)
  const { push } = useToast()

  const search = async (q: string) => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('resource_library')
        .select('id, title, description, content_type, category, media_url, external_url')
        .ilike('title', `%${q}%`)
        .order('created_at', { ascending: false })
        .limit(50)
      if (error) throw error
      setResults((data ?? []) as ResourceRow[])
    } catch (e) {
      console.error('[ResourceSearchModal] search error:', e)
      push({ message: 'Resource search failed.', type: 'error' })
      setResults([])
    } finally {
      setLoading(false)
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
    } catch (e) {
      console.error('[ResourceSearchModal] assign error:', e)
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
          {loading ? (
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
                    <button onClick={() => assign(r)} className="px-3 py-1 rounded bg-blue-600 text-white text-sm">Assign</button>
                  </div>
                </div>
              ))}
            </div>
          )}
          <div className="mt-4 text-right">
            <button onClick={() => { onClose(); onCreateNew?.() }} className="px-3 py-2 rounded border">Create new</button>
          </div>
        </div>
      </div>
    </div>
  )
}

/* =========================================================
   PDF Export helper — lazy import with vite-ignore
========================================================= */

async function exportCaseSummaryPDF(args: {
  caseTitle: string
  caseId: string
  notes: SessionNote[]
  activities: ClientActivity[]
}) {
  const { caseTitle, caseId, notes, activities } = args

  // Avoid Vite pre-bundling; caller will show a toast if this returns false
  let jsPDFMod: any = null
  try {
    jsPDFMod = await import(/* @vite-ignore */ 'jspdf')
  } catch {
    return false
  }

  const jsPDF = jsPDFMod.default || jsPDFMod.jsPDF || jsPDFMod
  const doc = new jsPDF()

  const line = (txt: string, y: number) => doc.text(txt, 14, y)
  let y = 14

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(16)
  line(`Case Summary — ${caseTitle}`, y); y += 8
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  line(`Case ID: ${caseId}`, y); y += 6
  line(`Generated: ${new Date().toLocaleString()}`, y); y += 8

  doc.setFont('helvetica', 'bold')
  line('In-Between Activities', y); y += 6
  doc.setFont('helvetica', 'normal')
  if (activities.length === 0) {
    line('• None', y); y += 6
  } else {
    activities.slice(0, 20).forEach(a => {
      const t = `${fmt(a.occurred_at)} — ${a.type}${a.title ? ` — ${a.title}` : ''}`
      line(`• ${t}`.slice(0, 96), y); y += 6
      if (y > 280) { doc.addPage(); y = 14 }
    })
  }
  y += 2

  doc.setFont('helvetica', 'bold')
  line('Recent Session Notes', y); y += 6
  doc.setFont('helvetica', 'normal')
  if (notes.length === 0) {
    line('• None', y); y += 6
  } else {
    notes.slice(0, 10).forEach(n => {
      const head = `${fmt(n.updated_at)} — S${n.session_index ?? '•'}`
      line(head, y); y += 6
      const txt = (typeof n.content === 'string' ? n.content : JSON.stringify(n.content)).slice(0, 800)
      const chunks = txt.match(/.{1,90}(\s|$)/g) || []
      chunks.forEach(c => {
        line(c.trim(), y); y += 5
        if (y > 280) { doc.addPage(); y = 14 }
      })
      y += 2
      if (y > 280) { doc.addPage(); y = 14 }
    })
  }

  doc.save(`case-summary-${caseId}.pdf`)
  return true
}

/* =========================================================
   MAIN WORKSPACE
========================================================= */

export default function Workspace() {
  const { caseId: routeCaseId } = useParams<{ caseId: string }>()
  const navigate = useNavigate()
  const { profile } = useAuth()

  const [cases, setCases] = useState<CaseItem[]>([])
  const [loadingCases, setLoadingCases] = useState<boolean>(true)
  const [casesError, setCasesError] = useState<string | null>(null)
  const [selectedCaseId, setSelectedCaseId] = useState<string>(routeCaseId || '')
  const [showAssessment, setShowAssessment] = useState<boolean>(() => {
    try { const v = localStorage.getItem('ws_show_assessment'); return v === null ? true : v === 'true' } catch { return true }
  })

  // Guard state (mirrors SessionBoard)
  const sessionRef = useRef<SessionBoardHandle | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [isDirty, setIsDirty] = useState(false)

  // Notes drawer state
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [drawerHeader, setDrawerHeader] = useState('')
  const [drawerNote, setDrawerNote] = useState<SessionNote | null>(null)
  const [drawerMode, setDrawerMode] = useState<'single' | 'phase'>('single')
  const [drawerSessionIndex, setDrawerSessionIndex] = useState<number | null>(null)

  // Quick resource modal (🔥 removed stray "the:" label that caused the parser error)
  const [showCreateResource, setShowCreateResource] = useState(false)
  const [showResourceSearch, setShowResourceSearch] = useState(false)
  const [resourceQuery, setResourceQuery] = useState('')
  const [searchResults, setSearchResults] = useState<ResourceRow[]>([])
  const [searchLoading, setSearchLoading] = useState(false)
  const [showAgenda, setShowAgenda] = useState(true)
  const [showInBetween, setShowInBetween] = useState(true)
  // Confirm modal state for leaving with unsaved changes
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [confirmResolve, setConfirmResolve] = useState<null | ((v: boolean) => void)>(null)
  const { push } = useToast()

  // Load cases for dropdown
  useEffect(() => {
    const run = async () => {
      if (!profile?.id) {
        setCases([])
        setLoadingCases(false)
        return
      }
      setLoadingCases(true)
      setCasesError(null)
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
        setCasesError('Failed to load cases.')
        setCases([])
      } finally {
        setLoadingCases(false)
      }
    }
    run()
  }, [profile])

  // Listen for programmatic 'open-resource-library' events from SessionBoard
  useEffect(() => {
    const h = () => setShowResourceSearch(true)
    window.addEventListener('open-resource-library', h as any)
    return () => window.removeEventListener('open-resource-library', h as any)
  }, [])

  // Sync selected with route
  useEffect(() => {
    setSelectedCaseId(routeCaseId || '')
  }, [routeCaseId])

  // Window/tab close guard
  // HMR touch: timestamp to trigger Vite update
  // touched: 2025-09-30T00:00:00Z
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

  const confirmLeave = useCallback(async () => {
    if (!isSaving && !isDirty) return true
    try {
      // Open confirm modal and await user's choice
      const wantsToLeave = await new Promise<boolean>((resolve) => {
        setConfirmOpen(true)
        setConfirmResolve(() => (v: boolean) => {
          setConfirmOpen(false)
          setConfirmResolve(null)
          resolve(v)
        })
      })
      if (!wantsToLeave) return false
      if (isDirty && sessionRef.current) {
        const ok = await sessionRef.current.saveNow()
        return ok || true
      }
      return true
    } catch (e) {
      console.error('[Workspace] confirmLeave error:', e)
      try { push({ message: 'Could not confirm leave. Please try again.', type: 'error' }) } catch {}
      return false
    }
  }, [isSaving, isDirty])

  const onChangeCase = useCallback(
    async (newId: string) => {
      if (!newId || newId === selectedCaseId) return
      try {
        const ok = await confirmLeave()
        if (!ok) return
        setSelectedCaseId(newId)
        navigate(`/cases/${newId}/workspace`)
      } catch (e) {
        console.error('[Workspace] onChangeCase error:', e)
        try { push({ message: 'Error switching case. Please try again.', type: 'error' }) } catch {}
      }
    },
    [confirmLeave, navigate, selectedCaseId]
  )

  // Flag Case → supervision_flags + upsert case_summaries
  const flagCase = useCallback(async () => {
    if (!profile?.id || !selectedCaseId) return
    try {
      push({ message: 'Flagging case for supervision…', type: 'info' })
      const { error: fErr } = await supabase.from('supervision_flags').insert({
        case_id: selectedCaseId,
        therapist_id: profile.id,
        status: 'open',
        reason: 'Flagged from Workspace',
        created_at: new Date().toISOString(),
      } as any)
      if (fErr) throw fErr

      const c = cases.find(x => x.id === selectedCaseId)
      const caseNum = c?.case_number ? `Case ${c.case_number}` : `Case ${selectedCaseId.slice(0,6)}…`
      const clientName = `${c?.client?.first_name ?? ''} ${c?.client?.last_name ?? ''}`.trim()
      const title = clientName ? `${clientName} — ${caseNum}` : caseNum

      const { data: latestNote } = await supabase
        .from('session_notes')
        .select('content, updated_at')
        .eq('case_id', selectedCaseId)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      const highlightSource = latestNote?.content
        ? (typeof latestNote.content === 'string' ? latestNote.content : JSON.stringify(latestNote.content))
        : 'Flagged for supervision.'
      const last_highlight = highlightSource.slice(0, 240)

      const { error: sErr } = await supabase
        .from('case_summaries')
        .upsert({
          case_id: selectedCaseId,
          title,
          last_highlight,
          updated_at: new Date().toISOString(),
          updated_by: profile.id,
        } as any, { onConflict: 'case_id' } as any)

      if (sErr) throw sErr

      push({ message: 'Flagged for supervision and summary updated.', type: 'success' })
    } catch (e) {
      console.error('[Workspace] flagCase error:', e)
      push({ message: 'Could not flag the case (check tables & RLS).', type: 'error' })
    }
  }, [cases, profile, selectedCaseId])

  const handleSaveAndExit = useCallback(async () => {
    if (sessionRef.current) {
      const ok = await sessionRef.current.saveNow()
      if (ok && selectedCaseId) navigate(`/cases/${selectedCaseId}`)
    }
  }, [navigate, selectedCaseId])

  const current = useMemo(
    () => cases.find((c) => c.id === selectedCaseId) || null,
    [cases, selectedCaseId]
  )

  // Open single/phase drawers
  const openNoteDrawer = (n: SessionNote, label: string) => {
    setDrawerNote(n || null)
    setDrawerHeader(label)
    setDrawerMode('single')
    setDrawerSessionIndex(n?.session_index ?? null)
    setDrawerOpen(true)
  }
  const openPhaseDrawer = (sessionIndex: number | null, label: string) => {
    setDrawerNote(null)
    setDrawerHeader(label)
    setDrawerMode('phase')
    setDrawerSessionIndex(sessionIndex ?? null)
    setDrawerOpen(true)
  }

  /* Agenda Panel (moved from SessionBoard) */
  const AgendaPanel: React.FC<{ caseId?: string; therapistId?: string | null }> = ({ caseId, therapistId }) => {
    const [agendaRows, setAgendaRows] = useState<AgendaItem[]>([])
    const [loading, setLoading] = useState(false)
    const [err, setErr] = useState<string | null>(null)

    const load = async () => {
      if (!caseId || !therapistId) { setAgendaRows([]); return }
      setLoading(true); setErr(null)
      try {
        const { data, error } = await supabase
          .from('session_agenda')
          .select('id, case_id, therapist_id, source, source_id, title, payload, created_at, completed_at')
          .eq('case_id', caseId)
          .eq('therapist_id', therapistId)
          .order('created_at', { ascending: false })
        if (error) throw error
        setAgendaRows((data ?? []) as AgendaItem[])
      } catch (e) {
        console.error('[AgendaPanel] load error:', e)
        setAgendaRows([])
        setErr('Failed to load agenda.')
      } finally { setLoading(false) }
    }

    useEffect(() => { void load() }, [caseId, therapistId])

    const toggleDone = async (id: string, done: boolean) => {
      try {
        const { error } = await supabase.from('session_agenda').update({ completed_at: done ? new Date().toISOString() : null }).eq('id', id)
        if (error) throw error
        await load()
      } catch (e) {
        console.error('[AgendaPanel] toggleDone error:', e)
        push({ message: 'Could not update agenda item.', type: 'error' })
      }
    }

    const remove = async (id: string) => {
      const ok = confirm('Remove agenda item?')
      if (!ok) return
      try {
        const { error } = await supabase.from('session_agenda').delete().eq('id', id)
        if (error) throw error
        await load()
      } catch (e) {
        console.error('[AgendaPanel] remove error:', e)
        push({ message: 'Could not remove agenda item.', type: 'error' })
      }
    }

    if (!caseId) {
      return (
        <div className="bg-white border rounded-xl p-4">
          <h3 className="font-medium text-gray-900 mb-1">Session Agenda</h3>
          <p className="text-sm text-gray-500">Select a case to view session agenda.</p>
        </div>
      )
    }

    return (
      <div className="bg-white border rounded-xl p-4">
        <div className="flex items-center justify-between">
          <h3 className="font-medium text-gray-900">Session Agenda</h3>
          <div className="flex items-center gap-2">
            <button onClick={() => void load()} className="px-2 py-1 text-xs rounded border">Refresh</button>
            <button onClick={() => setShowResourceSearch(true)} className="px-2 py-1 text-xs rounded border">Add Resource</button>
          </div>
        </div>
        <div className="mt-3">
          {loading ? (
            <div className="text-sm text-gray-500">Loading…</div>
          ) : err ? (
            <div className="text-sm text-red-600">{err}</div>
          ) : agendaRows.length === 0 ? (
            <div className="text-sm text-gray-500">No queued items yet.</div>
          ) : (
            <div className="space-y-2">
              {agendaRows.map(a => (
                <div key={a.id} className="border rounded p-2 flex items-start justify-between">
                  <div>
                    <div className="text-sm font-medium">{a.title}</div>
                    <div className="text-xs text-gray-500">{a.source ?? '—'} • {fmt(a.created_at)}</div>
                    {a.payload?.details && <div className="text-sm text-gray-700 mt-1">{a.payload.details}</div>}
                  </div>
                  <div className="flex flex-col gap-2">
                    <button onClick={() => void toggleDone(a.id, !a.completed_at)} className="px-2 py-1 text-xs rounded bg-green-600 text-white">{a.completed_at ? 'Undo' : 'Done'}</button>
                    <button onClick={() => void remove(a.id)} className="px-2 py-1 text-xs rounded border">Remove</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    )
  }

  // Export PDF
  const onExportPDF = useCallback(async () => {
    if (!selectedCaseId) return
    const [{ data: notes }, { data: acts }] = await Promise.all([
      supabase
        .from('session_notes')
        .select('id, case_id, therapist_id, content, created_at, updated_at, session_index')
        .eq('case_id', selectedCaseId)
        .order('updated_at', { ascending: false })
        .limit(30),
      supabase
        .from('client_activities')
        .select('id, case_id, client_id, type, title, details, occurred_at, session_phase, reviewed_at, reviewed_by')
        .eq('case_id', selectedCaseId)
        .order('occurred_at', { ascending: false })
        .limit(50),
    ])

    const c = cases.find(x => x.id === selectedCaseId)
    const caseNum = c?.case_number ? `Case ${c.case_number}` : `Case ${selectedCaseId.slice(0,6)}…`
    const clientName = `${c?.client?.first_name ?? ''} ${c?.client?.last_name ?? ''}`.trim()
    const caseTitle = clientName ? `${clientName} — ${caseNum}` : caseNum

    await exportCaseSummaryPDF({
      caseTitle,
      caseId: selectedCaseId,
      notes: (notes ?? []) as SessionNote[],
      activities: (acts ?? []) as ClientActivity[],
    })
    const ok = await exportCaseSummaryPDF({
      caseTitle,
      caseId: selectedCaseId,
      notes: (notes ?? []) as SessionNote[],
      activities: (acts ?? []) as ClientActivity[],
    })
    if (!ok) push({ message: 'PDF export requires the "jspdf" package. Install with `npm i jspdf`.', type: 'info' })
  }, [cases, selectedCaseId, push])

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
            <div>
              {loadingCases ? (
                <div className="px-3 py-2 text-sm rounded-lg border">Loading cases…</div>
              ) : casesError ? (
                <div className="px-3 py-2 text-sm rounded-lg border text-red-600">{casesError}</div>
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

            {/* Quick Create Resource (Private/Public) */}
            {profile?.id && (
              <>
                <button
                  onClick={() => setShowResourceSearch(true)}
                  className="px-3 py-2 text-sm rounded-lg border hover:bg-gray-50 inline-flex items-center gap-1"
                  title="Search & assign a resource to this client/session"
                >
                  <Plus className="w-4 h-4" /> New Resource
                </button>
                <button
                  onClick={() => setShowCreateResource(true)}
                  className="px-3 py-2 text-sm rounded-lg border hover:bg-gray-50 inline-flex items-center gap-1"
                  title="Create a new resource"
                >
                  <FileText className="w-4 h-4" /> Create
                </button>
              </>
            )}

            {/* Flag Case */}
            <button
              onClick={flagCase}
              className="px-3 py-2 text-sm rounded-lg border hover:bg-gray-50 inline-flex items-center gap-1"
              disabled={!selectedCaseId}
              title="Flag for supervision and update case summary"
            >
              <Flag className="w-4 h-4 text-amber-600" /> Flag Case
            </button>

            {/* Export PDF */}
            <button
              onClick={onExportPDF}
              className="px-3 py-2 text-sm rounded-lg border hover:bg-gray-50 inline-flex items-center gap-1"
              disabled={!selectedCaseId}
              title="Export case summary (PDF)"
            >
              <Download className="w-4 h-4" /> Export Summary
            </button>

            {/* Save & Exit */}
            <button
              onClick={handleSaveAndExit}
              className="px-3 py-2 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700 inline-flex items-center gap-1"
              disabled={!selectedCaseId}
            >
              <LogOut className="w-4 h-4" /> Save & Exit
            </button>
          </div>
        </div>
      </div>

      {/* Timeline */}
      {selectedCaseId ? (
        <SessionTimeline
          caseId={selectedCaseId}
          onOpenNote={openNoteDrawer}
          onOpenPhase={openPhaseDrawer}
        />
      ) : null}

      {/* Body */}
      <div className="flex-1 min-h-0">
        <div className="max-w-7xl mx-auto p-4 lg:p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left panel: Agenda -> InBetween -> Assessments (all toggleable) */}
          <div className="space-y-4">
            <div className="bg-white border rounded-xl p-0 overflow-hidden">
              <div className="p-3 flex items-center justify-between border-b">
                <div className="flex items-center gap-2"><ClipboardList className="w-4 h-4 text-blue-600" /><h3 className="font-medium text-gray-900">Agenda</h3></div>
                <div className="flex items-center gap-2">
                  <button onClick={() => setShowAgenda(s => !s)} className="px-2 py-1 text-sm rounded border">{showAgenda ? 'Hide' : 'Show'}</button>
                </div>
              </div>
              <div className="p-4">
                {showAgenda ? <AgendaPanel caseId={selectedCaseId || undefined} therapistId={profile?.id ?? null} /> : <div className="text-sm text-gray-500">Agenda hidden. Click Show to expand.</div>}
              </div>
            </div>

            <div>
              {showInBetween ? (
                <InBetweenPanel caseId={selectedCaseId} therapistId={profile?.id ?? null} />
              ) : (
                <div className="bg-white border rounded-xl p-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium text-gray-900">In-Between Sessions</h3>
                    <div className="flex items-center gap-2">
                      <button onClick={() => setShowInBetween(s => !s)} className="px-2 py-1 text-sm rounded border">Show</button>
                    </div>
                  </div>
                  <p className="text-sm text-gray-500">In-Between panel hidden.</p>
                </div>
              )}
            </div>

            <div className="bg-white border rounded-xl p-0 overflow-hidden">
              <div className="p-3 flex items-center justify-between border-b">
                <h3 className="font-medium text-gray-900">Assessments</h3>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      try { localStorage.setItem('ws_show_assessment', String(!showAssessment)) } catch {}
                      setShowAssessment(s => !s)
                    }}
                    className="px-2 py-1 text-sm rounded border hover:bg-gray-50"
                  >
                    {showAssessment ? 'Hide' : 'Show'}
                  </button>
                </div>
              </div>

              {showAssessment ? (
                <div className="p-0">
                  <AssessmentWorkspace initialInstanceId={undefined} onClose={() => { /* noop when embedded */ }} />
                </div>
              ) : (
                <div className="p-4 text-sm text-gray-500">Assessments hidden. Click Show to expand.</div>
              )}
            </div>
          </div>

          {/* Session Board (always rendered for structure) */}
          <div className="lg:col-span-2 bg-white border rounded-xl p-4">
            <SessionBoard
              ref={sessionRef}
              defaultCaseId={current?.id || ''}
              defaultClientId={current?.client_id || ''}
              onSavingChange={setIsSaving}
              onDirtyChange={setIsDirty}
            />
          </div>
        </div>
      </div>

      {/* Drawers / Modals */}
      <NotesDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        header={drawerHeader}
        mode={drawerMode}
        note={drawerNote || undefined}
        caseId={selectedCaseId}
        sessionIndex={drawerSessionIndex ?? undefined}
      />

      {showCreateResource && profile?.id && (
        <CreateQuickResourceModal
          ownerId={profile.id}
          onClose={() => setShowCreateResource(false)}
          onCreated={() => setShowCreateResource(false)}
        />
      )}
      {showResourceSearch && (
        <ResourceSearchModal
          open={showResourceSearch}
          onClose={() => setShowResourceSearch(false)}
          caseId={selectedCaseId || undefined}
          clientId={current?.client_id ?? undefined}
          therapistId={profile?.id ?? undefined}
          onCreateNew={() => setShowCreateResource(true)}
        />
      )}
      {/* Confirm modal used by confirmLeave */}
      <ConfirmModal
        open={confirmOpen}
        title={isSaving ? 'Notes are still saving' : 'Unsaved changes'}
        description={isSaving ? 'Notes are still saving. Are you sure you want to leave the Workspace now?' : 'You have unsaved changes. Save before leaving?' }
        confirmLabel={isDirty ? 'Save & Leave' : 'Leave'}
        cancelLabel={'Cancel'}
        onConfirm={async () => {
          // If dirty, attempt save; if save succeeds resolve true, else still resolve true to allow leave
          if (confirmResolve) {
            if (isDirty && sessionRef.current) {
              const ok = await sessionRef.current.saveNow()
              try { confirmResolve(Boolean(ok)) } catch {}
            } else {
              try { confirmResolve(true) } catch {}
            }
          }
        }}
        onCancel={() => { if (confirmResolve) try { confirmResolve(false) } catch {} }}
      />
    </div>
  )
}
