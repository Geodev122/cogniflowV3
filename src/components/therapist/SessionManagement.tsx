// src/components/therapist/SessionManagement.tsx
import React, { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { formatDateTime, isRecursionError } from '../../utils/helpers'
import {
  Calendar,
  Plus,
  Filter,
  User,
  Edit,
  CheckCircle,
  AlertTriangle,
  Trash2,
  Clock,
  Search,
  Check,
  Users,
  FileText,
  MessageSquare,
} from 'lucide-react'

type AptType = 'individual' | 'group' | 'family' | 'assessment'
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
  const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar')

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

  const getAppointmentTypeIcon = (type: AptType) => {
    switch (type) {
      case 'individual':
        return <User className="h-4 w-4" />
      case 'group':
        return <Users className="h-4 w-4" />
      case 'family':
        return <Users className="h-4 w-4" />
      case 'assessment':
        return <FileText className="h-4 w-4" />
      default:
        return <User className="h-4 w-4" />
    }
  }

  const getAppointmentTypeColor = (type: AptType) => {
    switch (type) {
      case 'individual':
        return 'bg-blue-100 text-blue-800'
      case 'group':
        return 'bg-orange-100 text-orange-800'
      case 'family':
        return 'bg-green-100 text-green-800'
      case 'assessment':
        return 'bg-purple-100 text-purple-800'
      default:
        return 'bg-gray-100 text-gray-800'
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
      groups[key].