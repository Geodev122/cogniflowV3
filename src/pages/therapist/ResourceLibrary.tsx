// src/pages/therapist/ResourceLibrary.tsx
import React, { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { Search, Send } from 'lucide-react'

type Resource = {
  id: string
  therapist_id: string | null
  title: string
  description: string | null
  tags: string[] | null
  url: string
  is_public: boolean
  created_at: string
}

const PAGE = 20

const ResourceLibrary: React.FC = () => {
  const { profile } = useAuth()
  const [q, setQ] = useState('')
  const [rows, setRows] = useState<Resource[]>([])
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)

  const fetchRows = async () => {
    setLoading(true)
    let query = supabase
      .from('resources')
      .select('id,therapist_id,title,description,tags,url,is_public,created_at', { count: 'exact' })
      .or(`is_public.eq.true,therapist_id.eq.${profile?.id ?? 'null'}`)

    if (q.trim()) {
      const s = q.trim()
      query = query.or(
        `title.ilike.%${s}%,description.ilike.%${s}%,tags.cs.{${s}}`
      )
    }

    const from = (page - 1) * PAGE
    const to = from + PAGE - 1
    const { data, count, error } = await query.order('created_at', { ascending: false }).range(from, to)

    if (error) {
      console.error(error)
      setRows([])
      setTotal(0)
    } else {
      setRows((data || []) as Resource[])
      setTotal(count || 0)
    }
    setLoading(false)
  }

  useEffect(() => { fetchRows() }, [page, q]) // eslint-disable-line

  const assignToClient = async (resource: Resource, clientId: string) => {
    // Example uses a documents table; adjust if you’re using resource_assignments
    const { error } = await supabase.from('documents').insert({
      owner_id: clientId,
      created_by: profile?.id ?? null,
      title: resource.title,
      description: resource.description,
      url: resource.url,
      type: 'resource',
      meta: { resource_id: resource.id }
    })
    if (error) alert(error.message)
    else alert('Assigned!')
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE))

  return (
    <div className="space-y-4 p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Resource Library</h2>
        <div className="relative w-80">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            className="w-full pl-9 pr-3 py-2 border rounded"
            placeholder="Search title, description, tag…"
            value={q}
            onChange={(e) => { setPage(1); setQ(e.target.value) }}
          />
        </div>
      </div>

      {loading ? (
        <div>Loading…</div>
      ) : rows.length === 0 ? (
        <div className="text-gray-600">No resources found.</div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {rows.map(r => (
            <div key={r.id} className="border rounded-lg p-3 flex flex-col">
              <div className="font-medium truncate">{r.title}</div>
              <div className="text-sm text-gray-600 line-clamp-3 mt-1">{r.description ?? '—'}</div>
              <div className="mt-2 flex flex-wrap gap-1">
                {(r.tags ?? []).map(t => (
                  <span key={t} className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 border">
                    #{t}
                  </span>
                ))}
              </div>
              <div className="mt-3 flex items-center gap-2">
                <a className="text-blue-600 underline text-sm" href={r.url} target="_blank" rel="noreferrer">Open</a>
                <div className="ml-auto">
                  <button
                    className="inline-flex items-center gap-1 text-sm px-2 py-1 rounded border hover:bg-gray-50"
                    onClick={async () => {
                      const clientId = prompt('Assign to Client ID:')
                      if (clientId) await assignToClient(r, clientId)
                    }}
                  >
                    <Send className="w-4 h-4" /> Assign
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {totalPages > 1 && !loading && (
        <div className="flex items-center justify-center gap-2">
          <button className="px-3 py-1.5 border rounded" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page===1}>Prev</button>
          <span className="text-sm text-gray-600">Page {page} of {totalPages}</span>
          <button className="px-3 py-1.5 border rounded" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page===totalPages}>Next</button>
        </div>
      )}
    </div>
  )
}
export default ResourceLibrary
