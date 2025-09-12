// src/components/therapist/ClientManagement.tsx
import React, { useEffect, useMemo, useState, useCallback } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { generatePatientCode, isRecursionError, formatDate } from '../../utils/helpers'
import {
  Users,
  Plus,
  Search,
  LayoutGrid,
  List as ListIcon,
  User as UserIcon,
  AlertTriangle,
  ExternalLink,
  MessageSquarePlus
} from 'lucide-react'

/* ============================= Types ============================= */

interface Client {
  id: string
  first_name: string
  last_name: string
  email: string
  created_at: string
}

type ViewMode = 'list' | 'grid'

/* ============================= Component ============================= */

export const ClientManagement: React.FC = () => {
  const [clients, setClients] = useState<Client[]>([])
  const [assignedClientIds, setAssignedClientIds] = useState<Set<string>>(new Set())
  const [clientCaseIdsByClient, setClientCaseIdsByClient] = useState<Record<string, string[]>>({})
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedClient, setSelectedClient] = useState<Client | null>(null)
  const [showAddClient, setShowAddClient] = useState(false)
  const [showQuickProfile, setShowQuickProfile] = useState(false)
  const [loading, setLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<ViewMode>('grid')

  const { profile } = useAuth()

  const fetchEverything = useCallback(async () => {
    if (!profile) {
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setErrorMsg(null)

      // 1) All clients in the database (privacy handled in UI)
      const { data: allClients, error: profilesErr } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, email, created_at')
        .eq('role', 'client')
        .order('created_at', { ascending: false })

      if (profilesErr) throw profilesErr

      // 2) Which clients are assigned to this therapist
      const { data: relations, error: relErr } = await supabase
        .from('therapist_client_relations')
        .select('client_id')
        .eq('therapist_id', profile.id)

      if (relErr && !isRecursionError(relErr)) {
        console.warn('Error fetching relations:', relErr)
      }

      const assigned = new Set<string>((relations || []).map(r => r.client_id))

      // 3) Active cases for this therapist (to show case IDs in the quick profile)
      const { data: myCases, error: casesErr } = await supabase
        .from('cases')
        .select('id, client_id, status')
        .eq('therapist_id', profile.id)
        .in('status', ['active', 'open', 'ongoing']) // adjust to your statuses
      if (casesErr && !isRecursionError(casesErr)) {
        console.warn('Error fetching cases:', casesErr)
      }

      const byClient: Record<string, string[]> = {}
      ;(myCases || []).forEach(c => {
        if (!byClient[c.client_id]) byClient[c.client_id] = []
        byClient[c.client_id].push(String(c.id))
      })

      setClients(allClients || [])
      setAssignedClientIds(assigned)
      setClientCaseIdsByClient(byClient)
    } catch (err) {
      console.error('Error fetching clients overview:', err)
      setErrorMsg('Failed to load clients. Please try again.')
      setClients([])
      setAssignedClientIds(new Set())
      setClientCaseIdsByClient({})
    } finally {
      setLoading(false)
    }
  }, [profile])

  useEffect(() => {
    fetchEverything()
  }, [fetchEverything])

  const filteredClients = useMemo(() => {
    const q = searchTerm.trim().toLowerCase()
    if (!q) return clients
    return clients.filter(c =>
      `${c.first_name} ${c.last_name}`.toLowerCase().includes(q)
      || (c.email || '').toLowerCase().includes(q)
    )
  }, [clients, searchTerm])

  /* ============================= Actions ============================= */

  const sendConsentRequest = async (clientId: string) => {
    if (!profile) return
    try {
      // Use your own schema here if different
      const { error } = await supabase.from('form_assignments').insert({
        therapist_id: profile.id,
        client_id: clientId,
        form_type: 'case_consent', // <-- adjust if your schema uses something else (e.g., form_slug)
        status: 'pending',
        assigned_at: new Date().toISOString()
      })
      if (error) throw error
      alert('Consent request sent.')
    } catch (e) {
      console.error('Failed to send consent request:', e)
      alert('Could not send consent request. Check configuration.')
    }
  }

  const openQuickProfile = (client: Client) => {
    setSelectedClient(client)
    setShowQuickProfile(true)
  }

  /* ============================= Header ============================= */

  const header = (
    <div className="flex items-center justify-between">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Client Directory</h2>
        <p className="text-gray-600">
          Browse all clients. Contact details stay hidden unless the client accepts your case request.
        </p>
      </div>

      <div className="flex items-center gap-2">
        <div className="hidden sm:flex items-center rounded-md border border-gray-200 overflow-hidden">
          <button
            onClick={() => setViewMode('grid')}
            className={`px-3 py-2 text-sm flex items-center gap-1 ${viewMode === 'grid' ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-50'}`}
            title="Cards view"
          >
            <LayoutGrid className="w-4 h-4" /> Cards
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`px-3 py-2 text-sm flex items-center gap-1 ${viewMode === 'list' ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-50'}`}
            title="List view"
          >
            <ListIcon className="w-4 h-4" /> List
          </button>
        </div>

        <button
          onClick={() => setShowAddClient(true)}
          className="hidden sm:inline-flex items-center px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Client
        </button>
      </div>
    </div>
  )

  /* ============================= UI ============================= */

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

      {/* Mobile primary action + view toggle */}
      <div className="sm:hidden flex items-center justify-between">
        <button
          onClick={() => setShowAddClient(true)}
          className="inline-flex items-center justify-center rounded-lg bg-blue-600 text-white py-2 px-3"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Client
        </button>
        <div className="flex items-center rounded-md border border-gray-200 overflow-hidden">
          <button
            onClick={() => setViewMode('grid')}
            className={`px-2 py-2 text-sm ${viewMode === 'grid' ? 'bg-blue-50 text-blue-700' : 'text-gray-600'}`}
            title="Cards"
          >
            <LayoutGrid className="w-4 h-4" />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`px-2 py-2 text-sm ${viewMode === 'list' ? 'bg-blue-50 text-blue-700' : 'text-gray-600'}`}
            title="List"
          >
            <ListIcon className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white/80 rounded-lg shadow-sm border border-gray-200">
        <div className="p-4">
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
      </div>

      {/* Empty state */}
      {filteredClients.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-10 text-center">
          <Users className="mx-auto h-12 w-12 text-gray-300" />
          <h3 className="mt-3 text-gray-900 font-medium">No clients found</h3>
          <p className="text-sm text-gray-600 mt-1">Try adjusting your search.</p>
        </div>
      ) : (
        <>
          {viewMode === 'grid' ? (
            /* ------------------------ Cards (Boxes) View ------------------------ */
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredClients.map((client) => {
                const assigned = assignedClientIds.has(client.id)
                return (
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
                          <div className="text-xs text-gray-500">
                            Joined {formatDate(client.created_at)}
                          </div>
                        </div>
                      </div>
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                        assigned ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
                      }`}>
                        {assigned ? 'Assigned to you' : 'Not assigned'}
                      </span>
                    </div>

                    {/* Privacy: contact info hidden unless assigned */}
                    <div className="mt-3 text-sm">
                      <div className="text-gray-500">Email</div>
                      <div className="font-medium text-gray-900">
                        {assigned ? client.email : 'Hidden until consent'}
                      </div>
                    </div>

                    <div className="mt-4 flex items-center gap-3">
                      <button
                        onClick={() => openQuickProfile(client)}
                        className="inline-flex items-center gap-2 rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
                        title="Open profile"
                      >
                        <UserIcon className="w-4 h-4" />
                        Open Profile
                      </button>

                      <button
                        onClick={() => sendConsentRequest(client.id)}
                        className="inline-flex items-center gap-2 rounded-md bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 text-sm"
                        title="Send consent"
                      >
                        <MessageSquarePlus className="w-4 h-4" />
                        Send Consent
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            /* --------------------------- List/Table View --------------------------- */
            <div className="bg-white shadow-sm rounded-lg border border-gray-200">
              <div className="overflow-x-auto">
                <table className="min-w-full table-fixed divide-y divide-gray-200 text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="w-1/2 px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Client
                      </th>
                      <th className="w-1/4 px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Assignment
                      </th>
                      <th className="w-1/4 px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredClients.map((client) => {
                      const assigned = assignedClientIds.has(client.id)
                      return (
                        <tr key={client.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3">
                            <div className="flex items-center">
                              <div className="h-9 w-9 rounded-full bg-blue-100 flex items-center justify-center">
                                <span className="text-xs font-semibold text-blue-700">
                                  {client.first_name?.[0]}
                                  {client.last_name?.[0]}
                                </span>
                              </div>
                              <div className="ml-3">
                                <div className="text-sm font-medium text-gray-900">
                                  {client.first_name} {client.last_name}
                                </div>
                                <div className="text-xs text-gray-500">
                                  Joined {formatDate(client.created_at)}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                              assigned ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
                            }`}>
                              {assigned ? 'Assigned to you' : 'Not assigned'}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <button
                                onClick={() => openQuickProfile(client)}
                                className="inline-flex items-center gap-1 text-blue-700 hover:text-blue-900"
                                title="Open Profile"
                              >
                                <ExternalLink className="w-4 h-4" />
                                Open Profile
                              </button>
                              <button
                                onClick={() => sendConsentRequest(client.id)}
                                className="inline-flex items-center gap-1 text-indigo-700 hover:text-indigo-900"
                                title="Send Consent"
                              >
                                <MessageSquarePlus className="w-4 h-4" />
                                Send Consent
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* Add Client Modal */}
      {showAddClient && (
        <AddClientModal onClose={() => setShowAddClient(false)} onAdd={async (d) => {
          await addClientToRoster(d, profile!.id)
          await fetchEverything()
        }} />
      )}

      {/* Quick Profile Modal */}
      {showQuickProfile && selectedClient && (
        <QuickProfileModal
          client={selectedClient}
          assigned={assignedClientIds.has(selectedClient.id)}
          caseIds={clientCaseIdsByClient[selectedClient.id] || []}
          onClose={() => setShowQuickProfile(false)}
        />
      )}
    </div>
  )
}

/* ============================= Helpers (create client) ============================= */

const addClientToRoster = async (
  clientData: { firstName: string; lastName: string; email: string; whatsappNumber: string },
  therapistId: string
) => {
  try {
    const patientCode = generatePatientCode()
    // 1) create profile
    const { data: p, error: profileError } = await supabase
      .from('profiles')
      .insert({
        id: crypto.randomUUID(),
        role: 'client',
        first_name: clientData.firstName,
        last_name: clientData.lastName,
        email: clientData.email,
        whatsapp_number: clientData.whatsappNumber,
        patient_code: patientCode,
        created_by_therapist: therapistId,
        password_set: false,
      })
      .select('id')
      .single()

    if (profileError) throw profileError
    const clientId = p?.id
    if (!clientId) throw new Error('Missing client id after insert')

    // 2) link therapist-client (optional early assignment)
    const { error: relationError } = await supabase
      .from('therapist_client_relations')
      .insert({ therapist_id: therapistId, client_id: clientId })
    if (relationError && !String(relationError.message || '').includes('duplicate key')) {
      throw relationError
    }

    alert(`Client ${clientData.firstName} ${clientData.lastName} added successfully!`)
  } catch (error) {
    console.error('Error adding client:', error)
    alert('Error adding client to roster. Please try again.')
  }
}

/* ============================= Add Client Modal ============================= */

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
      onClose()
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
                disabled={!formData.firstName || !formData.lastName || !formData.email || !formData.whatsappNumber}
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

/* ============================= Quick Profile Modal ============================= */

const QuickProfileModal: React.FC<{
  client: Client
  assigned: boolean
  caseIds: string[]
  onClose: () => void
}> = ({ client, assigned, caseIds, onClose }) => {
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-end justify-center px-4 pb-20 pt-4 text-center sm:block sm:p-0">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={onClose} />
        <div className="inline-block w-full max-w-lg transform overflow-hidden rounded-lg bg-white text-left align-bottom shadow-xl transition-all sm:my-8 sm:align-middle">
          <div className="bg-white px-6 pt-6 pb-4">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
                <span className="text-base font-semibold text-blue-700">
                  {client.first_name?.[0]}
                  {client.last_name?.[0]}
                </span>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  {client.first_name} {client.last_name}
                </h3>
                <p className="text-xs text-gray-500">Joined {formatDate(client.created_at)}</p>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-3">
              <div>
                <div className="text-xs text-gray-500">Email</div>
                <div className="text-sm font-medium text-gray-900">
                  {assigned ? client.email : 'Hidden until consent'}
                </div>
              </div>

              <div>
                <div className="text-xs text-gray-500">Assignment</div>
                <div className="text-sm">
                  {assigned ? (
                    <span className="inline-flex items-center px-2 py-1 text-xs rounded-full bg-green-100 text-green-800">
                      Assigned to you
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-700">
                      Not assigned
                    </span>
                  )}
                </div>
              </div>

              {/* Only show case IDs belonging to THIS therapist */}
              {assigned && (
                <div>
                  <div className="text-xs text-gray-500">Your Active Case IDs</div>
                  {caseIds.length > 0 ? (
                    <div className="flex flex-wrap gap-2 mt-1">
                      {caseIds.map((id) => (
                        <span key={id} className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded-md">
                          #{id}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <div className="text-sm text-gray-600 mt-1">No active cases for this client.</div>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="bg-gray-50 px-6 py-4 sm:flex sm:flex-row-reverse">
            <button
              type="button"
              onClick={onClose}
              className="inline-flex w-full justify-center rounded-md bg-blue-600 px-4 py-2 text-base font-medium text-white shadow-sm hover:bg-blue-700 sm:ml-3 sm:w-auto sm:text-sm"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ClientManagement
