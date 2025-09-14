import React, { useCallback, useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { ClipboardList } from 'lucide-react'

export const SessionBoard: React.FC = () => {
  const { profile } = useAuth()
  const [clientId, setClientId] = useState<string>('')
  const [caseId, setCaseId] = useState<string>('')
  const [content, setContent] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveInfo, setSaveInfo] = useState<string | null>(null)
  const [resources, setResources] = useState<any[]>([])

  useEffect(() => {
    ;(async () => {
      const { data } = await supabase
        .from('resource_library')
        .select('id,title,content_type,category')
        .eq('is_public', true)
        .limit(8)
      setResources(data || [])
    })()
  }, [])

  const autoSave = useCallback(
    async (next: string) => {
      if (!profile?.id) return
      setSaving(true)
      setSaveInfo(null)
      try {
        const { error } = await supabase
          .from('session_notes')
          .upsert(
            {
              therapist_id: profile.id,
              client_id: clientId || null,
              case_id: caseId || null,
              content: next,
              updated_at: new Date().toISOString(),
            } as any,
            { onConflict: 'therapist_id,case_id' } as any
          )
        if (error) throw error
        setSaveInfo('Saved')
      } catch {
        setSaveInfo('Save failed')
      } finally {
        setSaving(false)
      }
    },
    [profile?.id, clientId, caseId]
  )

  useEffect(() => {
    const t = setTimeout(() => {
      if (content.trim().length) autoSave(content)
    }, 600)
    return () => clearTimeout(t)
  }, [content, autoSave])

  const attach = (r: any) => {
    setContent((prev) => prev + `\n\n[Attached Resource] ${r.title} (${r.content_type}/${r.category})`)
  }

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
          {resources.length === 0 ? (
            <div className="text-sm text-gray-500">No resources yet.</div>
          ) : (
            <div className="space-y-2">
              {resources.map((r) => (
                <div key={r.id} className="flex items-center justify-between border rounded p-2">
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-gray-900 truncate">{r.title}</div>
                    <div className="text-xs text-gray-500">{r.content_type} • {r.category}</div>
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

        <div className="lg:col-span-2 bg-white border rounded-lg shadow-sm p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-3">
            <input value={clientId} onChange={(e) => setClientId(e.target.value)} placeholder="Client ID (optional)" className="px-3 py-2 border rounded text-sm" />
            <input value={caseId} onChange={(e) => setCaseId(e.target.value)} placeholder="Case ID (optional)" className="px-3 py-2 border rounded text-sm" />
            <div className="text-xs text-gray-500 flex items-center md:justify-end">
              {new Date().toLocaleString()}
            </div>
          </div>
          <textarea
            rows={16}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Live session notes…"
            className="w-full border rounded p-3 text-sm"
          />
        </div>
      </div>
    </div>
  )
}
export default SessionBoard
