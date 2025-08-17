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
  X,
  Users,
  Tag,
  Award,
  Target,
  Brain,
  Shield,
  Zap,
  CheckCircle
} from 'lucide-react'

interface Resource {
  id: string
  title: string
  category: string
  subcategory?: string
  description?: string
  content_type?: string
  tags?: string[]
  difficulty_level?: string
  evidence_level?: string
  is_public?: boolean
  created_at: string
}

const SAMPLE_RESOURCES: Resource[] = [
  {
    id: '1',
    title: 'CBT Thought Record Worksheet',
    category: 'worksheet',
    subcategory: 'cognitive',
    description: 'A comprehensive thought record worksheet for identifying and challenging negative thought patterns using evidence-based CBT techniques.',
    content_type: 'pdf',
    tags: ['CBT', 'thought-challenging', 'cognitive-restructuring', 'anxiety', 'depression'],
    difficulty_level: 'beginner',
    evidence_level: 'research_based',
    is_public: true,
    created_at: '2024-01-15T10:00:00Z'
  },
  {
    id: '2',
    title: 'Anxiety Management Protocol',
    category: 'protocol',
    subcategory: 'anxiety',
    description: 'Step-by-step evidence-based protocol for managing acute anxiety episodes using breathing techniques and grounding exercises.',
    content_type: 'interactive',
    tags: ['anxiety', 'breathing', 'grounding', 'panic', 'mindfulness'],
    difficulty_level: 'intermediate',
    evidence_level: 'research_based',
    is_public: true,
    created_at: '2024-01-14T14:30:00Z'
  },
  {
    id: '3',
    title: 'Depression Screening Guide',
    category: 'educational',
    subcategory: 'assessment',
    description: 'Comprehensive guide for conducting depression screenings with PHQ-9 interpretation guidelines and clinical recommendations.',
    content_type: 'pdf',
    tags: ['depression', 'screening', 'PHQ-9', 'assessment', 'diagnosis'],
    difficulty_level: 'advanced',
    evidence_level: 'clinical_consensus',
    is_public: true,
    created_at: '2024-01-13T09:15:00Z'
  },
  {
    id: '4',
    title: 'Mindfulness Meditation Scripts',
    category: 'intervention',
    subcategory: 'mindfulness',
    description: 'Collection of guided meditation scripts for various therapeutic contexts including body scan, breathing, and loving-kindness practices.',
    content_type: 'audio',
    tags: ['mindfulness', 'meditation', 'relaxation', 'body-scan', 'breathing'],
    difficulty_level: 'beginner',
    evidence_level: 'research_based',
    is_public: true,
    created_at: '2024-01-12T16:45:00Z'
  },
  {
    id: '5',
    title: 'Trauma-Informed Care Guidelines',
    category: 'protocol',
    subcategory: 'trauma',
    description: 'Best practices for providing trauma-informed care in therapeutic settings with safety protocols and intervention strategies.',
    content_type: 'text',
    tags: ['trauma', 'PTSD', 'safety', 'guidelines', 'intervention'],
    difficulty_level: 'advanced',
    evidence_level: 'research_based',
    is_public: true,
    created_at: '2024-01-11T11:20:00Z'
  },
  {
    id: '6',
    title: 'Behavioral Activation Worksheet',
    category: 'worksheet',
    subcategory: 'behavioral',
    description: 'Activity scheduling and mood monitoring worksheet for depression treatment using behavioral activation principles.',
    content_type: 'pdf',
    tags: ['behavioral-activation', 'depression', 'activity-scheduling', 'mood-tracking'],
    difficulty_level: 'intermediate',
    evidence_level: 'research_based',
    is_public: true,
    created_at: '2024-01-10T13:30:00Z'
  }
]

const CATEGORIES = [
  { id: 'all', name: 'All', icon: Library, count: 0 },
  { id: 'worksheet', name: 'Worksheets', icon: FileText, count: 0 },
  { id: 'educational', name: 'Educational', icon: BookOpen, count: 0 },
  { id: 'intervention', name: 'Interventions', icon: Target, count: 0 },
  { id: 'protocol', name: 'Protocols', icon: Shield, count: 0 },
  { id: 'research', name: 'Research', icon: Brain, count: 0 }
]

