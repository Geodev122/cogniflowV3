import React, { useState, useEffect } from 'react'
import { AssessmentTools } from './AssessmentTools'
import { WorksheetManagement } from './WorksheetManagement'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { 
  Library, 
  ClipboardList, 
  Brain, 
  BookOpen, 
  Search, 
  Filter, 
  Eye, 
  Send, 
  GraduationCap,
  FileText,
  Video,
  Headphones,
  Download,
  Star,
  Clock,
  Users,
  Target,
  Award,
  Lightbulb,
  Gamepad2,
  Plus,
  X
} from 'lucide-react'

interface Resource {
  id: string
  title: string
  type: 'assessment' | 'treatment_plan' | 'worksheet' | 'exercise' | 'article' | 'video' | 'audio'
  category: string
  description: string
  difficulty: 'beginner' | 'intermediate' | 'advanced'
  duration?: string
  rating: number
  usageCount: number
  evidenceBased: boolean
  tags: string[]
  content_url?: string
  content_data?: any
}

export const ResourceLibrary: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'all' | 'assessments' | 'treatments' | 'worksheets' | 'psychoeducation' | 'exercises'>('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [difficultyFilter, setDifficultyFilter] = useState('all')
  const [evidenceFilter, setEvidenceFilter] = useState('all')
  const [selectedResource, setSelectedResource] = useState<Resource | null>(null)
  const [showAssignModal, setShowAssignModal] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [resources, setResources] = useState<Resource[]>([])
  const [clients, setClients] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { profile } = useAuth()

  useEffect(() => {
    if (profile) {
      fetchResources()
      fetchClients()
    }
  }, [profile])

  const fetchResources = async () => {
    try {
      setError(null)
      
      // Fetch from resource_library table
      const { data, error } = await supabase
        .from('resource_library')
        .select('*')
        .eq('is_public', true)
        .order('created_at', { ascending: false })

      if (error) throw error

      // Transform database data to component format
      const transformedResources = data?.map(item => ({
        id: item.id,
        title: item.title,
        type: item.content_type || 'article',
        category: item.category,
        description: item.description || '',
        difficulty: item.difficulty_level || 'beginner',
        duration: item.content_data?.duration || 'Variable',
        rating: 4.5, // Default rating
        usageCount: 0, // Will be calculated from usage analytics
        evidenceBased: item.evidence_level === 'research_based',
        tags: item.tags || [],
        content_url: item.content_url,
        content_data: item.content_data
      })) || []

      setResources(transformedResources)
    } catch (error) {
      console.error('Error fetching resources:', error)
      setError('Failed to load resources')
      setResources([])
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

  const createCustomResource = async (resourceData: any) => {
    try {
      const { error } = await supabase
        .from('resource_library')
        .insert({
          title: resourceData.title,
          category: resourceData.category,
          subcategory: resourceData.subcategory,
          description: resourceData.description,
          content_type: resourceData.type,
          content_data: resourceData.content,
          tags: resourceData.tags,
          difficulty_level: resourceData.difficulty,
          evidence_level: resourceData.evidenceBased ? 'research_based' : 'clinical_consensus',
          created_by: profile!.id,
          is_public: false
        })

      if (error) throw error

      await fetchResources()
      setShowCreateModal(false)
      alert('Resource created successfully!')
    } catch (error) {
      console.error('Error creating resource:', error)
      alert('Error creating resource. Please try again.')
    }
  }

  const assignResource = async (resourceId: string, clientIds: string[], instructions: string) => {
    try {
      const resource = resources.find(r => r.id === resourceId)
      if (!resource) return

      const assignments = clientIds.map(clientId => ({
        therapist_id: profile!.id,
        client_id: clientId,
        form_type: resource.type,
        form_id: resourceId,
        title: resource.title,
        instructions,
        status: 'assigned'
      }))

      const { error } = await supabase
        .from('form_assignments')
        .insert(assignments)

      if (error) throw error

      setShowAssignModal(false)
      setSelectedResource(null)
      alert('Resource assigned successfully!')
    } catch (error) {
      console.error('Error assigning resource:', error)
      alert('Error assigning resource. Please try again.')
    }
  }

  const filteredResources = resources.filter((resource) => {
    const matchesTab = activeTab === 'all' || 
      (activeTab === 'assessments' && resource.type === 'assessment') ||
      (activeTab === 'treatments' && resource.type === 'treatment_plan') ||
      (activeTab === 'worksheets' && resource.type === 'worksheet') ||
      (activeTab === 'psychoeducation' && ['article', 'video', 'audio'].includes(resource.type)) ||
      (activeTab === 'exercises' && resource.type === 'exercise')

    const matchesSearch = resource.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         resource.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         resource.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))

    const matchesCategory = categoryFilter === 'all' || resource.category === categoryFilter
    const matchesDifficulty = difficultyFilter === 'all' || resource.difficulty === difficultyFilter
    const matchesEvidence = evidenceFilter === 'all' || 
      (evidenceFilter === 'evidence-based' && resource.evidenceBased) ||
      (evidenceFilter === 'clinical' && !resource.evidenceBased)

    return matchesTab && matchesSearch && matchesCategory && matchesDifficulty && matchesEvidence
  })

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'assessment': return <ClipboardList className="w-4 h-4 sm:w-5 sm:h-5" />
      case 'treatment_plan': return <Brain className="w-4 h-4 sm:w-5 sm:h-5" />
      case 'worksheet': return <FileText className="w-4 h-4 sm:w-5 sm:h-5" />
      case 'article': return <BookOpen className="w-4 h-4 sm:w-5 sm:h-5" />
      case 'video': return <Video className="w-4 h-4 sm:w-5 sm:h-5" />
      case 'audio': return <Headphones className="w-4 h-4 sm:w-5 sm:h-5" />
      default: return <FileText className="w-4 h-4 sm:w-5 sm:h-5" />
    }
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'assessment': return 'text-blue-600 bg-blue-100'
      case 'treatment_plan': return 'text-purple-600 bg-purple-100'
      case 'worksheet': return 'text-green-600 bg-green-100'
      case 'article': return 'text-orange-600 bg-orange-100'
      case 'video': return 'text-red-600 bg-red-100'
      case 'audio': return 'text-indigo-600 bg-indigo-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner': return 'text-green-600 bg-green-100'
      case 'intermediate': return 'text-yellow-600 bg-yellow-100'
      case 'advanced': return 'text-red-600 bg-red-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  const renderStarRating = (rating: number) => {
    return (
      <div className="flex items-center space-x-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`w-3 h-3 sm:w-4 sm:h-4 ${
              star <= rating ? 'text-yellow-400 fill-current' : 'text-gray-300'
            }`}
          />
        ))}
        <span className="text-xs sm:text-sm text-gray-600 ml-1">{rating}</span>
      </div>
    )
  }

  return (
    <div className="w-full max-w-none space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div className="flex-1 min-w-0">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Resource Library</h2>
          <p className="text-sm text-gray-600 mt-1">Evidence-based tools, assessments, and treatment resources</p>
        </div>
        <button 
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-purple-600 hover:bg-purple-700 flex-shrink-0"
        >
          <Plus className="w-4 h-4 mr-2" />
          Create Custom
        </button>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <div className="overflow-x-auto">
          <nav className="-mb-px flex space-x-4 lg:space-x-8">
            {[
              { id: 'all', name: 'All Resources', icon: Library },
              { id: 'assessments', name: 'Assessments', icon: ClipboardList },
              { id: 'worksheets', name: 'Worksheets', icon: FileText },
              { id: 'exercises', name: 'Exercises', icon: Gamepad2 },
              { id: 'treatments', name: 'Treatments', icon: Brain },
              { id: 'psychoeducation', name: 'Psychoeducation', icon: GraduationCap }
            ].map((tab) => {
              const Icon = tab.icon
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center space-x-2 py-2 px-3 border-b-2 font-medium text-sm whitespace-nowrap ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  <span className="hidden md:inline">{tab.name}</span>
                  <span className="md:hidden">{tab.name.split(' ')[0]}</span>
                </button>
              )
            })}
          </nav>
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'assessments' && (
        <div className="w-full">
          <AssessmentTools />
        </div>
      )}
      
      {activeTab === 'worksheets' && (
        <div className="w-full">
          <WorksheetManagement />
        </div>
      )}
      
      {activeTab === 'exercises' && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="text-center py-12 text-gray-500">
            <Gamepad2 className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Therapeutic Exercises</h3>
            <p className="text-gray-600">
              Interactive therapeutic exercises and games coming soon.
            </p>
          </div>
        </div>
      )}
      
      {(activeTab === 'all' || activeTab === 'treatments' || activeTab === 'psychoeducation') && (
        <div className="w-full space-y-4 sm:space-y-6">
          {/* Filters */}
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search resources..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                />
              </div>
              
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              >
                <option value="all">All Categories</option>
                <option value="worksheet">Worksheets</option>
                <option value="educational">Educational</option>
                <option value="intervention">Interventions</option>
                <option value="protocol">Protocols</option>
                <option value="research">Research</option>
              </select>
              
              <select
                value={difficultyFilter}
                onChange={(e) => setDifficultyFilter(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              >
                <option value="all">All Levels</option>
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
              </select>
              
              <select
                value={evidenceFilter}
                onChange={(e) => setEvidenceFilter(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              >
                <option value="all">All Types</option>
                <option value="evidence-based">Evidence-Based</option>
                <option value="clinical">Clinical Practice</option>
              </select>
            </div>
          </div>

          {/* Resources Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredResources.map((resource) => (
              <div key={resource.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-3 min-w-0 flex-1">
                    <div className={`p-2 rounded-lg flex-shrink-0 ${getTypeColor(resource.type)}`}>
                      {getTypeIcon(resource.type)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-semibold text-gray-900 text-sm leading-tight">{resource.title}</h3>
                      <p className="text-xs text-gray-600 mt-1">{resource.category}</p>
                    </div>
                  </div>
                  {resource.evidenceBased && (
                    <div className="flex items-center space-x-1 text-green-600 flex-shrink-0">
                      <Award className="w-4 h-4" />
                    </div>
                  )}
                </div>
                
                <p className="text-sm text-gray-600 mb-4 line-clamp-2">{resource.description}</p>
                
                <div className="flex flex-col gap-3 mb-4">
                  <div className="flex items-center justify-between">
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getDifficultyColor(resource.difficulty)}`}>
                      {resource.difficulty}
                    </span>
                    {resource.duration && (
                      <div className="flex items-center space-x-1 text-gray-500">
                        <Clock className="w-4 h-4" />
                        <span className="text-xs">{resource.duration}</span>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-1 text-gray-500">
                      <Users className="w-4 h-4" />
                      <span className="text-xs">{resource.usageCount}</span>
                    </div>
                    {renderStarRating(resource.rating)}
                  </div>
                </div>
                
                <div className="flex flex-wrap gap-1 mb-4">
                  {resource.tags.slice(0, 2).map((tag, index) => (
                    <span key={index} className="inline-flex px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded truncate">
                      {tag}
                    </span>
                  ))}
                  {resource.tags.length > 2 && (
                    <span className="inline-flex px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded">
                      +{resource.tags.length - 2}
                    </span>
                  )}
                </div>
                
                <div className="flex flex-col sm:flex-row gap-2">
                  <button
                    onClick={() => setSelectedResource(resource)}
                    className="flex-1 inline-flex items-center justify-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    Preview
                  </button>
                  <button
                    onClick={() => {
                      setSelectedResource(resource)
                      setShowAssignModal(true)
                    }}
                    className="flex-1 inline-flex items-center justify-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                  >
                    <Send className="w-4 h-4 mr-2" />
                    Assign
                  </button>
                </div>
              </div>
            ))}
          </div>

          {filteredResources.length === 0 && !loading && !error && (
            <div className="text-center py-12">
              <Library className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No resources found</h3>
              <p className="mt-1 text-sm text-gray-500">
                Try adjusting your search terms or filters.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Resource Preview Modal */}
      {selectedResource && !showAssignModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => setSelectedResource(null)} />
            
            <div className="inline-block align-middle bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:max-w-2xl w-full max-w-md sm:max-w-2xl mx-4">
              <div className="bg-white">
                <div className="flex items-center justify-between p-6 border-b border-gray-200">
                  <h3 className="text-lg font-medium text-gray-900 flex-1 min-w-0 pr-4">{selectedResource.title}</h3>
                  <button
                    onClick={() => setSelectedResource(null)}
                    className="text-gray-400 hover:text-gray-600 flex-shrink-0"
                  >
                    <X className="h-6 w-6" />
                  </button>
                </div>
                
                <div className="p-6">
                  <div className="space-y-6">
                    {/* Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center space-y-4 sm:space-y-0 sm:space-x-4">
                      <div className={`p-3 rounded-lg self-start ${getTypeColor(selectedResource.type)}`}>
                        {getTypeIcon(selectedResource.type)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm text-gray-600">{selectedResource.category}</p>
                        <div className="flex flex-wrap items-center gap-2 mt-2">
                          <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getDifficultyColor(selectedResource.difficulty)}`}>
                            {selectedResource.difficulty}
                          </span>
                          {selectedResource.evidenceBased && (
                            <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
                              Evidence-Based
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <p className="text-gray-700">{selectedResource.description}</p>
                    
                    <div className="grid grid-cols-2 gap-4 py-4 border-t border-gray-200">
                      <div>
                        <p className="text-sm font-medium text-gray-900">Duration</p>
                        <p className="text-sm text-gray-600">{selectedResource.duration || 'Variable'}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">Usage</p>
                        <p className="text-sm text-gray-600">{selectedResource.usageCount} therapists</p>
                      </div>
                    </div>
                    
                    <div>
                      <p className="text-sm font-medium text-gray-900 mb-3">Tags</p>
                      <div className="flex flex-wrap gap-2">
                        {selectedResource.tags.map((tag, index) => (
                          <span key={index} className="inline-flex px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="bg-gray-50 px-6 py-4 flex flex-col sm:flex-row-reverse gap-3">
                  <button
                    onClick={() => setShowAssignModal(true)}
                    className="w-full sm:w-auto inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-sm font-medium text-white hover:bg-blue-700"
                  >
                    Assign to Client
                  </button>
                  <button
                    onClick={() => {
                      if (selectedResource.content_url) {
                        window.open(selectedResource.content_url, '_blank')
                      }
                    }}
                    className="w-full sm:w-auto inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Download
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Assignment Modal */}
      {showAssignModal && selectedResource && (
        <AssignResourceModal
          resource={selectedResource}
          clients={clients}
          onClose={() => setShowAssignModal(false)}
          onAssign={assignResource}
        />
      )}

      {/* Create Resource Modal */}
      {showCreateModal && (
        <CreateResourceModal
          onClose={() => setShowCreateModal(false)}
          onCreate={createCustomResource}
        />
      )}
    </div>
  )
}

