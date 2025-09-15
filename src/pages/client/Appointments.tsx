import React, { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { MobileShell } from '../../components/client/MobileShell'
import { CalendarPlus, Clock, Send } from 'lucide-react'

type Row = {
  id: string
  appointment_date: string
  appointment_type?: string | null
  notes?: string | null
  therapist?: { first_name?: string | null; last_name?: string | null } | null
}

export default function Appointments() {
  const { profile } = useAuth()
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [submitMsg, setSubmitMsg] = useState<string | null>(null)

  useEffect(() => {
    let cancel = false
    const load = async () => {
      if (!profile) return
      setLoading(true); setError(null)
      try {
        const { data, error: err } = await supabase
          .from('appointments')
          .select(`
            id, appointment_date, appointment_type, notes, therapist_id,
            therapist:profiles!appointments_therapist_id_fkey(first_name,last_name)
          `)
          .eq('client_id', profile.id)
          .order('appointment_date', { ascending: true })
          .limit(200)
        if (err) throw err
        if (!cancel) setRows((data || []) as any)
      } catch (e:any) {
        console.error('[Appointments] load', e); if (!cancel) setError('Could not load appointments.')
      } finally {
        if (!cancel) setLoading(false)
      }
    }
    load()
    return () => { cancel = true }
  }, [profile])

  const requestChange = async (id: string) => {
    if (!profile) return
    const reason = prompt('Optional message to your therapist about this appointment:')
    setSubmitting(true); setSubmitMsg(null)
    try {
      // uses client_requests table (type=reschedule) – safe if exists; otherwise RLS/db will block silently
      await supabase.from('client_requests').insert({
        client_id: profile.id, case_id: null, therapist_id: null,
        type: 'reschedule', message: reason || null, status: 'open', payload: { appointment_id: id }
      } as any)
      setSubmitMsg('Request sent.')
    } catch (e:any) {
      console.warn('[Appointments] requestChange', e)
      setSubmitMsg('Could not send request (it may not be enabled).')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <MobileShell title="Schedule">
      <div className="p-3">
        {loading ? (
          <div className="h-[60vh] grid place-items-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 text-red-800 rounded p-3 text-sm">{error}</div>
        ) : (
          <>
            {submitMsg && <div className="mb-2 text-xs text-gray-600">{submitMsg}</div>}
            <div className="space-y-2">
              {rows.length === 0 && <div className="text-sm text-gray-600">No appointments yet.</div>}
              {rows.map(r => (
                <div key={r.id} className="bg-white border border-gray-200 rounded-xl p-3">
                  <div className="flex items-center justify-between">
                    <div className="font-medium text-gray-900">
                      {new Date(r.appointment_date).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </div>
                    <span className="text-xs bg-purple-100 text-purple-700 rounded-full px-2 py-0.5">{r.appointment_type || 'Session'}</span>
                  </div>
                  <div className="text-[11px] text-gray-600 mt-0.5">
                    {r.therapist ? `with ${r.therapist.first_name || ''} ${r.therapist.last_name || ''}` : ''}
                  </div>
                  {r.notes && <div className="mt-1 text-[11px] text-gray-600">{r.notes}</div>}
                  <div className="mt-2 flex items-center gap-2">
                    <button
                      onClick={() => requestChange(r.id)}
                      disabled={submitting}
                      className="text-xs px-2 py-1.5 rounded border flex items-center gap-1 hover:bg-gray-50 disabled:opacity-50"
                    >
                      <Send className="w-3.5 h-3.5" /> Request change
                    </button>
                    <a
                      className="text-xs px-2 py-1.5 rounded border flex items-center gap-1 hover:bg-gray-50"
                      href={`data:text/calendar;charset=utf8,BEGIN:VCALENDAR%0AVERSION:2.0%0ABEGIN:VEVENT%0ASUMMARY:Thera-PY%20Session%0ADTSTART:${new Date(r.appointment_date).toISOString().replace(/[-:]/g,'').split('.')[0]}Z%0AEND:VEVENT%0AEND:VCALENDAR`}
                      download="session.ics"
                    >
                      <CalendarPlus className="w-3.5 h-3.5" /> Add to calendar
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </MobileShell>
  )
}
