import React, { useState, useEffect, useCallback, Suspense } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { isRecursionError } from '../utils/helpers'
import {
  Users,
  FileText,
  Calendar,
  Library,
  CheckCircle,
  AlertTriangle,
  Menu,
  X,
  Target,
  ChevronLeft,
  User,
  CalendarDays,
  Brain,
  Shield,
  Headphones,
  Plus,
  Eye,
  Phone,
  LogOut,
  BarChart3,
  Building2,
  MessageCircle,
  Loader2,
  Send,
  Filter,
  Search,
  Download,
  Upload,
  ShieldCheck,
  CreditCard,
  IdCard,
  Ticket,
  Star,
  Bell,
  ClipboardList,
} from 'lucide-react'
import { Navigate } from 'react-router-dom'
import { TherapistOnboarding } from '../components/therapist/TherapistOnboarding'

// Lazy modules that exist in your repo already
const ClientManagement = React.lazy(() =>
  import('../components/therapist/ClientManagement').then(m => ({ default: m.ClientManagement }))
)
const SessionManagement = React.lazy(() =>
  import('../components/therapist/SessionManagement').then(m => ({ default: m.SessionManagement }))
)
const CaseManagement = React.lazy(() =>
  import('../components/therapist/CaseManagement').then(m => ({ default: m.CaseManagement }))
)
const CommunicationTools = React.lazy(() => import('../components/therapist/CommunicationTools'))
const ResourceLibrary = React.lazy(() =>
  import('../components/therapist/ResourceLibrary').then(m => ({ default: m.default || m }))
)

