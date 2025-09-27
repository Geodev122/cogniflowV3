// src/components/therapist/SessionManagement.tsx
import React, { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { formatDateTime, isRecursionError } from '../../utils/helpers'
import { Calendar, Plus, ListFilter as Filter, User, CreditCard as Edit, CircleCheck as CheckCircle, TriangleAlert as AlertTriangle, Trash2, Clock, Search, Check, Users, FileText, MessageSquare } from 'lucide-react'' | 'family' | 'assessment'
type AptStatus = 'scheduled' | 'completed' | 'cancelled' | 'no_show'

interface Appointment {
  id: string
  client_id: string
  appointment_date: string
  duration_minutes: number
  appointment_type: AptType
  status: AptStatus
  notes?: string
  client: {
    first_name: string
    last_name: string
    email: string
  }
}

interface ClientLite {
  id: string
  first_name: string
  last_name: string
  email: string
}

export const SessionManagement: React.FC = () => {
  const { profile } = useAuth()
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [clients, setClients] = useState<ClientLite[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [showNewAppointment, setShowNewAppointment] = useState(false)
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null)

  const [viewFilter, setViewFilter] = useState<'all' | 'today' | 'week' | 'upcoming' | 'past'>('upcoming')
  const [statusFilter, setStatusFilter] = useState<'all' | AptStatus>('all')
  const [typeFilter, setTypeFilter] = useState<'all' | AptType>('all')
  const [search, setSearch] = useState('')

  useEffect(() => {
    if (!profile) return
    fetchClients()
    fetchAppointments()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile])

  const fetchAppointments = async () => {
    if (!profile) return
    try {
      setLoading(true)
      setError(null)

      const { data, error: aptErr } = await supabase
        .from('appointments')
        .select('*')
        .eq('therapist_id', profile.id)
        .order('appointment_date', { ascending: true })

      if (aptErr) {
        if (isRecursionError(aptErr)) {
          console.error('RLS recursion error in appointments:', aptErr)
          setError('Database configuration error — please contact support.')
          setAppointments([])
          return
        }
        throw aptErr
      }

      const clientIds = [...new Set((data ?? []).map(a => a.client_id))]
      let clientData: ClientLite[] = []
      if (clientIds.length) {
        const { data: cd, error: cErr } = await supabase
          .from('profiles')
          .select('id, first_name, last_name, email')
          .in('id', clientIds)

        if (cErr && !isRecursionError(cErr)) {
          console.warn('Error fetching client data for appointments:', cErr)
        }
        clientData = cd || []
      }

      const list: Appointment[] =
        (data || []).map(a => ({
          ...a,
          client:
            clientData.find(c => c.id === a.client_id) || {
              first_name: 'Unknown',
              last_name: 'Client',
              email: 'unknown@example.com',
            },
        })) || []

      setAppointments(list)
    } catch (e) {
      console.error('Error fetching appointments:', e)
      setError(isRecursionError(e) ? 'Database configuration error — please contact support.' : 'Failed to load appointments.')
      setAppointments([])
    } finally {
      setLoading(false)
    }
  }

  const fetchClients = async () => {
    if (!profile) return
    try {
      const { data: relations } = await supabase
        .from('therapist_client_relations')
        .select('client_id')
        .eq('therapist_id', profile.id)

      const clientIds = relations?.map(r => r.client_id) || []
      if (!clientIds.length) {
        setClients([])
        return
      }

      const { data: clientData } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, email')
        .in('id', clientIds)

      setClients(clientData || [])
    } catch (e) {
      console.error('Error fetching clients:', e)
      setClients([])
    }
  }

  const createAppointment = async (appointmentData: {
    clientId: string
    dateTime: string
    duration: number
    type: AptType
    notes: string
  }) => {
    try {
      const { error: insErr } = await supabase.from('appointments').insert({
        therapist_id: profile!.id,
        client_id: appointmentData.clientId,
        appointment_date: appointmentData.dateTime,
        duration_minutes: appointmentData.duration,
        appointment_type: appointmentData.type,
        status: 'scheduled',
        notes: appointmentData.notes,
      })

      if (insErr) throw insErr

      await fetchAppointments()
      setShowNewAppointment(false)
      alert('Appointment scheduled successfully!')
    } catch (e) {
      console.error('Error creating appointment:', e)
      alert('Error creating appointment')
    }
  }

  const updateAppointment = async (aptId: string, updates: Partial<Appointment>) => {
    try {
      const { error: upErr } = await supabase.from('appointments').update(updates).eq('id', aptId)
      if (upErr) throw upErr
      await fetchAppointments()
      setSelectedAppointment(null)
      alert('Appointment updated')
    } catch (e) {
      console.error('Error updating appointment:', e)
      alert('Error updating appointment')
    }
  }

  const deleteAppointment = async (aptId: string) => {
    if (!confirm('Delete this appointment?')) return
    try {
      const { error: delErr } = await supabase.from('appointments').delete().eq('id', aptId)
      if (delErr) throw delErr
      await fetchAppointments()
      setSelectedAppointment(null)
      alert('Appointment deleted')
    } catch (e) {
      console.error('Error deleting appointment:', e)
      alert('Error deleting appointment')
    }
  }

  const MarkCompletedButton: React.FC<{ apt: Appointment }> = ({ apt }) =>
    apt.status === 'scheduled' ? (
      <button
        onClick={() => updateAppointment(apt.id, { status: 'completed' })}
        className="text-green-600 hover:text-green-800 px-2 py-1 rounded"
        aria-label="Mark completed"
        title="Mark completed"
      >
        <CheckCircle className="w-4 h-4" />
      </button>
    ) : null

  const getStatusColor = (status: AptStatus) => {
    switch (status) {
      case 'scheduled':
        return 'text-blue-600 bg-blue-100'
      case 'completed':
        return 'text-green-600 bg-green-100'
      case 'cancelled':
        return 'text-red-600 bg-red-100'
      case 'no_show':
        return 'text-orange-600 bg-orange-100'
      default:
        return 'text-gray-600 bg-gray-100'
    }
  }

  // Filters
  const filtered = useMemo(() => {
    const now = new Date()
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const endOfToday = new Date(startOfToday.getTime() + 24 * 60 * 60 * 1000 - 1)
    const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)

    return appointments.filter(a => {
      const when = new Date(a.appointment_date)

      // View window
      let inWindow = true
      if (viewFilter === 'today') inWindow = when >= startOfToday && when <= endOfToday
      if (viewFilter === 'week') inWindow = when >= startOfToday && when <= weekFromNow
      if (viewFilter === 'upcoming') inWindow = when >= now
      if (viewFilter === 'past') inWindow = when < now

      // Status/type
      const statusOk = statusFilter === 'all' || a.status === statusFilter
      const typeOk = typeFilter === 'all' || a.appointment_type === typeFilter

      // Search (client name/email)
      const q = search.trim().toLowerCase()
      const searchOk =
        !q ||
        `${a.client.first_name} ${a.client.last_name}`.toLowerCase().includes(q) ||
        a.client.email.toLowerCase().includes(q)

      return inWindow && statusOk && typeOk && searchOk
    })
  }, [appointments, viewFilter, statusFilter, typeFilter, search])

  // Quick stats
  const stats = useMemo(() => {
    const now = new Date()
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const endOfToday = new Date(startOfToday.getTime() + 24 * 60 * 60 * 1000 - 1)
    const thirtyAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

    const upcoming = appointments.filter(a => new Date(a.appointment_date) >= now && a.status === 'scheduled').length
    const today = appointments.filter(a => {
      const d = new Date(a.appointment_date)
      return d >= startOfToday && d <= endOfToday
    }).length
    const completed30 = appointments.filter(a => a.status === 'completed' && new Date(a.appointment_date) >= thirtyAgo).length
    const noShows30 = appointments.filter(a => a.status === 'no_show' && new Date(a.appointment_date) >= thirtyAgo).length

    return { upcoming, today, completed30, noShows30 }
  }, [appointments])

  // Group by day
  const groupedByDay = useMemo(() => {
    const groups: Record<string, Appointment[]> = {}
    for (const a of filtered) {
      const d = new Date(a.appointment_date)
      const key = d.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' })
      groups[key] = groups[key] || []
      groups[key].push(a)
    }
    // preserve chronological order
    const entries = Object.entries(groups).sort((a, b) => {
      const ad = new Date(a[1][0].appointment_date).getTime()
      const bd = new Date(b[1][0].appointment_date).getTime()
      return ad - bd
    })
    return entries
  }, [filtered])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-center space-x-2">
          <AlertTriangle className="w-5 h-5 text-red-600" />
          <span className="text-red-800">{error}</span>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Session Management</h2>
          <p className="text-gray-600">Schedule and manage therapy sessions</p>
        </div>
        <button
          onClick={() => setShowNewAppointment(true)}
          className="hidden sm:inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus className="w-4 h-4 mr-2" />
          Schedule Session
        </button>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Upcoming" value={stats.upcoming} tone="blue" icon={<Calendar className="w-5 h-5" />} />
        <StatCard label="Today" value={stats.today} tone="purple" icon={<Clock className="w-5 h-5" />} />
        <StatCard label="Completed (30d)" value={stats.completed30} tone="green" icon={<Check className="w-5 h-5" />} />
        <StatCard label="No-shows (30d)" value={stats.noShows30} tone="amber" icon={<AlertTriangle className="w-5 h-5" />} />
      </div>

      {/* Mobile FAB */}
      <button
        onClick={() => setShowNewAppointment(true)}
        className="sm:hidden fixed bottom-20 right-4 z-30 rounded-full shadow-lg bg-blue-600 hover:bg-blue-700 text-white w-14 h-14 flex items-center justify-center"
        aria-label="Schedule Session"
      >
        <Plus className="w-6 h-6" />
      </button>

      {/* Sticky Filters */}
      <div className="sticky top-0 z-10">
        <div className="backdrop-blur supports-[backdrop-filter]:bg-white/70 bg-white border border-gray-200 rounded-lg shadow-sm p-4">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3 items-end">
            <label className="block">
              <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
                <Filter className="w-4 h-4 text-gray-400" />
                <span>View</span>
              </div>
              <select
                value={viewFilter}
                onChange={e => setViewFilter(e.target.value as any)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="upcoming">Upcoming</option>
                <option value="today">Today</option>
                <option value="week">This week</option>
                <option value="past">Past</option>
                <option value="all">All</option>
              </select>
            </label>

            <label className="block">
              <div className="text-sm text-gray-600 mb-1">Status</div>
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value as any)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">All</option>
                <option value="scheduled">Scheduled</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
                <option value="no_show">No-show</option>
              </select>
            </label>

            <label className="block">
              <div className="text-sm text-gray-600 mb-1">Type</div>
              <select
                value={typeFilter}
                onChange={e => setTypeFilter(e.target.value as any)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">All</option>
                <option value="individual">Individual</option>
                <option value="group">Group</option>
                <option value="family">Family</option>
                <option value="assessment">Assessment</option>
              </select>
            </label>

            <label className="block md:col-span-2">
              <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
                <Search className="w-4 h-4 text-gray-400" />
                <span>Search</span>
              </div>
              <input
                type="text"
                placeholder="Search by client or email"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </label>
          </div>
        </div>
      </div>

      {/* Appointments List */}
      <div className="bg-white shadow-sm rounded-lg border border-gray-200">
        {filtered.length === 0 ? (
          <div className="text-center py-12">
            <Calendar className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No appointments found</h3>
            <p className="mt-1 text-sm text-gray-500">
              {search || statusFilter !== 'all' || typeFilter !== 'all' || viewFilter !== 'upcoming'
                ? 'Try adjusting your filters or search.'
                : 'Schedule your first session to get started.'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {groupedByDay.map(([day, items]) => (
              <div key={day} className="p-4 sm:p-6">
                <h4 className="text-sm font-semibold text-gray-700 mb-3">{day}</h4>
                <div className="space-y-3">
                  {items.map(appointment => (
                    <div key={appointment.id} className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4 p-4 rounded-lg border border-gray-100 hover:bg-gray-50">
                      {/* Left */}
                      <div className="flex items-start gap-3 sm:gap-4">
                        <div className="w-12 h-12 sm:w-14 sm:h-14 bg-blue-100 rounded-full flex items-center justify-center shrink-0">
                          <User className="w-6 h-6 sm:w-7 sm:h-7 text-blue-600" />
                        </div>
                        <div className="min-w-0">
                          <h5 className="font-medium text-gray-900 truncate">
                            {appointment.client.first_name} {appointment.client.last_name}
                          </h5>
                          <p className="text-sm text-gray-600 truncate">{appointment.client.email}</p>

                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-500 mt-1">
                            <span>{formatDateTime(appointment.appointment_date)}</span>
                            <span>{appointment.duration_minutes} minutes</span>
                            <span className="capitalize">{appointment.appointment_type}</span>
                          </div>
                        </div>
                      </div>

                      {/* Right */}
                      <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                        <span className={`inline-flex px-2.5 py-1 text-xs font-medium rounded-full ${getStatusColor(appointment.status)}`}>
                          {appointment.status.replace('_', ' ')}
                        </span>
                        <button
                          onClick={() => setSelectedAppointment(appointment)}
                          className="text-blue-600 hover:text-blue-800 px-2 py-1 rounded"
                          aria-label="Edit appointment"
                          title="Edit appointment"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <MarkCompletedButton apt={appointment} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* New Appointment Modal */}
      {showNewAppointment && (
        <NewAppointmentModal
          clients={clients}
          onClose={() => setShowNewAppointment(false)}
          onCreate={createAppointment}
        />
      )}

      {/* Edit Appointment Modal */}
      {selectedAppointment && (
        <EditAppointmentModal
          appointment={selectedAppointment}
          onClose={() => setSelectedAppointment(null)}
          onSave={(updates) => updateAppointment(selectedAppointment.id, updates)}
          onDelete={() => deleteAppointment(selectedAppointment.id)}
        />
      )}
    </div>
  )
}

/* ---------- small presentational helpers ---------- */

const tones = {
  blue: { chip: 'bg-blue-50 text-blue-700', iconWrap: 'bg-blue-100 text-blue-600' },
  purple: { chip: 'bg-purple-50 text-purple-700', iconWrap: 'bg-purple-100 text-purple-600' },
  green: { chip: 'bg-green-50 text-green-700', iconWrap: 'bg-green-100 text-green-600' },
  amber: { chip: 'bg-amber-50 text-amber-700', iconWrap: 'bg-amber-100 text-amber-600' },
} as const

const StatCard: React.FC<{ label: string; value: number | string; tone: keyof typeof tones; icon: React.ReactNode }> = ({
  label,
  value,
  tone,
  icon,
}) => (
  <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm font-medium text-gray-600">{label}</p>
        <p className={`text-2xl font-bold ${tone === 'blue' ? 'text-blue-600' : tone === 'purple' ? 'text-purple-600' : tone === 'green' ? 'text-green-600' : 'text-amber-600'}`}>
          {value}
        </p>
      </div>
      <div className={`p-3 rounded-full ${tones[tone].iconWrap}`}>{icon}</div>
    </div>
  </div>
)

/* ---------- New Appointment Modal ---------- */

interface NewAppointmentModalProps {
  clients: ClientLite[]
  onClose: () => void
  onCreate: (appointmentData: { clientId: string; dateTime: string; duration: number; type: AptType; notes: string }) => void
}

const NewAppointmentModal: React.FC<NewAppointmentModalProps> = ({ clients, onClose, onCreate }) => {
  const [formData, setFormData] = useState({
    clientId: '',
    dateTime: '',
    duration: 50,
    type: 'individual' as AptType,
    notes: '',
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (formData.clientId && formData.dateTime) {
      onCreate(formData)
    }
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={onClose} />
        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle w-full sm:max-w-lg">
          <form onSubmit={handleSubmit} className="flex flex-col max-h-[85vh]">
            <div className="bg-white px-6 pt-6 pb-4 overflow-y-auto">
              <h3 className="text-lg font-medium text-gray-900 mb-6">Schedule New Session</h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Client</label>
                  <select
                    value={formData.clientId}
                    onChange={e => setFormData(prev => ({ ...prev, clientId: e.target.value }))}
                    className="w-full border border-gray-300 rounded-md px-3 py-3 sm:py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                    required
                  >
                    <option value="">Select a client</option>
                    {clients.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.first_name} {c.last_name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Date & Time</label>
                    <input
                      type="datetime-local"
                      value={formData.dateTime}
                      onChange={e => setFormData(prev => ({ ...prev, dateTime: e.target.value }))}
                      className="w-full border border-gray-300 rounded-md px-3 py-3 sm:py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Type</label>
                    <select
                      value={formData.type}
                      onChange={e => setFormData(prev => ({ ...prev, type: e.target.value as AptType }))}
                      className="w-full border border-gray-300 rounded-md px-3 py-3 sm:py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                    >
                      <option value="individual">Individual</option>
                      <option value="group">Group</option>
                      <option value="family">Family</option>
                      <option value="assessment">Assessment</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Duration (minutes)</label>
                  <input
                    type="number"
                    value={formData.duration}
                    onChange={e => setFormData(prev => ({ ...prev, duration: parseInt(e.target.value || '0', 10) }))}
                    className="w-full border border-gray-300 rounded-md px-3 py-3 sm:py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                    min={15}
                    max={180}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
                  <textarea
                    value={formData.notes}
                    onChange={e => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                    className="w-full border border-gray-300 rounded-md px-3 py-3 sm:py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                    rows={3}
                    placeholder="Session notes or special instructions..."
                  />
                </div>
              </div>
            </div>

            <div className="bg-gray-50 px-6 py-4 sm:flex sm:flex-row-reverse border-t">
              <button
                type="submit"
                disabled={!formData.clientId || !formData.dateTime}
                className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-3 sm:py-2 bg-blue-600 text-base sm:text-sm font-medium text-white hover:bg-blue-700 sm:ml-3 sm:w-auto disabled:opacity-50"
              >
                Schedule Session
              </button>
              <button
                type="button"
                onClick={onClose}
                className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-3 sm:py-2 bg-white text-base sm:text-sm font-medium text-gray-700 hover:bg-gray-50 sm:mt-0 sm:ml-3 sm:w-auto"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

/* ---------- Edit Appointment Modal ---------- */

const EditAppointmentModal: React.FC<{
  appointment: Appointment
  onClose: () => void
  onSave: (updates: Partial<Appointment>) => void
  onDelete: () => void
}> = ({ appointment, onClose, onSave, onDelete }) => {
  const [dateTime, setDateTime] = useState(appointment.start_time.slice(0, 16)) // assume ISO string
  const [type, setType] = useState<AptType>(appointment.appointment_type)
  const [status, setStatus] = useState<AptStatus>(appointment.status)
  const [duration, setDuration] = useState<number>(appointment.duration_minutes)
  const [notes, setNotes] = useState(appointment.notes || '')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave({
      start_time: dateTime,
      appointment_date: dateTime,
      end_time: new Date(new Date(dateTime).getTime() + duration * 60000).toISOString(),
      appointment_type: type,
      status,
      duration_minutes: duration,
      notes,
    })
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={onClose} />
        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle w-full sm:max-w-lg">
          <form onSubmit={handleSubmit} className="flex flex-col max-h-[85vh]">
            <div className="bg-white px-6 pt-6 pb-4 overflow-y-auto">
              <h3 className="text-lg font-medium text-gray-900 mb-6">Edit Session</h3>

              <div className="space-y-4">
                <div className="text-sm text-gray-500">
                  <span className="font-medium text-gray-700">Client: </span>
                  {appointment.client.first_name} {appointment.client.last_name} • {appointment.client.email}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Date & Time</label>
                    <input
                      type="datetime-local"
                      value={dateTime}
                      onChange={e => setDateTime(e.target.value)}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Type</label>
                    <select
                      value={type}
                      onChange={e => setType(e.target.value as AptType)}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="individual">Individual</option>
                      <option value="group">Group</option>
                      <option value="family">Family</option>
                      <option value="assessment">Assessment</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                    <select
                      value={status}
                      onChange={e => setStatus(e.target.value as AptStatus)}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="scheduled">Scheduled</option>
                      <option value="completed">Completed</option>
                      <option value="cancelled">Cancelled</option>
                      <option value="no_show">No-show</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Duration (minutes)</label>
                    <input
                      type="number"
                      value={duration}
                      onChange={e => setDuration(parseInt(e.target.value || '0', 10))}
                      min={15}
                      max={180}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
                  <textarea
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    rows={3}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Add or update session notes..."
                  />
                </div>
              </div>
            </div>

            <div className="bg-gray-50 px-6 py-4 sm:flex sm:items-center sm:justify-between border-t">
              <button
                type="button"
                onClick={onDelete}
                className="inline-flex items-center text-sm text-red-600 hover:text-red-800 mb-3 sm:mb-0"
              >
                <Trash2 className="w-4 h-4 mr-1" />
                Delete
              </button>
              <div className="sm:flex sm:flex-row-reverse sm:gap-2">
                <button
                  type="submit"
                  className="inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-sm font-medium text-white hover:bg-blue-700"
                >
                  Save Changes
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="mt-3 sm:mt-0 inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
