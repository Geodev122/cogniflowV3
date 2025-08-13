import React, { useState, useEffect } from 'react'
import { AssessmentTools } from './AssessmentTools'
import { WorksheetManagement } from './WorksheetManagement'
import { supabase } from '../../lib/supabase'
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
  Plus
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
}

export const ResourceLibrary: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'all' | 'assessments' | 'treatments' | 'worksheets' | 'psychoeducation' | 'exercises'>('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [difficultyFilter, setDifficultyFilter] = useState('all')
  const [evidenceFilter, setEvidenceFilter] = useState('all')
  const [selectedResource, setSelectedResource] = useState<Resource | null>(null)
  const [showAssignModal, setShowAssignModal] = useState(false)
  const [resources, setResources] = useState<Resource[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchResources()
  }, [])

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
        tags: item.tags || []
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
      case 'assessment': return <ClipboardList className="w-5 h-5" />
      case 'treatment_plan': return <Brain className="w-5 h-5" />
      case 'worksheet': return <FileText className="w-5 h-5" />
      case 'article': return <BookOpen className="w-5 h-5" />
      case 'video': return <Video className="w-5 h-5" />
      case 'audio': return <Headphones className="w-5 h-5" />
      default: return <FileText className="w-5 h-5" />
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
            className={`w-4 h-4 ${
              star <= rating ? 'text-yellow-400 fill-current' : 'text-gray-300'
            }`}
          />
        ))}
        <span className="text-sm text-gray-600 ml-1">{rating}</span>
      </div>
    )
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Resource Library</h2>
          <p className="text-sm sm:text-base text-gray-600">Evidence-based tools, assessments, and treatment resources</p>
        </div>
        <button className="inline-flex items-center px-3 py-2 sm:px-4 sm:py-2 border border-transparent text-xs sm:text-sm font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700 w-full sm:w-auto justify-center">
          <Plus className="w-4 h-4 mr-2" />
          Create Custom
        </button>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 overflow-x-auto">
        <nav className="-mb-px flex space-x-2 sm:space-x-4 lg:space-x-8 min-w-max px-1">
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
                className={`flex items-center space-x-1 sm:space-x-2 py-2 px-2 sm:px-3 border-b-2 font-medium text-xs sm:text-sm whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className="w-3 h-3 sm:w-4 sm:h-4 lg:w-5 lg:h-5" />
                <span className="hidden sm:inline">{tab.name}</span>
                <span className="sm:hidden">{tab.name.split(' ')[0]}</span>
              </button>
            )
          })}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'assessments' && (
        <AssessmentTools />
      )}
      
      {activeTab === 'worksheets' && (
        <WorksheetManagement />
      )}
      
      {activeTab === 'exercises' && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
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
        <>
          {/* Filters */}
          <div className="bg-white p-3 sm:p-4 lg:p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 lg:gap-4">
              <div className="relative">
                <Search className="absolute left-2 sm:left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 sm:w-5 sm:h-5" />
                <input
                  type="text"
                  placeholder="Search resources..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-8 sm:pl-10 pr-3 sm:pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-xs sm:text-sm"
                />
              </div>
              
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="border border-gray-300 rounded-md px-2 sm:px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-xs sm:text-sm"
              >
                <option value="all">All Categories</option>
                <option value="Depression Screening">Depression Screening</option>
                <option value="Anxiety Screening">Anxiety Screening</option>
                <option value="Cognitive Restructuring">Cognitive Restructuring</option>
                <option value="Educational">Educational</option>
                <option value="Depression Treatment">Depression Treatment</option>
                <option value="Anxiety Treatment">Anxiety Treatment</option>
                <option value="Mood Monitoring">Mood Monitoring</option>
                <option value="Mindfulness">Mindfulness</option>
              </select>
              
              <select
                value={difficultyFilter}
                onChange={(e) => setDifficultyFilter(e.target.value)}
                className="border border-gray-300 rounded-md px-2 sm:px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-xs sm:text-sm"
              >
                <option value="all">All Levels</option>
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
              </select>
              
              <select
                value={evidenceFilter}
                onChange={(e) => setEvidenceFilter(e.target.value)}
                className="border border-gray-300 rounded-md px-2 sm:px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-xs sm:text-sm"
              >
                <option value="all">All Types</option>
                <option value="evidence-based">Evidence-Based</option>
                <option value="clinical">Clinical Practice</option>
              </select>
            </div>
          </div>

          {/* Resources Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-6">
            {filteredResources.map((resource) => (
              <div key={resource.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 sm:p-4 lg:p-6 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-2">
                    <div className={`p-1.5 sm:p-2 rounded-lg ${getTypeColor(resource.type)}`}>
                      {getTypeIcon(resource.type)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-semibold text-gray-900 text-xs sm:text-sm leading-tight">{resource.title}</h3>
                      <p className="text-xs text-gray-600">{resource.category}</p>
                    </div>
                  </div>
                  {resource.evidenceBased && (
                    <div className="flex items-center space-x-1 text-green-600 flex-shrink-0">
                      <Award className="w-3 h-3 sm:w-4 sm:h-4" />
                      <span className="text-xs hidden sm:inline">Evidence-Based</span>
                    </div>
                  )}
                </div>
                
                <p className="text-xs sm:text-sm text-gray-600 mb-3 sm:mb-4 line-clamp-2 sm:line-clamp-3">{resource.description}</p>
                
                <div className="flex flex-col gap-2 mb-3 sm:mb-4">
                  <div className="flex items-center space-x-2 sm:space-x-4">
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getDifficultyColor(resource.difficulty)}`}>
                      {resource.difficulty}
                    </span>
                    {resource.duration && (
                      <div className="flex items-center space-x-1 text-gray-500">
                        <Clock className="w-3 h-3 sm:w-4 sm:h-4" />
                        <span className="text-xs">{resource.duration}</span>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center space-x-1 text-gray-500">
                    <Users className="w-3 h-3 sm:w-4 sm:h-4" />
                    <span className="text-xs">{resource.usageCount}</span>
                  </div>
                </div>
                
                <div className="mb-3 sm:mb-4">
                  {renderStarRating(resource.rating)}
                </div>
                
                <div className="flex flex-wrap gap-1 mb-3 sm:mb-4">
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
                
                <div className="flex flex-col gap-2">
                  <button
                    onClick={() => setSelectedResource(resource)}
                    className="w-full inline-flex items-center justify-center px-3 py-2 border border-gray-300 text-xs sm:text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                  >
                    <Eye className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                    Preview
                  </button>
                  <button
                    onClick={() => {
                      setSelectedResource(resource)
                      setShowAssignModal(true)
                    }}
                    className="w-full inline-flex items-center justify-center px-3 py-2 border border-transparent text-xs sm:text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                  >
                    <Send className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                    Assign
                  </button>
                </div>
              </div>
            ))}
          </div>

          {!loading && !error && filteredResources.length === 0 && (
            <div className="text-center py-8 sm:py-12">
              <Library className="mx-auto h-8 w-8 sm:h-12 sm:w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No resources found</h3>
              <p className="mt-1 text-xs sm:text-sm text-gray-500">
                Try adjusting your search terms or filters.
              </p>
            </div>
          )}
        </>
      )}

      {/* Resource Preview Modal */}
      {selectedResource && !showAssignModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-end justify-center min-h-screen pt-4 px-2 sm:px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => setSelectedResource(null)} />
            
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full mx-2 sm:mx-4">
              <div className="bg-white px-3 sm:px-4 lg:px-6 pt-4 sm:pt-6 pb-4">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-base sm:text-lg font-medium text-gray-900 pr-2">{selectedResource.title}</h3>
                  <button
                    onClick={() => setSelectedResource(null)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <span className="sr-only">Close</span>
                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-4">
                    <div className={`p-2 sm:p-3 rounded-lg ${getTypeColor(selectedResource.type)} self-start`}>
                      {getTypeIcon(selectedResource.type)}
                    </div>
                    <div>
                      <p className="text-xs sm:text-sm text-gray-600">{selectedResource.category}</p>
                      <div className="flex flex-wrap items-center gap-2 mt-1">
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
                  
                  <p className="text-sm sm:text-base text-gray-700">{selectedResource.description}</p>
                  
                  <div className="grid grid-cols-2 gap-3 sm:gap-4 py-3 sm:py-4 border-t border-gray-200">
                    <div>
                      <p className="text-xs sm:text-sm font-medium text-gray-900">Duration</p>
                      <p className="text-xs sm:text-sm text-gray-600">{selectedResource.duration || 'Variable'}</p>
                    </div>
                    <div>
                      <p className="text-xs sm:text-sm font-medium text-gray-900">Usage</p>
                      <p className="text-xs sm:text-sm text-gray-600">{selectedResource.usageCount} therapists</p>
                    </div>
                  </div>
                  
                  <div>
                    <p className="text-xs sm:text-sm font-medium text-gray-900 mb-2">Tags</p>
                    <div className="flex flex-wrap gap-1">
                      {selectedResource.tags.map((tag, index) => (
                        <span key={index} className="inline-flex px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="bg-gray-50 px-3 sm:px-4 lg:px-6 py-3 sm:py-4 flex flex-col sm:flex-row-reverse gap-2 sm:gap-3">
                <button
                  onClick={() => setShowAssignModal(true)}
                  className="w-full sm:w-auto inline-flex justify-center rounded-md border border-transparent shadow-sm px-3 sm:px-4 py-2 bg-blue-600 text-sm font-medium text-white hover:bg-blue-700"
                >
                  Assign to Client
                </button>
                <button
                  className="w-full sm:w-auto inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-3 sm:px-4 py-2 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  <Download className="w-3 h-3 sm:w-4 sm:h-4 mr-2" />
                  Download
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Assignment Modal */}
      {showAssignModal && selectedResource && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-end justify-center min-h-screen pt-4 px-2 sm:px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => setShowAssignModal(false)} />
            
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full mx-2 sm:mx-4">
              <div className="bg-white px-3 sm:px-4 lg:px-6 pt-4 sm:pt-6 pb-4">
                <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-4">
                  Assign: {selectedResource.title}
                </h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                      Select Client
                    </label>
                    <select className="w-full border border-gray-300 rounded-md px-2 sm:px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-xs sm:text-sm">
                      <option>Select a client...</option>
                      <option>John Doe</option>
                      <option>Jane Smith</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                      Due Date
                    </label>
                    <input
                      type="date"
                      className="w-full border border-gray-300 rounded-md px-2 sm:px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-xs sm:text-sm"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                      Instructions (Optional)
                    </label>
                    <textarea
                      rows={3}
                      className="w-full border border-gray-300 rounded-md px-2 sm:px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-xs sm:text-sm"
                      placeholder="Add any specific instructions for the client..."
                    />
                  </div>
                </div>
              </div>
              
              <div className="bg-gray-50 px-3 sm:px-4 lg:px-6 py-3 sm:py-4 flex flex-col sm:flex-row-reverse gap-2 sm:gap-3">
                <button
                  onClick={() => {
                    setShowAssignModal(false)
                    setSelectedResource(null)
                  }}
                  className="w-full sm:w-auto inline-flex justify-center rounded-md border border-transparent shadow-sm px-3 sm:px-4 py-2 bg-blue-600 text-sm font-medium text-white hover:bg-blue-700"
                >
                  Assign Resource
                </button>
                <button
                  onClick={() => setShowAssignModal(false)}
                  className="w-full sm:w-auto inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-3 sm:px-4 py-2 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}