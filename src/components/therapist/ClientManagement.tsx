// src/components/therapist/ClientManagement.tsx
import React, { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import {
  getRiskColor as riskClassFromLevel,
  formatDate,
  generatePatientCode,
  isRecursionError,
} from '../../utils/helpers'
import {
  Users,
  Plus,
  Search,
  Filter,
  Edit,
  Phone,
  Mail,
  AlertTriangle,
} from 'lucide-react'

interface ClientProfileExtras {
  emergency_contact_name?: string
  emergency_contact_phone?: string
  emergency_contact_relationship?: string
  medical_history?: string
  current_medications?: string
  presenting_concerns?: string
  therapy_history?: string
  risk_level?: string
  notes?: string
}

interface ClientStats {
  totalAssessments: number
  completedAssessments: number
  lastSession?: string
  nextAppointment?: string
}

interface Client {
  id: string
  first_name: string
  last_name: string
  email: string
  created_at: string
  profile?: ClientProfileExtras | null
  stats?: ClientStats
}

export const ClientManagement: React.FC = () => {
  const [clients, setClients] = useState<Client[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [riskFilter, setRiskFilter] = useState<string>('all')
  const [selectedClient, setSelectedClient] = useState<Client | null>(null)
  const [showAddClient, setShowAddClient] = useState(false)
  const [showClientDetails, setShowClientDetails] = useState(false)
  const [loading, setLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const { profile } = useAuth()

  const fetchClients = async () => {
    if (!profile) {
      // prevent infinite spinner while profile is not yet available
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setErrorMsg(null)

      // 1) Join relations -> profiles in one query (avoids some RLS pitfalls with .in)
      const { data: rows, error: joinError } = await supabase
        .from('therapist_client_relations')
        .select(`
          client_id,
          profiles:profiles!therapist_client_relations_client_id_fkey (
            id, first_name, last_name, email, created_at
          )
        `)
        .eq('therapist_id', profile.id)

      if (joinError) {
        console.error('Error joining relations->profiles:', joinError)
        setErrorMsg('Failed to load clients. Please try again.')
        setClients([])
        setLoading(false)
        return
      }

      const baseClients =
        (rows || [])
          .map((r: any) => r.profiles)
          .filter(Boolean) as Array<{
            id: string; first_name: string; last_name: string; email: string; created_at: string
          }>

      if (baseClients.length === 0) {
        setClients([])
        return
      }

      // 2) Hydrate each client with extras/stats
      const enriched = await Promise.all(
        baseClients.map(async (client) => {
          try {
            const [
              { data: clientProfile, error: extendedError },
              { data: assessments, error: assessmentsError },
              { data: lastSession, error: lastSessionError },
              { data: nextAppointment, error: nextAppointmentError },
            ] = await Promise.all([
              supabase
                .from('client_profiles')
                .select('*')
                .eq('client_id', client.id)
                .eq('therapist_id', profile.id)
                .maybeSingle(),
              supabase
                .from('form_assignments')
                .select('status')
                .eq('client_id', client.id)
                .eq('therapist_id', profile.id),
              supabase
                .from('appointments')
                .select('appointment_date')
                .eq('client_id', client.id)
                .eq('therapist_id', profile.id)
                .eq('status', 'completed')
                .order('appointment_date', { ascending: false })
                .limit(1),
              supabase
                .from('appointments')
                .select('appointment_date')
                .eq('client_id', client.id)
                .eq('therapist_id', profile.id)
                .eq('status', 'scheduled')
                .gte('appointment_date', new Date().toISOString())
                .order('appointment_date', { ascending: true })
                .limit(1),
            ])

            if (extendedError && !isRecursionError(extendedError)) {
              console.warn('Error fetching extended profile for client:', client.id, extendedError)
            }
            if (assessmentsError && !isRecursionError(assessmentsError)) {
              console.warn('Error fetching assessments for client:', client.id, assessmentsError)
            }
            if (lastSessionError && !isRecursionError(lastSessionError)) {
              console.warn('Error fetching last session for client:', client.id, lastSessionError)
            }
            if (nextAppointmentError && !isRecursionError(nextAppointmentError)) {
              console.warn('Error fetching next appointment for client:', client.id, nextAppointmentError)
            }

            const stats: ClientStats = {
              totalAssessments: assessments?.length || 0,
              completedAssessments: assessments?.filter((a: any) => a.status === 'completed').length || 0,
              lastSession: lastSession?.[0]?.appointment_date,
              nextAppointment: nextAppointment?.[0]?.appointment_date,
            }

            return {
              ...client,
              profile: clientProfile || null,
              stats,
            } as Client
          } catch (e) {
            console.error('Error processing client data:', client.id, e)
            return {
              ...client,
              profile: null,
              stats: {
                totalAssessments: 0,
                completedAssessments: 0,
                lastSession: undefined,
                nextAppointment: undefined,
              },
            } as Client
          }
        })
      )

      setClients(enriched)
    } catch (error) {
      console.error('Error fetching clients:', error)
      if (isRecursionError(error)) console.error('RLS recursion detected in client management')
      setErrorMsg('Failed to load clients. Please try again.')
      setClients([])
    } finally {
      setLoading(false)
    }
  }

  // Run fetch when profile is ready / changes
  useEffect(() => {
    fetchClients()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile])

  const filteredClients = useMemo(() => {
    let next = [...clients]
    const q = searchTerm.trim().toLowerCase()

    if (q) {
      next = next.filter(
        (c) =>
          `${c.first_name} ${c.last_name}`.toLowerCase().includes(q) ||
          c.email.toLowerCase().includes(q)
      )
    }

    if (riskFilter !== 'all') {
      next = next.filter((c) => (c.profile?.risk_level || 'low') === riskFilter)
    }

    return next
  }, [clients, searchTerm, riskFilter])

  const addClientToRoster = async (clientData: {
    firstName: string
    lastName: string
    email: string
    whatsappNumber: string
  }) => {
    try {
      const patientCode = generatePatientCode()

      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: crypto.randomUUID(),
          role: 'client',
          first_name: clientData.firstName,
          last_name: clientData.lastName,
          email: clientData.email,
          whatsapp_number: clientData.whatsappNumber,
          patient_code: patientCode,
          created_by_therapist: profile!.id,
          password_set: false,
        })
        .select('id')
        .single()

      if (profileError) {
        console.error('Error creating client profile:', profileError)
        throw new Error(`Failed to create client profile: ${profileError.message}`)
      }

      const { data: newClient, error: clientError } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', clientData.email)
        .eq('created_by_therapist', profile!.id)
        .single()

      if (clientError || !newClient) {
        throw new Error('Failed to retrieve created client')
      }

      const { error: relationError } = await supabase
        .from('therapist_client_relations')
        .insert({
          therapist_id: profile!.id,
          client_id: newClient.id,
        })

      if (relationError && !String(relationError.message || '').includes('duplicate key')) {
        console.error('Error creating therapist-client relation:', relationError)
        throw new Error(`Failed to establish therapist-client relationship: ${relationError.message}`)
      }

      await fetchClients()
      setShowAddClient(false)
      alert(
        `Client ${clientData.firstName} ${clientData.lastName} added successfully! Patient Code: ${patientCode}`
      )
    } catch (error) {
      console.error('Error adding client:', error)
      alert(error instanceof Error ? error.message : 'Error adding client to roster. Please try again.')
    }
  }

  const updateClientProfile = async (clientId: string, updates: ClientProfileExtras) => {
    try {
      const { error } = await supabase
        .from('client_profiles')
        .upsert({
          client_id: clientId,
          therapist_id: profile!.id,
          ...updates,
          updated_at: new Date().toISOString(),
        })

      if (error) throw error

      await fetchClients()
      setShowClientDetails(false)
    } catch (error) {
      console.error('Error updating client profile:', error)
      alert('Error updating profile. Please try again.')
    }
  }

  const header = useMemo(
    () => (
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Client Management</h2>
          <p className="text-gray-600">Manage your client roster and profiles</p>
        </div>
        <button
          onClick={() => setShowAddClient(true)}
          className="hidden sm:inline-flex items-center px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Client
        </button>
      </div>
    ),
    []
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-blue-600" />
      </div>
    )
  }

  if (errorMsg) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-red-600" />
          <span className="text-red-800">{errorMsg}</span>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 overflow-x-clip">
      {/* Header */}
      {header}

      {/* Mobile primary action */}
      <button
        onClick={() => setShowAddClient(true)}
        className="sm:hidden w-full inline-flex items-center justify-center rounded-lg bg-blue-600 text-white py-2"
      >
        <Plus className="w-4 h-4 mr-2" />
        Add Client
      </button>

      {/* Sticky Filters */}
      <div className="bg-white/80 rounded-lg shadow-sm border border-gray-200">
        <div className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search clients by name or email…"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 rounded-md border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Filter className="w-5 h-5 text-gray-400" />
              <select
                value={riskFilter}
                onChange={(e) => setRiskFilter(e.target.value)}
                className="rounded-md border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">All Risk Levels</option>
                <option value="low">Low Risk</option>
                <option value="moderate">Moderate Risk</option>
                <option value="high">High Risk</option>
                <option value="crisis">Crisis</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Empty state */}
      {filteredClients.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-10 text-center">
          <Users className="mx-auto h-12 w-12 text-gray-300" />
          <h3 className="mt-3 text-gray-900 font-medium">No clients found</h3>
          <p className="text-sm text-gray-600 mt-1">
            {searchTerm || riskFilter !== 'all'
              ? 'Try adjusting your search or filters.'
              : 'Add clients to your roster to get started.'}
          </p>
        </div>
      ) : (
        <>
          {/* Mobile card layout */}
          <div className="grid gap-4 sm:hidden">
            {filteredClients.map((client) => (
              <div key={client.id} className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                      <span className="text-sm font-semibold text-blue-700">
                        {client.first_name?.[0]}
                        {client.last_name?.[0]}
                      </span>
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">
                        {client.first_name} {client.last_name}
                      </div>
                      <div className="text-sm text-gray-600">{client.email}</div>
                    </div>
                  </div>
                  <span
                    className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${riskClassFromLevel(
                      client.profile?.risk_level
                    )}`}
                  >
                    {client.profile?.risk_level || 'low'}
                  </span>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-3 text-sm text-gray-600">
                  <div>
                    <div className="text-gray-500">Assessments</div>
                    <div className="font-medium">
                      {client.stats?.completedAssessments ?? 0}/{client.stats?.totalAssessments ?? 0}
                    </div>
                  </div>
                  <div>
                    <div className="text-gray-500">Last Session</div>
                    <div className="font-medium">{formatDate(client.stats?.lastSession)}</div>
                  </div>
                  <div>
                    <div className="text-gray-500">Next Appt</div>
                    <div className="font-medium">{formatDate(client.stats?.nextAppointment)}</div>
                  </div>
                  <div className="flex items-center gap-2 justify-end">
                    <button
                      onClick={() => {
                        setSelectedClient(client)
                        setShowClientDetails(true)
                      }}
                      className="inline-flex items-center rounded-md px-2 py-1 text-blue-700 hover:text-blue-900"
                    >
                      <Edit className="w-4 h-4 mr-1" />
                      Edit
                    </button>
                    <button className="inline-flex items-center rounded-md px-2 py-1 text-green-700 hover:text-green-900">
                      <Phone className="w-4 h-4" />
                    </button>
                    <button className="inline-flex items-center rounded-md px-2 py-1 text-purple-700 hover:text-purple-900">
                      <Mail className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop table */}
          <div className="hidden sm:block bg-white shadow-sm rounded-lg border border-gray-200">
  <div className="overflow-x-clip">
    <table className="w-full table-fixed divide-y divide-gray-200 text-[11px] sm:text-xs">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="w-1/3 px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
  Client
</th>
<th className="w-28 px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
  Risk Level
</th>
<th className="w-32 px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
  Assessments
</th>
<th className="w-36 px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
  Last Session
</th>
<th className="w-40 px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
  Next Appointment
</th>
<th className="w-28 px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
  Actions
</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredClients.map((client) => (
                    <tr key={client.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                            <span className="text-sm font-semibold text-blue-700">
                              {client.first_name?.[0]}
                              {client.last_name?.[0]}
                            </span>
                          </div>
                          <div className="ml-4 max-w-[14rem]">
  <div className="text-sm font-medium text-gray-900 truncate">
    {client.first_name} {client.last_name}
  </div>
  <div className="text-sm text-gray-600 truncate">{client.email}</div>
</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${riskClassFromLevel(
                            client.profile?.risk_level
                          )}`}
                        >
                          {client.profile?.risk_level || 'low'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {client.stats?.completedAssessments ?? 0}/{client.stats?.totalAssessments ?? 0}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {formatDate(client.stats?.lastSession)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {formatDate(client.stats?.nextAppointment)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              setSelectedClient(client)
                              setShowClientDetails(true)
                            }}
                            className="text-blue-700 hover:text-blue-900"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button className="text-green-700 hover:text-green-900">
                            <Phone className="w-4 h-4" />
                          </button>
                          <button className="text-purple-700 hover:text-purple-900">
                            <Mail className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Add Client Modal */}
      {showAddClient && (
        <AddClientModal onClose={() => setShowAddClient(false)} onAdd={addClientToRoster} />
      )}

      {/* Client Details Modal */}
      {showClientDetails && selectedClient && (
        <ClientDetailsModal
          client={selectedClient}
          onClose={() => setShowClientDetails(false)}
          onUpdate={updateClientProfile}
        />
      )}
    </div>
  )
}

/* ----------------------------- Add Client Modal ---------------------------- */

interface AddClientModalProps {
  onClose: () => void
  onAdd: (clientData: {
    firstName: string
    lastName: string
    email: string
    whatsappNumber: string
  }) => void
}

const AddClientModal: React.FC<AddClientModalProps> = ({ onClose, onAdd }) => {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    whatsappNumber: '',
  })
  const [patientCode, setPatientCode] = useState('')

  useEffect(() => {
    setPatientCode(generatePatientCode())
  }, [])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (formData.firstName && formData.lastName && formData.email && formData.whatsappNumber) {
      onAdd(formData)
    }
  }

  const handleChange = (field: string, value: string) =>
    setFormData((prev) => ({ ...prev, [field]: value }))

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-end justify-center px-4 pb-20 pt-4 text-center sm:block sm:p-0">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={onClose} />
        <div className="inline-block w-full max-w-lg transform overflow-hidden rounded-lg bg-white text-left align-bottom shadow-xl transition-all sm:my-8 sm:align-middle">
          <form onSubmit={handleSubmit}>
            <div className="bg-white px-6 pt-6 pb-4">
              <h3 className="text-lg font-medium text-gray-900">Create New Client Account</h3>

              <div className="mt-4 space-y-4">
                <div className="rounded-lg border border-blue-200 bg-blue-50 p-3">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-blue-900">Patient Code:</span>
                    <span className="rounded bg-white px-2 py-1 font-mono text-sm text-blue-700">
                      {patientCode}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-blue-700">
                    Auto-generated unique identifier for this client
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor="firstName" className="block text-sm font-medium text-gray-700">
                      First Name *
                    </label>
                    <input
                      id="firstName"
                      type="text"
                      value={formData.firstName}
                      onChange={(e) => handleChange('firstName', e.target.value)}
                      className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                  <div>
                    <label htmlFor="lastName" className="block text-sm font-medium text-gray-700">
                      Last Name *
                    </label>
                    <input
                      id="lastName"
                      type="text"
                      value={formData.lastName}
                      onChange={(e) => handleChange('lastName', e.target.value)}
                      className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                    Email Address *
                  </label>
                  <input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleChange('email', e.target.value)}
                    placeholder="client@example.com"
                    className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="whatsappNumber" className="block text-sm font-medium text-gray-700">
                    WhatsApp Number *
                  </label>
                  <input
                    id="whatsappNumber"
                    type="tel"
                    value={formData.whatsappNumber}
                    onChange={(e) => handleChange('whatsappNumber', e.target.value)}
                    placeholder="+1 (555) 123-4567"
                    className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
                  <p className="text-sm text-amber-800">
                    <strong>Note:</strong> The client will receive an email with their patient code and
                    instructions to set up their password.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 px-6 py-4 sm:flex sm:flex-row-reverse">
              <button
                type="submit"
                disabled={
                  !formData.firstName ||
                  !formData.lastName ||
                  !formData.email ||
                  !formData.whatsappNumber
                }
                className="inline-flex w-full justify-center rounded-md bg-blue-600 px-4 py-2 text-base font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 sm:ml-3 sm:w-auto sm:text-sm"
              >
                Create Client Account
              </button>
              <button
                type="button"
                onClick={onClose}
                className="mt-3 inline-flex w-full justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-base font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
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

