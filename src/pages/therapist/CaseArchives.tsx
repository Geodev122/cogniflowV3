import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { Search, Filter, ArrowUpDown, ExternalLink, Share2, ArrowRightLeft, Send, RotateCcw } from 'lucide-react'

type CaseRow = {
  id: string
  client_name: string | null
  therapist_name: string | null
  status: 'archived' | 'closed'
  archived_at: string | null
  last_session_at: string | null
}

export default function CaseArchives() {
  const navigate = useNavigate()
  const [rows, setRows] = useState<CaseRow[]>([])
  const [q, setQ] = useState('')
  const [statusFilter, setStatusFilter] = useState<Set<'archived'|'closed'>>(new Set(['archived']))
  const [loading, setLoading] = useState(true)
  const [sort, setSort] = useState<'archived_at_desc'|'archived_at_asc'>('archived_at_desc')

  useEffect(() => { void fetchRows() }, [statusFilter, q, sort])

  async function fetchRows() {
    setLoading(true)
    const statuses = Array.from(statusFilter.values())
    // Build query
    let query = supabase.from('cases')
      .select(`
        id,
        status,
        archived_at,
        last_session_at,
        client:profiles!cases_client_id_fkey ( full_name ),
        therapist:profiles!cases_therapist_id_fkey ( full_name )
      `)
      .in('status', statuses.length ? statuses : ['archived','closed'])

    if (q.trim()) {
      // Example: if you have a tsv or ilike on client name or id
      query = query.or(`id.ilike.%${q}%,client.full_name.ilike.%${q}%`)
    }

    if (sort === 'archived_at_desc') query = query.order('archived_at', { ascending: false, nullsFirst: false })
    else query = query.order('archived_at', { ascending: true, nullsFirst: true })

    const { data, error } = await query
    if (error) {
      console.error(error)
      setRows([]); setLoading(false)
      return
    }

    const normalized: CaseRow[] = (data ?? []).map((r: any) => ({
      id: r.id,
      client_name: r.client?.full_name ?? null,
      therapist_name: r.therapist?.full_name ?? null,
      status: r.status,
      archived_at: r.archived_at,
      last_session_at: r.last_session_at ?? null,
    }))
    setRows(normalized); setLoading(false)
  }

  function manage(id: string) {
    navigate(`/therapist/cases/${id}/summary?mode=readOnly`)
  }

  async function submitToSupervision(id: string) {
    const notes = prompt('Notes for supervision request (optional):') ?? ''
    const { error } = await supabase.from('supervision_requests').insert({
      case_id: id,
      requester_id: (await supabase.auth.getUser()).data.user?.id,
      notes,
      status: 'pending'
    })
    if (error) return alert('Failed to submit: ' + error.message)
    alert('Submitted for supervision.')
  }

  async function refer(id: string) {
    const toTherapist = prompt('Enter therapist UUID or email (demo):')
    if (!toTherapist) return
    // If you allow email, resolve to profile id first.
    const to_therapist_id = toTherapist // assume UUID for brevity
    const { error } = await supabase.from('case_referrals').insert({
      case_id: id,
      from_therapist_id: (await supabase.auth.getUser()).data.user?.id,
      to_therapist_id,
      reason: ''
    })
    if (error) return alert('Failed to refer: ' + error.message)
    alert('Referral requested.')
  }

  async function reopen(id: string) {
    if (!confirm('Re-open this case?')) return
    const { error } = await supabase.from('cases')
      .update({ status: 'active', archived_at: null })
      .eq('id', id)
    if (error) return alert('Failed to re-open: ' + error.message)
    await fetchRows()
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 opacity-60" />
          <input
            className="pl-9 pr-3 py-2 rounded-xl border w-72"
            placeholder="Search case ID or client name"
            value={q}
            onChange={e => setQ(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-2">
          <button
            className={`px-3 py-1.5 rounded-full border ${statusFilter.has('archived') ? 'bg-gray-900 text-white' : ''}`}
            onClick={() => toggle(statusFilter, setStatusFilter, 'archived')}
          >Archived</button>
          <button
            className={`px-3 py-1.5 rounded-full border ${statusFilter.has('closed') ? 'bg-gray-900 text-white' : ''}`}
            onClick={() => toggle(statusFilter, setStatusFilter, 'closed')}
          >Closed</button>
        </div>

        <button
          className="ml-auto inline-flex items-center gap-1 px-3 py-2 rounded-lg border"
          onClick={() => setSort(s => s === 'archived_at_desc' ? 'archived_at_asc' : 'archived_at_desc')}
        >
          <ArrowUpDown className="h-4 w-4" />
          Sort by Archived
        </button>
      </div>

      <div className="border rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr className="text-left">
              <th className="px-4 py-3">Case</th>
              <th className="px-4 py-3">Client</th>
              <th className="px-4 py-3">Therapist</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Archived</th>
              <th className="px-4 py-3">Last Session</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td className="px-4 py-6" colSpan={7}>Loading…</td></tr>
            )}
            {!loading && rows.length === 0 && (
              <tr><td className="px-4 py-10 text-center text-gray-500" colSpan={7}>
                No archived cases found.
              </td></tr>
            )}
            {rows.map(r => (
              <tr key={r.id} className="border-t">
                <td className="px-4 py-3 font-mono">{r.id.slice(0,8)}…</td>
                <td className="px-4 py-3">{r.client_name ?? '—'}</td>
                <td className="px-4 py-3">{r.therapist_name ?? '—'}</td>
                <td className="px-4 py-3 capitalize">{r.status}</td>
                <td className="px-4 py-3">{fmt(r.archived_at)}</td>
                <td className="px-4 py-3">{fmt(r.last_session_at)}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <button className="px-2 py-1 border rounded-lg inline-flex items-center gap-1" onClick={() => manage(r.id)}>
                      <ExternalLink className="h-4 w-4" /> Manage
                    </button>
                    <button className="px-2 py-1 border rounded-lg inline-flex items-center gap-1" onClick={() => submitToSupervision(r.id)}>
                      <Send className="h-4 w-4" /> Submit
                    </button>
                    <button className="px-2 py-1 border rounded-lg inline-flex items-center gap-1" onClick={() => refer(r.id)}>
                      <ArrowRightLeft className="h-4 w-4" /> Refer
                    </button>
                    <button className="px-2 py-1 border rounded-lg inline-flex items-center gap-1" onClick={() => reopen(r.id)}>
                      <RotateCcw className="h-4 w-4" /> Re-open
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function toggle<T>(s:Set<T>, set:(v:Set<T>)=>void, v:T){
  const n = new Set(s); n.has(v) ? n.delete(v) : n.add(v); set(n)
}
function fmt(x:string|null){ return x ? new Date(x).toLocaleString() : '—' }
