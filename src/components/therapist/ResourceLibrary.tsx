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
  X,
  Grid3X3,
  List,
  SlidersHorizontal,
  ChevronDown,
  Bookmark,
  TrendingUp,
  Zap
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
  const [activeCategory, setActiveCategory] = useState<string>('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [difficultyFilter, setDifficultyFilter] = useState('all')
  const [evidenceFilter, setEvidenceFilter] = useState('all')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [showFilters, setShowFilters] = useState(false)
  const [selectedResource, setSelectedResource] = useState<Resource | null>(null)
  const [showAssignModal, setShowAssignModal] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [resources, setResources] = useState<Resource[]>([])
  const [clients, setClients] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { profile } = useAuth()

  const categories = [
    { id: 'all', name: 'All Resources', icon: Library, count: 0, color: 'blue' },
    { id: 'assessments', name: 'Assessments', icon: ClipboardList, count: 0, color: 'purple' },
    { id: 'worksheets', name: 'Worksheets', icon: FileText, count: 0, color: 'green' },
    { id: 'exercises', name: 'Exercises', icon: Gamepad2, count: 0, color: 'orange' },
    { id: 'treatments', name: 'Treatment Plans', icon: Brain, count: 0, color: 'indigo' },
    { id: 'education', name: 'Psychoeducation', icon: GraduationCap, count: 0, color: 'teal' }
  ]

  useEffect(() => {
    if (profile) {
      fetchResources()
      fetchClients()
    }
  }, [profile])

  const fetchResources = async () => {
    try {
      setError(null)
      
      const { data, error } = await supabase
        .from('resource_library')
        .select('*')
        .eq('is_public', true)
        .order('created_at', { ascending: false })

      if (error) throw error

      const transformedResources = data?.map(item => ({
        id: item.id,
        title: item.title,
        type: item.content_type || 'article',
        category: item.category,
        description: item.description || '',
        difficulty: item.difficulty_level || 'beginner',
        duration: item.content_data?.duration || 'Variable',
        rating: 4.5,
        usageCount: Math.floor(Math.random() * 100),
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
    const matchesCategory = activeCategory === 'all' || 
      (activeCategory === 'assessments' && resource.type === 'assessment') ||
      (activeCategory === 'worksheets' && resource.type === 'worksheet') ||
      (activeCategory === 'exercises' && resource.type === 'exercise') ||
      (activeCategory === 'treatments' && resource.type === 'treatment_plan') ||
      (activeCategory === 'education' && ['article', 'video', 'audio'].includes(resource.type))

    const matchesSearch = resource.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         resource.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         resource.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))

    const matchesDifficulty = difficultyFilter === 'all' || resource.difficulty === difficultyFilter
    const matchesEvidence = evidenceFilter === 'all' || 
      (evidenceFilter === 'evidence-based' && resource.evidenceBased) ||
      (evidenceFilter === 'clinical' && !resource.evidenceBased)

    return matchesCategory && matchesSearch && matchesDifficulty && matchesEvidence
  })

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'assessment': return <ClipboardList className="w-5 h-5" />
      case 'treatment_plan': return <Brain className="w-5 h-5" />
      case 'worksheet': return <FileText className="w-5 h-5" />
      case 'article': return <BookOpen className="w-5 h-5" />
      case 'video': return <Video className="w-5 h-5" />
      case 'audio': return <Headphones className="w-5 h-5" />
      case 'exercise': return <Gamepad2 className="w-5 h-5" />
      default: return <FileText className="w-5 h-5" />
    }
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'assessment': return 'text-purple-600 bg-purple-100'
      case 'treatment_plan': return 'text-indigo-600 bg-indigo-100'
      case 'worksheet': return 'text-green-600 bg-green-100'
      case 'article': return 'text-orange-600 bg-orange-100'
      case 'video': return 'text-red-600 bg-red-100'
      case 'audio': return 'text-blue-600 bg-blue-100'
      case 'exercise': return 'text-amber-600 bg-amber-100'
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

  const getCategoryColor = (categoryId: string) => {
    const category = categories.find(c => c.id === categoryId)
    switch (category?.color) {
      case 'purple': return 'bg-purple-500 hover:bg-purple-600'
      case 'green': return 'bg-green-500 hover:bg-green-600'
      case 'orange': return 'bg-orange-500 hover:bg-orange-600'
      case 'indigo': return 'bg-indigo-500 hover:bg-indigo-600'
      case 'teal': return 'bg-teal-500 hover:bg-teal-600'
      default: return 'bg-blue-500 hover:bg-blue-600'
    }
  }

  const renderStarRating = (rating: number) => {
    return (
      <div className="flex items-center space-x-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`w-4 h-4 ${
              star <= rating ? 'text-yellow-400 fill-current' : 'text-gray-300'
            }`}
          />
        ))}
        <span className="text-sm text-gray-600 ml-1">{rating}</span>
      </div>
    )
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
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header with Search and Actions */}
      <div className="bg-white border-b border-gray-200 p-4 flex-shrink-0">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between space-y-4 lg:space-y-0">
          <div>
            <h2 className="text-xl font-bold text-gray-900 flex items-center">
              <Library className="w-5 h-5 mr-2 text-blue-600" />
              Resource Library
            </h2>
            <p className="text-sm text-gray-600">Evidence-based tools and therapeutic resources</p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1 sm:flex-none sm:w-64">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search resources..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              />
            </div>
            
            <div className="flex space-x-2">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`inline-flex items-center px-4 py-2 border rounded-lg text-sm font-medium transition-colors ${
                  showFilters 
                    ? 'bg-blue-50 border-blue-300 text-blue-700' 
                    : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                <SlidersHorizontal className="w-4 h-4 mr-2" />
                Filters
                <ChevronDown className={`w-4 h-4 ml-2 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
              </button>
              
              <div className="flex border border-gray-300 rounded-lg overflow-hidden">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`px-3 py-2 text-sm ${
                    viewMode === 'grid' 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <Grid3X3 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`px-3 py-2 text-sm ${
                    viewMode === 'list' 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <List className="w-4 h-4" />
                </button>
              </div>
              
              <button
                onClick={() => setShowCreateModal(true)}
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create
              </button>
            </div>
          </div>
        </div>

        {/* Advanced Filters */}
        {showFilters && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Difficulty Level</label>
                <select
                  value={difficultyFilter}
                  onChange={(e) => setDifficultyFilter(e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="all">All Levels</option>
                  <option value="beginner">Beginner</option>
                  <option value="intermediate">Intermediate</option>
                  <option value="advanced">Advanced</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Evidence Base</label>
                <select
                  value={evidenceFilter}
                  onChange={(e) => setEvidenceFilter(e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="all">All Types</option>
                  <option value="evidence-based">Evidence-Based</option>
                  <option value="clinical">Clinical Practice</option>
                </select>
              </div>
              
              <div className="flex items-end">
                <button
                  onClick={() => {
                    setDifficultyFilter('all')
                    setEvidenceFilter('all')
                    setSearchTerm('')
                  }}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                >
                  Clear Filters
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Category Navigation */}
      <div className="bg-white border-b border-gray-200 p-4 flex-shrink-0">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {categories.map((category) => {
            const Icon = category.icon
            const isActive = activeCategory === category.id
            const categoryResources = category.id === 'all' 
              ? resources 
              : resources.filter(r => {
                  if (category.id === 'assessments') return r.type === 'assessment'
                  if (category.id === 'worksheets') return r.type === 'worksheet'
                  if (category.id === 'exercises') return r.type === 'exercise'
                  if (category.id === 'treatments') return r.type === 'treatment_plan'
                  if (category.id === 'education') return ['article', 'video', 'audio'].includes(r.type)
                  return false
                })
            
            return (
              <button
                key={category.id}
                onClick={() => setActiveCategory(category.id)}
                className={`p-3 rounded-lg border-2 transition-all text-center ${
                  isActive
                    ? `border-${category.color}-500 bg-${category.color}-50`
                    : 'border-gray-200 hover:border-gray-300 bg-white hover:bg-gray-50'
                }`}
              >
                <Icon className={`w-6 h-6 mx-auto mb-2 ${
                  isActive ? `text-${category.color}-600` : 'text-gray-400'
                }`} />
                <div className={`text-sm font-medium ${
                  isActive ? `text-${category.color}-900` : 'text-gray-700'
                }`}>
                  {category.name}
                </div>
                <div className={`text-xs ${
                  isActive ? `text-${category.color}-700` : 'text-gray-500'
                }`}>
                  {categoryResources.length} items
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Resources Content */}
      <div className="bg-white flex-1 flex flex-col overflow-hidden">
        {/* Content Header */}
        <div className="px-4 py-3 border-b border-gray-200 flex-shrink-0">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold text-gray-900">
              {categories.find(c => c.id === activeCategory)?.name || 'All Resources'}
            </h3>
            <div className="flex items-center space-x-2 text-sm text-gray-500">
              <span>{filteredResources.length} resources</span>
            </div>
          </div>
        </div>

        {/* Resources Grid/List */}
        <div className="flex-1 overflow-y-auto p-4">
          {filteredResources.length === 0 ? (
            <div className="text-center py-12">
              <Library className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No resources found</h3>
              <p className="text-gray-600 mb-6">
                {searchTerm || difficultyFilter !== 'all' || evidenceFilter !== 'all'
                  ? 'Try adjusting your search terms or filters.'
                  : 'Create your first custom resource to get started.'
                }
              </p>
              <button
                onClick={() => setShowCreateModal(true)}
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create Resource
              </button>
            </div>
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredResources.map((resource) => (
                <div key={resource.id} className="group bg-white border border-gray-200 rounded-lg hover:shadow-md transition-all duration-200 overflow-hidden">
                  {/* Card Header */}
                  <div className="p-4">
                    <div className="flex items-start justify-between mb-4">
                      <div className={`p-3 rounded-lg ${getTypeColor(resource.type)}`}>
                        {getTypeIcon(resource.type)}
                      </div>
                      <div className="flex items-center space-x-2">
                        {resource.evidenceBased && (
                          <div className="p-1 bg-green-100 rounded-full">
                            <Award className="w-4 h-4 text-green-600" />
                          </div>
                        )}
                        <button className="p-1 hover:bg-gray-100 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                          <Bookmark className="w-4 h-4 text-gray-400" />
                        </button>
                      </div>
                    </div>
                    
                    <h4 className="text-base font-semibold text-gray-900 mb-2 line-clamp-2">
                      {resource.title}
                    </h4>
                    <p className="text-sm text-gray-600 mb-4 line-clamp-3">
                      {resource.description}
                    </p>
                    
                    {/* Metadata */}
                    <div className="flex items-center justify-between mb-4">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getDifficultyColor(resource.difficulty)}`}>
                        {resource.difficulty}
                      </span>
                      <div className="flex items-center space-x-1 text-gray-500">
                        <Clock className="w-4 h-4" />
                        <span className="text-xs">{resource.duration}</span>
                      </div>
                    </div>
                    
                    {/* Rating and Usage */}
                    <div className="flex items-center justify-between mb-4">
                      {renderStarRating(resource.rating)}
                      <div className="flex items-center space-x-1 text-gray-500">
                        <Users className="w-4 h-4" />
                        <span className="text-xs">{resource.usageCount}</span>
                      </div>
                    </div>
                    
                    {/* Tags */}
                    <div className="flex flex-wrap gap-1 mb-4">
                      {resource.tags.slice(0, 3).map((tag, index) => (
                        <span key={index} className="inline-flex px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded">
                          {tag}
                        </span>
                      ))}
                      {resource.tags.length > 3 && (
                        <span className="inline-flex px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded">
                          +{resource.tags.length - 3}
                        </span>
                      )}
                    </div>
                    
                    {/* Card Actions */}
                    <div className="flex space-x-2">
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
                </div>
              ))}
            </div>
          ) : (
            /* List View */
            <div className="space-y-4">
              {filteredResources.map((resource) => (
                <div key={resource.id} className="flex items-center space-x-4 p-4 border border-gray-200 rounded-lg hover:shadow-sm transition-shadow">
                  <div className={`p-3 rounded-lg flex-shrink-0 ${getTypeColor(resource.type)}`}>
                    {getTypeIcon(resource.type)}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <h4 className="text-base font-semibold text-gray-900 truncate">{resource.title}</h4>
                        <p className="text-sm text-gray-600 mt-1 line-clamp-2">{resource.description}</p>
                        
                        <div className="flex items-center space-x-4 mt-3">
                          <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getDifficultyColor(resource.difficulty)}`}>
                            {resource.difficulty}
                          </span>
                          <div className="flex items-center space-x-1 text-gray-500">
                            <Clock className="w-4 h-4" />
                            <span className="text-xs">{resource.duration}</span>
                          </div>
                          {renderStarRating(resource.rating)}
                          {resource.evidenceBased && (
                            <div className="flex items-center space-x-1 text-green-600">
                              <Award className="w-4 h-4" />
                              <span className="text-xs">Evidence-Based</span>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex space-x-2 ml-4">
                        <button
                          onClick={() => setSelectedResource(resource)}
                          className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                        >
                          <Eye className="w-4 h-4 mr-2" />
                          Preview
                        </button>
                        <button
                          onClick={() => {
                            setSelectedResource(resource)
                            setShowAssignModal(true)
                          }}
                          className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                        >
                          <Send className="w-4 h-4 mr-2" />
                          Assign
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Resource Preview Modal */}
      {selectedResource && !showAssignModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen p-4">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => setSelectedResource(null)} />
            
            <div className="relative bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
              <div className="bg-white">
                {/* Modal Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-200">
                  <div className="flex items-center space-x-3">
                    <div className={`p-2 rounded-lg ${getTypeColor(selectedResource.type)}`}>
                      {getTypeIcon(selectedResource.type)}
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold text-gray-900">{selectedResource.title}</h3>
                      <p className="text-sm text-gray-600">{selectedResource.category}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedResource(null)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X className="h-6 w-6" />
                  </button>
                </div>
                
                {/* Modal Content */}
                <div className="p-6">
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Main Content */}
                    <div className="lg:col-span-2 space-y-6">
                      <div>
                        <h4 className="text-lg font-semibold text-gray-900 mb-3">Description</h4>
                        <p className="text-gray-700 leading-relaxed">{selectedResource.description}</p>
                      </div>
                      
                      {selectedResource.content_data && (
                        <div>
                          <h4 className="text-lg font-semibold text-gray-900 mb-3">Content Preview</h4>
                          <div className="bg-gray-50 rounded-lg p-4">
                            <p className="text-sm text-gray-600">Content preview would be displayed here</p>
                          </div>
                        </div>
                      )}
                      
                      <div>
                        <h4 className="text-lg font-semibold text-gray-900 mb-3">Tags</h4>
                        <div className="flex flex-wrap gap-2">
                          {selectedResource.tags.map((tag, index) => (
                            <span key={index} className="inline-flex px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-full">
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                    
                    {/* Sidebar */}
                    <div className="space-y-6">
                      <div className="bg-gray-50 rounded-lg p-4">
                        <h4 className="font-semibold text-gray-900 mb-4">Resource Details</h4>
                        <div className="space-y-3">
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-600">Difficulty:</span>
                            <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getDifficultyColor(selectedResource.difficulty)}`}>
                              {selectedResource.difficulty}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-600">Duration:</span>
                            <span className="text-sm text-gray-900">{selectedResource.duration}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-600">Usage:</span>
                            <span className="text-sm text-gray-900">{selectedResource.usageCount} therapists</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-600">Rating:</span>
                            {renderStarRating(selectedResource.rating)}
                          </div>
                          {selectedResource.evidenceBased && (
                            <div className="flex items-center space-x-2 pt-2 border-t border-gray-200">
                              <Award className="w-4 h-4 text-green-600" />
                              <span className="text-sm text-green-800 font-medium">Evidence-Based</span>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <div className="space-y-3">
                        <button
                          onClick={() => setShowAssignModal(true)}
                          className="w-full inline-flex items-center justify-center px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
                        >
                          <Send className="w-5 h-5 mr-2" />
                          Assign to Client
                        </button>
                        <button
                          onClick={() => {
                            if (selectedResource.content_url) {
                              window.open(selectedResource.content_url, '_blank')
                            }
                          }}
                          className="w-full inline-flex items-center justify-center px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
                        >
                          <Download className="w-5 h-5 mr-2" />
                          Download
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

      {/* Assignment Modal */}
      {showAssignModal && selectedResource && (
        <AssignResourceModal
          resource={selectedResource}
          clients={clients}
          onClose={() => {
            setShowAssignModal(false)
            setSelectedResource(null)
          }}
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
  const [dueDate, setDueDate] = useState('')
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
      <div className="flex items-center justify-center min-h-screen p-4">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={onClose} />
        
        <div className="relative bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
          <form onSubmit={handleSubmit}>
            <div className="bg-white px-6 pt-6 pb-4">
              <div className="flex items-start justify-between mb-6">
                <h3 className="text-lg font-medium text-gray-900 pr-4">
                  Assign: {resource.title}
                </h3>
                <button
                  type="button"
                  onClick={onClose}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Select Clients ({selectedClients.length} selected)
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
                        <div className="ml-3">
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
                  <label htmlFor="dueDate" className="block text-sm font-medium text-gray-700 mb-2">
                    Due Date (Optional)
                  </label>
                  <input
                    type="date"
                    id="dueDate"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                Assign to {selectedClients.length} Client{selectedClients.length !== 1 ? 's' : ''}
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
    content: '',
    duration: ''
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
      <div className="flex items-center justify-center min-h-screen p-4">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={onClose} />
        
        <div className="relative bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
          <form onSubmit={handleSubmit}>
            <div className="bg-white px-6 pt-6 pb-4">
              <div className="flex items-start justify-between mb-6">
                <h3 className="text-lg font-medium text-gray-900">Create Custom Resource</h3>
                <button
                  type="button"
                  onClick={onClose}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Title *</label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                    <select
                      value={formData.category}
                      onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Content Type</label>
                    <select
                      value={formData.type}
                      onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="text">Text/PDF</option>
                      <option value="interactive">Interactive</option>
                      <option value="video">Video</option>
                      <option value="audio">Audio</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Duration</label>
                    <input
                      type="text"
                      value={formData.duration}
                      onChange={(e) => setFormData(prev => ({ ...prev, duration: e.target.value }))}
                      placeholder="e.g., 15 min"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Tags</label>
                  <input
                    type="text"
                    value={formData.tags}
                    onChange={(e) => setFormData(prev => ({ ...prev, tags: e.target.value }))}
                    placeholder="Comma-separated tags (e.g., CBT, anxiety, homework)"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                className="w-full sm:w-auto inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
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