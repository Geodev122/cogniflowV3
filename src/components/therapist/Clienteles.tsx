import React, { useCallback, useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { Users, Search, AlertTriangle, ShieldCheck } from 'lucide-react'

export const Clienteles: React.FC = () => {
  const { profile } = useAuth()
  const [scope, setScope] = useState<'mine' | 'all'>('mine')
  const [q, setQ] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [rows, setRows] = useState<any[]>([])
  const [myIds, setMyIds] = useState<Set<string>>(new Set())

  const fetchMineIds = useCallback(async () => {
    if (!profile?.id) return
    const { data, error: e } = await supabase
      .from('therapist_client_relations')
      .select('client_id')
      .eq('therapist_id', profile.id)
    if (e) { console.warn('[Clienteles] relations error', e); setMyIds(new Set()) }
    else { setMyIds(new Set((data || []).map(d => d.client_id))) }
  }, [profile?.id])

  const fetchRows = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const { data, error: e } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, email, phone, city, country, created_at, role')
        .eq('role', 'client')
        .order('created_at', { ascending: false })
      if (e) throw e
      setRows(data || [])
    } catch (e: any) {
      console.error('[Clienteles] fetchRows', e)
      setError('Could not load clients.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchMineIds(); fetchRows() }, [fetchMineIds, fetchRows])

  const filtered = rows.filter(r => {
    const text = `${r.first_name || ''} ${r.last_name || ''} ${r.email || ''} ${r.city || ''}`.toLowerCase()
    const okScope = scope === 'all' ? true : myIds.has(r.id)
    const okQ = !q.trim() || text.includes(q.trim().toLowerCase())
    return okScope && okQ
  })

  const sendIntake = (via: 'whatsapp' | 'email', r: any) => {
    const link = `${window.location.origin}/intake/${r.id}`
    if (via === 'whatsapp') {
      const phone = (r.phone || '').replace(/[^\d]/g, '')
      if (!phone) return alert('No phone on file.')
      const text = `Hello ${r.first_name || ''}, please complete your intake form: ${link}`
      window.open(`https://wa.me/${phone}?text=${encodeURIComponent(text)}`, '_blank', 'noopener,noreferrer')
    } else {
      window.location.href = `mailto:${r.email}?subject=Intake%20Form&body=${encodeURIComponent('Please complete your intake: ' + link)}`
    }
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Users className="w-6 h-6 text-blue-600" />
          <h2 className="text-2xl font-bold text-gray-900">Clienteles</h2>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search clients…"
              className="pl-9 pr-3 py-2 border rounded-lg text-sm"
            />
          </div>
          <select
            value={scope}
            onChange={(e) => setScope(e.target.value as any)}
            className="px-3 py-2 border rounded-lg text-sm"
          >
            <option value="mine">My Clients</option>
            <option value="all">All Clients</option>
          </select>
        </div>
      </div>

      <div className="bg-white border rounded-lg shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-12 grid place-items-center">
            <div className="w-6 h-6 animate-spin border-b-2 border-blue-600 rounded-full" />
          </div>
        ) : error ? (
          <div className="p-4 text-red-700 bg-red-50 border-b border-red-200 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" />
            <span>{error}</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center">
            <Users className="w-10 h-10 text-gray-300 mx-auto mb-2" />
            <div className="text-gray-900 font-medium">No clients found</div>
            <div className="text-sm text-gray-600">Try changing filters or search</div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-gray-50 text-xs uppercase text-gray-600">
                <tr>
                  <th className="text-left px-4 py-3">Name</th>
                  <th className="text-left px-4 py-3">City</th>
                  <th className="text-left px-4 py-3">Country</th>
                  <th className="text-left px-4 py-3">Contact</th>
                  <th className="text-right px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y text-sm">
                {filtered.map(r => {
                  const isMine = myIds.has(r.id)
                  return (
                    <tr key={r.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-900">
                          {r.first_name} {r.last_name}
                        </div>
                        <div className="text-xs text-gray-500">{new Date(r.created_at).toLocaleDateString()}</div>
                      </td>
                      <td className="px-4 py-3">{r.city || '—'}</td>
                      <td className="px-4 py-3">{r.country || '—'}</td>
                      <td className="px-4 py-3">
                        <div className="text-xs text-gray-600">
                          {isMine ? r.email : 'Hidden'}
                        </div>
                        <div className="text-xs text-gray-500">
                          {isMine ? r.phone || '—' : '—'}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2 justify-end">
                          <button
                            onClick={() => sendIntake('whatsapp', r)}
                            className="px-3 py-1.5 bg-green-600 text-white rounded hover:bg-green-700 text-xs"
                          >
                            WhatsApp Intake
                          </button>
                          <button
                            onClick={() => sendIntake('email', r)}
                            className="px-3 py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700 text-xs"
                          >
                            Email Intake
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="mt-3 text-xs text-gray-500 flex items-center gap-1">
        <ShieldCheck className="w-3.5 h-3.5" />
        <span>Private contact details are only visible for <b>My Clients</b> (linked via assignment).</span>
      </div>
    </div>
  )
}
export default Clienteles