/* ──────────────────────────────────────────────────────────────────────────────
   Inline Progress Metrics (keeps Vite happy even if you later extract it)
────────────────────────────────────────────────────────────────────────────── */
const ProgressMetrics: React.FC = () => {
  const cards = [
    { title: 'Active Cases', value: 18, sub: 'now' },
    { title: 'Upcoming Sessions', value: 7, sub: 'next 48h' },
    { title: 'Pending Assessments', value: 5, sub: 'awaiting client' },
    { title: 'Alerts', value: 2, sub: 'action needed' },
  ]
  const rows = [
    { name: 'John Smith', metric: 'PHQ-9 Δ', value: '-3', note: 'Improving' },
    { name: 'Emily Davis', metric: 'GAD-7 Δ', value: '-1', note: 'Stable' },
    { name: 'Michael Lee', metric: 'PHQ-9 Δ', value: '-4', note: 'Improving' },
  ]
  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center gap-2 mb-6">
        <BarChart3 className="w-6 h-6 text-blue-600" />
        <h2 className="text-2xl font-bold text-gray-900">Progress Metrics</h2>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {cards.map((c) => (
          <div key={c.title} className="bg-white rounded-lg border border-gray-200 shadow-sm p-5">
            <div className="text-sm text-gray-600">{c.title}</div>
            <div className="text-3xl font-bold text-gray-900 mt-1">{c.value}</div>
            <div className="text-xs text-gray-500 mt-1">{c.sub}</div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
        <div className="px-4 py-3 border-b border-gray-200">
          <h3 className="text-sm font-semibold text-gray-900">Recent Changes</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full table-fixed">
            <colgroup>
              <col className="w-1/2" />
              <col className="w-1/4" />
              <col className="w-1/6" />
              <col className="w-1/6" />
            </colgroup>
            <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
              <tr>
                <th className="text-left px-4 py-3">Client</th>
                <th className="text-left px-4 py-3">Metric</th>
                <th className="text-left px-4 py-3">Value</th>
                <th className="text-left px-4 py-3">Note</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 text-sm">
              {rows.map((r, i) => (
                <tr key={i} className="hover:bg-gray-50">
                  <td className="px-4 py-3">{r.name}</td>
                  <td className="px-4 py-3">{r.metric}</td>
                  <td className="px-4 py-3">{r.value}</td>
                  <td className="px-4 py-3">{r.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

/* ──────────────────────────────────────────────────────────────────────────────
   Clinic Rentals (Supabase wired)
   Tables:
     clinic_spaces(active bool, ...), clinic_rental_requests(therapist_id uuid, ...)

   RLS (reference):
     - spaces: SELECT active=true for authenticated
     - requests: INSERT/SELECT where therapist_id = auth.uid()
────────────────────────────────────────────────────────────────────────────── */
type RequestType = 'hourly' | 'daily' | 'tailored'
interface ClinicSpace {
  id: string
  name: string
  location?: string | null
  amenities?: string[] | null
  pricing_hourly?: number | null
  pricing_daily?: number | null
  tailored_available?: boolean | null
  whatsapp?: string | null
  external_managed?: boolean | null
  active?: boolean | null
  created_at?: string | null
}
interface MyRequest {
  id: string
  created_at: string
  request_type: RequestType
  status: string
  preferred_date: string | null
  duration_hours: number | null
  notes: string | null
  space: { id: string; name: string } | null
}

const RequestBookingModal: React.FC<{
  open: boolean
  onClose: () => void
  onSubmit: (payload: {
    request_type: RequestType
    preferred_date: string | null
    duration_hours: number | null
    notes: string
  }) => Promise<void>
  defaultType: RequestType
  spaceName: string
  submitting: boolean
}> = ({ open, onClose, onSubmit, defaultType, spaceName, submitting }) => {
  const [requestType, setRequestType] = useState<RequestType>(defaultType)
  const [date, setDate] = useState<string>('')
  const [hours, setHours] = useState<string>(defaultType === 'hourly' ? '2' : '')
  const [notes, setNotes] = useState('')

  useEffect(() => {
    setRequestType(defaultType)
    setHours(defaultType === 'hourly' ? '2' : '')
  }, [defaultType])

  if (!open) return null

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    await onSubmit({
      request_type: requestType,
      preferred_date: date || null,
      duration_hours: requestType === 'hourly' ? Number(hours || 0) || 1 : null,
      notes,
    })
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="fixed inset-0 bg-gray-900/50" onClick={onClose} />
        <div className="relative bg-white rounded-xl shadow-xl w-full max-w-lg">
          <form onSubmit={submit}>
            <div className="p-5 border-b border-gray-200 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Request Clinic Space</h3>
                <p className="text-sm text-gray-600">{spaceName}</p>
              </div>
              <button type="button" className="text-gray-400 hover:text-gray-600" onClick={onClose}>
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <label className="block">
                <span className="block text-sm font-medium text-gray-700 mb-1">Request type</span>
                <select
                  value={requestType}
                  onChange={(e) => setRequestType(e.target.value as RequestType)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="hourly">Hourly booking</option>
                  <option value="daily">Per day booking</option>
                  <option value="tailored">Tailored plan</option>
                </select>
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <label className="block">
                  <span className="block text-sm font-medium text-gray-700 mb-1">Preferred date (optional)</span>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </label>

                {requestType === 'hourly' && (
                  <label className="block">
                    <span className="block text-sm font-medium text-gray-700 mb-1">Hours</span>
                    <input
                      type="number"
                      min={1}
                      max={12}
                      value={hours}
                      onChange={(e) => setHours(e.target.value)}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </label>
                )}
              </div>

              <label className="block">
                <span className="block text-sm font-medium text-gray-700 mb-1">Notes (optional)</span>
                <textarea
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Timing constraints, recurring interest, special setup needs…"
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </label>
            </div>
            <div className="p-5 border-t border-gray-200 flex justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="inline-flex items-center gap-2 px-5 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                {submitting ? 'Submitting…' : 'Submit request'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

const ClinicRental: React.FC = () => {
  const { profile } = useAuth()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [spaces, setSpaces] = useState<ClinicSpace[]>([])
  const [requests, setRequests] = useState<MyRequest[]>([])
  const [modalOpen, setModalOpen] = useState(false)
  const [modalSubmitting, setModalSubmitting] = useState(false)
  const [activeSpace, setActiveSpace] = useState<ClinicSpace | null>(null)
  const [defaultType, setDefaultType] = useState<RequestType>('hourly')

  const openWA = (phone: string, text: string) => {
    if (!phone) return
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(text)}`, '_blank', 'noopener,noreferrer')
  }

  const fetchSpaces = useCallback(async () => {
    try {
      setError(null)
      setLoading(true)
      const { data, error: e } = await supabase
        .from('clinic_spaces')
        .select('id,name,location,amenities,pricing_hourly,pricing_daily,tailored_available,whatsapp,external_managed,active,created_at')
        .eq('active', true)
        .order('created_at', { ascending: false })
      if (e) throw e
      setSpaces(data || [])
    } catch (e: any) {
      console.error('[ClinicRental] fetchSpaces error', e)
      setError('Could not load clinic spaces.')
      setSpaces([])
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchRequests = useCallback(async () => {
    if (!profile?.id) return
    try {
      const { data, error: e } = await supabase
        .from('clinic_rental_requests')
        .select('id,created_at,request_type,status,preferred_date,duration_hours,notes,space:clinic_spaces (id,name)')
        .eq('therapist_id', profile.id)
        .order('created_at', { ascending: false })
        .limit(5)
      if (e) throw e
      setRequests((data as any) || [])
    } catch (e) {
      console.warn('[ClinicRental] fetchRequests error', e)
      setRequests([])
    }
  }, [profile?.id])

  useEffect(() => {
    fetchSpaces()
  }, [fetchSpaces])

  useEffect(() => {
    fetchRequests()
  }, [fetchRequests])

  const openModal = (space: ClinicSpace, type: RequestType) => {
    setActiveSpace(space)
    setDefaultType(type)
    setModalOpen(true)
  }

  const submitRequest = async (payload: {
    request_type: RequestType
    preferred_date: string | null
    duration_hours: number | null
    notes: string
  }) => {
    if (!profile?.id || !activeSpace?.id) return
    try {
      setModalSubmitting(true)
      const { error: e } = await supabase.from('clinic_rental_requests').insert({
        therapist_id: profile.id,
        space_id: activeSpace.id,
        request_type: payload.request_type,
        preferred_date: payload.preferred_date,
        duration_hours: payload.duration_hours,
        notes: payload.notes || null,
        status: 'new',
      })
      if (e) throw e
      setModalOpen(false)
      setActiveSpace(null)
      await fetchRequests()
      alert('Your request was submitted. The clinic/admin will get back to you.')
    } catch (e: any) {
      console.error('[ClinicRental] submitRequest error', e)
      alert(e?.message || 'Failed to submit request.')
    } finally {
      setModalSubmitting(false)
    }
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Building2 className="w-6 h-6 text-blue-600" />
          Clinic Rentals
        </h2>
        <p className="text-gray-600 mt-1">
          Book admin-listed clinic spaces by the hour, per day, or request a tailored plan. Externally managed listings use WhatsApp for enquiries.
        </p>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
          </div>
        ) : error ? (
          <div className="flex items-center gap-2 text-red-700 bg-red-50 border border-red-200 p-3 rounded">
            <AlertTriangle className="w-5 h-5" />
            <span>{error}</span>
          </div>
        ) : spaces.length === 0 ? (
          <div className="text-center py-10">
            <Building2 className="mx-auto h-10 w-10 text-gray-300 mb-2" />
            <h3 className="text-gray-900 font-medium">No clinic spaces yet</h3>
            <p className="text-sm text-gray-600">Admins haven’t added spaces. Check back soon.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {spaces.map((s) => (
              <div key={s.id} className="bg-white rounded-lg border border-gray-200 shadow-sm p-5 flex flex-col">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{s.name}</h3>
                    <p className="text-sm text-gray-600">{s.location || '—'}</p>
                  </div>
                  <Building2 className="w-5 h-5 text-gray-300" />
                </div>

                {s.amenities?.length ? (
                  <div className="mt-3">
                    <div className="text-xs text-gray-500 mb-1">Amenities</div>
                    <div className="flex flex-wrap gap-2">
                      {s.amenities.slice(0, 8).map((a) => (
                        <span key={a} className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-700">{a}</span>
                      ))}
                      {s.amenities.length > 8 && (
                        <span className="text-[11px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-500">
                          +{s.amenities.length - 8}
                        </span>
                      )}
                    </div>
                  </div>
                ) : null}

                <div className="mt-4 grid grid-cols-3 gap-2">
                  <div className="rounded-md border border-gray-200 p-3 text-center">
                    <div className="text-xs text-gray-500">Hour</div>
                    <div className="text-sm font-semibold text-gray-900">
                      {s.pricing_hourly != null ? `$${s.pricing_hourly}` : '—'}
                    </div>
                  </div>
                  <div className="rounded-md border border-gray-200 p-3 text-center">
                    <div className="text-xs text-gray-500">Per Day</div>
                    <div className="text-sm font-semibold text-gray-900">
                      {s.pricing_daily != null ? `$${s.pricing_daily}` : '—'}
                    </div>
                  </div>
                  <div className="rounded-md border border-gray-200 p-3 text-center">
                    <div className="text-xs text-gray-500">Tailored</div>
                    <div className="text-sm font-semibold text-gray-900">
                      {s.tailored_available ? 'Available' : '—'}
                    </div>
                  </div>
                </div>

                <div className="mt-4 flex flex-col sm:flex-row gap-2">
                  {s.external_managed ? (
                    <button
                      onClick={() =>
                        openWA(
                          s.whatsapp || '',
                          `Hi, I'm enquiring about "${s.name}" (externally managed).`
                        )
                      }
                      className="inline-flex items-center justify-center gap-2 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 text-sm"
                    >
                      <MessageCircle className="w-4 h-4" />
                      Enquire on WhatsApp
                    </button>
                  ) : (
                    <>
                      {s.pricing_hourly != null && (
                        <button
                          onClick={() => openModal(s, 'hourly')}
                          className="inline-flex items-center justify-center gap-2 rounded-md bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 text-sm"
                        >
                          Book Hourly
                        </button>
                      )}
                      {s.pricing_daily != null && (
                        <button
                          onClick={() => openModal(s, 'daily')}
                          className="inline-flex items-center justify-center gap-2 rounded-md bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 text-sm"
                        >
                          Book Per Day
                        </button>
                      )}
                      {s.tailored_available && (
                        <button
                          onClick={() => openModal(s, 'tailored')}
                          className="inline-flex items-center justify-center gap-2 rounded-md bg-sky-600 hover:bg-sky-700 text-white px-4 py-2 text-sm"
                        >
                          Tailored Plan
                        </button>
                      )}
                    </>
                  )}
                </div>

                {s.external_managed && s.whatsapp && (
                  <p className="mt-2 text-xs text-emerald-700">
                    Externally managed. Booking handled off-platform—tap Enquire to continue on WhatsApp.
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* My latest requests */}
      {profile?.id && (
        <div className="mt-6 bg-white rounded-lg border border-gray-200 shadow-sm p-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">My latest requests</h3>
          {requests.length === 0 ? (
            <p className="text-sm text-gray-600">No requests yet.</p>
          ) : (
            <div className="space-y-2">
              {requests.map((r) => (
                <div key={r.id} className="flex items-center justify-between border border-gray-100 rounded p-3">
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-gray-900 truncate">
                      {r.space?.name || 'Unknown space'}
                    </div>
                    <div className="text-xs text-gray-600">
                      {new Date(r.created_at).toLocaleString()} • {r.request_type}
                      {r.preferred_date ? ` • pref: ${r.preferred_date}` : ''}
                      {r.duration_hours ? ` • ${r.duration_hours}h` : ''}
                    </div>
                    {r.notes && <div className="text-xs text-gray-500 mt-0.5 line-clamp-1">{r.notes}</div>}
                  </div>
                  <span
                    className={`ml-3 shrink-0 inline-flex px-2 py-1 text-[11px] rounded-full ${
                      r.status === 'approved'
                        ? 'bg-green-100 text-green-700'
                        : r.status === 'rejected'
                        ? 'bg-red-100 text-red-700'
                        : 'bg-yellow-100 text-yellow-700'
                    }`}
                  >
                    {r.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <RequestBookingModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={submitRequest}
        defaultType={defaultType}
        spaceName={activeSpace?.name || ''}
        submitting={modalSubmitting}
      />
    </div>
  )
}

/* ──────────────────────────────────────────────────────────────────────────────
   Clienteles (All vs My Clients) – role-aware reveal
   Tables: profiles (role='client'), therapist_client_relations(therapist_id, client_id)
────────────────────────────────────────────────────────────────────────────── */
const Clienteles: React.FC = () => {
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
    if (e) {
      console.warn('[Clienteles] relations error', e)
      setMyIds(new Set())
    } else {
      setMyIds(new Set((data || []).map(d => d.client_id)))
    }
  }, [profile?.id])

  const fetchRows = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      let query = supabase
        .from('profiles')
        .select('id, first_name, last_name, email, phone, city, country, created_at, role')
        .eq('role', 'client')
        .order('created_at', { ascending: false })

      const { data, error: e } = await query
      if (e) throw e
      setRows(data || [])
    } catch (e: any) {
      console.error('[Clienteles] fetchRows', e)
      setError('Could not load clients.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchMineIds()
    fetchRows()
  }, [fetchMineIds, fetchRows])

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
            <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
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
        Private contact details are only visible for **My Clients** (linked via assignment).
      </div>
    </div>
  )
}

/* ──────────────────────────────────────────────────────────────────────────────
   Session Board – live session workspace
   Tables:
     session_notes (id, therapist_id, client_id, case_id, content text, updated_at)
────────────────────────────────────────────────────────────────────────────── */
const SessionBoard: React.FC = () => {
  const { profile } = useAuth()
  const [clientId, setClientId] = useState<string>('')
  const [caseId, setCaseId] = useState<string>('')
  const [content, setContent] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveInfo, setSaveInfo] = useState<string | null>(null)
  const [resources, setResources] = useState<any[]>([])

  // Quick attachable resources (compact pull from public resource_library)
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
            },
            { onConflict: 'therapist_id,case_id' } as any
          )
        if (error) throw error
        setSaveInfo('Saved')
      } catch (e: any) {
        setSaveInfo('Save failed')
      } finally {
        setSaving(false)
      }
    },
    [profile?.id, clientId, caseId]
  )

  // Debounced save
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
        {/* Left: Resources */}
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

        {/* Right: Notes */}
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

/* ──────────────────────────────────────────────────────────────────────────────
   Licensing & Compliance
   Storage bucket: licensing
   Table: therapist_licenses(id, therapist_id, file_path, expires_on, status)
────────────────────────────────────────────────────────────────────────────── */
const LicensingCompliance: React.FC = () => {
  const { profile } = useAuth()
  const [rows, setRows] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [expires, setExpires] = useState<string>('')

  const load = useCallback(async () => {
    if (!profile?.id) return
    try {
      setLoading(true)
      const { data, error: e } = await supabase
        .from('therapist_licenses')
        .select('*')
        .eq('therapist_id', profile.id)
        .order('created_at', { ascending: false })
      if (e) throw e
      setRows(data || [])
    } catch (e: any) {
      setError('Could not load licenses')
    } finally {
      setLoading(false)
    }
  }, [profile?.id])

  useEffect(() => {
    load()
  }, [load])

  const upload = async () => {
    if (!profile?.id || !file) return
    try {
      const ext = file.name.split('.').pop()
      const path = `${profile.id}/${Date.now()}.${ext}`
      const { error: st } = await supabase.storage.from('licensing').upload(path, file, { upsert: true })
      if (st) throw st
      const { error: ins } = await supabase.from('therapist_licenses').insert({
        therapist_id: profile.id,
        file_path: path,
        expires_on: expires || null,
        status: 'submitted'
      })
      if (ins) throw ins
      setFile(null)
      setExpires('')
      await load()
      alert('License uploaded.')
    } catch (e: any) {
      alert(e?.message || 'Upload failed')
    }
  }

  const daysLeft = (d?: string | null) => {
    if (!d) return null
    const ms = new Date(d).getTime() - Date.now()
    return Math.ceil(ms / (1000 * 60 * 60 * 24))
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-4">
      <div className="flex items-center gap-2">
        <IdCard className="w-6 h-6 text-blue-600" />
        <h2 className="text-2xl font-bold text-gray-900">Licensing & Compliance</h2>
      </div>

      <div className="bg-white border rounded-lg shadow-sm p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <input type="file" onChange={(e) => setFile(e.target.files?.[0] || null)} className="text-sm" />
          <input
            type="date"
            value={expires}
            onChange={(e) => setExpires(e.target.value)}
            className="px-3 py-2 border rounded text-sm"
            placeholder="Expiry date"
          />
          <button
            onClick={upload}
            disabled={!file}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          >
            <Upload className="w-4 h-4 inline mr-1" />
            Upload License
          </button>
        </div>
      </div>

      <div className="bg-white border rounded-lg shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-10 grid place-items-center">
            <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
          </div>
        ) : error ? (
          <div className="p-4 text-red-700 bg-red-50 border-b border-red-200 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" />
            <span>{error}</span>
          </div>
        ) : rows.length === 0 ? (
          <div className="py-10 text-center">
            <IdCard className="w-10 h-10 text-gray-300 mx-auto mb-2" />
            <div className="text-gray-900 font-medium">No licenses uploaded</div>
            <div className="text-sm text-gray-600">Upload your license to enable verification & renewal reminders.</div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-gray-50 text-xs uppercase text-gray-600">
                <tr>
                  <th className="text-left px-4 py-3">File</th>
                  <th className="text-left px-4 py-3">Expiry</th>
                  <th className="text-left px-4 py-3">Status</th>
                  <th className="text-right px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y text-sm">
                {rows.map(r => {
                  const left = daysLeft(r.expires_on)
                  return (
                    <tr key={r.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-900 truncate">{r.file_path}</div>
                        <div className="text-xs text-gray-500">{new Date(r.created_at).toLocaleString()}</div>
                      </td>
                      <td className="px-4 py-3">
                        {r.expires_on ? (
                          <span className={`${left !== null && left <= 30 ? 'text-red-600 font-medium' : 'text-gray-700'}`}>
                            {r.expires_on} {left !== null && `• ${left}d`}
                          </span>
                        ) : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          r.status === 'approved' ? 'bg-green-100 text-green-700'
                            : r.status === 'rejected' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'
                        }`}>{r.status || 'pending'}</span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <a
                          href={supabase.storage.from('licensing').getPublicUrl(r.file_path).data.publicUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 px-3 py-1.5 bg-gray-100 rounded hover:bg-gray-200 text-xs"
                        >
                          <Download className="w-3.5 h-3.5" /> View
                        </a>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <div className="text-xs text-gray-500 flex items-center gap-1">
        <Bell className="w-3.5 h-3.5" /> We’ll alert you 30/14/7 days before expiry.
      </div>
    </div>
  )
}

/* ──────────────────────────────────────────────────────────────────────────────
   Supervision – simple share/feed
   Tables: supervision_threads(id, therapist_id, case_id, title, status)
           supervision_comments(thread_id, author_id, content, created_at)
────────────────────────────────────────────────────────────────────────────── */
const SupervisionPanel: React.FC = () => {
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
    } finally {
      setLoading(false)
    }
  }, [profile?.id])

  useEffect(() => {
    load()
  }, [load])

  const create = async () => {
    if (!title.trim()) return
    try {
      setCreating(true)
      await supabase.from('supervision_threads').insert({
        therapist_id: profile?.id,
        title: title.trim(),
        case_id: caseId || null,
        status: 'open'
      })
      setTitle('')
      setCaseId('')
      await load()
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-4">
      <div className="flex items-center gap-2">
        <Headphones className="w-6 h-6 text-blue-600" />
        <h2 className="text-2xl font-bold text-gray-900">Supervision</h2>
      </div>

      <div className="bg-white border rounded-lg shadow-sm p-4">
        <div className="grid grid-cols-1 md:grid-cols-6 gap-2">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Thread title"
            className="md:col-span-3 px-3 py-2 border rounded text-sm"
          />
          <input
            value={caseId}
            onChange={(e) => setCaseId(e.target.value)}
            placeholder="Case ID (optional)"
            className="md:col-span-2 px-3 py-2 border rounded text-sm"
          />
          <button
            onClick={create}
            disabled={creating}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          >
            Start Thread
          </button>
        </div>
      </div>

      <div className="bg-white border rounded-lg shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-10 grid place-items-center">
            <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
          </div>
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
                    <div className="text-xs text-gray-500">
                      Case: {t.case_id || '—'} • {new Date(t.created_at).toLocaleString()}
                    </div>
                  </div>
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    t.status === 'resolved' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                  }`}>{t.status}</span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

/* ──────────────────────────────────────────────────────────────────────────────
   VIP Opportunities – announcements
   Table: vip_offers(id,title,body,expires_on,cta_label,cta_url)
────────────────────────────────────────────────────────────────────────────── */
const VIPOpportunities: React.FC = () => {
  const [offers, setOffers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    ;(async () => {
      const { data } = await supabase
        .from('vip_offers')
        .select('*')
        .gte('expires_on', new Date().toISOString().slice(0, 10))
        .order('expires_on', { ascending: true })
      setOffers(data || [])
      setLoading(false)
    })()
  }, [])

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-2 mb-4">
        <Star className="w-6 h-6 text-blue-600" />
        <h2 className="text-2xl font-bold text-gray-900">VIP Opportunities</h2>
      </div>

      <div className="bg-white border rounded-lg shadow-sm">
        {loading ? (
          <div className="py-12 grid place-items-center">
            <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
          </div>
        ) : offers.length === 0 ? (
          <div className="py-12 text-center">
            <Star className="w-10 h-10 text-gray-300 mx-auto mb-2" />
            <div className="text-gray-900 font-medium">No active offers</div>
            <div className="text-sm text-gray-600">New opportunities will appear here.</div>
          </div>
        ) : (
          <ul className="divide-y">
            {offers.map(o => (
              <li key={o.id} className="p-4 hover:bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="min-w-0">
                    <div className="font-medium text-gray-900 truncate">{o.title}</div>
                    <div className="text-sm text-gray-700 mt-1">{o.body}</div>
                    <div className="text-xs text-gray-500 mt-1">Expires: {o.expires_on}</div>
                  </div>
                  {o.cta_url && (
                    <a
                      className="ml-3 shrink-0 px-3 py-1.5 bg-blue-600 text-white rounded text-xs hover:bg-blue-700"
                      href={o.cta_url}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {o.cta_label || 'Learn more'}
                    </a>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

/* ──────────────────────────────────────────────────────────────────────────────
   Membership – billing snapshot
   Tables: subscriptions(therapist_id,status,renewal_on), invoices(id,therapist_id,amount_cents,status,created_at,invoice_url)
────────────────────────────────────────────────────────────────────────────── */
const MembershipPanel: React.FC = () => {
  const { profile } = useAuth()
  const [sub, setSub] = useState<any | null>(null)
  const [invoices, setInvoices] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    ;(async () => {
      if (!profile?.id) return
      setLoading(true)
      const [{ data: s }, { data: inv }] = await Promise.all([
        supabase.from('subscriptions').select('*').eq('therapist_id', profile.id).maybeSingle(),
        supabase.from('invoices').select('*').eq('therapist_id', profile.id).order('created_at', { ascending: false }).limit(10),
      ])
      setSub(s || null)
      setInvoices(inv || [])
      setLoading(false)
    })()
  }, [profile?.id])

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-4">
      <div className="flex items-center gap-2">
        <CreditCard className="w-6 h-6 text-blue-600" />
        <h2 className="text-2xl font-bold text-gray-900">Membership</h2>
      </div>

      <div className="bg-white border rounded-lg shadow-sm p-4">
        {loading ? (
          <div className="py-8 grid place-items-center">
            <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
          </div>
        ) : !sub ? (
          <div className="text-sm text-gray-700">
            No active subscription. Please contact admin to activate your membership.
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="text-sm">
              <div><span className="text-gray-600">Status:</span> <span className="font-medium">{sub.status}</span></div>
              <div><span className="text-gray-600">Renews on:</span> <span className="font-medium">{sub.renewal_on || '—'}</span></div>
            </div>
            <div className="text-xs text-gray-500">For upgrades/renewal changes, contact support.</div>
          </div>
        )}
      </div>

      <div className="bg-white border rounded-lg shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200">
          <div className="font-semibold text-sm text-gray-900">Invoices</div>
        </div>
        {loading ? (
          <div className="py-8 grid place-items-center">
            <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
          </div>
        ) : invoices.length === 0 ? (
          <div className="py-10 text-center text-sm text-gray-600">No invoices yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-gray-50 text-xs uppercase text-gray-600">
                <tr>
                  <th className="text-left px-4 py-3">Date</th>
                  <th className="text-left px-4 py-3">Amount</th>
                  <th className="text-left px-4 py-3">Status</th>
                  <th className="text-right px-4 py-3">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y text-sm">
                {invoices.map(inv => (
                  <tr key={inv.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">{new Date(inv.created_at).toLocaleDateString()}</td>
                    <td className="px-4 py-3">${(inv.amount_cents / 100).toFixed(2)}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        inv.status === 'paid' ? 'bg-green-100 text-green-700'
                          : inv.status === 'void' ? 'bg-gray-100 text-gray-700' : 'bg-yellow-100 text-yellow-700'
                      }`}>{inv.status}</span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {inv.invoice_url ? (
                        <a
                          href={inv.invoice_url}
                          target="_blank"
                          rel="noreferrer"
                          className="px-3 py-1.5 bg-blue-600 text-white rounded text-xs hover:bg-blue-700"
                        >
                          View
                        </a>
                      ) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

/* ──────────────────────────────────────────────────────────────────────────────
   Contact Administrator – support tickets
   Table: support_tickets(id,therapist_id,subject,body,priority,status,created_at)
────────────────────────────────────────────────────────────────────────────── */
const ContactAdminPanel: React.FC = () => {
  const { profile } = useAuth()
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [priority, setPriority] = useState<'low' | 'normal' | 'high'>('normal')
  const [sending, setSending] = useState(false)

  const submit = async () => {
    if (!subject.trim() || !body.trim() || !profile?.id) return
    try {
      setSending(true)
      const { error } = await supabase.from('support_tickets').insert({
        therapist_id: profile.id,
        subject: subject.trim(),
        body: body.trim(),
        priority,
        status: 'new'
      })
      if (error) throw error
      setSubject(''); setBody(''); setPriority('normal')
      alert('Ticket submitted. We will get back to you soon.')
    } catch (e: any) {
      alert(e?.message || 'Failed to submit ticket.')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-4">
      <div className="flex items-center gap-2">
        <Shield className="w-6 h-6 text-blue-600" />
        <h2 className="text-2xl font-bold text-gray-900">Contact Administrator</h2>
      </div>

      <div className="bg-white border rounded-lg shadow-sm p-4 space-y-3">
        <input
          value={subject} onChange={(e) => setSubject(e.target.value)}
          placeholder="Subject"
          className="w-full px-3 py-2 border rounded text-sm"
        />
        <select
          value={priority} onChange={(e) => setPriority(e.target.value as any)}
          className="px-3 py-2 border rounded text-sm"
        >
          <option value="low">Low priority</option>
          <option value="normal">Normal</option>
          <option value="high">High / urgent</option>
        </select>
        <textarea
          rows={8}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Describe your issue or request…"
          className="w-full px-3 py-2 border rounded text-sm"
        />
        <div className="flex justify-end">
          <button
            onClick={submit}
            disabled={sending}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {sending ? 'Sending…' : 'Submit Ticket'}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ──────────────────────────────────────────────────────────────────────────────
   Types for main page
────────────────────────────────────────────────────────────────────────────── */
interface DashboardStats {
  totalClients: number
  activeCases: number
  patientsToday: number
  profileCompletion: number
}
interface OnboardingStep {
  id: string
  title: string
  completed: boolean
}
interface TodaySession {
  id: string
  client_name: string
  time: string
  type: string
  notes?: string
}
interface CaseInsight {
  client_name: string
  insight: string
  recommendation: string
  priority: 'high' | 'medium' | 'low'
}
interface ActivityItem {
  id: string
  type: 'client' | 'supervision' | 'admin'
  title: string
  description: string
  time: string
  icon: string
}
type SectionId =
  | 'overview'
  | 'clienteles'
  | 'clients'
  | 'cases'
  | 'sessions'
  | 'sessionBoard'
  | 'leads'
  | 'metrics'
  | 'clinic'
  | 'resources'
  | 'licensing'
  | 'supervision'
  | 'vip'
  | 'profile'
  | 'membership'
  | 'admin'

/* ──────────────────────────────────────────────────────────────────────────────
   Main Component
────────────────────────────────────────────────────────────────────────────── */
export default function TherapistDashboard() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [showOnboardingModal, setShowOnboardingModal] = useState(false)
  const [showProfileModal, setShowProfileModal] = useState(false)
  const [stats, setStats] = useState<DashboardStats>({
    totalClients: 0,
    activeCases: 0,
    patientsToday: 0,
    profileCompletion: 0
  })
  const [onboardingSteps, setOnboardingSteps] = useState<OnboardingStep[]>([])
  const [todaySessions, setTodaySessions] = useState<TodaySession[]>([])
  const [caseInsights, setCaseInsights] = useState<CaseInsight[]>([])
  const [recentActivities, setRecentActivities] = useState<ActivityItem[]>([])
  const [loading, setLoading] = useState(true)
  const [profileLive, setProfileLive] = useState(false)
  const [isSigningOut, setIsSigningOut] = useState(false)
  const [signOutError, setSignOutError] = useState<string | null>(null)
  const [active, setActive] = useState<SectionId>('overview')

  const { profile, signOut } = useAuth()

  const navigationSections = [
    {
      title: null,
      items: [{ id: 'overview', name: 'Overview', icon: Target, color: 'blue' }]
    },
    {
      title: 'Client Access',
      items: [
        { id: 'clienteles', name: 'Clienteles', icon: Users, color: 'green' },
        { id: 'clients', name: 'Client Management', icon: Users, color: 'green' },
        { id: 'cases', name: 'Case Management', icon: FileText, color: 'green' },
        { id: 'resources', name: 'Resource Library', icon: Library, color: 'green' },
      ]
    },
    {
      title: 'Practice Management',
      items: [
        { id: 'sessions', name: 'Session Management', icon: Calendar, color: 'purple' },
        { id: 'sessionBoard', name: 'Session Board', icon: ClipboardList, color: 'purple' },
        { id: 'leads', name: 'Client Leads', icon: Users, color: 'purple' },
        { id: 'metrics', name: 'Progress Metrics', icon: BarChart3, color: 'purple' },
        { id: 'clinic', name: 'Clinic Rentals', icon: Building2, color: 'purple' },
      ]
    },
    {
      title: 'Profession Management',
      items: [
        { id: 'licensing', name: 'Licensing & Compliance', icon: ShieldCheck, color: 'amber' },
        { id: 'supervision', name: 'Supervision', icon: Headphones, color: 'amber' },
        { id: 'vip', name: 'VIP Opportunities', icon: Star, color: 'amber' },
      ]
    },
    {
      title: 'Account',
      items: [
        { id: 'profile', name: 'Therapist Profile', icon: User, color: 'blue' },
        { id: 'membership', name: 'Membership', icon: CreditCard, color: 'blue' },
        { id: 'admin', name: 'Contact Administrator', icon: Shield, color: 'blue' },
      ]
    }
  ] as const

  const fetchDashboardData = useCallback(async () => {
    if (!profile) return
    try {
      setLoading(true)

      const { data: clientRelations, error: relationsError } = await supabase
        .from('therapist_client_relations')
        .select('client_id')
        .eq('therapist_id', profile.id)
      if (relationsError) console.warn('dashboard: client relations error:', relationsError)

      const { data: activeCases, error: casesError } = await supabase
        .from('cases')
        .select('id')
        .eq('therapist_id', profile.id)
        .eq('status', 'active')
      if (casesError) console.warn('dashboard: active cases error:', casesError)

      const today = new Date().toISOString().split('T')[0]
      const { data: todayAppointments, error: appointmentsError } = await supabase
        .from('appointments')
        .select(`
          id,
          appointment_date,
          appointment_type,
          notes,
          profiles!appointments_client_id_fkey(first_name, last_name)
        `)
        .eq('therapist_id', profile.id)
        .gte('appointment_date', today)
        .lt('appointment_date', `${today}T23:59:59`)
      if (appointmentsError) console.warn('dashboard: today appts error:', appointmentsError)

      const steps: OnboardingStep[] = [
        { id: 'basic', title: 'Basic Information', completed: !!profile.whatsapp_number },
        { id: 'professional', title: 'Professional Details', completed: !!profile.professional_details },
        { id: 'verification', title: 'Verification', completed: profile.verification_status === 'verified' },
        { id: 'bio', title: 'Bio & Story', completed: !!(profile.professional_details?.bio && profile.professional_details.bio.length > 150) },
        { id: 'locations', title: 'Practice Locations', completed: !!(profile.professional_details?.practice_locations?.length > 0) }
      ]
      const completedSteps = steps.filter(s => s.completed).length
      const profileCompletion = Math.round((completedSteps / steps.length) * 100)
      const isProfileLive = profileCompletion === 100 && profile.verification_status === 'verified'

      setStats({
        totalClients: clientRelations?.length || 0,
        activeCases: activeCases?.length || 0,
        patientsToday: todayAppointments?.length || 0,
        profileCompletion
      })
      setOnboardingSteps(steps)
      setProfileLive(isProfileLive)

      setTodaySessions(
        todayAppointments?.map(apt => ({
          id: apt.id,
          client_name: `${apt.profiles?.first_name || 'Unknown'} ${apt.profiles?.last_name || 'Client'}`,
          time: new Date(apt.appointment_date).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
          type: apt.appointment_type,
          notes: apt.notes
        })) || []
      )

      // Placeholder insights/activities
      setCaseInsights([
        { client_name: 'John Smith',  insight: 'Consistent improvement in anxiety scores', recommendation: 'Consider bi-weekly sessions', priority: 'medium' },
        { client_name: 'Emily Davis', insight: 'Missed two assignments', recommendation: 'Schedule check-in for barriers', priority: 'high' }
      ])
      setRecentActivities([
        { id: '1', type: 'client',      title: 'John completed PHQ-9', description: 'Score improved 15 → 12', time: '2h ago', icon: 'CheckCircle' },
        { id: '2', type: 'supervision', title: 'New supervision slot', description: 'Dr. Wilson opens group session', time: '1d ago', icon: 'Headphones' },
        { id: '3', type: 'admin',       title: 'Platform update',      description: 'New assessment tools', time: '2d ago', icon: 'Bell' }
      ])
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
      if (isRecursionError(error)) console.error('RLS recursion detected in dashboard data fetch')
    } finally {
      setLoading(false)
    }
  }, [profile])

  useEffect(() => {
    if (profile) fetchDashboardData()
  }, [profile, fetchDashboardData])

  const handleSignOut = async () => {
    setIsSigningOut(true)
    setSignOutError(null)
    try {
      await signOut()
    } catch (error) {
      console.error('Error signing out:', error)
      setSignOutError('Failed to sign out. Please try again.')
    } finally {
      setIsSigningOut(false)
    }
  }

  if (profile && profile.role !== 'therapist') return <Navigate to="/client" replace />

  const handleOnboardingComplete = () => {
    setShowOnboardingModal(false)
    fetchDashboardData()
  }

  const goto = (id: SectionId) => {
    setActive(id)
    setMobileMenuOpen(false)
  }

  const Overview = () => (
    <div className="h-full overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-6">
      {!profileLive && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Onboarding</h3>
            <span className="text-sm text-gray-500">{stats.profileCompletion}% complete</span>
          </div>
          <div className="space-y-3 mb-4">
            {onboardingSteps.map((step, index) => (
              <div key={step.id} className="flex items-center space-x-3">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center ${step.completed ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-500'}`}>
                  {step.completed ? <CheckCircle className="w-4 h-4" /> : <span className="text-xs">{index + 1}</span>}
                </div>
                <span className={`text-sm ${step.completed ? 'text-gray-700' : 'text-gray-500'}`}>{step.title}</span>
              </div>
            ))}
          </div>
          <button onClick={() => setShowOnboardingModal(true)} className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors">
            Continue Setup
          </button>
        </div>
      )}

      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-6 rounded-xl shadow-lg">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold mb-1">Welcome back, Dr. {profile?.first_name}!</h2>
            <p className="text-blue-100">{new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
          </div>
          {profileLive && (
            <div className="flex items-center space-x-2 bg-green-500 bg-opacity-20 px-3 py-1 rounded-full">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
              <span className="text-sm text-green-100">Profile Live</span>
            </div>
          )}
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Active Cases</p>
              <p className="text-3xl font-bold text-green-600">{stats.activeCases}</p>
            </div>
            <div className="p-3 bg-green-100 rounded-full"><FileText className="h-6 w-6 text-green-600" /></div>
          </div>
        </div>
        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Upcoming Sessions</p>
              <p className="text-3xl font-bold text-purple-600">{stats.patientsToday}</p>
            </div>
            <div className="p-3 bg-purple-100 rounded-full"><CalendarDays className="h-6 w-6 text-purple-600" /></div>
          </div>
        </div>
        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Clients</p>
              <p className="text-3xl font-bold text-blue-600">{stats.totalClients}</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-full"><Users className="h-6 w-6 text-blue-600" /></div>
          </div>
        </div>
        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Profile</p>
              <p className="text-3xl font-bold text-indigo-600">{stats.profileCompletion}%</p>
            </div>
            <div className="p-3 bg-indigo-100 rounded-full"><ShieldCheck className="h-6 w-6 text-indigo-600" /></div>
          </div>
        </div>
      </div>

      {/* Today schedule */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900">Today's Schedule</h3>
          <button onClick={() => goto('sessions')} className="inline-flex items-center px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm">
            <Plus className="w-4 h-4 mr-1" /> Schedule
          </button>
        </div>
        {todaySessions.length === 0 ? (
          <div className="text-center py-8">
            <Calendar className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h4 className="text-lg font-medium text-gray-900 mb-2">No sessions today</h4>
            <p className="text-gray-600">Your schedule is clear for today</p>
          </div>
        ) : (
          <div className="space-y-3">
            {todaySessions.map(session => (
              <div key={session.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center"><User className="w-5 h-5 text-blue-600" /></div>
                  <div>
                    <h4 className="font-medium text-gray-900">{session.client_name}</h4>
                    <p className="text-sm text-gray-600">{session.time} • {session.type}</p>
                  </div>
                </div>
                <button className="text-blue-600 hover:text-blue-800"><Eye className="w-4 h-4" /></button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Insights + Activities */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center space-x-3 mb-6">
          <div className="p-2 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg">
            <Brain className="w-5 h-5 text-white" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900">Case Insights</h3>
        </div>
        <div className="space-y-4">
          {caseInsights.map((insight, index) => (
            <div key={index} className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h4 className="font-medium text-gray-900">{insight.client_name}</h4>
                  <p className="text-sm text-gray-600 mt-1">{insight.insight}</p>
                  <p className="text-sm text-blue-600 mt-2">💡 {insight.recommendation}</p>
                </div>
                <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                  insight.priority === 'high' ? 'bg-red-100 text-red-800'
                    : insight.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'
                }`}>{insight.priority}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-6">Quick Actions</h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <button onClick={() => goto('clienteles')} className="p-4 bg-green-50 hover:bg-green-100 rounded-lg transition-colors group">
            <Users className="w-8 h-8 text-green-600 mx-auto mb-2" />
            <p className="text-sm font-medium text-green-900">Find Client</p>
          </button>
          <button onClick={() => goto('sessions')} className="p-4 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors group">
            <Calendar className="w-8 h-8 text-purple-600 mx-auto mb-2" />
            <p className="text-sm font-medium text-purple-900">Schedule Session</p>
          </button>
          <button onClick={() => goto('resources')} className="p-4 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors group">
            <Library className="w-8 h-8 text-blue-600 mx-auto mb-2" />
            <p className="text-sm font-medium text-blue-900">Resource Library</p>
          </button>
          <button onClick={() => goto('cases')} className="p-4 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors group">
            <FileText className="w-8 h-8 text-indigo-600 mx-auto mb-2" />
            <p className="text-sm font-medium text-indigo-900">View Cases</p>
          </button>
        </div>
      </div>
    </div>
  )

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Fixed Header */}
      <header className="fixed top-0 left-0 right-0 z-40 bg-white shadow-sm border-b border-gray-200">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <div className="logo-container">
                <div className="flex items-center space-x-3">
                  <img
                    src="/thera-py-icon.png"
                    alt="Thera-PY Logo"
                    className="w-8 h-8"
                    onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
                  />
                  <img
                    src="/thera-py-image.png"
                    alt="Thera-PY"
                    className="h-6"
                    onError={e => { (e.currentTarget as HTMLImageElement).outerHTML = '<span class="text-xl font-bold text-gray-900">Thera-PY</span>' }}
                  />
                </div>
              </div>
              <div className="hidden sm:block"><p className="text-sm text-gray-500">Therapist Portal</p></div>
            </div>

            <div className="flex items-center space-x-4">
              {profileLive && (
                <div className="hidden sm:flex items-center space-x-2 bg-green-100 text-green-800 px-3 py-1 rounded-full">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-sm font-medium">Profile Live</span>
                </div>
              )}

              <button
                onClick={() => setShowProfileModal(true)}
                className="flex items-center space-x-2 text-sm text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-md px-3 py-2 transition-colors"
              >
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <span className="text-xs font-medium text-blue-600">
                    {profile?.first_name?.[0]}{profile?.last_name?.[0]}
                  </span>
                </div>
                <div className="hidden sm:block text-left">
                  <div className="font-medium">{profile?.first_name} {profile?.last_name}</div>
                  <div className="text-xs text-gray-500">View Profile</div>
                </div>
              </button>

              <button
                onClick={handleSignOut}
                disabled={isSigningOut}
                className="flex items-center space-x-1 sm:space-x-2 px-2 sm:px-3 py-2 text-xs sm:text-sm text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title="Sign out"
              >
                {isSigningOut ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600"></div>
                ) : (
                  <LogOut className="w-4 h-4" />
                )}
                <span className="hidden sm:inline">{isSigningOut ? 'Signing out...' : 'Sign out'}</span>
              </button>

              {/* Mobile Menu Button */}
              <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="md:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors">
                {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>

          {/* Sign out error notification */}
          {signOutError && (
            <div className="bg-red-50 border-l-4 border-red-400 p-3">
              <div className="flex items-center">
                <AlertTriangle className="w-4 h-4 text-red-400 mr-2" />
                <span className="text-sm text-red-700">{signOutError}</span>
                <button onClick={() => setSignOutError(null)} className="ml-auto text-red-400 hover:text-red-600">×</button>
              </div>
            </div>
          )}
        </div>
      </header>

      <div className="flex pt-16">
        {/* Sidebar (desktop) */}
        <div className={`hidden md:flex flex-col ${sidebarCollapsed ? 'w-16' : 'w-64'} bg-white border-r border-gray-200 fixed left-0 top-16 bottom-0 transition-all duration-300 shadow-lg z-30`}>
          <div className="flex-shrink-0 border-b border-gray-100">
            <div className="p-4 flex items-center justify-between">
              {!sidebarCollapsed && (
                <h3 className="text-sm font-semibold text-gray-800 flex items-center">
                  <Target className="w-4 h-4 mr-2 text-blue-600" /> Navigation
                </h3>
              )}
              <button
                onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                className={`w-8 h-8 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center hover:from-blue-600 hover:to-indigo-700 group transform hover:scale-110 ${sidebarCollapsed ? 'mx-auto' : ''} relative overflow-hidden`}
                title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200"></div>
                <ChevronLeft className={`w-4 h-4 transition-all duration-300 ${sidebarCollapsed ? 'rotate-180' : ''} group-hover:scale-125 relative z-10`} />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-3">
            <nav className="space-y-6">
              {navigationSections.map((section, idx) => (
                <div key={idx}>
                  {section.title && !sidebarCollapsed && (
                    <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 px-2 flex items-center">
                      <div className="w-4 h-0.5 bg-gray-300 mr-2"></div>
                      {section.title}
                      <div className="flex-1 h-0.5 bg-gray-300 ml-2"></div>
                    </h4>
                  )}
                  <div className="space-y-1">
                    {section.items.map(tab => {
                      const Icon = tab.icon
                      const isActive = active === (tab.id as SectionId)
                      return (
                        <button
                          key={tab.id}
                          onClick={() => { setActive(tab.id as SectionId) }}
                          className={`w-full flex items-center ${sidebarCollapsed ? 'justify-center' : 'space-x-3'} px-3 py-3 rounded-xl transition-all duration-200 text-sm font-medium group relative overflow-hidden ${
                            isActive
                              ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg transform scale-105 border border-blue-400'
                              : 'text-gray-700 hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 hover:text-blue-900 hover:shadow-md hover:scale-102 hover:border hover:border-blue-200'
                          }`}
                          title={sidebarCollapsed ? tab.name : undefined}
                        >
                          <Icon className={`w-5 h-5 flex-shrink-0 transition-all duration-200 group-hover:scale-125 ${isActive ? 'text-white drop-shadow-sm' : 'text-gray-400 group-hover:text-blue-600'}`} />
                          {!sidebarCollapsed && <span className="transition-all duration-200 font-medium group-hover:font-semibold">{tab.name}</span>}
                          {isActive && !sidebarCollapsed && <div className="absolute right-3 w-2 h-2 bg-white rounded-full opacity-90 animate-pulse shadow-sm"></div>}
                          {isActive && <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent pointer-events-none"></div>}
                          {!isActive && <div className="absolute inset-0 bg-gradient-to-r from-transparent to-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none"></div>}
                        </button>
                      )
                    })}
                  </div>
                </div>
              ))}
            </nav>
          </div>

          {!sidebarCollapsed && (
            <div className="flex-shrink-0 border-t border-gray-100 p-4">
              <div className="text-center">
                <div className="text-xs text-gray-500 mb-1">Thera-PY Platform</div>
                <div className="text-xs text-gray-400">v1.0.0</div>
              </div>
            </div>
          )}
        </div>

        {/* Mobile Navigation Overlay */}
        {mobileMenuOpen && (
          <div className="md:hidden fixed inset-0 z-50 pt-16">
            <div className="fixed inset-0 bg-gray-600 bg-opacity-75" onClick={() => setMobileMenuOpen(false)} />
            <div className="fixed inset-y-0 left-0 w-64 bg-white shadow-xl pt-16">
              <div className="h-full overflow-y-auto p-4">
                <nav className="space-y-6">
                  {navigationSections.map((section, idx) => (
                    <div key={idx}>
                      {section.title && <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">{section.title}</h3>}
                      <div className="space-y-1">
                        {section.items.map(tab => {
                          const Icon = tab.icon
                          const isActive = active === (tab.id as SectionId)
                          return (
                            <button
                              key={tab.id}
                              onClick={() => { goto(tab.id as SectionId) }}
                              className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg transition-all text-sm font-medium ${isActive ? 'text-blue-700 bg-blue-50' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}`}
                            >
                              <Icon className={`w-5 h-5 flex-shrink-0 ${isActive ? 'text-blue-600' : 'text-gray-400'}`} />
                              <span>{tab.name}</span>
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  ))}
                </nav>
              </div>
            </div>
          </div>
        )}

        {/* Main Content */}
        <div className={`flex-1 transition-all duration-300 ${sidebarCollapsed ? 'md:ml-16' : 'md:ml-64'} bg-gray-50 min-h-0`}>
          <main className="min-h-[calc(100vh-4rem)] overflow-y-auto">
            <Suspense
              fallback={<div className="p-6"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto" /></div>}
            >
              {active === 'overview'      && <Overview />}
              {active === 'clienteles'    && <Clienteles />}
              {active === 'clients'       && <ClientManagement />}
              {active === 'cases'         && <CaseManagement />}
              {active === 'sessions'      && <SessionManagement />}
              {active === 'sessionBoard'  && <SessionBoard />}
              {active === 'leads'         && <CommunicationTools />}
              {active === 'metrics'       && <ProgressMetrics />}
              {active === 'clinic'        && <ClinicRental />}
              {active === 'resources'     && <ResourceLibrary />}
              {active === 'licensing'     && <LicensingCompliance />}
              {active === 'supervision'   && <SupervisionPanel />}
              {active === 'vip'           && <VIPOpportunities />}

              {active === 'profile' && (
                <div className="p-6">
                  <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-8">
                    <SimpleTherapistProfile
                      profile={profile}
                      onEdit={() => setShowOnboardingModal(true)}
                    />
                  </div>
                </div>
              )}

              {active === 'membership' && <MembershipPanel />}

              {active === 'admin' && <ContactAdminPanel />}
            </Suspense>
          </main>
        </div>
      </div>

      {/* Modals */}
      {showOnboardingModal && (
        <TherapistOnboarding onComplete={handleOnboardingComplete} onClose={() => setShowOnboardingModal(false)} />
      )}

      {showProfileModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => setShowProfileModal(false)} />
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full max-h-[90vh] overflow-y-auto">
              <div className="bg-white">
                <div className="flex items-center justify-between p-6 border-b border-gray-200">
                  <h3 className="text-lg font-medium text-gray-900">Professional Profile</h3>
                  <button onClick={() => setShowProfileModal(false)} className="text-gray-400 hover:text-gray-600">
                    <X className="h-6 w-6" />
                  </button>
                </div>
                <div className="p-6">
                  <SimpleTherapistProfile
                    profile={profile}
                    onEdit={() => {
                      setShowProfileModal(false)
                      setShowOnboardingModal(true)
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/* ──────────────────────────────────────────────────────────────────────────────
   Simple Profile Card
────────────────────────────────────────────────────────────────────────────── */
const SimpleTherapistProfile: React.FC<{ profile: any; onEdit: () => void }> = ({ profile, onEdit }) => {
  const professionalDetails = profile?.professional_details || {}
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="text-center">
        <div className="w-24 h-24 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <User className="w-12 h-12 text-blue-600" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900">
          {profile?.first_name} {profile?.last_name}
        </h2>
        <p className="text-gray-600">{profile?.email}</p>
        <div className="mt-4">
          <span
            className={`inline-flex px-3 py-1 text-sm font-medium rounded-full ${
              profile?.verification_status === 'verified' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
            }`}
          >
            {profile?.verification_status === 'verified' ? 'Verified Professional' : 'Verification Pending'}
          </span>
        </div>
      </div>

      <div className="bg-gray-50 rounded-lg p-4">
        <h3 className="font-medium text-gray-900 mb-3">Contact Information</h3>
        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <Phone className="w-4 h-4 text-gray-500" />
            <span className="text-sm text-gray-700">{profile?.whatsapp_number || 'Not provided'}</span>
          </div>
        </div>
      </div>

      {professionalDetails.specializations && (
        <div className="bg-gray-50 rounded-lg p-4">
          <h3 className="font-medium text-gray-900 mb-3">Specializations</h3>
          <div className="flex flex-wrap gap-2">
            {professionalDetails.specializations.map((spec: string, i: number) => (
              <span key={i} className="inline-flex px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                {spec}
              </span>
            ))}
          </div>
        </div>
      )}

      {professionalDetails.languages && (
        <div className="bg-gray-50 rounded-lg p-4">
          <h3 className="font-medium text-gray-900 mb-3">Languages</h3>
          <div className="flex flex-wrap gap-2">
            {professionalDetails.languages.map((lang: string, i: number) => (
              <span key={i} className="inline-flex px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                {lang}
              </span>
            ))}
          </div>
        </div>
      )}

      {professionalDetails.bio && (
        <div className="bg-gray-50 rounded-lg p-4">
          <h3 className="font-medium text-gray-900 mb-3">About</h3>
          <p className="text-sm text-gray-700 leading-relaxed">{professionalDetails.bio}</p>
        </div>
      )}

      {professionalDetails.qualifications && (
        <div className="bg-gray-50 rounded-lg p-4">
          <h3 className="font-medium text-gray-900 mb-3">Qualifications</h3>
          <div className="space-y-1">
            {professionalDetails.qualifications
              .split('\n')
              .filter((q: string) => q.trim())
              .map((q: string, i: number) => (
                <div key={i} className="flex items-start space-x-2">
                  <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                  <span className="text-sm text-gray-700">{q.trim()}</span>
                </div>
              ))}
          </div>
        </div>
      )}

      <div className="text-center">
        <button onClick={onEdit} className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
          <User className="w-4 h-4 mr-2" />
          Edit Profile
        </button>
      </div>
    </div>
  )
}
