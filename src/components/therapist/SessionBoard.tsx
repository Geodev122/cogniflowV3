import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { ClipboardList } from 'lucide-react'

type QuickResource = {
  id: string
  title: string
  content_type: string | null
  category: string | null
}

export const SessionBoard: React.FC = () => {
  const { profile } = useAuth()

  // Local inputs for scoping the note
  const [clientId, setClientId] = useState<string>('')
  const [caseId, setCaseId] = useState<string>('')

  // Note content & save states
  const [content, setContent] = useState<string>('')
  const [saving, setSaving] = useState<boolean>(false)
  const [saveInfo, setSaveInfo] = useState<string | null>(null)
  const saveInfoTimer = useRef<number | null>(null)

  // Quick resources list (public)
  const [resources, setResources] = useState<QuickResource[]>([])
  const [resourcesLoading, setResourcesLoading] = useState<boolean>(false)
  const [resourcesError, setResourcesError] = useState<string | null>(null)

  // ===== Helpers =====
  const therapistId = profile?.id ?? null
  const canSave = useMemo(() => !!therapistId, [therapistId])

  const showSaveInfo = useCallback((msg: string) => {
    setSaveInfo(msg)
    if (saveInfoTimer.current) {
      window.clearTimeout(saveInfoTimer.current)
    }
    // Fade the message after a short delay to keep the header clean
    saveInfoTimer.current = window.setTimeout(() => setSaveInfo(null), 3000)
  }, [])

  // ===== Load existing draft for (therapist, case) to avoid overwriting prior work =====
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
          // support string or json content; keep as string in textarea
          setContent(typeof data.content === 'string' ? data.content : JSON.stringify(data.content))
        }
      } catch (e) {
        console.warn('[SessionBoard] loadDraft exception:', e)
      }
    }
    loadDraft()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [therapistId, caseId])

  // ===== Fetch quick resources (with proper loading & error states) =====
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

  // ===== Autosave (debounced) =====
  const autoSave = useCallback(
    async (next: string) => {
      if (!canSave) return
      // If there is absolutely no content, skip writing empty rows
      if (!next.trim()) return

      setSaving(true)
      setSaveInfo(null)
      try {
        // Keep the API aligned with your unique constraint (therapist_id, case_id)
        const { error } = await supabase
          .from('session_notes')
          .upsert(
            {
              therapist_id: therapistId,
              client_id: clientId || null,
              case_id: caseId || null,
              content: next, // if your column is jsonb, you can JSON.parse(next) when needed
              updated_at: new Date().toISOString(),
            } as any,
            // Important: make sure you actually have a unique index on (therapist_id, case_id)
            { onConflict: 'therapist_id,case_id' } as any
          )

        if (error) {
          console.error('[SessionBoard] autosave error:', error)
          showSaveInfo('Save failed')
        } else {
          showSaveInfo('Saved')
        }
      } catch (e) {
        console.error('[SessionBoard] autosave exception:', e)
        showSaveInfo('Save failed')
      } finally {
        setSaving(false)
      }
    },
    [canSave, therapistId, clientId, caseId, showSaveInfo]
  )

  // Debounce: save 600ms after user stops typing
  useEffect(() => {
    const t = window.setTimeout(() => {
      if (content.trim()) autoSave(content)
    }, 600)
    return () => window.clearTimeout(t)
  }, [content, autoSave])

  // ===== Attach a resource (append a reference line) =====
  const attach = (r: QuickResource) => {
    setContent((prev) =>
      `${prev}${prev ? '\n\n' : ''}[Attached Resource] ${r.title} (${r.content_type ?? 'other'}/${r.category ?? 'general'})`
    )
  }

  // ===== Render =====
  return (
    <div className="p-6 max-w-7xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ClipboardList className="w-6 h-6 text-blue-600" />
          <h2 className="text-2xl font-bold text-gray-900">Session Board</h2>
        </div>
        <div className="text-xs text-gray-500">
          {saving ? 'Saving…' : saveInfo || 'Idle'}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Quick Resources */}
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

        {/* Note Editor */}
        <div className="lg:col-span-2 bg-white border rounded-lg shadow-sm p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-3">
            <input
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              placeholder="Client ID (optional)"
              className="px-3 py-2 border rounded text-sm"
            />
            <input
              value={caseId}
              onChange={(e) => setCaseId(e.target.value)}
              placeholder="Case ID (optional)"
              className="px-3 py-2 border rounded text-sm"
            />
            <div className="text-xs text-gray-500 flex items-center md:justify-end">
              {new Date().toLocaleString()}
            </div>
          </div>

          {!therapistId ? (
            <div className="text-sm text-red-600">
              You must be signed in to save notes.
            </div>
          ) : (
            <textarea
              rows={16}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Live session notes…"
              className="w-full border rounded p-3 text-sm"
            />
          )}
        </div>
      </div>
    </div>
  )
}

export default SessionBoard
