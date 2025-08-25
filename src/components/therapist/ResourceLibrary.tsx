import React, { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { useAssessments } from '../../hooks/useAssessments'
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
  CheckCircle,
  BookmarkCheck,
  Bookmark,
  ExternalLink,
  Download,
  Share2,
  Clock,
  TrendingUp,
  AlertTriangle
} from 'lucide-react'

// Simple Assessment Library Component
interface AssessmentLibraryProps {
  onAssign: (templateId: string, clientIds: string[]) => void
  onPreview: (template: any) => void
}

const AssessmentLibrary: React.FC<AssessmentLibraryProps> = ({ onAssign, onPreview }) => {
  const { templates, loading, error } = useAssessments()
  const [searchTerm, setSearchTerm] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')

  const filteredTemplates = templates.filter(template => {
    const matchesSearch = template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         template.description.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = categoryFilter === 'all' || template.category === categoryFilter
    return matchesSearch && matchesCategory
  })

  const categories = [
    { id: 'all', name: 'All Categories', count: templates.length },
    { id: 'depression', name: 'Depression', count: templates.filter(t => t.category === 'depression').length },
    { id: 'anxiety', name: 'Anxiety', count: templates.filter(t => t.category === 'anxiety').length },
    { id: 'trauma', name: 'Trauma', count: templates.filter(t => t.category === 'trauma').length },
    { id: 'stress', name: 'Stress', count: templates.filter(t => t.category === 'stress').length },
    { id: 'wellbeing', name: 'Wellbeing', count: templates.filter(t => t.category === 'wellbeing').length }
  ]

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
        <div className="flex items-center space-x-3">
          <Brain className="w-6 h-6 text-blue-600" />
          <h2 className="text-2xl font-bold text-gray-900">Psychometric Assessments</h2>
        </div>
        <div className="text-sm text-gray-600">
          {filteredTemplates.length} of {templates.length} assessments
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search assessments..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            {categories.map(cat => (
              <option key={cat.id} value={cat.id}>{cat.name} ({cat.count})</option>
            ))}
          </select>
        </div>
      </div>

      {/* Assessment Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredTemplates.map(template => (
          <div key={template.id} className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="font-semibold text-gray-900">{template.name}</h3>
                <p className="text-sm text-blue-600 font-medium">{template.abbreviation}</p>
              </div>
              <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                {template.category}
              </span>
            </div>
            
            <p className="text-gray-600 text-sm mb-4 line-clamp-2">{template.description}</p>
            
            <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
              <span>{template.questions?.length || 0} questions</span>
              <span>~{template.estimated_duration_minutes} min</span>
            </div>
            
            <div className="flex space-x-2">
              <button
                onClick={() => onPreview(template)}
                className="flex-1 inline-flex items-center justify-center px-3 py-2 text-sm font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100"
              >
                <Eye className="w-4 h-4 mr-1" />
                Preview
              </button>
              <button
                onClick={() => onAssign(template.id, [])}
                className="flex-1 inline-flex items-center justify-center px-3 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700"
              >
                <Send className="w-4 h-4 mr-1" />
                Assign
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {filteredTemplates.length === 0 && (
        <div className="text-center py-12">
          <Brain className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No assessments found</h3>
          <p className="text-gray-600">
            {searchTerm || categoryFilter !== 'all'
              ? 'Try adjusting your search or filters.'
              : 'No assessment templates are available.'
            }
          </p>
        </div>
      )}
    </div>
  )
}

interface AssignModalProps {
  templateId: string
  templateName: string
  clients: any[]
  onClose: () => void
  onAssign: (templateId: string, clientIds: string[], options: any) => void
}

const AssignModal: React.FC<AssignModalProps> = ({ templateId, templateName, clients, onClose, onAssign }) => {
  const [selectedClients, setSelectedClients] = useState<string[]>([])
  const [dueDate, setDueDate] = useState('')
  const [instructions, setInstructions] = useState('')
  const [reminderFrequency, setReminderFrequency] = useState('none')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (selectedClients.length > 0) {
      onAssign(templateId, selectedClients, {
        dueDate,
        instructions,
        reminderFrequency
      })
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
        <div className="fixed inset-0 bg-gray-900 bg-opacity-50" onClick={onClose} />
        
        <div className="relative bg-white rounded-xl shadow-xl max-w-2xl w-full">
          <form onSubmit={handleSubmit}>
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Assign Assessment</h3>
                <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <p className="text-gray-600 mt-1">{templateName}</p>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Select Clients
                </label>
                <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-lg">
                  {clients.map(client => (
                    <label key={client.id} className="flex items-center p-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0">
                      <input
                        type="checkbox"
                        checked={selectedClients.includes(client.id)}
                        onChange={() => toggleClient(client.id)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mr-3"
                      />
                      <div>
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
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Due Date (Optional)
                </label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Reminder Frequency
                </label>
                <select
                  value={reminderFrequency}
                  onChange={(e) => setReminderFrequency(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="none">No Reminders</option>
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="before_due">Before Due Date</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Instructions for Client (Optional)
                </label>
                <textarea
                  value={instructions}
                  onChange={(e) => setInstructions(e.target.value)}
                  rows={3}
                  placeholder="Additional instructions or context for the client..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 flex justify-end space-x-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={selectedClients.length === 0}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Assign Assessment
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

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
    description: 'A comprehensive thought record worksheet for identifying and challenging negative thought patterns.',
    content_type: 'pdf',
    tags: ['CBT', 'thought-challenging', 'cognitive-restructuring'],
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
    description: 'Step-by-step evidence-based protocol for managing acute anxiety episodes.',
    content_type: 'interactive',
    tags: ['anxiety', 'breathing', 'grounding'],
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
    description: 'Comprehensive guide for conducting depression screenings with PHQ-9 interpretation.',
    content_type: 'pdf',
    tags: ['depression', 'screening', 'PHQ-9'],
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
    description: 'Collection of guided meditation scripts for various therapeutic contexts.',
    content_type: 'audio',
    tags: ['mindfulness', 'meditation', 'relaxation'],
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
    description: 'Best practices for providing trauma-informed care in therapeutic settings.',
    content_type: 'text',
    tags: ['trauma', 'PTSD', 'safety'],
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
    description: 'Activity scheduling and mood monitoring worksheet for depression treatment.',
    content_type: 'pdf',
    tags: ['behavioral-activation', 'depression'],
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
  { id: 'protocol', name: 'Protocols', icon: Shield, count: 0 }
]

export default function ResourceLibrary() {
  const [resources, setResources] = useState<Resource[]>([])
  const [filteredResources, setFilteredResources] = useState<Resource[]>([])
  const [activeTab, setActiveTab] = useState<'assessments' | 'resources'>('assessments')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [selectedResource, setSelectedResource] = useState<Resource | null>(null)
  const [showAssignModal, setShowAssignModal] = useState(false)
  const [showAssessmentAssignModal, setShowAssessmentAssignModal] = useState(false)
  const [selectedAssessmentId, setSelectedAssessmentId] = useState<string>('')
  const [selectedAssessmentName, setSelectedAssessmentName] = useState<string>('')
  const [clients, setClients] = useState<any[]>([])
  const [bookmarkedResources, setBookmarkedResources] = useState<string[]>([])
  const [resourcesLoading, setResourcesLoading] = useState(false)
  const { profile } = useAuth()
  const { templates, assignAssessment } = useAssessments()

  useEffect(() => {
    fetchClients()
    if (activeTab === 'resources') {
      fetchResources()
    }
  }, [profile, activeTab])

  useEffect(() => {
    if (activeTab === 'resources') {
      filterResources()
    }
  }, [resources, selectedCategory, searchTerm, activeTab])

  const fetchResources = async () => {
  try {
    setResourcesLoading(true)
    console.debug('[ResourceLibrary] fetching resources…', { is_public: true })
    const { data, error } = await supabase
      .from('resource_library')
      .select('id, title, category, subcategory, description, content_type, tags, difficulty_level, evidence_level, is_public, created_at') // minimal fields = fewer RLS surprises
      .eq('is_public', true)
      .order('created_at', { ascending: false })

    console.debug('[ResourceLibrary] resources result', { error, count: data?.length ?? 0 })
    if (error || !data || data.length === 0) {
      console.warn('[ResourceLibrary] Using SAMPLE_RESOURCES. DB may be empty or blocked by RLS.', { error })
      setResources(SAMPLE_RESOURCES)
    } else {
      setResources(data)
    }
  } catch (err) {
    console.error('[ResourceLibrary] fetchResources crash', err)
    setResources(SAMPLE_RESOURCES)
  } finally {
    setResourcesLoading(false)
  }
}


  const fetchClients = async () => {
    if (!profile) return

    try {
      const { data: relations, error: relationsError } = await supabase
        .from('therapist_client_relations')
        .select('client_id')
        .eq('therapist_id', profile.id)

      if (relationsError) {
        console.error('Error fetching client relations:', relationsError)
        setClients([])
        return
      }

      const clientIds = relations?.map(r => r.client_id) || []
      if (clientIds.length > 0) {
        const { data: clientData, error: clientError } = await supabase
          .from('profiles')
          .select('id, first_name, last_name, email')
          .in('id', clientIds)

        if (clientError) {
          console.error('Error fetching client profiles:', clientError)
          setClients([])
          return
        }

        setClients(clientData || [])
      } else {
        setClients([])
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

    setFilteredResources(filtered)
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

  const toggleBookmark = (resourceId: string) => {
    setBookmarkedResources(prev => 
      prev.includes(resourceId) 
        ? prev.filter(id => id !== resourceId)
        : [...prev, resourceId]
    )
  }

  const handleAssessmentAssign = async (templateId: string, clientIds: string[], options: any) => {
    try {
      await assignAssessment(templateId, clientIds, options)
      setShowAssessmentAssignModal(false)
      alert('Assessment assigned successfully!')
    } catch (error) {
      console.error('Error assigning assessment:', error)
      alert('Error assigning assessment. Please try again.')
    }
  }

  const handleAssessmentPreview = (template: any) => {
    console.log('Preview assessment:', template)
  }

  const getContentTypeIcon = (type?: string) => {
    switch (type) {
      case 'pdf': return <FileText className="w-3 h-3" />
      case 'video': return <Video className="w-3 h-3" />
      case 'audio': return <Headphones className="w-3 h-3" />
      case 'interactive': return <Zap className="w-3 h-3" />
      default: return <FileText className="w-3 h-3" />
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
      case 'beginner': return 'bg-green-100 text-green-700'
      case 'intermediate': return 'bg-yellow-100 text-yellow-700'
      case 'advanced': return 'bg-red-100 text-red-700'
      default: return 'bg-gray-100 text-gray-700'
    }
  }

  const getCategoryIcon = (category: string) => {
    const cat = CATEGORIES.find(c => c.id === category)
    return cat ? cat.icon : FileText
  }

  // Update category counts
  const categoriesWithCounts = CATEGORIES.map(cat => ({
    ...cat,
    count: cat.id === 'all' ? resources.length : resources.filter(r => r.category === cat.id).length
  }))

  const renderBrowseTab = () => {
    if (loading) {
      return (
        <div className="h-full flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      )
    }

    return (
      <div className="h-full flex flex-col bg-gray-50">
        {/* Fixed Header - Compact */}
        <div className="flex-shrink-0 bg-white border-b border-gray-200 p-3">
          {/* Title */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2">
              <Library className="w-5 h-5 text-blue-600" />
              <h2 className="text-lg font-bold text-gray-900">Resource Library</h2>
            </div>
            <div className="flex items-center space-x-1">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded ${viewMode === 'grid' ? 'bg-blue-100 text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}
              >
                <Grid3X3 className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-1.5 rounded ${viewMode === 'list' ? 'bg-blue-100 text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Compact Search */}
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search resources..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Compact Category Pills */}
          <div className="flex space-x-1 overflow-x-auto scrollbar-hide">
            {categoriesWithCounts.map((category) => {
              const Icon = category.icon
              const isActive = selectedCategory === category.id
              
              return (
                <button
                  key={category.id}
                  onClick={() => setSelectedCategory(category.id)}
                  className={`flex items-center space-x-1 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
                    isActive
                      ? 'bg-blue-100 text-blue-700 border border-blue-200'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  <Icon className="w-3 h-3" />
                  <span>{category.name}</span>
                  <span className={`px-1.5 py-0.5 text-xs rounded-full ${
                    isActive ? 'bg-blue-200 text-blue-800' : 'bg-gray-200 text-gray-600'
                  }`}>
                    {category.count}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Scrollable Content Area */}
        <div className="flex-1 overflow-y-auto p-3">
          {filteredResources.length === 0 ? (
            <div className="h-full flex items-center justify-center">
              <div className="text-center">
                <Library className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <h3 className="text-sm font-medium text-gray-900 mb-1">No resources found</h3>
                <p className="text-xs text-gray-500">Try adjusting your search or filters</p>
              </div>
            </div>
          ) : (
            <>
              {viewMode === 'grid' ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                  {filteredResources.map((resource) => {
                    const CategoryIcon = getCategoryIcon(resource.category)
                    const isBookmarked = bookmarkedResources.includes(resource.id)
                    
                    return (
                      <div key={resource.id} className="bg-white border border-gray-200 rounded-lg p-3 hover:shadow-md hover:border-blue-200 transition-all">
                        {/* Compact Header */}
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center space-x-2">
                            <CategoryIcon className="w-4 h-4 text-blue-600" />
                            <div className={`flex items-center space-x-1 px-1.5 py-0.5 rounded text-xs ${getContentTypeColor(resource.content_type)}`}>
                              {getContentTypeIcon(resource.content_type)}
                              <span className="capitalize">{resource.content_type}</span>
                            </div>
                          </div>
                          <button
                            onClick={() => toggleBookmark(resource.id)}
                            className={`p-1 rounded transition-all ${
                              isBookmarked ? 'text-yellow-500' : 'text-gray-400 hover:text-yellow-500'
                            }`}
                          >
                            {isBookmarked ? <BookmarkCheck className="w-3 h-3" /> : <Bookmark className="w-3 h-3" />}
                          </button>
                        </div>

                        {/* Content */}
                        <h3 className="font-medium text-gray-900 text-sm mb-1 line-clamp-2">
                          {resource.title}
                        </h3>
                        <p className="text-xs text-gray-600 mb-2 line-clamp-2">
                          {resource.description}
                        </p>

                        {/* Compact Metadata */}
                        <div className="flex items-center justify-between mb-2">
                          {resource.difficulty_level && (
                            <span className={`px-2 py-0.5 text-xs rounded-full ${getDifficultyColor(resource.difficulty_level)}`}>
                              {resource.difficulty_level}
                            </span>
                          )}
                          <span className="text-xs text-gray-500">
                            {new Date(resource.created_at).toLocaleDateString()}
                          </span>
                        </div>

                        {/* Compact Tags */}
                        {resource.tags && resource.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mb-2">
                            {resource.tags.slice(0, 2).map((tag, index) => (
                              <span key={index} className="px-1.5 py-0.5 text-xs bg-gray-100 text-gray-600 rounded">
                                #{tag}
                              </span>
                            ))}
                            {resource.tags.length > 2 && (
                              <span className="px-1.5 py-0.5 text-xs bg-gray-100 text-gray-500 rounded">
                                +{resource.tags.length - 2}
                              </span>
                            )}
                          </div>
                        )}

                        {/* Compact Actions */}
                        <div className="flex space-x-1">
                          <button
                            onClick={() => setSelectedResource(resource)}
                            className="flex-1 flex items-center justify-center px-2 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 rounded hover:bg-blue-100 transition-colors"
                          >
                            <Eye className="w-3 h-3 mr-1" />
                            View
                          </button>
                          <button
                            onClick={() => {
                              setSelectedResource(resource)
                              setShowAssignModal(true)
                            }}
                            className="flex-1 flex items-center justify-center px-2 py-1.5 text-xs font-medium text-white bg-blue-600 rounded hover:bg-blue-700 transition-colors"
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
                <div className="space-y-2">
                  {filteredResources.map((resource) => {
                    const CategoryIcon = getCategoryIcon(resource.category)
                    const isBookmarked = bookmarkedResources.includes(resource.id)
                    
                    return (
                      <div key={resource.id} className="bg-white border border-gray-200 rounded-lg p-3 hover:shadow-sm hover:border-blue-200 transition-all">
                        <div className="flex items-start justify-between">
                          <div className="flex items-start space-x-3 flex-1 min-w-0">
                            <CategoryIcon className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                            
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between mb-1">
                                <h3 className="font-medium text-gray-900 text-sm truncate pr-2">
                                  {resource.title}
                                </h3>
                                <div className="flex items-center space-x-1 flex-shrink-0">
                                  <div className={`flex items-center space-x-1 px-1.5 py-0.5 rounded text-xs ${getContentTypeColor(resource.content_type)}`}>
                                    {getContentTypeIcon(resource.content_type)}
                                    <span className="capitalize">{resource.content_type}</span>
                                  </div>
                                  <button
                                    onClick={() => toggleBookmark(resource.id)}
                                    className={`p-1 rounded transition-all ${
                                      isBookmarked ? 'text-yellow-500' : 'text-gray-400 hover:text-yellow-500'
                                    }`}
                                  >
                                    {isBookmarked ? <BookmarkCheck className="w-3 h-3" /> : <Bookmark className="w-3 h-3" />}
                                  </button>
                                </div>
                              </div>
                              
                              <p className="text-xs text-gray-600 mb-2 line-clamp-1">
                                {resource.description}
                              </p>
                              
                              <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-2">
                                  {resource.difficulty_level && (
                                    <span className={`px-2 py-0.5 text-xs rounded-full ${getDifficultyColor(resource.difficulty_level)}`}>
                                      {resource.difficulty_level}
                                    </span>
                                  )}
                                  <span className="text-xs text-gray-500">
                                    {new Date(resource.created_at).toLocaleDateString()}
                                  </span>
                                </div>
                                
                                <div className="flex space-x-1">
                                  <button
                                    onClick={() => setSelectedResource(resource)}
                                    className="flex items-center px-2 py-1 text-xs font-medium text-blue-700 bg-blue-50 rounded hover:bg-blue-100 transition-colors"
                                  >
                                    <Eye className="w-3 h-3 mr-1" />
                                    View
                                  </button>
                                  <button
                                    onClick={() => {
                                      setSelectedResource(resource)
                                      setShowAssignModal(true)
                                    }}
                                    className="flex items-center px-2 py-1 text-xs font-medium text-white bg-blue-600 rounded hover:bg-blue-700 transition-colors"
                                  >
                                    <Send className="w-3 h-3 mr-1" />
                                    Assign
                                  </button>
                                </div>
                              </div>
                            </div>
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
    )
  }

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Tab Navigation */}
      <div className="flex-shrink-0 bg-white border-b border-gray-200">
        <div className="flex space-x-8 px-4">
          <button
            onClick={() => setActiveTab('assessments')}
            className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'assessments'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center space-x-2">
              <Brain className="w-5 h-5" />
              <span>Psychometric Assessments</span>
            </div>
          </button>
          
          <button
            onClick={() => setActiveTab('resources')}
            className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'resources'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center space-x-2">
              <Library className="w-5 h-5" />
              <span>Resource Library</span>
            </div>
          </button>
        </div>
      </div>

      {/* Tab Content */}
      <div className="flex-1 min-h-0">
        {activeTab === 'assessments' ? (
          <div className="h-full p-4">
            <AssessmentLibrary
              onAssign={(templateId, clientIds) => {
                const template = templates.find(t => t.id === templateId)
                if (!template) return
                setSelectedAssessmentId(templateId)
                setSelectedAssessmentName(template.name)
                setShowAssessmentAssignModal(true)
              }}
              onPreview={handleAssessmentPreview}
            />
          </div>
        ) : (
          renderBrowseTab()
        )}
      </div>

      {/* Resource Preview Modal */}
      {selectedResource && !showAssignModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen p-4">
            <div className="fixed inset-0 bg-gray-900 bg-opacity-50" onClick={() => setSelectedResource(null)} />
            
            <div className="relative bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
              <div className="flex items-center justify-between p-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">{selectedResource.title}</h3>
                <button
                  onClick={() => setSelectedResource(null)}
                  className="p-1 text-gray-400 hover:text-gray-600 rounded"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-4 overflow-y-auto max-h-96">
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Description</h4>
                    <p className="text-sm text-gray-700">{selectedResource.description}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">Category</h4>
                      <span className="inline-flex items-center px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                        {selectedResource.category}
                      </span>
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">Difficulty</h4>
                      <span className={`inline-flex px-2 py-1 text-xs rounded-full ${getDifficultyColor(selectedResource.difficulty_level)}`}>
                        {selectedResource.difficulty_level}
                      </span>
                    </div>
                  </div>

                  {selectedResource.tags && selectedResource.tags.length > 0 && (
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">Tags</h4>
                      <div className="flex flex-wrap gap-1">
                        {selectedResource.tags.map((tag, index) => (
                          <span key={index} className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded">
                            #{tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="p-4 border-t border-gray-200 flex space-x-2">
                <button
                  onClick={() => setShowAssignModal(true)}
                  className="flex-1 flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Send className="w-4 h-4 mr-2" />
                  Assign to Clients
                </button>
                <button className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors">
                  <Download className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Assign Resource Modal */}
      {showAssignModal && selectedResource && (
        <AssignResourceModal
          resource={selectedResource}
          clients={clients}
          onClose={() => setShowAssignModal(false)}
          onAssign={assignResource}
        />
      )}

      {/* Assessment Assign Modal */}
      {showAssessmentAssignModal && (
        <AssignModal
          templateId={selectedAssessmentId}
          templateName={selectedAssessmentName}
          clients={clients}
          onClose={() => setShowAssessmentAssignModal(false)}
          onAssign={handleAssessmentAssign}
        />
      )}
    </div>
  )
}

interface AssignResourceModalProps {
  resource: Resource
  clients: any[]
  onClose: () => void
  onAssign: (resourceId: string, clientIds: string[]) => void
}

const AssignResourceModal: React.FC<AssignResourceModalProps> = ({ resource, clients, onClose, onAssign }) => {
  const [selectedClients, setSelectedClients] = useState<string[]>([])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (selectedClients.length > 0) {
      onAssign(resource.id, selectedClients)
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
        <div className="fixed inset-0 bg-gray-900 bg-opacity-50" onClick={onClose} />
        
        <div className="relative bg-white rounded-xl shadow-xl max-w-lg w-full">
          <form onSubmit={handleSubmit}>
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Assign Resource</h3>
              <button type="button" onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 rounded">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4">
              <div className="mb-4">
                <h4 className="font-medium text-gray-900 mb-2">{resource.title}</h4>
                <p className="text-sm text-gray-600">{resource.description}</p>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Clients
                </label>
                <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-lg">
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
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mr-3"
                        />
                        <div className="flex items-center space-x-2">
                          <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
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
                      </label>
                    ))
                  )}
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-gray-200 flex space-x-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={selectedClients.length === 0}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Assign Resource
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}