/* --------------------------- Client Details Modal -------------------------- */

interface ClientDetailsModalProps {
  client: Client
  onClose: () => void
  onUpdate: (clientId: string, updates: ClientProfileExtras) => void
}

const ClientDetailsModal: React.FC<ClientDetailsModalProps> = ({ client, onClose, onUpdate }) => {
  const [formData, setFormData] = useState<ClientProfileExtras>({
    emergency_contact_name: client.profile?.emergency_contact_name || '',
    emergency_contact_phone: client.profile?.emergency_contact_phone || '',
    emergency_contact_relationship: client.profile?.emergency_contact_relationship || '',
    medical_history: client.profile?.medical_history || '',
    current_medications: client.profile?.current_medications || '',
    presenting_concerns: client.profile?.presenting_concerns || '',
    therapy_history: client.profile?.therapy_history || '',
    risk_level: client.profile?.risk_level || 'low',
    notes: client.profile?.notes || '',
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onUpdate(client.id, formData)
  }

  const handleChange = (field: keyof ClientProfileExtras, value: string) =>
    setFormData((prev) => ({ ...prev, [field]: value }))

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-end justify-center px-4 pb-20 pt-4 text-center sm:block sm:p-0">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={onClose} />
        <div className="inline-block w-full max-w-4xl transform overflow-hidden rounded-lg bg-white text-left align-bottom shadow-xl transition-all sm:my-8 sm:align-middle">
          <form onSubmit={handleSubmit}>
            <div className="bg-white px-6 pt-6 pb-4">
              <div className="mb-6 flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-900">
                  Client Profile: {client.first_name} {client.last_name}
                </h3>
                <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600" aria-label="Close">
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="grid max-h-96 grid-cols-1 gap-6 overflow-y-auto md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">Emergency Contact Name</label>
                  <input
                    type="text"
                    value={formData.emergency_contact_name}
                    onChange={(e) => handleChange('emergency_contact_name', e.target.value)}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">Emergency Contact Phone</label>
                  <input
                    type="tel"
                    value={formData.emergency_contact_phone}
                    onChange={(e) => handleChange('emergency_contact_phone', e.target.value)}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">Relationship</label>
                  <input
                    type="text"
                    value={formData.emergency_contact_relationship}
                    onChange={(e) => handleChange('emergency_contact_relationship', e.target.value)}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">Risk Level</label>
                  <select
                    value={formData.risk_level}
                    onChange={(e) => handleChange('risk_level', e.target.value)}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="low">Low Risk</option>
                    <option value="moderate">Moderate Risk</option>
                    <option value="high">High Risk</option>
                    <option value="crisis">Crisis</option>
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="mb-2 block text-sm font-medium text-gray-700">Presenting Concerns</label>
                  <textarea
                    rows={3}
                    value={formData.presenting_concerns}
                    onChange={(e) => handleChange('presenting_concerns', e.target.value)}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="mb-2 block text-sm font-medium text-gray-700">Medical History</label>
                  <textarea
                    rows={3}
                    value={formData.medical_history}
                    onChange={(e) => handleChange('medical_history', e.target.value)}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="mb-2 block text-sm font-medium text-gray-700">Current Medications</label>
                  <textarea
                    rows={2}
                    value={formData.current_medications}
                    onChange={(e) => handleChange('current_medications', e.target.value)}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="mb-2 block text-sm font-medium text-gray-700">Therapy History</label>
                  <textarea
                    rows={3}
                    value={formData.therapy_history}
                    onChange={(e) => handleChange('therapy_history', e.target.value)}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="mb-2 block text-sm font-medium text-gray-700">Clinical Notes</label>
                  <textarea
                    rows={4}
                    value={formData.notes}
                    onChange={(e) => handleChange('notes', e.target.value)}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>

            <div className="bg-gray-50 px-6 py-4 sm:flex sm:flex-row-reverse">
              <button
                type="submit"
                className="inline-flex w-full justify-center rounded-md bg-blue-600 px-4 py-2 text-base font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 sm:ml-3 sm:w-auto sm:text-sm"
              >
                Update Profile
              </button>
              <button
                type="button"
                onClick={onClose}
                className="mt-3 inline-flex w-full justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-base font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
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

export default ClientManagement
