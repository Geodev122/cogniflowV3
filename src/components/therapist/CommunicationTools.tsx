import React, { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { formatDateTime } from '../../utils/helpers'
import { 
  MessageSquare, 
  Send, 
  Phone, 
  Mail, 
  Search, 
  Filter,
  User,
  Clock,
  CheckCircle,
  AlertTriangle,
  Plus
} from 'lucide-react'

interface CommunicationLog {
  id: string
  client_id: string
  communication_type: 'email' | 'phone' | 'text' | 'in_person' | 'crisis' | 'reminder'
  subject?: string
  content?: string
  direction: 'outgoing' | 'incoming'
  status: 'draft' | 'sent' | 'delivered' | 'read' | 'failed'
  created_at: string
  client: {
    first_name: string
    last_name: string
    email: string
  }
}

export const CommunicationTools: React.FC = () => {
  const [communications, setCommunications] = useState<CommunicationLog[]>([])
  const [clients, setClients] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showNewMessage, setShowNewMessage] = useState(false)
  const [typeFilter, setTypeFilter] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')
  const { profile } = useAuth()

  useEffect(() => {
    if (profile) {
      fetchCommunications()
      fetchClients()
    }
  }, [profile])

  const fetchCommunications = async () => {
    if (!profile) return

    try {
      setError(null)
      const { data, error } = await supabase
        .from('communication_logs')
        .select('*')
        .eq('therapist_id', profile.id)
        .order('created_at', { ascending: false })

      if (error) throw error

      // Get client data
      const clientIds = [...new Set(data?.map(c => c.client_id) || [])]
      if (clientIds.length > 0) {
        const { data: clientData } = await supabase
          .from('profiles')
          .select('id, first_name, last_name, email')
          .in('id', clientIds)

        const communicationsWithClients = data?.map(comm => ({
          ...comm,
          client: clientData?.find(c => c.id === comm.client_id) || {
            first_name: 'Unknown',
            last_name: 'Client',
            email: 'unknown@example.com'
          }
        })) || []

        setCommunications(communicationsWithClients)
      } else {
        setCommunications([])
      }
    } catch (error) {
      console.error('Error fetching communications:', error)
      setError('Failed to load communications')
      setCommunications([])
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
          .select('id, first_name, last_name, email, whatsapp_number')
          .in('id', clientIds)

        setClients(clientData || [])
      }
    } catch (error) {
      console.error('Error fetching clients:', error)
      setClients([])
    }
  }

  const sendMessage = async (messageData: any) => {
    try {
      const { error } = await supabase
        .from('communication_logs')
        .insert({
          therapist_id: profile!.id,
          client_id: messageData.clientId,
          communication_type: messageData.type,
          subject: messageData.subject,
          content: messageData.content,
          direction: 'outgoing',
          status: 'sent'
        })

      if (error) throw error

      await fetchCommunications()
      setShowNewMessage(false)
    } catch (error) {
      console.error('Error sending message:', error)
      alert('Error sending message')
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'email': return <Mail className="w-4 h-4" />
      case 'phone': return <Phone className="w-4 h-4" />
      case 'text': return <MessageSquare className="w-4 h-4" />
      default: return <MessageSquare className="w-4 h-4" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'sent': return 'text-blue-600 bg-blue-100'
      case 'delivered': return 'text-green-600 bg-green-100'
      case 'read': return 'text-purple-600 bg-purple-100'
      case 'failed': return 'text-red-600 bg-red-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  const filteredCommunications = communications.filter(comm => {
    const matchesType = typeFilter === 'all' || comm.communication_type === typeFilter
    const matchesSearch = `${comm.client.first_name} ${comm.client.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (comm.subject || '').toLowerCase().includes(searchTerm.toLowerCase())
    return matchesType && matchesSearch
  })

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
          <h2 className="text-2xl font-bold text-gray-900">Communication Tools</h2>
          <p className="text-gray-600">Manage client communications and message history</p>
        </div>
        <button
          onClick={() => setShowNewMessage(true)}
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus className="w-4 h-4 mr-2" />
          New Message
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search communications..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Filter className="w-5 h-5 text-gray-400" />
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Types</option>
              <option value="email">Email</option>
              <option value="phone">Phone</option>
              <option value="text">Text/WhatsApp</option>
              <option value="reminder">Reminders</option>
            </select>
          </div>
        </div>
      </div>

      {/* Communications List */}
      <div className="bg-white shadow-sm rounded-lg border border-gray-200">
        {filteredCommunications.length === 0 ? (
          <div className="text-center py-12">
            <MessageSquare className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No communications yet</h3>
            <p className="mt-1 text-sm text-gray-500">
              Start communicating with your clients to see the history here.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {filteredCommunications.map((comm) => (
              <div key={comm.id} className="p-6 hover:bg-gray-50">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-4">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                      {getTypeIcon(comm.communication_type)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <h4 className="font-medium text-gray-900">
                          {comm.client.first_name} {comm.client.last_name}
                        </h4>
                        <span className="text-sm text-gray-500">•</span>
                        <span className="text-sm text-gray-500 capitalize">{comm.communication_type}</span>
                      </div>
                      {comm.subject && (
                        <p className="text-sm font-medium text-gray-700 mb-1">{comm.subject}</p>
                      )}
                      {comm.content && (
                        <p className="text-sm text-gray-600 line-clamp-2">{comm.content}</p>
                      )}
                      <p className="text-xs text-gray-500 mt-2">{formatDateTime(comm.created_at)}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(comm.status)}`}>
                      {comm.status}
                    </span>
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                      comm.direction === 'outgoing' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
                    }`}>
                      {comm.direction}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* New Message Modal */}
      {showNewMessage && (
        <NewMessageModal
          clients={clients}
          onClose={() => setShowNewMessage(false)}
          onSend={sendMessage}
        />
      )}
    </div>
  )
}

// New Message Modal Component
interface NewMessageModalProps {
  clients: any[]
  onClose: () => void
  onSend: (messageData: any) => void
}

const NewMessageModal: React.FC<NewMessageModalProps> = ({ clients, onClose, onSend }) => {
  const [formData, setFormData] = useState({
    clientId: '',
    type: 'email',
    subject: '',
    content: ''
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (formData.clientId && formData.content) {
      onSend(formData)
    }
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={onClose} />
        
        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full">
          <form onSubmit={handleSubmit}>
            <div className="bg-white px-6 pt-6 pb-4">
              <h3 className="text-lg font-medium text-gray-900 mb-6">Send Message</h3>
              
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
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
                    <label className="block text-sm font-medium text-gray-700 mb-2">Type</label>
                    <select
                      value={formData.type}
                      onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value }))}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="email">Email</option>
                      <option value="text">WhatsApp</option>
                      <option value="phone">Phone Call</option>
                      <option value="reminder">Reminder</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Subject</label>
                  <input
                    type="text"
                    value={formData.subject}
                    onChange={(e) => setFormData(prev => ({ ...prev, subject: e.target.value }))}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Message subject"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Message</label>
                  <textarea
                    value={formData.content}
                    onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    rows={6}
                    placeholder="Type your message here..."
                    required
                  />
                </div>
              </div>
            </div>
            
            <div className="bg-gray-50 px-6 py-4 sm:flex sm:flex-row-reverse">
              <button
                type="submit"
                disabled={!formData.clientId || !formData.content}
                className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50"
              >
                <Send className="w-4 h-4 mr-2" />
                Send Message
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