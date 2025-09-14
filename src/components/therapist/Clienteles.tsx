// src/components/therapist/Clienteles.tsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import {
  Users, Search, AlertTriangle, ShieldCheck, MessageSquare, FileText, Brain, RefreshCcw
} from 'lucide-react'

type ClientRow = {
  id: string
  first_name: string | null
  last_name: string | null
  email: string | null
  phone: string | null
  city: string | null
  country: string | null
  created_at: string
  role: string
}

export const Clienteles: React.FC = () => {
  const navigate = useNavigate()
  const { profile } = useAuth()

  const [scope, setScope] = useState<'mine' | 'all'>('mine')
  const [q, setQ] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [rows, setRows] = useState<ClientRow[]>([])
  const [myIds, setMyIds] = useState<Set<string>>(new Set())
  const [refreshKey, setRefreshKey] = useState(0)

  const searchDebounce = useRef<number | null>(null)

  // ────────────────────────────────────────────────────────────────────────────
  // Fetch IDs of clients linked to this therapist
  // ────────────────────────────────────────────────────────────────────────────
  const fetchMineIds = useCallback(async () => {
    if (!profile?.id) return setMyIds(new Set())
    try {
      const { data, error: e } = await supabase
        .from('therapist_client_relations')
        .select('client_id')
        .eq('therapist_id', profile.id)

      if (e) throw e
      setMyIds(new Set((data || []).map(d => d.client_id)))
    } catch (e) {
      console.warn('[Clienteles] relations error', e)
      setMyIds(new Set())
    }
  }, [profile?.id])

  // ────────────────────────────────────────────────────────────────────────────
  // Fetch clients list, with scope + server-side search (ilike)
  // ────────────────────────────────────────────────────────────────────────────
  const fetchRows = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      let query = supabase
        .from('profiles')
        .select('id, first_name, last_name, email, phone, city, country, created_at, role')
        .eq('role', 'client') as any

      // Scope enforcement
      if (scope === 'mine') {
        const ids = Array.from(myIds)
        if (ids.length === 0) {
          setRows([])
          setLoading(false)
          return
        }
        query = query.in('id', ids)
      }

      // Server-side search against common fields
      const hasQ = q.trim().length > 0
      if (hasQ) {
        const like = `%${q.trim()}%`
        query = query.or(
          [
            `first_name.ilike.${like}`,
            `last_name.ilike.${like}`,
            `email.ilike.${like}`,
            `city.ilike.${like}`
          ].join(',')
        )
      }

      query = query.order('created_at', { ascending: false }).limit(200)

      const { data, error: e } = await query
      if (e) throw e
      setRows((data || []) as ClientRow[])
    } catch (e: any) {
      console.error('[Clienteles] fetchRows', e)
      setError('Could not load clients.')
      setRows([])
    } finally {
      setLoading(false)
    }
  }, [scope, q, myIds])

  // Initial + manual refresh
  useEffect(() => {
    fetchMineIds()
  }, [fetchMineIds, refreshKey])

  // Debounce search to reduce roundtrips
  useEffect(() => {
    if (searchDebounce.current) window.clearTimeout(searchDebounce.current)
    searchDebounce.current = window.setTimeout(() => {
      fetchRows()
    }, 250)
    return () => {
      if (searchDebounce.current) window.clearTimeout(searchDebounce.current)
    }
  }, [q, scope, myIds, fetchRows])

  // Also fetch when myIds change (e.g., first load)
  useEffect(() => { fetchRows() }, [myIds]) // eslint-disable-line react-hooks/exhaustive-deps

  // Client-side highlight / fallback filter (kept minimal; server-side is primary)
  const displayRows = useMemo(() => rows, [rows])

  // ────────────────────────────────────────────────────────────────────────────
  // Actions
  // ────────────────────────────────────────────────────────────────────────────
  const sendIntake = (via: 'whatsapp' | 'email', r: ClientRow) => {
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

  const openCase = (r: ClientRow) => {
    // Deep link to Case Management filtered by client
    navigate(`/therapist/cases?clientId=${encodeURIComponent(r.id)}`)
  }

  const assignAssessment = (r: ClientRow) => {
    // Open assessments workspace with preselected client
    navigate(`/therapist/assessments?clientId=${encodeURIComponent(r.id)}`)
  }

  const messageClient = (r: ClientRow) => {
    // Deep link to comms tool with context
    navigate(`/therapist/comms?clientId=${encodeURIComponent(r.id)}`)
  }

  const isMine = (id: string) => myIds.has(id)

  // ────────────────────────────────────────────────────────────────────────────
  // UI
  // ────────────────────────────────────────────────────────────────────────────
  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
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
              placeholder="Search name, email, city…"
              className="pl-9 pr-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <select
            value={scope}
            onChange={(e) => setScope(e.target.value as any)}
            className="px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="mine">My Clients</option>
            <option value="all">All Clients</option>
          </select>

          <button
            onClick={() => setRefreshKey(k => k + 1)}
            className="ml-1 inline-flex items-center gap-1 px-3 py-2 border rounded-lg text-sm hover:bg-gray-50"
            title="Refresh"
          >
            <RefreshCcw className="w-4 h-4" />
            Refresh
          </button>
        </div>
      </div>

      {/* Body */}
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
        ) : displayRows.length === 0 ? (
          <div className="py-16 text-center">
            <Users className="w-10 h-10 text-gray-300 mx-auto mb-2" />
            <div className="text-gray-900 font-medium">No clients found</div>
            <div className="text-sm text-gray-600">Try changing scope or search</div>
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
                {displayRows.map(r => {
                  const mine = isMine(r.id)
                  const fullName = `${r.first_name || ''} ${r.last_name || ''}`.trim() || 'Client'
                  return (
                    <tr key={r.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-900">{fullName}</div>
                        <div className="text-xs text-gray-500">{new Date(r.created_at).toLocaleDateString()}</div>
                      </td>
                      <td className="px-4 py-3">{r.city || '—'}</td>
                      <td className="px-4 py-3">{r.country || '—'}</td>
                      <td className="px-4 py-3">
                        <div className="text-xs text-gray-600">
                          {mine ? r.email || '—' : 'Hidden'}
                        </div>
                        <div className="text-xs text-gray-500">
                          {mine ? r.phone || '—' : '—'}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2 justify-end">
                          <button
                            onClick={() => openCase(r)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded hover:bg-indigo-100"
                            title="Open Case"
                          >
                            <FileText className="w-4 h-4" />
                            <span className="hidden sm:inline">Open Case</span>
                          </button>
                          <button
                            onClick={() => assignAssessment(r)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 bg-amber-50 text-amber-700 border border-amber-200 rounded hover:bg-amber-100"
                            title="Assign Assessment"
                          >
                            <Brain className="w-4 h-4" />
                            <span className="hidden sm:inline">Assign</span>
                          </button>
                          <button
                            onClick={() => messageClient(r)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-50 text-blue-700 border border-blue-200 rounded hover:bg-blue-100"
                            title="Message"
                          >
                            <MessageSquare className="w-4 h-4" />
                            <span className="hidden sm:inline">Message</span>
                          </button>
                          <div className="w-px h-5 bg-gray-200 mx-1" />
                          <button
                            onClick={() => sendIntake('whatsapp', r)}
                            disabled={!mine}
                            className="px-3 py-1.5 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                            title={mine ? 'Send WhatsApp intake' : 'Only available for linked clients'}
                          >
                            WhatsApp Intake
                          </button>
                          <button
                            onClick={() => sendIntake('email', r)}
                            disabled={!mine}
                            className="px-3 py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                            title={mine ? 'Send email intake' : 'Only available for linked clients'}
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
        <span>
          Private contact details are only visible for <b>My Clients</b> (linked via
          <span className="whitespace-nowrap"> therapist_client_relations</span>).
        </span>
      </div>
    </div>
  )
}

export default Clienteles