export default function ResourceLibrary() {
  const [resources, setResources] = useState<Resource[]>([])
  const [filteredResources, setFilteredResources] = useState<Resource[]>([])
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [difficultyFilter, setDifficultyFilter] = useState('all')
  const [evidenceFilter, setEvidenceFilter] = useState('all')
  const [selectedResource, setSelectedResource] = useState<Resource | null>(null)
  const [showAssignModal, setShowAssignModal] = useState(false)
  const [clients, setClients] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [bookmarkedResources, setBookmarkedResources] = useState<string[]>([])
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

      if (error || !data || data.length === 0) {
        console.log('Using sample resources')
        setResources(SAMPLE_RESOURCES)
      } else {
        setResources(data)
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

  const getContentTypeColor = (type?: string) => {
    switch (type) {
      case 'pdf': return 'text-red-600 bg-red-50'
      case 'video': return 'text-purple-600 bg-purple-50'
      case 'audio': return 'text-green-600 bg-green-50'
      case 'interactive': return 'text-blue-600 bg-blue-50'
      default: return 'text-gray-600 bg-gray-50'
    }
  }

  const getDifficultyColor = (level?: string) => {
    switch (level) {
      case 'beginner': return 'text-emerald-700 bg-emerald-100'
      case 'intermediate': return 'text-amber-700 bg-amber-100'
      case 'advanced': return 'text-rose-700 bg-rose-100'
      default: return 'text-gray-700 bg-gray-100'
    }
  }

  const getEvidenceColor = (level?: string) => {
    switch (level) {
      case 'research_based': return 'text-blue-700 bg-blue-100'
      case 'clinical_consensus': return 'text-violet-700 bg-violet-100'
      case 'expert_opinion': return 'text-orange-700 bg-orange-100'
      default: return 'text-gray-700 bg-gray-100'
    }
  }

  const getCategoryIcon = (category: string) => {
    const cat = CATEGORIES.find(c => c.id === category)
    return cat ? cat.icon : FileText
  }

  const toggleBookmark = (resourceId: string) => {
    setBookmarkedResources(prev => 
      prev.includes(resourceId) 
        ? prev.filter(id => id !== resourceId)
        : [...prev, resourceId]
    )
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

  // Update category counts
  const categoriesWithCounts = CATEGORIES.map(cat => ({
    ...cat,
    count: cat.id === 'all' ? resources.length : resources.filter(r => r.category === cat.id).length
  }))

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center bg-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-200 border-t-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Loading resources...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Fixed Header */}
      <div className="flex-shrink-0 bg-white border-b border-gray-200">
        {/* Top Bar */}
        <div className="p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl shadow-lg">
                <Library className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Resource Library</h1>
                <p className="text-sm text-gray-600">Evidence-based therapeutic resources and tools</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              {/* View Toggle */}
              <div className="flex bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 rounded-md transition-all ${
                    viewMode === 'grid' 
                      ? 'bg-white text-blue-600 shadow-sm' 
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <Grid3X3 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 rounded-md transition-all ${
                    viewMode === 'list' 
                      ? 'bg-white text-blue-600 shadow-sm' 
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <List className="w-4 h-4" />
                </button>
              </div>

              <button className="p-2 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50">
                <Filter className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Search Bar */}
          <div className="relative mb-4">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search resources, tags, or descriptions..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-50 focus:bg-white transition-all"
            />
          </div>

          {/* Category Pills */}
          <div className="flex space-x-2 overflow-x-auto pb-2">
            {categoriesWithCounts.map((category) => {
              const Icon = category.icon
              const isActive = selectedCategory === category.id
              
              return (
                <button
                  key={category.id}
                  onClick={() => setSelectedCategory(category.id)}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all border ${
                    isActive
                      ? 'bg-blue-100 text-blue-700 border-blue-200 shadow-sm'
                      : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50 hover:border-gray-300'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{category.name}</span>
                  <span className={`px-2 py-0.5 text-xs rounded-full ${
                    isActive 
                      ? 'bg-blue-200 text-blue-800' 
                      : 'bg-gray-200 text-gray-600'
                  }`}>
                    {category.count}
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
          {/* Results Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-600">
                Showing {filteredResources.length} of {resources.length} resources
              </span>
              {(searchTerm || selectedCategory !== 'all') && (
                <button
                  onClick={() => {
                    setSearchTerm('')
                    setSelectedCategory('all')
                    setDifficultyFilter('all')
                    setEvidenceFilter('all')
                  }}
                  className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                >
                  Clear filters
                </button>
              )}
            </div>
          </div>

          {/* Content */}
          {filteredResources.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Library className="w-10 h-10 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No resources found</h3>
              <p className="text-gray-600 mb-6">
                {searchTerm ? 'Try adjusting your search or filters.' : 'No resources available in this category.'}
              </p>
              <button className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                <Plus className="w-4 h-4 mr-2" />
                Create Custom Resource
              </button>
            </div>
          ) : (
            <>
              {viewMode === 'grid' ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {filteredResources.map((resource) => {
                    const CategoryIcon = getCategoryIcon(resource.category)
                    const isBookmarked = bookmarkedResources.includes(resource.id)
                    
                    return (
                      <div key={resource.id} className="group bg-white border border-gray-200 rounded-xl p-6 hover:shadow-lg hover:border-blue-200 transition-all duration-200 hover:-translate-y-1">
                        {/* Header */}
                        <div className="flex items-start justify-between mb-4">
                          <div className="p-2 rounded-lg bg-blue-100">
                            <CategoryIcon className="w-5 h-5 text-blue-600" />
                          </div>
                          <div className="flex items-center space-x-1">
                            <button
                              onClick={() => toggleBookmark(resource.id)}
                              className={`p-1.5 rounded-lg transition-all ${
                                isBookmarked 
                                  ? 'text-yellow-500 bg-yellow-50' 
                                  : 'text-gray-400 hover:text-yellow-500 hover:bg-yellow-50'
                              }`}
                            >
                              <Star className={`w-4 h-4 ${isBookmarked ? 'fill-current' : ''}`} />
                            </button>
                          </div>
                        </div>

                        {/* Content */}
                        <div className="mb-4">
                          <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2 group-hover:text-blue-900 transition-colors">
                            {resource.title}
                          </h3>
                          <p className="text-sm text-gray-600 line-clamp-3 leading-relaxed">
                            {resource.description}
                          </p>
                        </div>

                        {/* Metadata */}
                        <div className="space-y-3 mb-4">
                          <div className="flex items-center justify-between">
                            <div className={`flex items-center space-x-1 px-2 py-1 rounded-md text-xs font-medium ${getContentTypeColor(resource.content_type)}`}>
                              {getContentTypeIcon(resource.content_type)}
                              <span className="capitalize">{resource.content_type}</span>
                            </div>
                            <span className="text-xs text-gray-500">
                              {new Date(resource.created_at).toLocaleDateString()}
                            </span>
                          </div>

                          <div className="flex flex-wrap gap-1">
                            {resource.difficulty_level && (
                              <span className={`px-2 py-1 text-xs font-medium rounded-md ${getDifficultyColor(resource.difficulty_level)}`}>
                                {resource.difficulty_level}
                              </span>
                            )}
                            {resource.evidence_level && (
                              <span className={`px-2 py-1 text-xs font-medium rounded-md ${getEvidenceColor(resource.evidence_level)}`}>
                                {resource.evidence_level?.replace('_', ' ')}
                              </span>
                            )}
                          </div>

                          {resource.tags && resource.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {resource.tags.slice(0, 3).map((tag, index) => (
                                <span key={index} className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded-md">
                                  #{tag}
                                </span>
                              ))}
                              {resource.tags.length > 3 && (
                                <span className="px-2 py-1 text-xs bg-gray-100 text-gray-500 rounded-md">
                                  +{resource.tags.length - 3} more
                                </span>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Actions */}
                        <div className="flex space-x-2">
                          <button
                            onClick={() => setSelectedResource(resource)}
                            className="flex-1 flex items-center justify-center px-3 py-2 text-sm font-medium text-blue-700 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                          >
                            <Eye className="w-4 h-4 mr-1" />
                            Preview
                          </button>
                          <button
                            onClick={() => {
                              setSelectedResource(resource)
                              setShowAssignModal(true)
                            }}
                            className="flex-1 flex items-center justify-center px-3 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
                          >
                            <Send className="w-4 h-4 mr-1" />
                            Assign
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredResources.map((resource) => {
                    const CategoryIcon = getCategoryIcon(resource.category)
                    const isBookmarked = bookmarkedResources.includes(resource.id)
                    
                    return (
                      <div key={resource.id} className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-md hover:border-blue-200 transition-all">
                        <div className="flex items-start justify-between">
                          <div className="flex items-start space-x-4 flex-1">
                            <div className="p-3 rounded-xl bg-blue-100 flex-shrink-0">
                              <CategoryIcon className="w-6 h-6 text-blue-600" />
                            </div>
                            
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between mb-2">
                                <h3 className="font-semibold text-gray-900 text-lg leading-tight">
                                  {resource.title}
                                </h3>
                                <div className="flex items-center space-x-2 ml-4">
                                  <div className={`flex items-center space-x-1 px-2 py-1 rounded-lg text-xs font-medium ${getContentTypeColor(resource.content_type)}`}>
                                    {getContentTypeIcon(resource.content_type)}
                                    <span className="capitalize">{resource.content_type}</span>
                                  </div>
                                  <button
                                    onClick={() => toggleBookmark(resource.id)}
                                    className={`p-1.5 rounded-lg transition-all ${
                                      isBookmarked 
                                        ? 'text-yellow-500 bg-yellow-50' 
                                        : 'text-gray-400 hover:text-yellow-500 hover:bg-yellow-50'
                                    }`}
                                  >
                                    <Star className={`w-4 h-4 ${isBookmarked ? 'fill-current' : ''}`} />
                                  </button>
                                </div>
                              </div>
                              
                              <p className="text-gray-600 mb-3 leading-relaxed">
                                {resource.description}
                              </p>
                              
                              <div className="flex flex-wrap items-center gap-2 mb-4">
                                {resource.difficulty_level && (
                                  <span className={`px-3 py-1 text-xs font-medium rounded-full ${getDifficultyColor(resource.difficulty_level)}`}>
                                    {resource.difficulty_level}
                                  </span>
                                )}
                                {resource.evidence_level && (
                                  <span className={`px-3 py-1 text-xs font-medium rounded-full ${getEvidenceColor(resource.evidence_level)}`}>
                                    {resource.evidence_level?.replace('_', ' ')}
                                  </span>
                                )}
                                <span className="text-xs text-gray-500">
                                  {new Date(resource.created_at).toLocaleDateString()}
                                </span>
                              </div>

                              {resource.tags && resource.tags.length > 0 && (
                                <div className="flex flex-wrap gap-1 mb-4">
                                  {resource.tags.slice(0, 5).map((tag, index) => (
                                    <span key={index} className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded-md">
                                      #{tag}
                                    </span>
                                  ))}
                                  {resource.tags.length > 5 && (
                                    <span className="px-2 py-1 text-xs bg-gray-100 text-gray-500 rounded-md">
                                      +{resource.tags.length - 5}
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                          
                          <div className="flex flex-col space-y-2 ml-4">
                            <button
                              onClick={() => setSelectedResource(resource)}
                              className="flex items-center px-4 py-2 text-sm font-medium text-blue-700 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                            >
                              <Eye className="w-4 h-4 mr-2" />
                              Preview
                            </button>
                            <button
                              onClick={() => {
                                setSelectedResource(resource)
                                setShowAssignModal(true)
                              }}
                              className="flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
                            >
                              <Send className="w-4 h-4 mr-2" />
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
            <div className="fixed inset-0 bg-gray-900 bg-opacity-50 transition-opacity" onClick={() => setSelectedResource(null)} />
            
            <div className="inline-block align-bottom bg-white rounded-2xl text-left overflow-hidden shadow-2xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full">
              <div className="bg-white">
                {/* Modal Header */}
                <div className="flex items-start justify-between p-6 border-b border-gray-200">
                  <div className="flex items-start space-x-4">
                    <div className="p-3 rounded-xl bg-blue-100">
                      {React.createElement(getCategoryIcon(selectedResource.category), { 
                        className: 'w-6 h-6 text-blue-600' 
                      })}
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-gray-900 mb-1">{selectedResource.title}</h3>
                      <p className="text-gray-600">{selectedResource.description}</p>
                      <div className="flex items-center space-x-4 mt-2">
                        <div className={`flex items-center space-x-1 px-2 py-1 rounded-lg text-xs font-medium ${getContentTypeColor(selectedResource.content_type)}`}>
                          {getContentTypeIcon(selectedResource.content_type)}
                          <span className="capitalize">{selectedResource.content_type}</span>
                        </div>
                        <span className="text-sm text-gray-500">
                          Category: {selectedResource.category}
                        </span>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedResource(null)}
                    className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-all"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Modal Content */}
                <div className="p-6">
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2">
                      <div className="bg-gray-50 rounded-xl p-8 h-80 flex items-center justify-center">
                        <div className="text-center">
                          <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center mx-auto mb-4">
                            {getContentTypeIcon(selectedResource.content_type)}
                          </div>
                          <h4 className="font-medium text-gray-900 mb-2">Resource Preview</h4>
                          <p className="text-gray-600 text-sm">
                            {selectedResource.content_type === 'interactive' ? 'Interactive content preview' :
                             selectedResource.content_type === 'video' ? 'Video player would be displayed here' :
                             selectedResource.content_type === 'audio' ? 'Audio player would be displayed here' :
                             'Document preview would be displayed here'}
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="space-y-6">
                      {/* Details */}
                      <div>
                        <h4 className="font-semibold text-gray-900 mb-3">Resource Details</h4>
                        <div className="space-y-3">
                          {selectedResource.difficulty_level && (
                            <div className="flex justify-between items-center">
                              <span className="text-sm text-gray-600">Difficulty:</span>
                              <span className={`px-3 py-1 text-xs font-medium rounded-full ${getDifficultyColor(selectedResource.difficulty_level)}`}>
                                {selectedResource.difficulty_level}
                              </span>
                            </div>
                          )}
                          {selectedResource.evidence_level && (
                            <div className="flex justify-between items-center">
                              <span className="text-sm text-gray-600">Evidence:</span>
                              <span className={`px-3 py-1 text-xs font-medium rounded-full ${getEvidenceColor(selectedResource.evidence_level)}`}>
                                {selectedResource.evidence_level?.replace('_', ' ')}
                              </span>
                            </div>
                          )}
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-gray-600">Created:</span>
                            <span className="text-sm text-gray-900">
                              {new Date(selectedResource.created_at).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Tags */}
                      {selectedResource.tags && selectedResource.tags.length > 0 && (
                        <div>
                          <h4 className="font-semibold text-gray-900 mb-3">Tags</h4>
                          <div className="flex flex-wrap gap-2">
                            {selectedResource.tags.map((tag, index) => (
                              <span key={index} className="px-3 py-1 text-xs bg-gray-100 text-gray-700 rounded-full">
                                #{tag}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Actions */}
                      <div className="space-y-3">
                        <button
                          onClick={() => setShowAssignModal(true)}
                          className="w-full flex items-center justify-center px-4 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-medium"
                        >
                          <Send className="w-4 h-4 mr-2" />
                          Assign to Clients
                        </button>
                      </div>
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
            <div className="fixed inset-0 bg-gray-900 bg-opacity-50 transition-opacity" onClick={() => setShowAssignModal(false)} />
            
            <div className="inline-block align-bottom bg-white rounded-2xl text-left overflow-hidden shadow-2xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-white p-6">
                <div className="flex items-start justify-between mb-6">
                  <h3 className="text-lg font-semibold text-gray-900">
                    Assign: {selectedResource.title}
                  </h3>
                  <button
                    onClick={() => setShowAssignModal(false)}
                    className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-all"
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
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <div className="flex items-center justify-between mb-4">
          <label className="block text-sm font-medium text-gray-700">
            Select Clients
          </label>
          <span className="text-sm text-gray-500">
            {selectedClients.length} selected
          </span>
        </div>
        
        <div className="max-h-60 overflow-y-auto border border-gray-200 rounded-xl">
          {clients.length === 0 ? (
            <div className="p-6 text-center text-gray-500">
              <Users className="w-8 h-8 mx-auto mb-2 text-gray-400" />
              <p className="text-sm">No clients available</p>
              <p className="text-xs text-gray-400 mt-1">Add clients to your roster first</p>
            </div>
          ) : (
            clients.map((client, index) => (
              <label key={client.id} className={`flex items-center p-4 hover:bg-gray-50 cursor-pointer transition-colors ${
                index !== clients.length - 1 ? 'border-b border-gray-100' : ''
              }`}>
                <input
                  type="checkbox"
                  checked={selectedClients.includes(client.id)}
                  onChange={() => toggleClient(client.id)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <div className="ml-3 flex-1">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="text-xs font-medium text-blue-600">
                        {client.first_name[0]}{client.last_name[0]}
                      </span>
                    </div>
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {client.first_name} {client.last_name}
                      </div>
                      <div className="text-xs text-gray-500">{client.email}</div>
                    </div>
                  </div>
                </div>
              </label>
            ))
          )}
        </div>
      </div>

      <div className="flex space-x-3">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors font-medium"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={selectedClients.length === 0}
          className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
        >
          Assign Resource
        </button>
      </div>
    </form>
  )
}