import React, { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import {
  ClipboardList, Plus, Search, Filter, Eye, Edit, Trash2, 
  Calendar, User, Clock, AlertTriangle, Play, CheckCircle,
  FileText, BarChart3, Target, Brain, Heart, Users, Send,
  Download, ExternalLink, RefreshCw, X, ArrowRight
} from 'lucide-react'

interface Assessment {
  id: string
  name: string
  description: string
  category: string
  type: 'questionnaire' | 'scale' | 'inventory' | 'test'
  duration_minutes: number
  questions_count: number
  scoring_method: string
  is_active: boolean
  created_at: string
}

interface AssessmentInstance {
  id: string
  assessment_id: string
  client_id: string
  therapist_id: string
  status: 'assigned' | 'in_progress' | 'completed' | 'cancelled'
  assigned_at: string
  started_at?: string
  completed_at?: string
  score?: number
  interpretation?: string
  notes?: string
  assessment: Assessment
  client: {
    first_name: string
    last_name: string
    email: string
  }
}

interface Client {
  id: string
  first_name: string
  last_name: string
  email: string
}

const AssessmentWorkspace: React.FC<{ onClose?: () => void }> = ({ onClose }) => {
  const { profile } = useAuth()
  const [activeTab, setActiveTab] = useState<'library' | 'assigned' | 'results' | 'analytics'>('library')
  
  // Library state
  const [assessments, setAssessments] = useState<Assessment[]>([])
  const [filteredAssessments, setFilteredAssessments] = useState<Assessment[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  
  // Assigned assessments state
  const [instances, setInstances] = useState<AssessmentInstance[]>([])
  const [filteredInstances, setFilteredInstances] = useState<AssessmentInstance[]>([])
  const [statusFilter, setStatusFilter] = useState('all')
  
  // Clients for assignment
  const [clients, setClients] = useState<Client[]>([])
  
  // Modal states
  const [showAssignModal, setShowAssignModal] = useState(false)
  const [selectedAssessment, setSelectedAssessment] = useState<Assessment | null>(null)
  const [selectedInstance, setSelectedInstance] = useState<AssessmentInstance | null>(null)
  const [showResultModal, setShowResultModal] = useState(false)
  
  // Loading states
  const [loading, setLoading] = useState(true)
  const [assigning, setAssigning] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (profile?.role === 'therapist') {
      fetchData()
    }
  }, [profile])

  useEffect(() => {
    filterAssessments()
  }, [assessments, searchTerm, categoryFilter])

  useEffect(() => {
    filterInstances()
  }, [instances, statusFilter])

  const fetchData = async () => {
    setLoading(true)
    setError(null)

    try {
      await Promise.all([
        fetchAssessments(),
        fetchInstances(),
        fetchClients()
      ])
    } catch (err: any) {
      console.error('Error fetching assessment data:', err)
      setError('Failed to load assessment data')
    } finally {
      setLoading(false)
    }
  }

  const fetchAssessments = async () => {
    const { data, error } = await supabase
      .from('assessments')
      .select('*')
      .eq('is_active', true)
      .order('name')

    if (error) throw error
    setAssessments(data || [])
  }

  const fetchInstances = async () => {
    if (!profile) return

    const { data, error } = await supabase
      .from('assessment_instances')
      .select(`
        *,
        assessment:assessments(*),
        client:profiles!assessment_instances_client_id_fkey(first_name, last_name, email)
      `)
      .eq('therapist_id', profile.id)
      .order('assigned_at', { ascending: false })

    if (error) throw error
    setInstances(data || [])
  }

  const fetchClients = async () => {
    if (!profile) return

    const { data, error } = await supabase
      .from('therapist_client_relations')
      .select(`
        client:profiles!therapist_client_relations_client_id_fkey(
          id, first_name, last_name, email
        )
      `)
      .eq('therapist_id', profile.id)

    if (error) throw error
    
    const clientList = data?.map(relation => relation.client).filter(Boolean) || []
    setClients(clientList)
  }

  const filterAssessments = () => {
    let filtered = assessments

    if (searchTerm) {
      filtered = filtered.filter(assessment =>
        assessment.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        assessment.description.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    if (categoryFilter !== 'all') {
      filtered = filtered.filter(assessment => assessment.category === categoryFilter)
    }

    setFilteredAssessments(filtered)
  }

  const filterInstances = () => {
    let filtered = instances

    if (statusFilter !== 'all') {
      filtered = filtered.filter(instance => instance.status === statusFilter)
    }

    setFilteredInstances(filtered)
  }

  const assignAssessment = async (assessmentId: string, clientId: string, notes?: string) => {
    if (!profile) return

    setAssigning(true)
    try {
      const { error } = await supabase
        .from('assessment_instances')
        .insert({
          assessment_id: assessmentId,
          client_id: clientId,
          therapist_id: profile.id,
          status: 'assigned',
          notes
        })

      if (error) throw error

      await fetchInstances()
      setShowAssignModal(false)
      setSelectedAssessment(null)
      alert('Assessment assigned successfully!')
    } catch (err: any) {
      console.error('Error assigning assessment:', err)
      alert('Failed to assign assessment')
    } finally {
      setAssigning(false)
    }
  }

  const getCategoryIcon = (category: string) => {
    const icons: Record<string, React.FC<any>> = {
      'depression': Brain,
      'anxiety': Heart,
      'personality': User,
      'cognitive': Brain,
      'behavioral': Target,
      'trauma': AlertTriangle,
      'substance': FileText,
      'relationship': Users
    }
    return icons[category] || ClipboardList
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'assigned': return 'bg-blue-100 text-blue-700'
      case 'in_progress': return 'bg-yellow-100 text-yellow-700'
      case 'completed': return 'bg-green-100 text-green-700'
      case 'cancelled': return 'bg-red-100 text-red-700'
      default: return 'bg-gray-100 text-gray-700'
    }
  }

  const renderLibrary = () => (
    <div className="space-y-6">
      {/* Search and Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search assessments..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">All Categories</option>
            <option value="depression">Depression</option>
            <option value="anxiety">Anxiety</option>
            <option value="personality">Personality</option>
            <option value="cognitive">Cognitive</option>
            <option value="behavioral">Behavioral</option>
            <option value="trauma">Trauma</option>
            <option value="substance">Substance Use</option>
            <option value="relationship">Relationship</option>
          </select>
        </div>
      </div>

      {/* Assessment Library */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Assessment Library</h3>
          <div className="text-sm text-gray-600">
            {filteredAssessments.length} assessment{filteredAssessments.length !== 1 ? 's' : ''}
          </div>
        </div>

        {filteredAssessments.length === 0 ? (
          <div className="text-center py-12">
            <ClipboardList className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <h4 className="text-lg font-medium text-gray-900 mb-2">No assessments found</h4>
            <p className="text-gray-600">Try adjusting your search or filters</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredAssessments.map((assessment) => (
              <AssessmentCard
                key={assessment.id}
                assessment={assessment}
                onAssign={() => {
                  setSelectedAssessment(assessment)
                  setShowAssignModal(true)
                }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )

  const renderAssigned = () => (
    <div className="space-y-6">
      {/* Status Filter */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Assigned Assessments</h3>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">All Status</option>
            <option value="assigned">Assigned</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      {/* Instances List */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        {filteredInstances.length === 0 ? (
          <div className="text-center py-12">
            <ClipboardList className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <h4 className="text-lg font-medium text-gray-900 mb-2">No assigned assessments</h4>
            <p className="text-gray-600 mb-4">Start by assigning assessments to your clients</p>
            <button
              onClick={() => setActiveTab('library')}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <Plus className="w-4 h-4" />
              Browse Library
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredInstances.map((instance) => (
              <InstanceCard
                key={instance.id}
                instance={instance}
                onViewResult={() => {
                  setSelectedInstance(instance)
                  setShowResultModal(true)
                }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )

  const renderResults = () => (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Assessment Results</h3>
        
        {instances.filter(i => i.status === 'completed').length === 0 ? (
          <div className="text-center py-12">
            <BarChart3 className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <h4 className="text-lg font-medium text-gray-900 mb-2">No completed assessments</h4>
            <p className="text-gray-600">Results will appear here once assessments are completed</p>
          </div>
        ) : (
          <div className="space-y-4">
            {instances
              .filter(i => i.status === 'completed')
              .map((instance) => (
                <div key={instance.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h4 className="font-semibold text-gray-900">{instance.assessment.name}</h4>
                      <p className="text-sm text-gray-600">
                        {instance.client.first_name} {instance.client.last_name}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-blue-600">
                        {instance.score ? `${instance.score}%` : 'N/A'}
                      </div>
                      <div className="text-xs text-gray-500">
                        {instance.completed_at && new Date(instance.completed_at).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                  
                  {instance.interpretation && (
                    <div className="mb-3">
                      <h5 className="text-sm font-medium text-gray-700 mb-1">Interpretation</h5>
                      <p className="text-sm text-gray-600">{instance.interpretation}</p>
                    </div>
                  )}
                  
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setSelectedInstance(instance)
                        setShowResultModal(true)
                      }}
                      className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
                    >
                      View Details
                    </button>
                    <button className="px-3 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm">
                      <Download className="w-4 h-4 inline mr-1" />
                      Export
                    </button>
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  )

  const renderAnalytics = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-xl border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Assigned</p>
              <p className="text-3xl font-bold text-blue-600">{instances.length}</p>
            </div>
            <ClipboardList className="w-8 h-8 text-blue-600" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Completed</p>
              <p className="text-3xl font-bold text-green-600">
                {instances.filter(i => i.status === 'completed').length}
              </p>
            </div>
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">In Progress</p>
              <p className="text-3xl font-bold text-yellow-600">
                {instances.filter(i => i.status === 'in_progress').length}
              </p>
            </div>
            <Clock className="w-8 h-8 text-yellow-600" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Completion Rate</p>
              <p className="text-3xl font-bold text-purple-600">
                {instances.length > 0 
                  ? Math.round((instances.filter(i => i.status === 'completed').length / instances.length) * 100)
                  : 0}%
              </p>
            </div>
            <Target className="w-8 h-8 text-purple-600" />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Assessment Analytics</h3>
        <div className="h-64 flex items-center justify-center text-gray-500">
          <div className="text-center">
            <BarChart3 className="w-12 h-12 text-gray-300 mx-auto mb-2" />
            <p>Analytics dashboard coming soon</p>
          </div>
        </div>
      </div>
    </div>
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-red-600" />
          <span className="text-red-800">{error}</span>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-xl p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold mb-2">Assessment Workspace</h2>
            <p className="text-purple-100">Manage psychological assessments and evaluations</p>
          </div>
          <div className="flex items-center gap-3">
            <ClipboardList className="w-12 h-12 text-purple-200" />
            {onClose && (
              <button
                onClick={onClose}
                className="p-2 text-purple-200 hover:text-white hover:bg-purple-700 rounded-lg"
              >
                <X className="w-6 h-6" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            {[
              { id: 'library', name: 'Library', icon: ClipboardList },
              { id: 'assigned', name: 'Assigned', icon: Send },
              { id: 'results', name: 'Results', icon: BarChart3 },
              { id: 'analytics', name: 'Analytics', icon: Target }
            ].map((tab) => {
              const Icon = tab.icon
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === tab.id
                      ? 'border-purple-500 text-purple-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.name}
                </button>
              )
            })}
          </nav>
        </div>

        <div className="p-6">
          {activeTab === 'library' && renderLibrary()}
          {activeTab === 'assigned' && renderAssigned()}
          {activeTab === 'results' && renderResults()}
          {activeTab === 'analytics' && renderAnalytics()}
        </div>
      </div>

      {/* Assign Assessment Modal */}
      {showAssignModal && selectedAssessment && (
        <AssignModal
          assessment={selectedAssessment}
          clients={clients}
          onClose={() => {
            setShowAssignModal(false)
            setSelectedAssessment(null)
          }}
          onAssign={assignAssessment}
          assigning={assigning}
        />
      )}

      {/* Result Detail Modal */}
      {showResultModal && selectedInstance && (
        <ResultModal
          instance={selectedInstance}
          onClose={() => {
            setShowResultModal(false)
            setSelectedInstance(null)
          }}
        />
      )}
    </div>
  )
}

// Assessment Card Component
const AssessmentCard: React.FC<{
  assessment: Assessment
  onAssign: () => void
}> = ({ assessment, onAssign }) => {
  const CategoryIcon = getCategoryIcon(assessment.category)

  return (
    <div className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <CategoryIcon className="w-5 h-5 text-purple-600" />
          <span className="text-xs text-gray-600 uppercase tracking-wide">
            {assessment.category}
          </span>
        </div>
        <span className="text-xs text-gray-500">{assessment.type}</span>
      </div>

      <h4 className="font-semibold text-gray-900 mb-2">{assessment.name}</h4>
      <p className="text-sm text-gray-600 mb-3 line-clamp-2">{assessment.description}</p>

      <div className="flex items-center justify-between mb-3 text-sm text-gray-600">
        <div className="flex items-center gap-1">
          <Clock className="w-4 h-4" />
          {assessment.duration_minutes}min
        </div>
        <div className="flex items-center gap-1">
          <FileText className="w-4 h-4" />
          {assessment.questions_count} questions
        </div>
      </div>

      <button
        onClick={onAssign}
        className="w-full px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm"
      >
        Assign to Client
      </button>
    </div>
  )
}

// Instance Card Component
const InstanceCard: React.FC<{
  instance: AssessmentInstance
  onViewResult: () => void
}> = ({ instance, onViewResult }) => {
  return (
    <div className="border border-gray-200 rounded-lg p-4">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h4 className="font-semibold text-gray-900">{instance.assessment.name}</h4>
          <p className="text-sm text-gray-600">
            {instance.client.first_name} {instance.client.last_name}
          </p>
        </div>
        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(instance.status)}`}>
          {instance.status.replace('_', ' ')}
        </span>
      </div>

      <div className="flex items-center justify-between text-sm text-gray-600 mb-3">
        <div>Assigned: {new Date(instance.assigned_at).toLocaleDateString()}</div>
        {instance.completed_at && (
          <div>Completed: {new Date(instance.completed_at).toLocaleDateString()}</div>
        )}
      </div>

      <div className="flex gap-2">
        {instance.status === 'completed' && (
          <button
            onClick={onViewResult}
            className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm"
          >
            View Results
          </button>
        )}
        <button className="px-3 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm">
          <Eye className="w-4 h-4 inline mr-1" />
          Details
        </button>
      </div>
    </div>
  )
}

// Assign Modal Component
const AssignModal: React.FC<{
  assessment: Assessment
  clients: Client[]
  onClose: () => void
  onAssign: (assessmentId: string, clientId: string, notes?: string) => void
  assigning: boolean
}> = ({ assessment, clients, onClose, onAssign, assigning }) => {
  const [selectedClient, setSelectedClient] = useState('')
  const [notes, setNotes] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedClient) return
    onAssign(assessment.id, selectedClient, notes)
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" onClick={onClose} />

        <div className="inline-block w-full max-w-md p-6 my-8 overflow-hidden text-left align-middle transition-all transform bg-white shadow-xl rounded-xl">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Assign Assessment</h3>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="mb-4 p-3 bg-purple-50 rounded-lg">
            <h4 className="font-medium text-purple-900">{assessment.name}</h4>
            <p className="text-sm text-purple-700">{assessment.description}</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Select Client *
              </label>
              <select
                value={selectedClient}
                onChange={(e) => setSelectedClient(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                required
              >
                <option value="">Choose a client</option>
                {clients.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.first_name} {client.last_name} ({client.email})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notes (Optional)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                placeholder="Add any notes or instructions..."
              />
            </div>

            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={assigning || !selectedClient}
                className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
              >
                {assigning ? 'Assigning...' : 'Assign'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

// Result Modal Component
const ResultModal: React.FC<{
  instance: AssessmentInstance
  onClose: () => void
}> = ({ instance, onClose }) => {
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" onClick={onClose} />

        <div className="inline-block w-full max-w-2xl p-6 my-8 overflow-hidden text-left align-middle transition-all transform bg-white shadow-xl rounded-xl">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Assessment Results</h3>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h4 className="font-medium text-gray-900">{instance.assessment.name}</h4>
                <p className="text-sm text-gray-600">{instance.assessment.description}</p>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-green-600">
                  {instance.score ? `${instance.score}%` : 'N/A'}
                </div>
                <div className="text-sm text-gray-600">Overall Score</div>
              </div>
            </div>

            <div className="border-t border-gray-200 pt-4">
              <h5 className="font-medium text-gray-900 mb-2">Client Information</h5>
              <p className="text-gray-600">
                {instance.client.first_name} {instance.client.last_name} ({instance.client.email})
              </p>
            </div>

            <div className="border-t border-gray-200 pt-4">
              <h5 className="font-medium text-gray-900 mb-2">Timeline</h5>
              <div className="space-y-2 text-sm text-gray-600">
                <div>Assigned: {new Date(instance.assigned_at).toLocaleString()}</div>
                {instance.started_at && (
                  <div>Started: {new Date(instance.started_at).toLocaleString()}</div>
                )}
                {instance.completed_at && (
                  <div>Completed: {new Date(instance.completed_at).toLocaleString()}</div>
                )}
              </div>
            </div>

            {instance.interpretation && (
              <div className="border-t border-gray-200 pt-4">
                <h5 className="font-medium text-gray-900 mb-2">Interpretation</h5>
                <p className="text-gray-600">{instance.interpretation}</p>
              </div>
            )}

            {instance.notes && (
              <div className="border-t border-gray-200 pt-4">
                <h5 className="font-medium text-gray-900 mb-2">Notes</h5>
                <p className="text-gray-600">{instance.notes}</p>
              </div>
            )}
          </div>

          <div className="flex gap-3 pt-6 border-t border-gray-200">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
            >
              Close
            </button>
            <button className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
              <Download className="w-4 h-4 inline mr-2" />
              Export Report
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AssessmentWorkspace