// src/pages/therapist/SessionManagement.tsx
import React, { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { Plus, CalendarClock, Trash2, Pencil } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'

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

const SessionManagement: React.FC = () => {
  const { profile } = useAuth()
  const [rows, setRows] = useState<Appt[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [editing, setEditing] = useState<Partial<Appt> | null>(null)
  const [saving, setSaving] = useState(false)

  const canEdit = !!profile?.id

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

  useEffect(() => { fetchRows() }, [profile?.id])

  const openNew = () => {
    setEditing({
      therapist_id: profile!.id,
      title: '',
      start_time: new Date().toISOString(),
      end_time: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      status: 'scheduled',
      location: '',
      notes: '',
      client_id: '',
      case_id: null,
    })
  }

  const save = async () => {
    if (!editing) return
    setSaving(true)
    try {
      if (editing.id) {
        const { error } = await supabase.from('appointments').update(editing).eq('id', editing.id)
        if (error) throw error
      } else {
        const { error } = await supabase.from('appointments').insert(editing)
        if (error) throw error
      }
      setEditing(null)
      await fetchRows()
    } catch (e: any) {
      alert(e.message || 'Failed to save appointment')
    } finally {
      setSaving(false)
    }
  }

  const remove = async (id: string) => {
    if (!confirm('Delete this appointment?')) return
    const { error } = await supabase.from('appointments').delete().eq('id', id)
    if (error) alert(error.message)
    else fetchRows()
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
            <div className="col-span-3">Start</div>
            <div className="col-span-3">End</div>
            <div className="col-span-2">Status</div>
            <div className="col-span-1"></div>
          </div>
          <div className="divide-y">
            {rows.map(r => (
              <div key={r.id} className="grid grid-cols-12 px-3 py-2 items-center">
                <div className="col-span-3 truncate">{r.title || '—'}</div>
                <div className="col-span-3">{new Date(r.start_time).toLocaleString()}</div>
                <div className="col-span-3">{new Date(r.end_time).toLocaleString()}</div>
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
              <label className="block text-sm">Start</label>
              <input type="datetime-local" className="w-full border rounded p-2"
                value={editing.start_time ? new Date(editing.start_time).toISOString().slice(0,16) : ''}
                onChange={(e) => setEditing(s => ({ 
                  ...s!, 
                  start_time: new Date(e.target.value).toISOString(),
                  appointment_date: new Date(e.target.value).toISOString()
                }))}/>
              <label className="block text-sm">End</label>
              <input type="datetime-local" className="w-full border rounded p-2"
                value={editing.end_time ? new Date(editing.end_time).toISOString().slice(0,16) : ''}
                onChange={(e) => setEditing(s => ({ ...s!, end_time: new Date(e.target.value).toISOString() }))}/>
              <input className="w-full border rounded p-2" placeholder="Location"
                value={editing.location ?? ''} onChange={(e) => setEditing(s => ({ ...s!, location: e.target.value }))}/>
              <textarea className="w-full border rounded p-2" rows={3} placeholder="Notes"
                value={editing.notes ?? ''} onChange={(e) => setEditing(s => ({ ...s!, notes: e.target.value }))}/>
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