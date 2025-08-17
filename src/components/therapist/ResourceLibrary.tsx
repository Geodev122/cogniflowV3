import React, { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { 
  Library, 
  Search, 
  Filter, 
  Grid3X3, 
  List, 
  Plus, 
  Eye, 
  Send, 
  Star,
  BookOpen,
  FileText,
  Video,
  Headphones,
  Download,
  X,
  Users,
  Clock,
  Award,
  Target,
  Brain,
  Heart,
  Zap,
  Shield
} from 'lucide-react'

interface Resource {
  id: string
  title: string
  category: string
  subcategory?: string
  description?: string
  content_type?: string
  content_url?: string
  content_data?: any
  tags?: string[]
  difficulty_level?: string
  evidence_level?: string
  created_by?: string
  is_public?: boolean
  created_at: string
  updated_at: string
}

const SAMPLE_RESOURCES: Resource[] = [
  {
    id: '1',
    title: 'CBT Thought Record Worksheet',
    category: 'worksheet',
    subcategory: 'cognitive',
    description: 'A comprehensive thought record worksheet for identifying and challenging negative thought patterns.',
    content_type: 'pdf',
    tags: ['CBT', 'thought-challenging', 'cognitive-restructuring'],
    difficulty_level: 'beginner',
    evidence_level: 'research_based',
    is_public: true,
    created_at: '2024-01-15T10:00:00Z',
    updated_at: '2024-01-15T10:00:00Z'
  },
  {
    id: '2',
    title: 'Anxiety Management Protocol',
    category: 'protocol',
    subcategory: 'anxiety',
    description: 'Step-by-step protocol for managing acute anxiety episodes using evidence-based techniques.',
    content_type: 'interactive',
    tags: ['anxiety', 'breathing', 'grounding'],
    difficulty_level: 'intermediate',
    evidence_level: 'research_based',
    is_public: true,
    created_at: '2024-01-14T14:30:00Z',
    updated_at: '2024-01-14T14:30:00Z'
  },
  {
    id: '3',
    title: 'Depression Screening Guide',
    category: 'educational',
    subcategory: 'assessment',
    description: 'Comprehensive guide for conducting depression screenings with interpretation guidelines.',
    content_type: 'pdf',
    tags: ['depression', 'screening', 'PHQ-9'],
    difficulty_level: 'advanced',
    evidence_level: 'clinical_consensus',
    is_public: true,
    created_at: '2024-01-13T09:15:00Z',
    updated_at: '2024-01-13T09:15:00Z'
  },
  {
    id: '4',
    title: 'Mindfulness Meditation Scripts',
    category: 'intervention',
    subcategory: 'mindfulness',
    description: 'Collection of guided meditation scripts for various therapeutic contexts.',
    content_type: 'audio',
    tags: ['mindfulness', 'meditation', 'relaxation'],
    difficulty_level: 'beginner',
    evidence_level: 'research_based',
    is_public: true,
    created_at: '2024-01-12T16:45:00Z',
    updated_at: '2024-01-12T16:45:00Z'
  },
  {
    id: '5',
    title: 'Trauma-Informed Care Guidelines',
    category: 'protocol',
    subcategory: 'trauma',
    description: 'Best practices for providing trauma-informed care in therapeutic settings.',
    content_type: 'text',
    tags: ['trauma', 'PTSD', 'safety'],
    difficulty_level: 'advanced',
    evidence_level: 'research_based',
    is_public: true,
    created_at: '2024-01-11T11:20:00Z',
    updated_at: '2024-01-11T11:20:00Z'
  },
  {
    id: '6',
    title: 'Behavioral Activation Worksheet',
    category: 'worksheet',
    subcategory: 'behavioral',
    description: 'Activity scheduling and mood monitoring worksheet for depression treatment.',
    content_type: 'pdf',
    tags: ['behavioral-activation', 'depression', 'activity-scheduling'],
    difficulty_level: 'intermediate',
    evidence_level: 'research_based',
    is_public: true,
    created_at: '2024-01-10T13:30:00Z',
    updated_at: '2024-01-10T13:30:00Z'
  }
]

const CATEGORIES = [
  { id: 'all', name: 'All Resources', icon: Library, color: 'blue' },
  { id: 'worksheet', name: 'Worksheets', icon: FileText, color: 'green' },
  { id: 'educational', name: 'Educational', icon: BookOpen, color: 'purple' },
  { id: 'intervention', name: 'Interventions', icon: Target, color: 'orange' },
  { id: 'protocol', name: 'Protocols', icon: Shield, color: 'red' },
  { id: 'research', name: 'Research', icon: Brain, color: 'indigo' }
]

export default function ResourceLibrary() {
  const [resources, setResources] = useState<Resource[]>([])
  const [filteredResources, setFilteredResources] = useState<Resource[]>([])
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [showFilters, setShowFilters] = useState(false)
  const [difficultyFilter, setDifficultyFilter] = useState('all')
  const [evidenceFilter, setEvidenceFilter] = useState('all')
  const [selectedResource, setSelectedResource] = useState<Resource | null>(null)
  const [showAssignModal, setShowAssignModal] = useState(false)
  const [clients, setClients] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const { profile } = useAuth()

  useEffect(() => {
    fetchResources()
    fetchClients()
  }, [profile])

  useEffect(() => {
    filterResources()
  }, [resources, selectedCategory, searchTerm, difficultyFilter, evidenceFilter])

  const fetchResources = async () => {
    try {
      const { data, error } = await supabase
        .from('resource_library')
        .select('*')
        .eq('is_public', true)
        .order('created_at', { ascending: false })

      if (error) {
        console.warn('Database resources not available, using sample data:', error)
        setResources(SAMPLE_RESOURCES)
      } else {
        setResources(data || SAMPLE_RESOURCES)
      }
    } catch (error) {
      console.error('Error fetching resources:', error)
      setResources(SAMPLE_RESOURCES)
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

  const filterResources = () => {
    let filtered = resources

    if (selectedCategory !== 'all') {
      filtered = filtered.filter(r => r.category === selectedCategory)
    }

    if (searchTerm) {
      filtered = filtered.filter(r =>
        r.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.tags?.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
      )
    }

    if (difficultyFilter !== 'all') {
      filtered = filtered.filter(r => r.difficulty_level === difficultyFilter)
    }

    if (evidenceFilter !== 'all') {
      filtered = filtered.filter(r => r.evidence_level === evidenceFilter)
    }

    setFilteredResources(filtered)
  }

  const getContentTypeIcon = (type?: string) => {
    switch (type) {
      case 'pdf': return <FileText className="w-4 h-4" />
      case 'video': return <Video className="w-4 h-4" />
      case 'audio': return <Headphones className="w-4 h-4" />
      case 'interactive': return <Zap className="w-4 h-4" />
      default: return <FileText className="w-4 h-4" />
    }
  }

  const getDifficultyColor = (level?: string) => {
    switch (level) {
      case 'beginner': return 'bg-green-100 text-green-800'
      case 'intermediate': return 'bg-yellow-100 text-yellow-800'
      case 'advanced': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getEvidenceColor = (level?: string) => {
    switch (level) {
      case 'research_based': return 'bg-blue-100 text-blue-800'
      case 'clinical_consensus': return 'bg-purple-100 text-purple-800'
      case 'expert_opinion': return 'bg-orange-100 text-orange-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getCategoryIcon = (category: string) => {
    const cat = CATEGORIES.find(c => c.id === category)
    return cat ? cat.icon : FileText
  }

  const assignResource = async (resourceId: string, clientIds: string[]) => {
    try {
      const resource = resources.find(r => r.id === resourceId)
      if (!resource) return

      const assignments = clientIds.map(clientId => ({
        therapist_id: profile!.id,
        client_id: clientId,
        form_type: 'worksheet',
        title: resource.title,
        instructions: resource.description || 'Please review this resource.',
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

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Fixed Header */}
      <div className="flex-shrink-0 border-b border-gray-200 bg-white">
        {/* Title and Search Bar */}
        <div className="p-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Resource Library</h2>
              <p className="text-sm text-gray-600">Evidence-based therapeutic resources and tools</p>
            </div>
            
            <div className="flex items-center space-x-3">
              {/* Search */}
              <div className="relative flex-1 sm:w-64">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search resources..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                />
              </div>

              {/* View Toggle */}
              <div className="flex border border-gray-300 rounded-lg overflow-hidden">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 ${viewMode === 'grid' ? 'bg-blue-500 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
                >
                  <Grid3X3 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 ${viewMode === 'list' ? 'bg-blue-500 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
                >
                  <List className="w-4 h-4" />
                </button>
              </div>

              {/* Filters Toggle */}
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`p-2 border border-gray-300 rounded-lg ${showFilters ? 'bg-blue-500 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
              >
                <Filter className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Advanced Filters */}
          {showFilters && (
            <div className="mt-4 p-4 bg-gray-50 rounded-lg">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Difficulty Level</label>
                  <select
                    value={difficultyFilter}
                    onChange={(e) => setDifficultyFilter(e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="all">All Levels</option>
                    <option value="beginner">Beginner</option>
                    <option value="intermediate">Intermediate</option>
                    <option value="advanced">Advanced</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Evidence Level</label>
                  <select
                    value={evidenceFilter}
                    onChange={(e) => setEvidenceFilter(e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="all">All Evidence</option>
                    <option value="research_based">Research Based</option>
                    <option value="clinical_consensus">Clinical Consensus</option>
                    <option value="expert_opinion">Expert Opinion</option>
                  </select>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Category Navigation */}
        <div className="px-4 py-3 border-b border-gray-100">
          <div className="flex space-x-2 overflow-x-auto">
            {CATEGORIES.map((category) => {
              const Icon = category.icon
              const isActive = selectedCategory === category.id
              const count = category.id === 'all' ? resources.length : resources.filter(r => r.category === category.id).length
              
              return (
                <button
                  key={category.id}
                  onClick={() => setSelectedCategory(category.id)}
                  className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                    isActive
                      ? 'bg-blue-500 text-white shadow-md'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{category.name}</span>
                  <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                    isActive ? 'bg-white bg-opacity-20' : 'bg-gray-200'
                  }`}>
                    {count}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-4">
          {filteredResources.length === 0 ? (
            <div className="text-center py-12">
              <Library className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No resources found</h3>
              <p className="mt-1 text-sm text-gray-500">
                {searchTerm ? 'Try adjusting your search or filters.' : 'No resources available in this category.'}
              </p>
            </div>
          ) : (
            <>
              {viewMode === 'grid' ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {filteredResources.map((resource) => {
                    const CategoryIcon = getCategoryIcon(resource.category)
                    return (
                      <div key={resource.id} className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-all hover:border-blue-300 group">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center space-x-2">
                            <div className="p-1.5 bg-blue-100 rounded-md">
                              <CategoryIcon className="w-4 h-4 text-blue-600" />
                            </div>
                            <div className="flex items-center space-x-1">
                              {getContentTypeIcon(resource.content_type)}
                              <span className="text-xs text-gray-500 capitalize">{resource.content_type}</span>
                            </div>
                          </div>
                          <button className="opacity-0 group-hover:opacity-100 transition-opacity">
                            <Star className="w-4 h-4 text-gray-400 hover:text-yellow-500" />
                          </button>
                        </div>

                        <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2 text-sm">{resource.title}</h3>
                        <p className="text-xs text-gray-600 mb-3 line-clamp-2">{resource.description}</p>

                        <div className="flex flex-wrap gap-1 mb-3">
                          {resource.difficulty_level && (
                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${getDifficultyColor(resource.difficulty_level)}`}>
                              {resource.difficulty_level}
                            </span>
                          )}
                          {resource.evidence_level && (
                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${getEvidenceColor(resource.evidence_level)}`}>
                              {resource.evidence_level?.replace('_', ' ')}
                            </span>
                          )}
                        </div>

                        <div className="flex space-x-2">
                          <button
                            onClick={() => setSelectedResource(resource)}
                            className="flex-1 flex items-center justify-center px-3 py-2 text-xs font-medium text-blue-700 bg-blue-50 rounded-md hover:bg-blue-100 transition-colors"
                          >
                            <Eye className="w-3 h-3 mr-1" />
                            Preview
                          </button>
                          <button
                            onClick={() => {
                              setSelectedResource(resource)
                              setShowAssignModal(true)
                            }}
                            className="flex-1 flex items-center justify-center px-3 py-2 text-xs font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors"
                          >
                            <Send className="w-3 h-3 mr-1" />
                            Assign
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredResources.map((resource) => {
                    const CategoryIcon = getCategoryIcon(resource.category)
                    return (
                      <div key={resource.id} className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-all hover:border-blue-300">
                        <div className="flex items-start justify-between">
                          <div className="flex items-start space-x-4 flex-1">
                            <div className="p-2 bg-blue-100 rounded-lg">
                              <CategoryIcon className="w-5 h-5 text-blue-600" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center space-x-2 mb-1">
                                <h3 className="font-semibold text-gray-900 truncate">{resource.title}</h3>
                                <div className="flex items-center space-x-1">
                                  {getContentTypeIcon(resource.content_type)}
                                  <span className="text-xs text-gray-500 capitalize">{resource.content_type}</span>
                                </div>
                              </div>
                              <p className="text-sm text-gray-600 mb-2 line-clamp-2">{resource.description}</p>
                              <div className="flex flex-wrap gap-1">
                                {resource.difficulty_level && (
                                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${getDifficultyColor(resource.difficulty_level)}`}>
                                    {resource.difficulty_level}
                                  </span>
                                )}
                                {resource.evidence_level && (
                                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${getEvidenceColor(resource.evidence_level)}`}>
                                    {resource.evidence_level?.replace('_', ' ')}
                                  </span>
                                )}
                                {resource.tags?.slice(0, 2).map((tag, index) => (
                                  <span key={index} className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded-full">
                                    {tag}
                                  </span>
                                ))}
                              </div>
                            </div>
                          </div>
                          <div className="flex space-x-2 ml-4">
                            <button
                              onClick={() => setSelectedResource(resource)}
                              className="flex items-center px-3 py-2 text-sm font-medium text-blue-700 bg-blue-50 rounded-md hover:bg-blue-100 transition-colors"
                            >
                              <Eye className="w-4 h-4 mr-1" />
                              Preview
                            </button>
                            <button
                              onClick={() => {
                                setSelectedResource(resource)
                                setShowAssignModal(true)
                              }}
                              className="flex items-center px-3 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors"
                            >
                              <Send className="w-4 h-4 mr-1" />
                              Assign
                            </button>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Resource Preview Modal */}
      {selectedResource && !showAssignModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => setSelectedResource(null)} />
            
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full">
              <div className="bg-white px-6 pt-6 pb-4">
                <div className="flex items-start justify-between mb-6">
                  <div className="flex items-start space-x-4">
                    <div className="p-3 bg-blue-100 rounded-lg">
                      {React.createElement(getCategoryIcon(selectedResource.category), { className: "w-6 h-6 text-blue-600" })}
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-gray-900">{selectedResource.title}</h3>
                      <p className="text-gray-600 mt-1">{selectedResource.description}</p>
                      <div className="flex items-center space-x-4 mt-2">
                        <div className="flex items-center space-x-1">
                          {getContentTypeIcon(selectedResource.content_type)}
                          <span className="text-sm text-gray-500 capitalize">{selectedResource.content_type}</span>
                        </div>
                        <span className="text-sm text-gray-500">Category: {selectedResource.category}</span>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedResource(null)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="lg:col-span-2">
                    <div className="bg-gray-50 rounded-lg p-6 h-64 flex items-center justify-center">
                      <div className="text-center">
                        {getContentTypeIcon(selectedResource.content_type)}
                        <p className="text-gray-600 mt-2">Resource preview would be displayed here</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">Details</h4>
                      <div className="space-y-2 text-sm">
                        {selectedResource.difficulty_level && (
                          <div className="flex justify-between">
                            <span className="text-gray-600">Difficulty:</span>
                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${getDifficultyColor(selectedResource.difficulty_level)}`}>
                              {selectedResource.difficulty_level}
                            </span>
                          </div>
                        )}
                        {selectedResource.evidence_level && (
                          <div className="flex justify-between">
                            <span className="text-gray-600">Evidence:</span>
                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${getEvidenceColor(selectedResource.evidence_level)}`}>
                              {selectedResource.evidence_level?.replace('_', ' ')}
                            </span>
                          </div>
                        )}
                        <div className="flex justify-between">
                          <span className="text-gray-600">Created:</span>
                          <span>{new Date(selectedResource.created_at).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>

                    {selectedResource.tags && selectedResource.tags.length > 0 && (
                      <div>
                        <h4 className="font-medium text-gray-900 mb-2">Tags</h4>
                        <div className="flex flex-wrap gap-1">
                          {selectedResource.tags.map((tag, index) => (
                            <span key={index} className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded-full">
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="space-y-2">
                      <button
                        onClick={() => setShowAssignModal(true)}
                        className="w-full flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        <Send className="w-4 h-4 mr-2" />
                        Assign to Clients
                      </button>
                      <button className="w-full flex items-center justify-center px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors">
                        <Download className="w-4 h-4 mr-2" />
                        Download
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Assign Resource Modal */}
      {showAssignModal && selectedResource && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => setShowAssignModal(false)} />
            
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-white px-6 pt-6 pb-4">
                <div className="flex items-start justify-between mb-6">
                  <h3 className="text-lg font-medium text-gray-900">
                    Assign: {selectedResource.title}
                  </h3>
                  <button
                    onClick={() => setShowAssignModal(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <AssignResourceForm
                  resource={selectedResource}
                  clients={clients}
                  onAssign={assignResource}
                  onCancel={() => setShowAssignModal(false)}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Assign Resource Form Component
interface AssignResourceFormProps {
  resource: Resource
  clients: any[]
  onAssign: (resourceId: string, clientIds: string[]) => void
  onCancel: () => void
}

const AssignResourceForm: React.FC<AssignResourceFormProps> = ({ resource, clients, onAssign, onCancel }) => {
  const [selectedClients, setSelectedClients] = useState<string[]>([])

  const toggleClient = (clientId: string) => {
    setSelectedClients(prev => 
      prev.includes(clientId) 
        ? prev.filter(id => id !== clientId)
        : [...prev, clientId]
    )
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (selectedClients.length > 0) {
      onAssign(resource.id, selectedClients)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">
          Select Clients ({selectedClients.length} selected)
        </label>
        <div className="max-h-48 overflow-y-auto border border-gray-300 rounded-lg">
          {clients.length === 0 ? (
            <div className="p-4 text-center text-gray-500">
              <Users className="w-8 h-8 mx-auto mb-2 text-gray-400" />
              <p className="text-sm">No clients available</p>
            </div>
          ) : (
            clients.map((client) => (
              <label key={client.id} className="flex items-center p-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0">
                <input
                  type="checkbox"
                  checked={selectedClients.includes(client.id)}
                  onChange={() => toggleClient(client.id)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <div className="ml-3 flex-1">
                  <div className="text-sm font-medium text-gray-900">
                    {client.first_name} {client.last_name}
                  </div>
                  <div className="text-xs text-gray-500">{client.email}</div>
                </div>
              </label>
            ))
          )}
        </div>
      </div>

      <div className="flex space-x-3 pt-4">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={selectedClients.length === 0}
          className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Assign Resource
        </button>
      </div>
    </form>
  )
}