// src/pages/therapist/SessionManagement.tsx
import React, { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { Plus, CalendarClock, Trash2, Pencil } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { useToast } from '../../components/ui/Toast'

type Appt = {
  id: string
  therapist_id: string
  client_id: string
  case_id: string | null
  title: string | null
  start_time: string
  end_time: string
  location: string | null
  status: 'scheduled' | 'completed' | 'cancelled' | string
  notes: string | null
}

type Client = {
  id: string
  first_name?: string | null
  last_name?: string | null
  email?: string | null
}

type Case = {
  id: string
  title?: string | null
}

const SessionManagement: React.FC = () => {
  const { profile } = useAuth()
  const [rows, setRows] = useState<Appt[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [editing, setEditing] = useState<Partial<Appt> | null>(null)
  const [saving, setSaving] = useState(false)

  const [clients, setClients] = useState<Client[]>([])
  const [cases, setCases] = useState<Case[]>([])

  const canEdit = !!profile?.id
  const { push } = useToast()

  // Helpers to convert between ISO strings and input[type=datetime-local] values
  const toInputDateTime = (iso?: string | null) => {
    if (!iso) return ''
    const d = new Date(iso)
    // get local datetime without timezone
    const tzOffset = d.getTimezoneOffset() * 60000
    const local = new Date(d.getTime() - tzOffset)
    return local.toISOString().slice(0, 16)
  }
  const fromInputToISO = (localValue: string) => {
    // localValue is like '2025-09-30T14:30' (local), interpret as local time and convert to ISO
    if (!localValue) return ''
    const dt = new Date(localValue)
    return dt.toISOString()
  }

  const fetchRows = async () => {
    if (!profile?.id) return
    setLoading(true)
    setError(null)
    const { data, error } = await supabase
      .from('appointments')
      .select('id, therapist_id, client_id, case_id, title, start_time, end_time, location, status, notes')
      .eq('therapist_id', profile.id)
      .order('start_time', { ascending: true })
    if (error) setError(error.message)
    setRows((data || []) as Appt[])
    setLoading(false)
  }

  const fetchClients = async () => {
    if (!profile?.id) return
    // fetch profiles with role 'client'
    const { data, error } = await supabase
      .from('profiles')
      .select('id, first_name, last_name, email')
      .eq('role', 'client')
      .order('first_name', { ascending: true })
    if (error) console.warn('Failed to load clients', error)
    else setClients((data || []) as Client[])
  }

  const fetchCases = async () => {
    if (!profile?.id) return
    // if your project uses a different table name for cases, update this query accordingly
    const { data, error } = await supabase
      .from('cases')
      .select('id, title')
      .order('title', { ascending: true })
    if (error) {
      // not all projects have cases; that's non-fatal
      console.debug('No cases table or failed to load cases', error.message)
    } else {
      setCases((data || []) as Case[])
    }
  }

  useEffect(() => { fetchRows() }, [profile?.id])
  useEffect(() => { fetchClients(); fetchCases() }, [profile?.id])

  const openNew = () => {
    setEditing({
      therapist_id: profile!.id,
      title: '',
      start_time: new Date().toISOString(),
      end_time: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      status: 'scheduled',
      location: '',
      notes: '',
      client_id: clients[0]?.id ?? '',
      case_id: null,
    })
  }

  const save = async () => {
    if (!editing) return
    // basic validation
    if (!editing.client_id) {
      push({ message: 'Please select a client', type: 'info' })
      return
    }
    if (!editing.start_time || !editing.end_time) {
      push({ message: 'Please provide start and end times', type: 'info' })
      return
    }
    const s = new Date(editing.start_time)
    const e = new Date(editing.end_time)
    if (s >= e) {
      push({ message: 'Start time must be before end time', type: 'info' })
      return
    }

    setSaving(true)
    try {
      const payload: Partial<Appt> = {
        therapist_id: editing.therapist_id || profile!.id,
        client_id: editing.client_id,
        case_id: editing.case_id ?? null,
        title: editing.title ?? null,
        start_time: editing.start_time!,
        end_time: editing.end_time!,
        location: editing.location ?? null,
        status: (editing.status as any) ?? 'scheduled',
        notes: editing.notes ?? null,
      }

      if (editing.id) {
        const { data, error } = await supabase
          .from('appointments')
          .update(payload)
          .eq('id', editing.id)
          .select()
        if (error) throw error
      } else {
        const { data, error } = await supabase
          .from('appointments')
          .insert(payload)
          .select()
        if (error) throw error
      }
      setEditing(null)
      await fetchRows()
    } catch (e: any) {
      push({ message: e?.message || 'Failed to save appointment', type: 'error' })
    } finally {
      setSaving(false)
    }
  }

  const remove = async (id: string) => {
    // graceful confirmation using toast info with manual confirm flow is complex;
    // use window.confirm as last-resort but show a toast for the result.
  if (!(await confirmAsync({ title: 'Delete appointment', description: 'Delete this appointment?' }))) return
    const { error } = await supabase.from('appointments').delete().eq('id', id)
    if (error) push({ message: error.message || 'Failed to delete appointment', type: 'error' })
    else {
      push({ message: 'Appointment deleted', type: 'success' })
      fetchRows()
    }
  }

  // memoized lookup maps
  const clientById = useMemo(() => {
    const m: Record<string, Client> = {}
    clients.forEach(c => { m[c.id] = c })
    return m
  }, [clients])

  const formatClient = (id?: string | null) => {
    if (!id) return '—'
    const c = clientById[id]
    if (!c) return id
    return [c.first_name, c.last_name].filter(Boolean).join(' ') || c.email || id
  }

  return (
    <div className="space-y-4 p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <CalendarClock className="w-5 h-5 text-blue-600" />
          Session Management
        </h2>
        {canEdit && (
          <button onClick={openNew} className="inline-flex items-center gap-2 px-3 py-1.5 rounded bg-blue-600 text-white">
            <Plus className="w-4 h-4" /> New
          </button>
        )}
      </div>

      {loading ? (
        <div>Loading…</div>
      ) : error ? (
        <div className="text-red-600">{error}</div>
      ) : rows.length === 0 ? (
        <div className="text-gray-600">No appointments yet.</div>
      ) : (
        <div className="border rounded overflow-hidden">
          <div className="grid grid-cols-12 bg-gray-50 text-xs uppercase text-gray-600 px-3 py-2">
            <div className="col-span-3">Title</div>
            <div className="col-span-2">Client</div>
            <div className="col-span-2">Start</div>
            <div className="col-span-2">End</div>
            <div className="col-span-2">Status</div>
            <div className="col-span-1"></div>
          </div>
          <div className="divide-y">
            {rows.map(r => (
              <div key={r.id} className="grid grid-cols-12 px-3 py-2 items-center">
                <div className="col-span-3 truncate">{r.title || '—'}</div>
                <div className="col-span-2 truncate">{formatClient(r.client_id)}</div>
                <div className="col-span-2">{new Date(r.start_time).toLocaleString()}</div>
                <div className="col-span-2">{new Date(r.end_time).toLocaleString()}</div>
                <div className="col-span-2 capitalize">{r.status}</div>
                <div className="col-span-1 flex gap-2 justify-end">
                  <button className="p-1 rounded hover:bg-gray-100" onClick={() => setEditing(r)} title="Edit">
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button className="p-1 rounded hover:bg-gray-100" onClick={() => remove(r.id)} title="Delete">
                    <Trash2 className="w-4 h-4 text-red-600" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Simple modal */}
      {editing && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/30" onClick={() => setEditing(null)} />
          <div className="absolute inset-x-0 top-10 mx-auto w-full max-w-xl bg-white rounded-xl shadow-2xl border overflow-hidden">
            <div className="px-4 py-3 border-b font-medium">Appointment</div>
            <div className="p-4 space-y-3">
              <input className="w-full border rounded p-2" placeholder="Title"
                value={editing.title ?? ''} onChange={(e) => setEditing(s => ({ ...s!, title: e.target.value }))} />

              <label className="block text-sm">Client</label>
              <select className="w-full border rounded p-2" value={editing.client_id ?? ''} onChange={(e) => setEditing(s => ({ ...s!, client_id: e.target.value }))}>
                <option value="">Select client</option>
                {clients.map(c => (
                  <option key={c.id} value={c.id}>{[c.first_name, c.last_name].filter(Boolean).join(' ') || c.email || c.id}</option>
                ))}
              </select>

              <label className="block text-sm">Start</label>
              <input type="datetime-local" className="w-full border rounded p-2"
                value={toInputDateTime(editing.start_time)}
                onChange={(e) => setEditing(s => ({ ...s!, start_time: fromInputToISO(e.target.value) }))} />

              <label className="block text-sm">End</label>
              <input type="datetime-local" className="w-full border rounded p-2"
                value={toInputDateTime(editing.end_time)}
                onChange={(e) => setEditing(s => ({ ...s!, end_time: fromInputToISO(e.target.value) }))} />

              <label className="block text-sm">Location</label>
              <input className="w-full border rounded p-2" placeholder="Location"
                value={editing.location ?? ''} onChange={(e) => setEditing(s => ({ ...s!, location: e.target.value }))} />

              <label className="block text-sm">Case (optional)</label>
              <select className="w-full border rounded p-2" value={editing.case_id ?? ''} onChange={(e) => setEditing(s => ({ ...s!, case_id: e.target.value || null }))}>
                <option value="">None</option>
                {cases.map(cs => (
                  <option key={cs.id} value={cs.id}>{cs.title || cs.id}</option>
                ))}
              </select>

              <label className="block text-sm">Status</label>
              <select className="w-full border rounded p-2" value={editing.status ?? 'scheduled'} onChange={(e) => setEditing(s => ({ ...s!, status: e.target.value }))}>
                <option value="scheduled">Scheduled</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>

              <label className="block text-sm">Notes</label>
              <textarea className="w-full border rounded p-2" rows={3} placeholder="Notes"
                value={editing.notes ?? ''} onChange={(e) => setEditing(s => ({ ...s!, notes: e.target.value }))} />

              <div className="flex justify-end gap-2 pt-2">
                <button className="px-3 py-1.5 rounded border" onClick={() => setEditing(null)}>Cancel</button>
                <button className="px-3 py-1.5 rounded bg-blue-600 text-white" onClick={save} disabled={saving}>
                  {saving ? 'Saving…' : 'Save'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default SessionManagement