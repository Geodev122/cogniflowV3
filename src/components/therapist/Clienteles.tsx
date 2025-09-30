// src/components/therapist/Clienteles.tsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { createClient } from '@supabase/supabase-js'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import {
  Users, Search, AlertTriangle, ShieldCheck, MessageSquare, FileText, Brain, RefreshCcw, Plus, X, Edit, Copy
} from 'lucide-react'
import ClientActions from './ClientActions'
import TherapistSearchModal from './TherapistSearchModal'
import TherapistReferralsInbox from './TherapistReferralsInbox'
import ClientReferralsList from './ClientReferralsList'

/* -------------------------------------------------------------------------- */
/* Types                                                                      */
/* -------------------------------------------------------------------------- */
type ClientRow = {
  id: string
  first_name: string | null
  last_name: string | null
  email: string | null
  phone: string | null
  whatsapp_number: string | null
  city: string | null
  country: string | null
  created_at: string
  role: string
  patient_code: string | null
  referral_source?: string | null
}

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */
function toInitials(first?: string | null, last?: string | null) {
  const f = (first || '').trim()
  const l = (last || '').trim()
  if (!f && !l) return 'CL'
  return (f[0] || '').concat(l[0] || '').toUpperCase()
}

function formatWhatsappDigits(input: string) {
  const trimmed = input.trim()
  const plus = trimmed.startsWith('+') ? '+' : ''
  const digits = trimmed.replace(/[^\d]/g, '')
  return plus + digits
}

function generatePatientCode(clientId?: string): string {
  // Deterministic code derived from clientId when available.
  // Format: PT + 9 chars (letters/digits) derived from a simple hash of clientId.
  if (clientId) {
    let h = 2166136261
    for (let i = 0; i < clientId.length; i++) {
      h ^= clientId.charCodeAt(i)
      h = Math.imul(h, 16777619)
    }
    // convert to unsigned and base36, pad and take 9 chars
    const s = (h >>> 0).toString(36).toUpperCase().padStart(9, '0').slice(0, 9)
    return `PT${s}`
  }
  // Fallback random code
  const n = Math.floor(100000000 + Math.random() * 900000000)
  return `PT${n}`
}

function fullName(r: Pick<ClientRow, 'first_name' | 'last_name'>) {
  const s = `${r.first_name || ''} ${r.last_name || ''}`.trim()
  return s || 'Client'
}