// Assign Resource Modal Component
interface AssignResourceModalProps {
  resource: Resource
  clients: any[]
  onClose: () => void
  onAssign: (resourceId: string, clientIds: string[], instructions: string) => void
}

const AssignResourceModal: React.FC<AssignResourceModalProps> = ({ 
  resource, 
  clients, 
  onClose, 
  onAssign 
}) => {
  const [selectedClients, setSelectedClients] = useState<string[]>([])
  const [instructions, setInstructions] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (selectedClients.length > 0) {
      onAssign(resource.id, selectedClients, instructions)
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
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={onClose} />
        
        <div className="inline-block align-middle bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 w-full max-w-md sm:max-w-lg mx-4">
          <form onSubmit={handleSubmit}>
            <div className="bg-white px-6 pt-6 pb-4">
              <div className="flex items-start justify-between mb-6">
                <h3 className="text-lg font-medium text-gray-900 flex-1 min-w-0 pr-4">
                  Assign: {resource.title}
                </h3>
                <button
                  type="button"
                  onClick={onClose}
                  className="text-gray-400 hover:text-gray-600 flex-shrink-0"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Select Clients
                  </label>
                  <div className="max-h-48 overflow-y-auto border border-gray-300 rounded-md">
                    {clients.map((client) => (
                      <label key={client.id} className="flex items-center p-3 hover:bg-gray-50 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedClients.includes(client.id)}
                          onChange={() => toggleClient(client.id)}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <div className="ml-3 min-w-0 flex-1">
                          <div className="text-sm font-medium text-gray-900">
                            {client.first_name} {client.last_name}
                          </div>
                          <div className="text-xs text-gray-500">{client.email}</div>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <label htmlFor="instructions" className="block text-sm font-medium text-gray-700 mb-2">
                    Instructions for Client
                  </label>
                  <textarea
                    id="instructions"
                    value={instructions}
                    onChange={(e) => setInstructions(e.target.value)}
                    rows={3}
                    placeholder="Optional instructions or context for the client..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                  />
                </div>
              </div>
            </div>
            
            <div className="bg-gray-50 px-6 py-4 flex flex-col sm:flex-row-reverse gap-3">
              <button
                type="submit"
                disabled={selectedClients.length === 0}
                className="w-full sm:w-auto inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Assign Resource
              </button>
              <button
                type="button"
                onClick={onClose}
                className="w-full sm:w-auto inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50"
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

// Create Resource Modal Component
interface CreateResourceModalProps {
  onClose: () => void
  onCreate: (resourceData: any) => void
}

const CreateResourceModal: React.FC<CreateResourceModalProps> = ({ onClose, onCreate }) => {
  const [formData, setFormData] = useState({
    title: '',
    category: 'worksheet',
    subcategory: '',
    description: '',
    type: 'text',
    difficulty: 'beginner',
    evidenceBased: false,
    tags: '',
    content: ''
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (formData.title && formData.description) {
      onCreate({
        ...formData,
        tags: formData.tags.split(',').map(tag => tag.trim()).filter(tag => tag)
      })
    }
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={onClose} />
        
        <div className="inline-block align-middle bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 w-full max-w-md sm:max-w-2xl mx-4">
          <form onSubmit={handleSubmit}>
            <div className="bg-white px-6 pt-6 pb-4">
              <div className="flex items-start justify-between mb-6">
                <h3 className="text-lg font-medium text-gray-900 flex-1 min-w-0 pr-4">Create Custom Resource</h3>
                <button
                  type="button"
                  onClick={onClose}
                  className="text-gray-400 hover:text-gray-600 flex-shrink-0"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              <div className="space-y-4 max-h-96 overflow-y-auto">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Title *</label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                    <select
                      value={formData.category}
                      onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                    >
                      <option value="worksheet">Worksheet</option>
                      <option value="educational">Educational</option>
                      <option value="intervention">Intervention</option>
                      <option value="protocol">Protocol</option>
                      <option value="research">Research</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Difficulty</label>
                    <select
                      value={formData.difficulty}
                      onChange={(e) => setFormData(prev => ({ ...prev, difficulty: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                    >
                      <option value="beginner">Beginner</option>
                      <option value="intermediate">Intermediate</option>
                      <option value="advanced">Advanced</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Description *</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Tags</label>
                  <input
                    type="text"
                    value={formData.tags}
                    onChange={(e) => setFormData(prev => ({ ...prev, tags: e.target.value }))}
                    placeholder="Comma-separated tags"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                  />
                </div>

                <div>
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={formData.evidenceBased}
                      onChange={(e) => setFormData(prev => ({ ...prev, evidenceBased: e.target.checked }))}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">Evidence-based resource</span>
                  </label>
                </div>
              </div>
            </div>
            
            <div className="bg-gray-50 px-6 py-4 flex flex-col sm:flex-row-reverse gap-3">
              <button
                type="submit"
                disabled={!formData.title || !formData.description}
                className="w-full sm:w-auto inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-purple-600 text-sm font-medium text-white hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Create Resource
              </button>
              <button
                type="button"
                onClick={onClose}
                className="w-full sm:w-auto inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50"
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