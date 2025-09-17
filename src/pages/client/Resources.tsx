import React, { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { MobileShell } from '../../components/client/MobileShell'
import { Download } from 'lucide-react'

type Resource = { id: string; title: string; kind: string; url?: string | null; meta?: any }

export default function Resources() {
  const { profile } = useAuth()
  const [rows, setRows] = useState<Resource[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancel = false
    const load = async () => {
      if (!profile) return
      setLoading(true); setError(null)
      try {
        // Show public or shared to this client
        const { data, error: err } = await supabase
          .from('resource_library')
          .select('id, title, category, external_url, media_url, description')
          .eq('is_public', true)
          .order('title', { ascending: true })
          .limit(200)
        if (err) throw err
        if (!cancel) {
          const mapped = (data || []).map(r => ({
            id: r.id,
            title: r.title,
            kind: r.category || 'resource',
            url: r.external_url || r.media_url,
            meta: { description: r.description }
          }))
          setRows(mapped)
        }
      } catch (e:any) {
        console.error('[Resources] load', e); if (!cancel) setError('Could not load resources.')
      } finally {
        if (!cancel) setLoading(false)
      }
    }
    load()
    return () => { cancel = true }
  }, [profile])

  return (
    <MobileShell title="Resources">
      <div className="p-3">
        {loading ? (
          <div className="h-[60vh] grid place-items-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 text-red-800 rounded p-3 text-sm">{error}</div>
        ) : rows.length === 0 ? (
          <div className="text-sm text-gray-600">No resources yet.</div>
        ) : (
          <div className="space-y-2">
            {rows.map(r => (
              <a key={r.id} href={r.url || '#'} target="_blank" rel="noreferrer"
                 className="block bg-white border border-gray-200 rounded-xl p-3 hover:bg-gray-50">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium text-gray-900">{r.title}</div>
                    <div className="text-[11px] text-gray-600">{r.kind}</div>
                  </div>
                  <Download className="w-4 h-4 text-gray-500" />
                </div>
              </a>
            ))}
          </div>
        )}
      </div>
    </MobileShell>
  )
}
