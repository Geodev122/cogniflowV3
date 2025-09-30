import React, { useCallback, useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { Building2, Loader2, AlertTriangle, MessageCircle, Download } from 'lucide-react'

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
  onSubmit: (payload: { request_type: RequestType; preferred_date: string | null; duration_hours: number | null; notes: string }) => Promise<void>
  defaultType: RequestType
  spaceName: string
  submitting: boolean
}> = ({ open, onClose, onSubmit, defaultType, spaceName, submitting }) => {
  const [requestType, setRequestType] = useState<RequestType>(defaultType)
  const [date, setDate] = useState<string>('')
  const [hours, setHours] = useState<string>(defaultType === 'hourly' ? '2' : '')
  const [notes, setNotes] = useState('')

  useEffect(() => { setRequestType(defaultType); setHours(defaultType === 'hourly' ? '2' : '') }, [defaultType])
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
              <button type="button" className="text-gray-400 hover:text-gray-600" onClick={onClose}>✕</button>
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
              <button type="button" onClick={onClose} className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50">Cancel</button>
              <button type="submit" disabled={submitting} className="inline-flex items-center gap-2 px-5 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50">
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                {submitting ? 'Submitting…' : 'Submit request'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

export const ClinicRentalPanel: React.FC = () => {
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
      setError(null); setLoading(true)
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
    } finally { setLoading(false) }
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

  useEffect(() => { fetchSpaces() }, [fetchSpaces])
  useEffect(() => { fetchRequests() }, [fetchRequests])

  const openModal = (space: ClinicSpace, type: RequestType) => { setActiveSpace(space); setDefaultType(type); setModalOpen(true) }

  const submitRequest = async (payload: { request_type: RequestType; preferred_date: string | null; duration_hours: number | null; notes: string }) => {
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
      const { push } = useToast()
      push({ message: 'Your request was submitted. The clinic/admin will get back to you.', type: 'success' })
    } catch (e: any) {
      console.error('[ClinicRental] submitRequest error', e)
      const { push } = useToast()
      push({ message: e?.message || 'Failed to submit request.', type: 'error' })
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
                        <span className="text-[11px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-500">+{s.amenities.length - 8}</span>
                      )}
                    </div>
                  </div>
                ) : null}

                <div className="mt-4 grid grid-cols-3 gap-2">
                  <div className="rounded-md border border-gray-200 p-3 text-center">
                    <div className="text-xs text-gray-500">Hour</div>
                    <div className="text-sm font-semibold text-gray-900">{s.pricing_hourly != null ? `$${s.pricing_hourly}` : '—'}</div>
                  </div>
                  <div className="rounded-md border border-gray-200 p-3 text-center">
                    <div className="text-xs text-gray-500">Per Day</div>
                    <div className="text-sm font-semibold text-gray-900">{s.pricing_daily != null ? `$${s.pricing_daily}` : '—'}</div>
                  </div>
                  <div className="rounded-md border border-gray-200 p-3 text-center">
                    <div className="text-xs text-gray-500">Tailored</div>
                    <div className="text-sm font-semibold text-gray-900">{s.tailored_available ? 'Available' : '—'}</div>
                  </div>
                </div>

                <div className="mt-4 flex flex-col sm:flex-row gap-2">
                  {s.external_managed ? (
                    <button
                      onClick={() => openWA(s.whatsapp || '', `Hi, I'm enquiring about "${s.name}" (externally managed).`)}
                      className="inline-flex items-center justify-center gap-2 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 text-sm"
                    >
                      <MessageCircle className="w-4 h-4" />
                      Enquire on WhatsApp
                    </button>
                  ) : (
                    <>
                      {s.pricing_hourly != null && (
                        <button onClick={() => openModal(s, 'hourly')} className="inline-flex items-center justify-center gap-2 rounded-md bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 text-sm">
                          Book Hourly
                        </button>
                      )}
                      {s.pricing_daily != null && (
                        <button onClick={() => openModal(s, 'daily')} className="inline-flex items-center justify-center gap-2 rounded-md bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 text-sm">
                          Book Per Day
                        </button>
                      )}
                      {s.tailored_available && (
                        <button onClick={() => openModal(s, 'tailored')} className="inline-flex items-center justify-center gap-2 rounded-md bg-sky-600 hover:bg-sky-700 text-white px-4 py-2 text-sm">
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
                      {r.preferred_date ? ` • pref: ${r.preferred_date}` : ''}{r.duration_hours ? ` • ${r.duration_hours}h` : ''}
                    </div>
                    {r.notes && <div className="text-xs text-gray-500 mt-0.5 line-clamp-1">{r.notes}</div>}
                  </div>
                  <span className={`ml-3 shrink-0 inline-flex px-2 py-1 text-[11px] rounded-full ${
                    r.status === 'approved' ? 'bg-green-100 text-green-700'
                      : r.status === 'rejected' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'
                  }`}>{r.status}</span>
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
export default ClinicRentalPanel
