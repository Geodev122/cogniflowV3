import React, { useCallback, useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { Headphones, Loader2 } from 'lucide-react'

export const SupervisionPanel: React.FC = () => {
  const { profile } = useAuth()
  const [threads, setThreads] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [title, setTitle] = useState('')
  const [caseId, setCaseId] = useState('')
  const [creating, setCreating] = useState(false)

  const load = useCallback(async () => {
    if (!profile?.id) return
    try {
      setLoading(true)
      const { data } = await supabase
        .from('supervision_threads')
        .select('id,title,status,created_at,case_id')
        .eq('therapist_id', profile.id)
        .order('created_at', { ascending: false })
      setThreads(data || [])
    } finally { setLoading(false) }
  }, [profile?.id])

  useEffect(() => { load() }, [load])

  const create = async () => {
    if (!title.trim()) return
    try {
      setCreating(true)
      await supabase.from('supervision_threads').insert({
        therapist_id: profile?.id, title: title.trim(), case_id: caseId || null, status: 'open'
      })
      setTitle(''); setCaseId(''); await load()
    } finally { setCreating(false) }
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-4">
      <div className="flex items-center gap-2">
        <Headphones className="w-6 h-6 text-blue-600" />
        <h2 className="text-2xl font-bold text-gray-900">Supervision</h2>
      </div>

      <div className="bg-white border rounded-lg shadow-sm p-4">
        <div className="grid grid-cols-1 md:grid-cols-6 gap-2">
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Thread title" className="md:col-span-3 px-3 py-2 border rounded text-sm" />
          <input value={caseId} onChange={(e) => setCaseId(e.target.value)} placeholder="Case ID (optional)" className="md:col-span-2 px-3 py-2 border rounded text-sm" />
          <button onClick={create} disabled={creating} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50">Start Thread</button>
        </div>
      </div>

      <div className="bg-white border rounded-lg shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-10 grid place-items-center"><Loader2 className="w-6 h-6 animate-spin text-blue-600" /></div>
        ) : threads.length === 0 ? (
          <div className="py-10 text-center">
            <Headphones className="w-10 h-10 text-gray-300 mx-auto mb-2" />
            <div className="text-gray-900 font-medium">No supervision threads</div>
            <div className="text-sm text-gray-600">Create a thread to request feedback.</div>
          </div>
        ) : (
          <ul className="divide-y">
            {threads.map(t => (
              <li key={t.id} className="p-4 hover:bg-gray-50">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium text-gray-900">{t.title}</div>
                    <div className="text-xs text-gray-500">Case: {t.case_id || '—'} • {new Date(t.created_at).toLocaleString()}</div>
                  </div>
                  <span className={`px-2 py-1 text-xs rounded-full ${t.status === 'resolved' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>{t.status}</span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
export default SupervisionPanel
