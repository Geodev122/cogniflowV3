// src/components/therapist/Clienteles.tsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { createClient } from '@supabase/supabase-js'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import {
  Users, Search, AlertTriangle, ShieldCheck, MessageSquare, FileText, Brain, RefreshCcw, Plus, X
} from 'lucide-react'

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
  // keep digits and leading '+'
  const trimmed = input.trim()
  const plus = trimmed.startsWith('+') ? '+' : ''
  const digits = trimmed.replace(/[^\d]/g, '')
  return plus + digits
}

function generatePatientCode(): string {
  // PT + 6 random digits
  const n = Math.floor(100000 + Math.random() * 900000)
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

  const searchDebounce = useRef<number | null>(null)

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

  const fetchRows = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      let query = supabase
        .from('profiles')
        .select('id, first_name, last_name, email, phone, whatsapp_number, city, country, created_at, role, patient_code')
        .eq('role', 'client') as any

      if (scope === 'mine') {
        const ids = Array.from(myIds)
        if (ids.length === 0) {
          setRows([])
          setLoading(false)
          return
        }
        query = query.in('id', ids)
      }

      if (q.trim().length > 0) {
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
  useEffect(() => { fetchMineIds() }, [fetchMineIds, refreshKey])

  // Debounce search
  useEffect(() => {
    if (searchDebounce.current) window.clearTimeout(searchDebounce.current)
    searchDebounce.current = window.setTimeout(() => { fetchRows() }, 250)
    return () => { if (searchDebounce.current) window.clearTimeout(searchDebounce.current) }
  }, [q, scope, myIds, fetchRows])

  // Also fetch when myIds first resolves
  useEffect(() => { fetchRows() }, [myIds]) // eslint-disable-line react-hooks/exhaustive-deps

  const displayRows = useMemo(() => rows, [rows])

  /* ------------------------------ Actions --------------------------------- */
  const sendIntake = (via: 'whatsapp' | 'email', r: ClientRow) => {
    const link = `${window.location.origin}/intake/${r.id}`
    if (via === 'whatsapp') {
      const phone = formatWhatsappDigits((r.phone || r.whatsapp_number || ''))
      if (!phone || phone.replace(/\D/g, '').length < 6) return alert('No valid WhatsApp number on file.')
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

  /* ----------------------------- Create Modal ----------------------------- */
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [creating, setCreating] = useState(false)
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')

  const resetCreateForm = () => {
    setFirstName(''); setLastName(''); setEmail(''); setPhone('')
  }

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!profile?.id) return
    const cleanPhone = formatWhatsappDigits(phone)
    if (!firstName.trim() || !lastName.trim() || !email.trim() || !cleanPhone) return

    setCreating(true)
    try {
      // 1) If a profile with this email already exists, link & update minimal fields
      let newUserId: string | null = null
      let existingProfileId: string | null = null
      let patientCode = generatePatientCode()

      // NOTE: RLS may allow this select; if not, we fall back to signUp branch.
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
        // 2) Create Auth user with temp password = patientCode (no session persistence!)
        const supabaseAnon = createClient(
          import.meta.env.VITE_SUPABASE_URL,
          import.meta.env.VITE_SUPABASE_ANON_KEY,
          { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } }
        )

        const signUp = await supabaseAnon.auth.signUp({
          email: email.toLowerCase(),
          password: patientCode,
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
          // Common case: email already registered -> try to fetch profile again and proceed
          if (!signUp.error.message?.toLowerCase().includes('already registered')) {
            throw signUp.error
          }
          // Try find the profile now (user was there)
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
        }
      }

      const targetId = existingProfileId || newUserId
      if (!targetId) throw new Error('Could not resolve client id.')

      // 3) Upsert into profiles (ensure role=client, patient_code, names, whatsapp_number)
      const { error: upsertErr } = await supabase.from('profiles').upsert({
        id: targetId,
        role: 'client',
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        email: email.toLowerCase(),
        whatsapp_number: cleanPhone,
        patient_code: patientCode,
        created_by_therapist: profile.id,
        password_set: false
      }, { onConflict: 'id' })
      if (upsertErr) throw upsertErr

      // 4) Link therapist <> client (ignore duplicate relation error)
      const rel = await supabase
        .from('therapist_client_relations')
        .insert({ therapist_id: profile.id, client_id: targetId })
      if (rel.error && !/duplicate key|already exists/i.test(rel.error.message || '')) {
        throw rel.error
      }

      // 5) Ensure client_profiles placeholder (optional)
      await supabase.from('client_profiles')
        .insert({ therapist_id: profile.id, client_id: targetId })
        .then(({ error }) => {
          if (error && !/duplicate key|already exists/i.test(error.message || '')) {
            // Non-fatal — log only
            console.warn('[Clienteles] client_profiles insert warning:', error.message)
          }
        })

      // 6) Done — refresh and suggest WhatsApp
      setShowCreateModal(false)
      resetCreateForm()
      setRefreshKey(k => k + 1)

      // Offer to open WhatsApp prefilled
      const intakeUrl = `${window.location.origin}/intake/${targetId}`
      const msg = `Client created.\n\n• Temp password: ${patientCode}\n• Intake: ${intakeUrl}\n\nOpen WhatsApp to share this now?`
      if (confirm(msg)) {
        const waText = `Hello ${firstName}, please use the code ${patientCode} to log in and complete your intake form: ${intakeUrl}`
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
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
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

          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-1 px-3 py-2 rounded-lg text-sm bg-blue-600 text-white hover:bg-blue-700"
            title="Add Client"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Add Client</span>
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
                  const name = fullName(r)
                  return (
                    <tr key={r.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-900 flex items-center gap-2">
                          <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-gray-200 text-[10px]">
                            {toInitials(r.first_name, r.last_name)}
                          </span>
                          {name}
                        </div>
                        <div className="text-xs text-gray-500">{new Date(r.created_at).toLocaleDateString()}</div>
                      </td>
                      <td className="px-4 py-3">{r.city || '—'}</td>
                      <td className="px-4 py-3">{r.country || '—'}</td>
                      <td className="px-4 py-3">
                        <div className="text-xs text-gray-600">{mine ? (r.email || '—') : 'Hidden'}</div>
                        <div className="text-xs text-gray-500">{mine ? (r.phone || r.whatsapp_number || '—') : '—'}</div>
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

      {/* -------------------------------- Modal ------------------------------- */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/40"
            onClick={() => !creating && setShowCreateModal(false)}
          />
          {/* Dialog */}
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
    </div>
  )
}

export default Clienteles