/* -------------------------------------------------------------------------- */
/* Component                                                                  */
/* -------------------------------------------------------------------------- */
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
  const [assignedMap, setAssignedMap] = useState<Record<string,string>>({}) // clientId -> assignmentStatus
  const [requestingMap, setRequestingMap] = useState<Record<string, boolean>>({})
  const [toast, setToast] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null)
  // Auto-dismiss toast after a short delay
  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 3500)
    return () => clearTimeout(t)
  }, [toast])

  const searchDebounce = useRef<number | null>(null)

  const fetchMineIds = useCallback(async () => {
    if (!profile?.id) return setMyIds(new Set())
    try {
      // Prefer therapist_client_relations as the authoritative source of "My Clients".
      // If relations are present, use them; otherwise fall back to assignments.
      const [{ data: aData, error: aErr }, { data: rData, error: rErr }] = await Promise.all([
        supabase.from('assignments').select('client_id, status').eq('therapist_id', profile.id),
        // include status from relations when available so we can reflect relation state
        supabase.from('therapist_client_relations').select('client_id, status').eq('therapist_id', profile.id)
      ])

      if (aErr && rErr) throw (aErr || rErr)
      const ids = new Set<string>()
      const map: Record<string,string> = {}

      // If there are therapist_client_relations, prefer those as the authoritative set
      if ((rData || []).length > 0) {
        ;(rData || []).forEach((rr: any) => { if (rr?.client_id) { ids.add(rr.client_id); if (rr.status) map[rr.client_id] = rr.status } })
        // keep assignment statuses for clients that are not present in relations (e.g., pending assignment requests)
        ;(aData || []).forEach((r: any) => { if (r?.client_id && !ids.has(r.client_id)) { ids.add(r.client_id); map[r.client_id] = r.status } })
      } else {
        ;(aData || []).forEach((r: any) => { if (r?.client_id) { ids.add(r.client_id); map[r.client_id] = r.status } })
      }

      setMyIds(ids)
      setAssignedMap(map)
    } catch (e) {
      console.warn('[Clienteles] relations error', e)
      setMyIds(new Set())
    }
  }, [profile?.id])

  const fetchRows = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      let data: any[] = []
      let error: any = null
      // If the query looks like a Patient ID (PT...), prefer server-side patient_code lookup.
      const qTrim = q.trim()
      if (qTrim.length > 0 && /^PT/i.test(qTrim)) {
        try {
          const { data: profilesData, error: profilesErr } = await supabase
            .from('profiles')
            .select('id, first_name, last_name, email, phone, whatsapp_number, created_at, role, patient_code')
            .ilike('patient_code', `${qTrim}%`)
            .order('created_at', { ascending: false })
          if (profilesErr) throw profilesErr
          data = profilesData || []
          if (scope === 'mine') data = (data || []).filter((r: any) => myIds.has(r.id))
        } catch (err) {
          console.warn('[Clienteles] patient-id search failed', err)
          data = []
        }
      } else if (scope === 'mine') {
        // Use the cached myIds (populated by fetchMineIds) to avoid an extra relation query.
        const clientIds = Array.from(myIds || [])
        if (clientIds.length === 0) {
          data = []
        } else {
          const { data: profilesData, error: profilesErr } = await supabase
            .from('profiles')
            .select('id, first_name, last_name, email, phone, whatsapp_number, city, country, created_at, role, patient_code')
            .in('id', clientIds)

          if (profilesErr) throw profilesErr
          data = profilesData || []
        }
      } else {
        // Try RPC first, fallback to direct query
        try {
          const { data: rpcData, error: rpcErr } = await supabase.rpc('get_clients_public')
          if (rpcErr) throw rpcErr
          data = rpcData || []
        } catch (rpcError) {
          console.warn('[Clienteles] RPC failed, trying direct query:', rpcError)
          // Fallback to direct profiles query for public client info
          const { data: profilesData, error: profilesErr } = await supabase
            .from('profiles')
            .select('id, first_name, last_name, email, phone, whatsapp_number, city, country, created_at, role, patient_code')
            .eq('role', 'client')
            .order('created_at', { ascending: false })
          
          if (profilesErr) throw profilesErr
          data = profilesData || []
        }
      }

  // removed stray undefined variable check
      const raw: any[] = (data || [])

      const normalized: ClientRow[] = raw.map(r => {
        return {
          id: r.id,
          first_name: r.first_name,
          last_name: r.last_name,
          email: r.email || null,
          phone: r.phone || null,
          whatsapp_number: r.whatsapp_number || r.phone || null,
          city: r.city || null,
          country: r.country || null,
          created_at: r.created_at || new Date().toISOString(),
          role: r.role || 'client',
          patient_code: r.patient_code || null,
          referral_source: r.referral_source || null
        }
      })

      // client-side filtering/search for public fields (name, email, referral source)
      if (qTrim.length > 0 && !/^PT/i.test(qTrim)) {
        const like = qTrim.toLowerCase()
        const filtered = normalized.filter(r => {
          const name = `${r.first_name || ''} ${r.last_name || ''}`.trim().toLowerCase()
          const initials = toInitials(r.first_name, r.last_name).toLowerCase()
          return name.includes(like)
            || initials.includes(like)
            || (r.email || '').toLowerCase().includes(like)
            || (r.referral_source || '').toLowerCase().includes(like)
        })
        setRows(filtered)
      } else {
        setRows(normalized)
      }
      // After rows are set, ensure server-side patient_code exists for any missing values.
      // This will call the `ensure_patient_code` RPC (if deployed) and update local state.
      // Do not await here synchronously in the main flow; call helper to update state.
      ;(async () => {
        try {
          await ensurePatientCodes(normalized)
        } catch (e) {
          console.warn('[Clienteles] ensurePatientCodes failed', e)
        }
      })()
    }
    catch (e: any) {
      console.error('[Clienteles] fetchRows', e)
      // Try to extract a useful message from the error object
      let msg = 'Could not load clients.'
      try {
        if (e?.message) msg = String(e.message)
        else if (typeof e === 'string') msg = e
        else msg = JSON.stringify(e)
      } catch (_err) {
        msg = 'Could not load clients (unknown error)'
      }
      setError(msg)
      setRows([])
      // show short toast for visibility in UI
      setToast({ type: 'error', message: msg.length > 120 ? msg.slice(0, 117) + '...' : msg })
    } finally {
      setLoading(false)
    }
  }, [scope, q, myIds, profile?.id])

  /* ----------------------------- Patch client ---------------------------- */
  /**
   * Patch a client's profile and mirror fields in the clients table.
   * Note: this will use the current anon client. If your RLS prevents therapists
   * from updating profiles directly, implement a DB-side RPC (trusted function)
   * that checks therapist-client relations and performs the update with service
   * privileges.
   */
  const patchClient = async (clientId: string, updates: Partial<ClientRow>) => {
    if (!profile?.id) {
      setToast({ type: 'error', message: 'Not authenticated' })
      return false
    }
    // First try server-side RPC which performs relation checks and transactional updates.
    try {
      setLoading(true)
      const payload = { ...updates }
      const { data, error } = await supabase.rpc('patch_client_for_therapist', { p_therapist: profile.id, p_client: clientId, p_payload: payload })
      if (error) throw error
      setToast({ type: 'success', message: 'Client updated' })
      setRefreshKey(k => k + 1)
      return true
    } catch (rpcErr: any) {
      // If RPC fails (no function, permissions, etc.), fall back to client-side updates and surface the original error.
      console.warn('[Clienteles] RPC patch failed, falling back to client-side updates', rpcErr)
      try {
        // Update the lightweight `clients` table (if present) and `profiles` table.
        const clientFields: any = {}
        const profileFields: any = {}
        if (updates.first_name !== undefined) { clientFields.first_name = updates.first_name; profileFields.first_name = updates.first_name }
        if (updates.last_name !== undefined) { clientFields.last_name = updates.last_name; profileFields.last_name = updates.last_name }
        if (updates.email !== undefined) { clientFields.email = updates.email; profileFields.email = updates.email }
        if (updates.whatsapp_number !== undefined) { clientFields.whatsapp_number = updates.whatsapp_number; profileFields.whatsapp_number = updates.whatsapp_number }
        if (updates.phone !== undefined) { profileFields.phone = updates.phone }
        if (updates.city !== undefined) { clientFields.city = updates.city; profileFields.city = updates.city }
        if (updates.country !== undefined) { clientFields.country = updates.country; profileFields.country = updates.country }
        if (updates.referral_source !== undefined) { clientFields.referral_source = updates.referral_source; profileFields.referral_source = updates.referral_source }

        const ops: Promise<any>[] = []
        if (Object.keys(clientFields).length > 0) {
          ops.push(supabase.from('clients').update(clientFields).eq('id', clientId))
        }
        if (Object.keys(profileFields).length > 0) {
          ops.push(supabase.from('profiles').update(profileFields).eq('id', clientId))
        }

        const results = await Promise.all(ops)
        for (const res of results) {
          if (res && (res as any).error) throw (res as any).error
        }

        setToast({ type: 'success', message: 'Client updated' })
        setRefreshKey(k => k + 1)
        return true
      } catch (err: any) {
        console.error('[Clienteles] patchClient fallback failed', err)
        setToast({ type: 'error', message: err?.message || rpcErr?.message || 'Failed to update client' })
        return false
      } finally {
        setLoading(false)
      }
    }
  }

  const copyPatientIdToClipboard = async (val: string) => {
    try {
      await navigator.clipboard.writeText(val)
      setToast({ type: 'success', message: 'Patient ID copied' })
    } catch (e: any) {
      console.warn('copy failed', e)
      setToast({ type: 'error', message: 'Could not copy Patient ID' })
    }
  }

  // Ensure server-side patient codes exist for rows missing a server-generated code.
  const ensurePatientCodes = async (cRows: ClientRow[]) => {
    if (!cRows || cRows.length === 0) return
    const updates: Record<string,string> = {}
    for (const r of cRows) {
      if (r.patient_code && /^PT/i.test(r.patient_code)) continue
      try {
        const { data, error } = await supabase.rpc('ensure_patient_code', { p_profile: r.id }) as any
        if (error) throw error
        const code = Array.isArray(data) ? data[0] : data
        if (code) updates[r.id] = code
      } catch (e) {
        // ignore missing rpc or errors; the fallback may have set patient_code already
        // console.warn('ensure_patient_code failed for', r.id, e)
      }
    }
    if (Object.keys(updates).length === 0) return
    setRows(prev => prev.map(rr => ({ ...rr, patient_code: updates[rr.id] || rr.patient_code })))
  }

  // Initial + manual refresh
  useEffect(() => { fetchMineIds() }, [fetchMineIds, refreshKey])

  // Debounce search
  useEffect(() => {
    if (searchDebounce.current) window.clearTimeout(searchDebounce.current)
    searchDebounce.current = window.setTimeout(() => { fetchRows() }, 250)
    return () => { if (searchDebounce.current) window.clearTimeout(searchDebounce.current) }
  }, [q, scope, myIds, fetchRows])

  // Fetch when myIds first resolves
  useEffect(() => { fetchRows() }, [myIds]) // eslint-disable-line react-hooks/exhaustive-deps

  const displayRows = useMemo(() => rows, [rows])

  /* ----------------------------- Create Modal ----------------------------- */
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showReferralsTab, setShowReferralsTab] = useState(false)
  const [selectedClientForReferrals, setSelectedClientForReferrals] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [referralSource, setReferralSource] = useState('')

  const resetCreateForm = () => {
    setFirstName(''); setLastName(''); setEmail(''); setPhone('')
  }

  

  /* ------------------------------ Actions --------------------------------- */
  const sendIntake = (via: 'whatsapp' | 'email', r: ClientRow) => {
    const link = `${window.location.origin}/intake/${r.id}`
    if (via === 'whatsapp') {
      const phone = formatWhatsappDigits((r.phone || r.whatsapp_number || ''))
      if (!phone || phone.replace(/\D/g, '').length < 6) return setToast({ type: 'error', message: 'No valid WhatsApp number on file.' })
      const code = r.patient_code || 'your code'
      const text = `Hello ${r.first_name || ''}, please use the code ${code} to log in and complete your intake form: ${link}`
      window.open(`https://wa.me/${phone.replace('+', '')}?text=${encodeURIComponent(text)}`, '_blank', 'noopener,noreferrer')
    } else {
      const code = r.patient_code ? `Your code: ${r.patient_code}\n\n` : ''
      window.location.href = `mailto:${r.email}?subject=Intake%20Form&body=${encodeURIComponent(
        `${code}Please complete your intake: ${link}`
      )}`
    }
  }

  const openCase = (r: ClientRow) => navigate(`/therapist/cases?clientId=${encodeURIComponent(r.id)}`)
  const assignAssessment = (r: ClientRow) => navigate(`/therapist/assessments?clientId=${encodeURIComponent(r.id)}`)
  const messageClient = (r: ClientRow) => navigate(`/therapist/comms?clientId=${encodeURIComponent(r.id)}`)
  const isMine = (id: string) => myIds.has(id)
  const getAssignmentStatus = (id: string) => assignedMap[id] || null

  // Render body content (clients list vs referrals inbox)
  const bodyContent = showReferralsTab ? (
    <div className="p-4">
      {profile?.role === 'therapist' ? (
        <TherapistReferralsInbox />
      ) : (
        <div className="p-4">You do not have access to the referral inbox.</div>
      )}
    </div>
  ) : loading ? (
    <div className="py-12 grid place-items-center">
      <div className="w-6 h-6 animate-spin border-b-2 border-blue-600 rounded-full" />
    </div>
  ) : error ? (
    <div className="p-4 text-red-700 bg-red-50 border-b border-red-200 flex items-center gap-2">
      <AlertTriangle className="w-5 h-5 shrink-0" />
      <span className="break-words">{error}</span>
    </div>
  ) : displayRows.length === 0 ? (
    <div className="py-16 text-center">
      <Users className="w-10 h-10 text-gray-300 mx-auto mb-2" />
      <div className="text-gray-900 font-medium">No clients found</div>
      <div className="text-sm text-gray-600">Try changing scope or search</div>
    </div>
  ) : (
    <>
      {/* Mobile: card list */}
      <ul className="divide-y md:hidden">
        {displayRows.map(r => {
          const mine = myIds.has(r.id)
          const name = fullName(r)
          const patientId = r.patient_code || r.id
          return (
            <li key={r.id} data-test-client-row className="p-4 space-y-2">
              <div className="flex items-center gap-3">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-gray-200 text-xs font-semibold flex-shrink-0">
                  {toInitials(r.first_name, r.last_name)}
                </span>
                <div className="min-w-0">
                  <div className="font-medium text-gray-900 truncate">{name}</div>
                  <div className="text-xs text-gray-500">{new Date(r.created_at).toLocaleDateString()}</div>
                </div>
              </div>

              {/* Compact card: always surface Patient ID and Name */}
              <div className="text-sm text-gray-700">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-[11px] uppercase text-gray-400">Patient ID</div>
                    <div className="font-mono text-[12px] text-gray-700 truncate">{patientId}</div>
                  </div>
                  <button type="button" onClick={() => copyPatientIdToClipboard(patientId)} className="p-1 rounded hover:bg-gray-100">
                    <Copy className="w-4 h-4 text-gray-500" />
                  </button>
                </div>
                <div className="text-[11px] uppercase text-gray-400 mt-2">Name</div>
                <div className="truncate text-gray-600">{name}</div>
              </div>

              <div className="pt-2">
                <div className="flex items-center gap-2 text-xs text-gray-600">
                  <button onClick={() => openCase(r)} title="Open Case" className="p-2 rounded hover:bg-gray-100">
                    <FileText className="w-4 h-4 text-indigo-700" />
                  </button>
                  <button onClick={() => assignAssessment(r)} title="Assign Assessment" className="p-2 rounded hover:bg-gray-100">
                    <Brain className="w-4 h-4 text-amber-700" />
                  </button>
                  <button onClick={() => messageClient(r)} title="Message" className="p-2 rounded hover:bg-gray-100">
                    <MessageSquare className="w-4 h-4 text-blue-700" />
                  </button>
                  <button onClick={() => openEditModal(r)} title="Edit" className="p-2 rounded hover:bg-gray-100">
                    <Edit className="w-4 h-4 text-gray-700" />
                  </button>
                  <div className="ml-auto text-[11px] text-gray-500">{new Date(r.created_at).toLocaleDateString()}</div>
                </div>

                <div className="mt-2">
                  <ClientActions clientId={r.id} patientCode={r.patient_code} isMine={mine} assignmentStatus={getAssignmentStatus(r.id)} onRefresh={() => setRefreshKey(k => k + 1)} />
                </div>
              </div>
            </li>
          )
        })}
      </ul>

      {/* Desktop: compact Patient ID + Actions */}
      <div className="hidden md:block w-full overflow-x-auto">
        <table className="w-full table-auto">
          <colgroup>
            <col className="w-[60%]" />
            <col className="w-[40%]" />
          </colgroup>
          <thead className="bg-gray-50 text-xs uppercase text-gray-600">
            <tr>
              <th className="text-left px-4 py-3">Patient ID</th>
              <th className="text-right px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y text-sm">
            {displayRows.map(r => (
              <tr key={r.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 align-top">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[13px] text-gray-700 truncate border rounded px-2 py-1 bg-gray-50">{r.patient_code || r.id}</span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <ClientActions clientId={r.id} patientCode={r.patient_code} isMine={myIds.has(r.id)} assignmentStatus={getAssignmentStatus(r.id)} onRefresh={() => setRefreshKey(k => k + 1)} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )

  const requestAssignment = async (clientId: string) => {
    if (!profile?.id) {
      setToast({ type: 'error', message: 'Not signed in' })
      return
    }
    setRequestingMap(m => ({ ...m, [clientId]: true }))
    try {
      const { error } = await supabase.from('assignments').insert({ therapist_id: profile.id, client_id: clientId })
      if (error) throw error
      setAssignedMap(m => ({ ...m, [clientId]: 'pending' }))
      setToast({ type: 'success', message: 'Assignment request sent.' })
    } catch (err: any) {
      console.error('[Clienteles] requestAssignment', err)
      setToast({ type: 'error', message: err?.message || 'Failed to request assignment' })
    } finally {
      setRequestingMap(m => ({ ...m, [clientId]: false }))
    }
  }

  const createCaseForClient = async (clientId: string) => {
    if (!profile?.id) {
      setToast({ type: 'error', message: 'Not authenticated' })
      return
    }
    try {
      const { data, error } = await supabase.rpc('create_case_for_client', { p_client_id: clientId, p_case_number: null, p_initial_payload: {} })
      if (error) throw error
      // rpc returns the new uuid — handle scalar or array
      const newCaseId = Array.isArray(data) ? (data[0] as any) : (data as any)
      setToast({ type: 'success', message: 'Case created' })
      if (newCaseId) {
        navigate(`/therapist/cases/${encodeURIComponent(String(newCaseId))}`)
      } else {
        // fallback to listing for the client
        navigate(`/therapist/cases?clientId=${encodeURIComponent(clientId)}`)
      }
    } catch (err: any) {
      console.error('[Clienteles] createCaseForClient', err)
      if (String(err?.message || '').includes('assignment_not_accepted')) {
        setToast({ type: 'error', message: 'Assignment not accepted — cannot create case.' })
      } else {
        setToast({ type: 'error', message: err?.message || 'Could not create case' })
      }
    }
  }



  /* ----------------------------- Edit Modal ----------------------------- */
  const [showEditModal, setShowEditModal] = useState(false)
  const [editing, setEditing] = useState(false)
  const [editingClient, setEditingClient] = useState<ClientRow | null>(null)
  const [editFirstName, setEditFirstName] = useState('')
  const [editLastName, setEditLastName] = useState('')
  const [editEmail, setEditEmail] = useState('')
  const [editPhone, setEditPhone] = useState('')
  const [editCity, setEditCity] = useState('')
  const [editCountry, setEditCountry] = useState('')
  const [editReferralSource, setEditReferralSource] = useState('')

  const openEditModal = (r: ClientRow) => {
    setEditingClient(r)
    setEditFirstName(r.first_name || '')
    setEditLastName(r.last_name || '')
    setEditEmail(r.email || '')
    setEditPhone(r.phone || r.whatsapp_number || '')
    setEditCity(r.city || '')
    setEditCountry(r.country || '')
    setEditReferralSource(r.referral_source || '')
    setShowEditModal(true)
  }

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingClient) return
    setEditing(true)
    try {
      const updates: Partial<ClientRow> = {
        first_name: editFirstName.trim() || null,
        last_name: editLastName.trim() || null,
        email: editEmail.trim() || null,
        phone: editPhone.trim() || null,
        whatsapp_number: editPhone.trim() || null,
        city: editCity.trim() || null,
        country: editCountry.trim() || null,
        referral_source: editReferralSource.trim() || null
      }
      const ok = await patchClient(editingClient.id, updates)
      if (ok) {
        setShowEditModal(false)
      }
    } finally {
      setEditing(false)
    }
  }

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!profile?.id) return
    const cleanPhone = formatWhatsappDigits(phone)
    if (!firstName.trim() || !lastName.trim() || !email.trim() || !cleanPhone) return

    setCreating(true)
    try {
      let newUserId: string | null = null
      let existingProfileId: string | null = null
  let patientCode: string | null = null

      const { data: existing, error: existingErr } = await supabase
        .from('profiles')
        .select('id, patient_code, role')
        .eq('email', email.toLowerCase())
        .limit(1)
        .maybeSingle()

      if (!existingErr && existing?.id) {
        existingProfileId = existing.id
        if (existing.patient_code) patientCode = existing.patient_code
      } else {
        existingProfileId = null
      }

  if (!existingProfileId) {
        const supabaseAnon = createClient(
          import.meta.env.VITE_SUPABASE_URL,
          import.meta.env.VITE_SUPABASE_ANON_KEY,
          { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } }
        )

        // Generate a temporary signup password for the new auth user. We'll show this to the therapist
        // so they can share it with the client. The server will still generate the canonical patient_code.
        const signupPassword = generatePatientCode()

        const signUp = await supabaseAnon.auth.signUp({
          email: email.toLowerCase(),
          password: signupPassword,
          options: {
            data: {
              first_name: firstName,
              last_name: lastName,
              role: 'client',
              password_set: false
            }
          }
        })

  if (signUp.error) {
          if (!signUp.error.message?.toLowerCase().includes('already registered')) {
            throw signUp.error
          }
          const fallback = await supabase
            .from('profiles')
            .select('id, patient_code, role')
            .eq('email', email.toLowerCase())
            .limit(1)
            .maybeSingle()
          if (fallback.error || !fallback.data?.id) throw signUp.error
          existingProfileId = fallback.data.id
          if (fallback.data.patient_code) patientCode = fallback.data.patient_code
        } else {
          if (!signUp.data.user) throw new Error('Auth signup succeeded but no user returned.')
          newUserId = signUp.data.user.id
          // carry forward the signupPassword so the therapist can see it in the confirmation message
          patientCode = signupPassword
        }
      }

      const targetId = existingProfileId || newUserId
      if (!targetId) throw new Error('Could not resolve client id.')

  // The signup password (if created above) is stored in patientCode for messaging purposes.
  // The server will be asked to generate the canonical patient_code.

      // Create a client record in the new `clients` table and upsert the profile without a client-side patient_code.
      const { error: clientErr } = await supabase.from('clients').upsert({
        id: targetId,
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        email: email.toLowerCase(),
        whatsapp_number: cleanPhone,
        referral_source: referralSource || null,
        created_at: new Date().toISOString()
      }, { onConflict: 'id' })
      if (clientErr) throw clientErr

      const { error: upsertErr } = await supabase.from('profiles').upsert({
        id: targetId,
        role: 'client',
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        email: email.toLowerCase(),
        whatsapp_number: cleanPhone,
        created_by_therapist: profile.id,
        password_set: false
      }, { onConflict: 'id' })
      if (upsertErr) throw upsertErr

      // Ask the server to ensure (and return) a patient_code for the profile. If the RPC is missing or fails,
      // fall back to a deterministic client-side code so the flow still works.
      let finalPatientCode: string | null = null
      try {
        const { data: codeData, error: codeErr } = await supabase.rpc('ensure_patient_code', { p_profile: targetId }) as any
        if (codeErr) throw codeErr
        const code = Array.isArray(codeData) ? codeData[0] : codeData
        if (code) finalPatientCode = String(code)
      } catch (rpcErr) {
        // RPC not available or failed — fallback to deterministic client-side code
        finalPatientCode = generatePatientCode(targetId)
        console.warn('[Clienteles] ensure_patient_code RPC failed, falling back to client-side code', rpcErr)
      }

      // Persist the patient_code into the clients mirror and into profiles so the server and UI agree.
      if (finalPatientCode) {
        await supabase.from('clients').update({ patient_code: finalPatientCode }).eq('id', targetId)
          .then(({ error }) => { if (error) console.warn('[Clienteles] updating clients.patient_code failed', error) })
        await supabase.from('profiles').update({ patient_code: finalPatientCode }).eq('id', targetId)
          .then(({ error }) => { if (error) console.warn('[Clienteles] updating profiles.patient_code failed', error) })
      }

      const rel = await supabase
        .from('therapist_client_relations')
        .insert({ therapist_id: profile.id, client_id: targetId })
      if (rel.error && !/duplicate key|already exists/i.test(rel.error.message || '')) {
        throw rel.error
      }

      await supabase.from('client_profiles')
        .insert({ therapist_id: profile.id, client_id: targetId })
        .then(({ error }) => {
          if (error && !/duplicate key|already exists/i.test(error.message || '')) {
            console.warn('[Clienteles] client_profiles insert warning:', error.message)
          }
        })

      setShowCreateModal(false)
      resetCreateForm()
      setRefreshKey(k => k + 1)

      const intakeUrl = `${window.location.origin}/intake/${targetId}`
      const msg = `Client created.\n\n• Temp password: ${patientCode || '(no temp password)'}\n• Patient code: ${finalPatientCode || '(not available)'}\n• Intake: ${intakeUrl}\n\nOpen WhatsApp to share this now?`
  const ok = await confirmAsync({ title: 'Confirm', description: msg })
  if (ok) {
        const waText = `Hello ${firstName}, please use the code ${finalPatientCode || patientCode || 'your code'} to log in and complete your intake form: ${intakeUrl}`
        const waNumber = cleanPhone.replace('+', '')
        if (waNumber) window.open(`https://wa.me/${waNumber}?text=${encodeURIComponent(waText)}`, '_blank', 'noopener,noreferrer')
      }
    } catch (err: any) {
      console.error('[Clienteles] create client error', err)
      alert(err?.message || 'Failed to create client. Please try again.')
    } finally {
      setCreating(false)
    }
  }

  /* --------------------------------- UI ----------------------------------- */
  return (
    <div className="h-full min-h-0 w-full overflow-x-hidden">
      <div className="mx-auto w-full max-w-[1400px] px-3 sm:px-6 py-6 min-w-0">
        {/* Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
          <div className="flex items-center gap-2">
            <Users className="w-6 h-6 text-blue-600 shrink-0" />
            <div className="text-sm text-gray-500">{displayRows.length} clients</div>
          </div>

          <div className="flex flex-wrap items-center gap-2 min-w-0">
            <div className="relative flex-1 min-w-0">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search name, email, patient id…"
                className="pl-9 pr-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-full"
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
              className="inline-flex items-center gap-1 px-3 py-2 border rounded-lg text-sm hover:bg-gray-50"
              title="Refresh"
            >
              <RefreshCcw className="w-4 h-4" />
              Refresh
            </button>

            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-1 px-3 py-2 rounded-lg text-sm bg-blue-600 text-white hover:bg-blue-700"
              title="Add Client"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Add Client</span>
            </button>
            <button
              onClick={() => setShowReferralsTab(s => !s)}
              className={`inline-flex items-center gap-1 px-3 py-2 rounded-lg text-sm ${showReferralsTab ? 'bg-gray-700 text-white' : 'bg-white hover:bg-gray-50'}`}
              title="Referrals"
            >
              <Users className="w-4 h-4" />
              <span className="hidden sm:inline">Referrals</span>
            </button>
          </div>
        </div>

        {/* Title (moved below controls) */}
        <div className="mt-4 mb-2">
          <h2 className="text-2xl font-bold text-gray-900">Clienteles</h2>
        </div>

        {/* Body */}
        <div className="bg-white border rounded-lg shadow-sm overflow-hidden">
          {bodyContent}
        </div>

        <TherapistSearchModal />

        <div className="mt-3 text-xs text-gray-500 flex items-center gap-1">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span className="whitespace-normal">
            Private contact details are only visible for <b>My Clients</b> (linked via
            <span className="whitespace-nowrap"> therapist_client_relations</span>).
          </span>
        </div>
      </div>

      {/* -------------------------------- Modal ------------------------------- */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div
            className="fixed inset-0 bg-black/40"
            onClick={() => !creating && setShowCreateModal(false)}
          />
          <div className="flex min-h-screen items-end justify-center px-4 pb-10 pt-6 text-center sm:block sm:p-0">
            <div className="inline-block w-full max-w-lg transform overflow-hidden rounded-lg bg-white text-left shadow-xl transition-all sm:my-8 sm:align-middle">
              <form onSubmit={handleCreateSubmit}>
                <div className="bg-white px-6 pt-6 pb-3">
                  <div className="flex items-start justify-between">
                    <h3 className="text-lg font-medium text-gray-900">Create New Client</h3>
                    <button
                      type="button"
                      onClick={() => !creating && setShowCreateModal(false)}
                      className="p-2 rounded hover:bg-gray-100"
                      title="Close"
                    >
                      <X className="w-5 h-5 text-gray-500" />
                    </button>
                  </div>

                  <div className="mt-4 space-y-4">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div>
                        <label htmlFor="firstName" className="block text-sm font-medium text-gray-700">First Name *</label>
                        <input
                          id="firstName" type="text" required
                          className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                          value={firstName} onChange={e => setFirstName(e.target.value)}
                        />
                      </div>
                      <div>
                        <label htmlFor="lastName" className="block text-sm font-medium text-gray-700">Last Name *</label>
                        <input
                          id="lastName" type="text" required
                          className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                          value={lastName} onChange={e => setLastName(e.target.value)}
                        />
                      </div>
                    </div>

                    <div>
                      <label htmlFor="email" className="block text-sm font-medium text-gray-700">Email *</label>
                      <input
                        id="email" type="email" required placeholder="client@example.com"
                        className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                        value={email} onChange={e => setEmail(e.target.value)}
                      />
                    </div>

                    <div>
                      <label htmlFor="phone" className="block text-sm font-medium text-gray-700">WhatsApp Number *</label>
                      <input
                        id="phone" type="tel" required placeholder="+1 555 123 4567"
                        className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                        value={phone} onChange={e => setPhone(e.target.value)}
                      />
                      <p className="mt-1 text-[11px] text-gray-500">Use international format if possible (e.g., +15551234567).</p>
                    </div>
                    <div>
                      <label htmlFor="referralSource" className="block text-sm font-medium text-gray-700">Referral Source</label>
                      <input
                        id="referralSource" type="text" placeholder="e.g. clinic, self, online"
                        className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                        value={referralSource} onChange={e => setReferralSource(e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 px-6 py-4 sm:flex sm:flex-row-reverse">
                  <button
                    type="submit"
                    disabled={creating || !firstName.trim() || !lastName.trim() || !email.trim() || !formatWhatsappDigits(phone)}
                    className="inline-flex w-full justify-center rounded-md bg-blue-600 px-4 py-2 text-base font-medium text-white shadow-sm hover:bg-blue-700 disabled:opacity-50 sm:ml-3 sm:w-auto sm:text-sm"
                  >
                    {creating ? 'Creating…' : 'Create Client'}
                  </button>
                  <button
                    type="button"
                    onClick={() => !creating && setShowCreateModal(false)}
                    className="mt-3 inline-flex w-full justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-base font-medium text-gray-700 shadow-sm hover:bg-gray-50 sm:mt-0 sm:w-auto sm:text-sm"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* -------------------------------- Edit Modal ------------------------------- */}
      {showEditModal && editingClient && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div
            className="fixed inset-0 bg-black/40"
            onClick={() => !editing && setShowEditModal(false)}
          />
          <div className="flex min-h-screen items-end justify-center px-4 pb-10 pt-6 text-center sm:block sm:p-0">
            <div className="inline-block w-full max-w-lg transform overflow-hidden rounded-lg bg-white text-left shadow-xl transition-all sm:my-8 sm:align-middle">
              <form onSubmit={handleEditSubmit}>
                <div className="bg-white px-6 pt-6 pb-3">
                  <div className="flex items-start justify-between">
                    <h3 className="text-lg font-medium text-gray-900">Edit Client</h3>
                    <button
                      type="button"
                      onClick={() => !editing && setShowEditModal(false)}
                      className="p-2 rounded hover:bg-gray-100"
                      title="Close"
                    >
                      <X className="w-5 h-5 text-gray-500" />
                    </button>
                  </div>

                  <div className="mt-4 space-y-4">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">First Name</label>
                        <input value={editFirstName} onChange={e => setEditFirstName(e.target.value)} className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Last Name</label>
                        <input value={editLastName} onChange={e => setEditLastName(e.target.value)} className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2" />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">Email</label>
                      <input value={editEmail} onChange={e => setEditEmail(e.target.value)} className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2" />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">Phone / WhatsApp</label>
                      <input value={editPhone} onChange={e => setEditPhone(e.target.value)} className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2" />
                    </div>

                    {/* City/Country removed from therapist UI (private fields) */}

                    <div>
                      <label className="block text-sm font-medium text-gray-700">Referral Source</label>
                      <input value={editReferralSource} onChange={e => setEditReferralSource(e.target.value)} className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2" />
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 px-6 py-4 sm:flex sm:flex-row-reverse">
                  <button
                    type="submit"
                    disabled={editing}
                    className="inline-flex w-full justify-center rounded-md bg-blue-600 px-4 py-2 text-base font-medium text-white shadow-sm hover:bg-blue-700 disabled:opacity-50 sm:ml-3 sm:w-auto sm:text-sm"
                  >
                    {editing ? 'Saving…' : 'Save Changes'}
                  </button>
                  <button
                    type="button"
                    onClick={() => !editing && setShowEditModal(false)}
                    className="mt-3 inline-flex w-full justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-base font-medium text-gray-700 shadow-sm hover:bg-gray-50 sm:mt-0 sm:w-auto sm:text-sm"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
      {/* Toast */}
      {toast && (
        <div className={`fixed right-4 bottom-6 z-50 max-w-sm w-[90vw] sm:w-auto`}> 
          <div className={`px-4 py-3 rounded shadow-lg text-sm ${toast.type === 'success' ? 'bg-green-600 text-white' : toast.type === 'error' ? 'bg-red-600 text-white' : 'bg-gray-800 text-white'}`}>
            <div className="flex items-center justify-between gap-4">
              <div className="truncate">{toast.message}</div>
              <button onClick={() => setToast(null)} className="ml-2 opacity-80 hover:opacity-100">Dismiss</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Clienteles
