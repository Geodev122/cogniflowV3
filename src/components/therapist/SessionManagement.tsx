import React, { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { formatDate, formatDateTime } from '../../utils/helpers'
import { 
  Calendar, 
  Plus, 
  Search, 
  Filter, 
  Clock, 
  User, 
  Video, 
  Phone,
  MapPin,
  Edit,
  Trash2,
  CheckCircle,
  AlertTriangle
} from 'lucide-react'

interface Appointment {
  id: string
  client_id: string
  appointment_date: string
  duration_minutes: number
  appointment_type: 'individual' | 'group' | 'family' | 'assessment'
  status: 'scheduled' | 'completed' | 'cancelled' | 'no_show'
  notes?: string
  client: {
    first_name: string
    last_name: string
    email: string
  }
}

export const SessionManagement: React.FC = () => {
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [clients, setClients] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showNewAppointment, setShowNewAppointment] = useState(false)
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null)
  const [viewFilter, setViewFilter] = useState<'all' | 'today' | 'week' | 'upcoming'>('upcoming')
  const { profile } = useAuth()

  useEffect(() => {
    if (profile) {
      fetchAppointments()
      fetchClients()
    }
  }, [profile])

  const fetchAppointments = async () => {
    if (!profile) return

    try {
      setError(null)
      const { data, error } = await supabase
        .from('appointments')
        .select('*')
        .eq('therapist_id', profile.id)
        .order('appointment_date', { ascending: true })

      if (error) throw error

      // Get client data for appointments
      const clientIds = [...new Set(data?.map(a => a.client_id) || [])]
      if (clientIds.length > 0) {
        const { data: clientData } = await supabase
          .from('profiles')
          .select('id, first_name, last_name, email')
          .in('id', clientIds)

        const appointmentsWithClients = data?.map(appointment => ({
          ...appointment,
          client: clientData?.find(c => c.id === appointment.client_id) || {
            first_name: 'Unknown',
            last_name: 'Client',
            email: 'unknown@example.com'
          }
        })) || []

        setAppointments(appointmentsWithClients)
      } else {
        setAppointments([])
      }
    } catch (error) {
      console.error('Error fetching appointments:', error)
      setError('Failed to load appointments')
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
      if (clientIds.length > 0) {
        const { data: clientData } = await supabase
          .from('profiles')
          .select('id, first_name, last_name, email')
          .in('id', clientIds)

        setClients(clientData || [])
      }
    } catch (error) {
      console.error('Error fetching clients:', error)
      setClients([])
    }
  }

  const createAppointment = async (appointmentData: any) => {
    try {
      const { error } = await supabase
        .from('appointments')
        .insert({
          therapist_id: profile!.id,
          client_id: appointmentData.clientId,
          appointment_date: appointmentData.dateTime,
          duration_minutes: appointmentData.duration,
          appointment_type: appointmentData.type,
          status: 'scheduled',
          notes: appointmentData.notes
        })

      if (error) throw error

      await fetchAppointments()
      setShowNewAppointment(false)
    } catch (error) {
      console.error('Error creating appointment:', error)
      alert('Error creating appointment')
    }
  }

  const updateAppointmentStatus = async (appointmentId: string, status: string) => {
    try {
      const { error } = await supabase
        .from('appointments')
        .update({ status })
        .eq('id', appointmentId)

      if (error) throw error
      await fetchAppointments()
    } catch (error) {
      console.error('Error updating appointment:', error)
    }
  }

  const getFilteredAppointments = () => {
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)

    switch (viewFilter) {
      case 'today':
        return appointments.filter(apt => {
          const aptDate = new Date(apt.appointment_date)
          return aptDate >= today && aptDate < new Date(today.getTime() + 24 * 60 * 60 * 1000)
        })
      case 'week':
        return appointments.filter(apt => {
          const aptDate = new Date(apt.appointment_date)
          return aptDate >= today && aptDate <= weekFromNow
        })
      case 'upcoming':
        return appointments.filter(apt => new Date(apt.appointment_date) >= now)
      default:
        return appointments
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled': return 'text-blue-600 bg-blue-100'
      case 'completed': return 'text-green-600 bg-green-100'
      case 'cancelled': return 'text-red-600 bg-red-100'
      case 'no_show': return 'text-orange-600 bg-orange-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

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
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus className="w-4 h-4 mr-2" />
          Schedule Session
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
        <div className="flex items-center space-x-4">
          <Filter className="w-5 h-5 text-gray-400" />
          <select
            value={viewFilter}
            onChange={(e) => setViewFilter(e.target.value as any)}
            className="border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">All Appointments</option>
            <option value="today">Today</option>
            <option value="week">This Week</option>
            <option value="upcoming">Upcoming</option>
          </select>
        </div>
      </div>

      {/* Appointments List */}
      <div className="bg-white shadow-sm rounded-lg border border-gray-200">
        {getFilteredAppointments().length === 0 ? (
          <div className="text-center py-12">
            <Calendar className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No appointments found</h3>
            <p className="mt-1 text-sm text-gray-500">
              Schedule your first session to get started.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {getFilteredAppointments().map((appointment) => (
              <div key={appointment.id} className="p-6 hover:bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                      <User className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900">
                        {appointment.client.first_name} {appointment.client.last_name}
                      </h4>
                      <p className="text-sm text-gray-600">{appointment.client.email}</p>
                      <div className="flex items-center space-x-4 text-sm text-gray-500 mt-1">
                        <span>{formatDateTime(appointment.appointment_date)}</span>
                        <span>{appointment.duration_minutes} minutes</span>
                        <span className="capitalize">{appointment.appointment_type}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(appointment.status)}`}>
                      {appointment.status.replace('_', ' ')}
                    </span>
                    <div className="flex space-x-1">
                      <button
                        onClick={() => setSelectedAppointment(appointment)}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      {appointment.status === 'scheduled' && (
                        <button
                          onClick={() => updateAppointmentStatus(appointment.id, 'completed')}
                          className="text-green-600 hover:text-green-800"
                        >
                          <CheckCircle className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
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
    </div>
  )
}

// New Appointment Modal Component
interface NewAppointmentModalProps {
  clients: any[]
  onClose: () => void
  onCreate: (appointmentData: any) => void
}

const NewAppointmentModal: React.FC<NewAppointmentModalProps> = ({ clients, onClose, onCreate }) => {
  const [formData, setFormData] = useState({
    clientId: '',
    dateTime: '',
    duration: 50,
    type: 'individual',
    notes: ''
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
        
        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
          <form onSubmit={handleSubmit}>
            <div className="bg-white px-6 pt-6 pb-4">
              <h3 className="text-lg font-medium text-gray-900 mb-6">Schedule New Session</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Client</label>
                  <select
                    value={formData.clientId}
                    onChange={(e) => setFormData(prev => ({ ...prev, clientId: e.target.value }))}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  >
                    <option value="">Select a client</option>
                    {clients.map(client => (
                      <option key={client.id} value={client.id}>
                        {client.first_name} {client.last_name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Date & Time</label>
                  <input
                    type="datetime-local"
                    value={formData.dateTime}
                    onChange={(e) => setFormData(prev => ({ ...prev, dateTime: e.target.value }))}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Duration (minutes)</label>
                    <input
                      type="number"
                      value={formData.duration}
                      onChange={(e) => setFormData(prev => ({ ...prev, duration: parseInt(e.target.value) }))}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      min="15"
                      max="180"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Type</label>
                    <select
                      value={formData.type}
                      onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value }))}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="individual">Individual</option>
                      <option value="group">Group</option>
                      <option value="family">Family</option>
                      <option value="assessment">Assessment</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    rows={3}
                    placeholder="Session notes or special instructions..."
                  />
                </div>
              </div>
            </div>
            
            <div className="bg-gray-50 px-6 py-4 sm:flex sm:flex-row-reverse">
              <button
                type="submit"
                disabled={!formData.clientId || !formData.dateTime}
                className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50"
              >
                Schedule Session
              </button>
              <button
                type="button"
                onClick={onClose}
                className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
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