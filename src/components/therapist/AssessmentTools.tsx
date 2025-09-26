import React, { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { formatDate } from '../../utils/helpers'
import { 
  ClipboardList, 
  Plus, 
  Search, 
  Filter, 
  Eye, 
  Send, 
  Calendar,
  BarChart3,
  FileText,
  Brain,
  Target,
  Clock,
  CheckCircle,
  X
} from 'lucide-react'

interface Assessment {
  id: string
  name: string
  abbreviation: string
  category: string
  description: string
  questions: any[]
  scoring_method: any
  interpretation_guide: any
}

interface AssignedAssessment {
  id: string
  client_id: string
  title: string
  status: string
  due_date: string
  assigned_at: string
  completed_at?: string
  client: {
    first_name: string
    last_name: string
    email: string
  }
  responses?: any
  score?: number
}

export const AssessmentTools: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'library' | 'assigned' | 'create' | 'reports'>('library')
  const [assessmentLibrary, setAssessmentLibrary] = useState<Assessment[]>([])
  const [assignedAssessments, setAssignedAssessments] = useState<AssignedAssessment[]>([])
  const [clients, setClients] = useState<any[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [selectedAssessment, setSelectedAssessment] = useState<Assessment | null>(null)
  const [showAssignModal, setShowAssignModal] = useState(false)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [loading, setLoading] = useState(true)
  const { profile } = useAuth()

  useEffect(() => {
    fetchData()
  }, [profile])

  const fetchData = async () => {
    if (!profile) return

    try {
      await Promise.all([
        fetchAssessmentLibrary(),
        fetchAssignedAssessments(),
        fetchClients()
      ])
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchAssessmentLibrary = async () => {
    try {
      const { data, error } = await supabase
        .from('assessment_library')
        .select('*')
        .eq('is_active', true)
        .order('category', { ascending: true })

      if (error) {
        console.error('Error fetching assessment library:', error)
        setAssessmentLibrary([])
        return
      }
      
      setAssessmentLibrary(data || [])
    } catch (error) {
      console.error('Error in fetchAssessmentLibrary:', error)
      setAssessmentLibrary([])
    }
  }

  const fetchAssignedAssessments = async () => {
    if (!profile) return

    try {
      const { data, error } = await supabase
        .from('form_assignments')
        .select('*')
        .eq('therapist_id', profile.id)
        .eq('form_type', 'psychometric')
        .order('assigned_at', { ascending: false })

      if (error) {
        console.error('Error fetching assigned assessments:', error)
        setAssignedAssessments([])
        return
      }

      // Get client data separately
      const clientIds = [...new Set(data?.map(a => a.client_id) || [])]
      if (clientIds.length === 0) {
        setAssignedAssessments([])
        return
      }
      
      const { data: clients, error: clientsError } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, email')
        .in('id', clientIds)

      if (clientsError) {
        console.warn('Error fetching client data for assignments:', clientsError)
      }

      const assignmentsWithClient = data?.map(assignment => {
        const client = clients?.find(c => c.id === assignment.client_id)
        return {
          ...assignment,
          client: client || { first_name: 'Unknown', last_name: 'Client', email: 'unknown@example.com' }
        }
      }) || []

      setAssignedAssessments(assignmentsWithClient)
    } catch (error) {
      console.error('Error in fetchAssignedAssessments:', error)
      setAssignedAssessments([])
    }
  }

  const fetchClients = async () => {
    if (!profile?.id) return

    try {
      const { data, error } = await supabase
        .from('therapist_client_relations')
        .select('client_id')
        .eq('therapist_id', profile.id)

      if (error) {
        console.error('Error fetching therapist-client relations:', error)
        setClients([])
        return
      }

      // Get client profiles separately
      const clientIds = data?.map(r => r.client_id) || []
      if (clientIds.length === 0) {
        setClients([])
        return
      }
      
      const { data: clientProfiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, email')
        .in('id', clientIds)

      if (profilesError) {
        console.error('Error fetching client profiles:', profilesError)
        setClients([])
        return
      }

      setClients(clientProfiles || [])
    } catch (error) {
      console.error('Error in fetchClients:', error)
      setClients([])
    }
  }

  const assignAssessment = async (assessmentId: string, clientIds: string[], dueDate: string, instructions: string) => {
    try {
      const assessment = assessmentLibrary.find(a => a.id === assessmentId)
      if (!assessment) return

      const assignments = clientIds.map(clientId => ({
        therapist_id: profile!.id,
        client_id: clientId,
        form_type: 'psychometric',
        form_id: assessmentId,
        title: assessment.name,
        instructions,
        due_date: dueDate,
        status: 'assigned'
      }))

      const { error } = await supabase
        .from('form_assignments')
        .insert(assignments)

      if (error) throw error

      // Also create entries in psychometric_forms table
      const psychometricForms = clientIds.map(clientId => ({
        therapist_id: profile!.id,
        client_id: clientId,
        form_type: assessment.abbreviation || 'custom',
        title: assessment.name,
        questions: assessment.questions,
        status: 'assigned'
      }))

      const { error: formsError } = await supabase
        .from('psychometric_forms')
        .insert(psychometricForms)
      
      if (formsError) {
        console.warn('Error creating psychometric forms:', formsError)
      }

      await fetchAssignedAssessments()
      setShowAssignModal(false)
      setSelectedAssessment(null)
      alert('Assessment assigned successfully!')
    } catch (error) {
      console.error('Error assigning assessment:', error)
      alert('Error assigning assessment. Please try again.')
    }
  }

  const createCustomAssessment = async (formData: any) => {
    try {
      const { error } = await supabase
        .from('custom_forms')
        .insert({
          therapist_id: profile!.id,
          title: formData.title,
          description: formData.description,
          questions: formData.questions
        })

      if (error) throw error

      setShowCreateForm(false)
      await fetchAssessmentLibrary()
      alert('Custom assessment created successfully!')
    } catch (error) {
      console.error('Error creating custom assessment:', error)
      alert('Error creating custom assessment. Please try again.')
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'assigned': return 'text-blue-600 bg-blue-100'
      case 'in_progress': return 'text-amber-600 bg-amber-100'
      case 'completed': return 'text-green-600 bg-green-100'
      case 'overdue': return 'text-red-600 bg-red-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'assigned': return <Clock className="w-4 h-4" />
      case 'in_progress': return <FileText className="w-4 h-4" />
      case 'completed': return <CheckCircle className="w-4 h-4" />
      default: return <FileText className="w-4 h-4" />
    }
  }

  const filteredAssessments = assessmentLibrary.filter(assessment => {
    const matchesSearch = assessment.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         assessment.description.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = categoryFilter === 'all' || assessment.category.toLowerCase() === categoryFilter.toLowerCase()
    return matchesSearch && matchesCategory
  })

  const filteredAssigned = assignedAssessments.filter(assignment => {
    const matchesSearch = assignment.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         `${assignment.client.first_name} ${assignment.client.last_name}`.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === 'all' || assignment.status === statusFilter
    return matchesSearch && matchesStatus
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  const renderLibrary = () => (
    <div className="space-y-3 sm:space-y-6 max-w-full overflow-hidden">
      {/* Search and Filters */}
      <div className="bg-white p-3 sm:p-4 rounded-lg shadow-sm border border-gray-200">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-2 sm:left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-3 h-3 sm:w-4 sm:h-4 lg:w-5 lg:h-5" />
              <input
                type="text"
                placeholder="Search assessments..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-7 sm:pl-8 lg:pl-10 pr-2 sm:pr-3 lg:pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-xs sm:text-sm"
              />
            </div>
          </div>
          <div className="flex items-center space-x-2 sm:justify-end">
            <Filter className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="border border-gray-300 rounded-md px-2 sm:px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-xs sm:text-sm"
            >
              <option value="all">All Categories</option>
              <option value="depression">Depression</option>
              <option value="anxiety">Anxiety</option>
              <option value="trauma">Trauma</option>
              <option value="general">General</option>
            </select>
          </div>
        </div>
      </div>

      {/* Assessment Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-6">
        {filteredAssessments.map((assessment) => (
          <div key={assessment.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 sm:p-4 lg:p-6 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between mb-3 sm:mb-4">
              <div>
                <h3 className="text-sm sm:text-base lg:text-lg font-semibold text-gray-900 leading-tight">{assessment.name}</h3>
                <p className="text-xs sm:text-sm text-blue-600 font-medium">{assessment.abbreviation}</p>
              </div>
              <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800 flex-shrink-0 ml-2">
                {assessment.category}
              </span>
            </div>
            
            <p className="text-gray-600 text-xs sm:text-sm mb-3 sm:mb-4 line-clamp-2 sm:line-clamp-3">{assessment.description}</p>
            
            <div className="flex items-center justify-between text-xs sm:text-sm text-gray-500 mb-3 sm:mb-4">
              <span>{assessment.questions.length} questions</span>
              <span>Max score: {assessment.scoring_method.max_score}</span>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-2">
              <button
                onClick={() => {
                  setSelectedAssessment(assessment)
                  setShowAssignModal(true)
                }}
                className="flex-1 inline-flex items-center justify-center px-3 py-2 border border-transparent text-xs sm:text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
              >
                <Send className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                Assign
              </button>
              <button className="inline-flex items-center justify-center px-3 py-2 border border-gray-300 text-xs sm:text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">
                <Eye className="w-3 h-3 sm:w-4 sm:h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )

  const renderAssigned = () => (
    <div className="space-y-3 sm:space-y-6 max-w-full overflow-hidden">
      {/* Search and Filters */}
      <div className="bg-white p-3 sm:p-4 rounded-lg shadow-sm border border-gray-200">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-2 sm:left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-3 h-3 sm:w-4 sm:h-4 lg:w-5 lg:h-5" />
              <input
                type="text"
                placeholder="Search assigned assessments..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-7 sm:pl-8 lg:pl-10 pr-2 sm:pr-3 lg:pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-xs sm:text-sm"
              />
            </div>
          </div>
          <div className="flex items-center space-x-2 sm:justify-end">
            <Filter className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="border border-gray-300 rounded-md px-2 sm:px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-xs sm:text-sm"
            >
              <option value="all">All Statuses</option>
              <option value="assigned">Assigned</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="overdue">Overdue</option>
            </select>
          </div>
        </div>
      </div>

      {/* Assigned Assessments Table */}
      <div className="bg-white shadow-sm rounded-lg border border-gray-200">
        <div className="overflow-hidden max-w-full">
          {filteredAssigned.length === 0 ? (
            <div className="text-center py-8 sm:py-12">
              <ClipboardList className="mx-auto h-8 w-8 sm:h-12 sm:w-12 text-gray-400" />
              <h3 className="mt-2 text-xs sm:text-sm font-medium text-gray-900">No assigned assessments</h3>
              <p className="mt-1 text-xs sm:text-sm text-gray-500">
                Start by assigning assessments from the library.
              </p>
            </div>
          ) : (
            <>
              {/* Mobile Card View */}
              <div className="block sm:hidden divide-y divide-gray-200">
                {filteredAssigned.map((assignment) => (
                  <div key={assignment.id} className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div className="min-w-0 flex-1">
                        <h4 className="text-sm font-medium text-gray-900 truncate">{assignment.title}</h4>
                        <p className="text-xs text-gray-600 truncate">
                          {assignment.client.first_name} {assignment.client.last_name}
                        </p>
                      </div>
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(assignment.status)} ml-2 flex-shrink-0`}>
                        {assignment.status.replace('_', ' ')}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span>Due: {formatDate(assignment.due_date)}</span>
                      <span>Score: {assignment.score !== undefined ? assignment.score : '-'}</span>
                    </div>
                    <div className="flex space-x-2 mt-3">
                      <button className="flex-1 text-blue-600 hover:text-blue-900 text-xs">
                        <Eye className="w-4 h-4 mx-auto" />
                      </button>
                      <button className="flex-1 text-green-600 hover:text-green-900 text-xs">
                        <BarChart3 className="w-4 h-4 mx-auto" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop Table View */}
              <div className="hidden sm:block overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Assessment
                      </th>
                      <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Client
                      </th>
                      <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Due Date
                      </th>
                      <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Score
                      </th>
                      <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredAssigned.map((assignment) => (
                      <tr key={assignment.id} className="hover:bg-gray-50">
                        <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                          <div className="text-xs sm:text-sm font-medium text-gray-900">{assignment.title}</div>
                          <div className="text-xs text-gray-500">Assigned {formatDate(assignment.assigned_at)}</div>
                        </td>
                        <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                          <div className="text-xs sm:text-sm font-medium text-gray-900">
                            {assignment.client.first_name} {assignment.client.last_name}
                          </div>
                          <div className="text-xs text-gray-500">{assignment.client.email}</div>
                        </td>
                        <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(assignment.status)}`}>
                            <div className="flex items-center space-x-1">
                              {getStatusIcon(assignment.status)}
                              <span className="capitalize">{assignment.status.replace('_', ' ')}</span>
                            </div>
                          </span>
                        </td>
                        <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-xs sm:text-sm text-gray-500">
                          {formatDate(assignment.due_date)}
                        </td>
                        <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-xs sm:text-sm text-gray-900">
                          {assignment.score !== undefined ? assignment.score : '-'}
                        </td>
                        <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-xs sm:text-sm font-medium">
                          <div className="flex space-x-2">
                            <button className="text-blue-600 hover:text-blue-900">
                              <Eye className="w-3 h-3 sm:w-4 sm:h-4" />
                            </button>
                            <button className="text-green-600 hover:text-green-900">
                              <BarChart3 className="w-3 h-3 sm:w-4 sm:h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )

  const renderCreateForm = () => (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
      <div className="flex items-center space-x-3 mb-6">
        <Brain className="w-5 h-5 sm:w-6 sm:h-6 text-purple-600" />
        <h3 className="text-base sm:text-lg font-semibold text-gray-900">Create Custom Assessment</h3>
      </div>
      
      <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-6">
        <div className="flex items-center space-x-2">
          <Brain className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600" />
          <span className="font-medium text-purple-900 text-sm sm:text-base">AI-Assisted Form Builder</span>
        </div>
        <p className="text-purple-700 text-xs sm:text-sm mt-2">
          Our AI can help you create evidence-based assessments tailored to your practice needs.
        </p>
        <button 
          onClick={() => setShowCreateModal(true)}
          className="mt-3 inline-flex items-center px-3 py-2 border border-transparent text-xs sm:text-sm font-medium rounded-md text-purple-700 bg-purple-100 hover:bg-purple-200"
        >
          <Brain className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
          Create Custom Assessment
        </button>
      </div>

      <div className="text-center py-8 sm:py-12 text-gray-500">
        <FileText className="mx-auto h-8 w-8 sm:h-12 sm:w-12 text-gray-400 mb-4" />
        <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-2">Custom Form Builder</h3>
        <p className="text-sm sm:text-base text-gray-600">
          Advanced form builder with drag-and-drop interface coming soon.
        </p>
      </div>
    </div>
  )

  const renderReports = () => (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
      <div className="flex items-center space-x-3 mb-6">
        <BarChart3 className="w-5 h-5 sm:w-6 sm:h-6 text-teal-600" />
        <h3 className="text-base sm:text-lg font-semibold text-gray-900">Assessment Reports & Analytics</h3>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8">
        <div className="bg-blue-50 p-3 sm:p-4 rounded-lg">
          <div className="flex items-center space-x-2 mb-2">
            <Target className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
            <span className="font-medium text-blue-900 text-xs sm:text-sm">Completion Rate</span>
          </div>
          <div className="text-xl sm:text-2xl font-bold text-blue-600">87%</div>
          <div className="text-xs sm:text-sm text-blue-700">This month</div>
        </div>
        
        <div className="bg-green-50 p-3 sm:p-4 rounded-lg">
          <div className="flex items-center space-x-2 mb-2">
            <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-green-600" />
            <span className="font-medium text-green-900 text-xs sm:text-sm">Avg Response Time</span>
          </div>
          <div className="text-xl sm:text-2xl font-bold text-green-600">2.3 days</div>
          <div className="text-xs sm:text-sm text-green-700">Per assessment</div>
        </div>
        
        <div className="bg-purple-50 p-3 sm:p-4 rounded-lg">
          <div className="flex items-center space-x-2 mb-2">
            <Brain className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600" />
            <span className="font-medium text-purple-900 text-xs sm:text-sm">AI Insights</span>
          </div>
          <div className="text-xl sm:text-2xl font-bold text-purple-600">12</div>
          <div className="text-xs sm:text-sm text-purple-700">Generated reports</div>
        </div>
      </div>

      <div className="text-center py-8 sm:py-12 text-gray-500">
        <BarChart3 className="mx-auto h-8 w-8 sm:h-12 sm:w-12 text-gray-400 mb-4" />
        <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-2">Advanced Analytics Dashboard</h3>
        <p className="text-sm sm:text-base text-gray-600">
          Comprehensive reporting and analytics features coming soon.
        </p>
      </div>
    </div>
  )

  return (
    <div className="space-y-3 sm:space-y-6 max-w-full overflow-hidden">
      {/* Header */}
      <div className="flex flex-col space-y-3 sm:space-y-0 sm:flex-row sm:items-center justify-between">
        <div className="min-w-0">
          <h2 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900 truncate">Assessment & Screening Tools</h2>
          <p className="text-xs sm:text-sm lg:text-base text-gray-600">Manage psychometric assessments and screening tools</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center px-3 py-2 sm:px-4 sm:py-2 border border-transparent text-xs sm:text-sm font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700 w-full sm:w-auto justify-center flex-shrink-0"
        >
          <Plus className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
          Create Custom
        </button>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 -mx-3 sm:mx-0">
        <div className="overflow-x-auto px-3 sm:px-0">
          <nav className="-mb-px flex space-x-1 sm:space-x-4 lg:space-x-8 min-w-max">
            {[
              { id: 'library', name: 'Assessment Library', icon: ClipboardList },
              { id: 'assigned', name: 'Assigned Assessments', icon: Send },
              { id: 'create', name: 'Create Custom', icon: Plus },
              { id: 'reports', name: 'Reports & Analytics', icon: BarChart3 }
            ].map((tab) => {
              const Icon = tab.icon
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center space-x-1 sm:space-x-2 py-2 px-2 sm:px-3 border-b-2 font-medium text-xs sm:text-sm whitespace-nowrap ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon className="w-3 h-3 sm:w-4 sm:h-4 lg:w-5 lg:h-5 flex-shrink-0" />
                  <span className="hidden sm:inline">{tab.name}</span>
                  <span className="sm:hidden">{tab.name.split(' ')[0]}</span>
                </button>
              )
            })}
          </nav>
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'library' && renderLibrary()}
      {activeTab === 'assigned' && renderAssigned()}
      {activeTab === 'create' && renderCreateForm()}
      {activeTab === 'reports' && renderReports()}

      {/* Assign Assessment Modal */}
      {showAssignModal && selectedAssessment && (
        <AssignAssessmentModal
          assessment={selectedAssessment}
          clients={clients}
          onClose={() => {
            setShowAssignModal(false)
            setSelectedAssessment(null)
          }}
          onAssign={assignAssessment}
        />
      )}

      {/* Create Custom Assessment Modal */}
      {showCreateModal && (
        <CreateCustomAssessmentModal
          onClose={() => setShowCreateModal(false)}
          onCreate={createCustomAssessment}
        />
      )}
    </div>
  )
}

// Assign Assessment Modal Component
interface AssignAssessmentModalProps {
  assessment: Assessment
  clients: any[]
  onClose: () => void
  onAssign: (assessmentId: string, clientIds: string[], dueDate: string, instructions: string) => void
}

const AssignAssessmentModal: React.FC<AssignAssessmentModalProps> = ({ 
  assessment, 
  clients, 
  onClose, 
  onAssign 
}) => {
  const [selectedClients, setSelectedClients] = useState<string[]>([])
  const [dueDate, setDueDate] = useState('')
  const [instructions, setInstructions] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (selectedClients.length > 0 && dueDate) {
      onAssign(assessment.id, selectedClients, dueDate, instructions)
    }
  }

  const toggleClient = (clientId: string) => {
    setSelectedClients(prev => 
      prev.includes(clientId) 
        ? prev.filter(id => id !== clientId)
        : [...prev, clientId]
    )
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-end justify-center min-h-screen pt-4 px-2 sm:px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={onClose} />
        
        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full mx-2 sm:mx-4">
          <form onSubmit={handleSubmit}>
            <div className="bg-white px-3 sm:px-4 lg:px-6 pt-4 sm:pt-6 pb-4">
              <div className="flex items-start justify-between mb-4 sm:mb-6">
                <h3 className="text-sm sm:text-base lg:text-lg font-medium text-gray-900 pr-2 flex-1 min-w-0">
                  Assign Assessment: {assessment.name}
                </h3>
                <button
                  type="button"
                  onClick={onClose}
                  className="text-gray-400 hover:text-gray-600 flex-shrink-0"
                >
                  <X className="h-5 w-5 sm:h-6 sm:w-6" />
                </button>
              </div>

              <div className="space-y-4 sm:space-y-6">
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2 sm:mb-3">
                    Select Clients
                  </label>
                  <div className="max-h-32 sm:max-h-48 overflow-y-auto border border-gray-300 rounded-md">
                    {clients.map((client) => (
                      <label key={client.id} className="flex items-center p-2 sm:p-3 hover:bg-gray-50 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedClients.includes(client.id)}
                          onChange={() => toggleClient(client.id)}
                          className="h-3 w-3 sm:h-4 sm:w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <div className="ml-2 sm:ml-3 min-w-0 flex-1">
                          <div className="text-xs sm:text-sm font-medium text-gray-900 truncate">
                            {client.first_name} {client.last_name}
                          </div>
                          <div className="text-xs text-gray-500 truncate">{client.email}</div>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <label htmlFor="dueDate" className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                    Due Date
                  </label>
                  <input
                    type="date"
                    id="dueDate"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                    className="w-full px-2 sm:px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-xs sm:text-sm"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="instructions" className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                    Instructions for Client
                  </label>
                  <textarea
                    id="instructions"
                    value={instructions}
                    onChange={(e) => setInstructions(e.target.value)}
                    rows={3}
                    placeholder="Optional instructions or context for the client..."
                    className="w-full px-2 sm:px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-xs sm:text-sm"
                  />
                </div>
              </div>
            </div>
            
            <div className="bg-gray-50 px-3 sm:px-4 lg:px-6 py-3 sm:py-4 flex flex-col sm:flex-row-reverse gap-2 sm:gap-3">
              <button
                type="submit"
                disabled={selectedClients.length === 0 || !dueDate}
                className="w-full sm:w-auto inline-flex justify-center rounded-md border border-transparent shadow-sm px-3 sm:px-4 py-2 bg-blue-600 text-xs sm:text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Assign Assessment
              </button>
              <button
                type="button"
                onClick={onClose}
                className="w-full sm:w-auto inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-3 sm:px-4 py-2 bg-white text-xs sm:text-sm font-medium text-gray-700 hover:bg-gray-50"
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

// Create Custom Assessment Modal Component
interface CreateCustomAssessmentModalProps {
  onClose: () => void
  onCreate: (assessmentData: any) => void
}

const CreateCustomAssessmentModal: React.FC<CreateCustomAssessmentModalProps> = ({ onClose, onCreate }) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    questions: [{ text: '', type: 'scale', options: [] }]
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (formData.title && formData.description) {
      onCreate(formData)
    }
  }

  const addQuestion = () => {
    setFormData(prev => ({
      ...prev,
      questions: [...prev.questions, { text: '', type: 'scale', options: [] }]
    }))
  }

  const updateQuestion = (index: number, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      questions: prev.questions.map((q, i) => 
        i === index ? { ...q, [field]: value } : q
      )
    }))
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-end justify-center min-h-screen pt-4 px-2 sm:px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={onClose} />
        
        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full mx-2 sm:mx-4">
          <form onSubmit={handleSubmit}>
            <div className="bg-white px-3 sm:px-4 lg:px-6 pt-4 sm:pt-6 pb-4">
              <div className="flex items-start justify-between mb-4 sm:mb-6">
                <h3 className="text-sm sm:text-base lg:text-lg font-medium text-gray-900 pr-2">Create Custom Assessment</h3>
                <button
                  type="button"
                  onClick={onClose}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-5 w-5 sm:h-6 sm:w-6" />
                </button>
              </div>

              <div className="space-y-4 max-h-96 overflow-y-auto">
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">Title *</label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                    className="w-full px-2 sm:px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-xs sm:text-sm"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">Description *</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    rows={3}
                    className="w-full px-2 sm:px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-xs sm:text-sm"
                    required
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-3">
                    <label className="block text-xs sm:text-sm font-medium text-gray-700">Questions</label>
                    <button
                      type="button"
                      onClick={addQuestion}
                      className="inline-flex items-center px-2 py-1 text-xs bg-blue-600 text-white rounded-md hover:bg-blue-700"
                    >
                      <Plus className="w-3 h-3 mr-1" />
                      Add
                    </button>
                  </div>
                  <div className="space-y-3">
                    {formData.questions.map((question, index) => (
                      <div key={index} className="border border-gray-200 rounded-md p-3">
                        <input
                          type="text"
                          value={question.text}
                          onChange={(e) => updateQuestion(index, 'text', e.target.value)}
                          placeholder="Question text"
                          className="w-full px-2 py-1 border border-gray-300 rounded-md text-xs"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            
            <div className="bg-gray-50 px-3 sm:px-4 lg:px-6 py-3 sm:py-4 flex flex-col sm:flex-row-reverse gap-2 sm:gap-3">
              <button
                type="submit"
                disabled={!formData.title || !formData.description}
                className="w-full sm:w-auto inline-flex justify-center rounded-md border border-transparent shadow-sm px-3 sm:px-4 py-2 bg-purple-600 text-xs sm:text-sm font-medium text-white hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Create Assessment
              </button>
              <button
                type="button"
                onClick={onClose}
                className="w-full sm:w-auto inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-3 sm:px-4 py-2 bg-white text-xs sm:text-sm font-medium text-gray-700 hover:bg-gray-50"
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