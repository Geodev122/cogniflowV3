// src/components/therapist/ResourceLibrary.tsx
import React, { useEffect, useMemo, useState } from 'react'
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
  BookOpen,
  FileText,
  Video,
  Headphones,
  X,
  Users,
  Zap,
  BookmarkCheck,
  Bookmark,
  Download,
  AlertTriangle,
  Clock,
} from 'lucide-react'

/* =========================
   Types & Constants
========================= */

interface Resource {
  id: string
  title: string
  category: 'worksheet' | 'educational' | 'intervention' | 'protocol' | string
  subcategory?: string
  description?: string
  content_type?: 'pdf' | 'video' | 'audio' | 'interactive' | string
  tags?: string[]
  difficulty_level?: 'beginner' | 'intermediate' | 'advanced' | string
  evidence_level?: string
  is_public?: boolean
  created_at: string
}

const CATEGORIES = [
  { id: 'all', name: 'All', icon: Library },
  { id: 'worksheet', name: 'Worksheets', icon: FileText },
  { id: 'educational', name: 'Educational', icon: BookOpen },
  { id: 'intervention', name: 'Interventions', icon: Zap },
  { id: 'protocol', name: 'Protocols', icon: Headphones }, // icon just for variety; swap if you prefer
] as const

const SAMPLE_RESOURCES: Resource[] = [
  {
    id: '1',
    title: 'CBT Thought Record Worksheet',
    category: 'worksheet',
    subcategory: 'cognitive',
    description:
      'A comprehensive thought record worksheet for identifying and challenging negative thought patterns.',
    content_type: 'pdf',
    tags: ['CBT', 'thought-challenging', 'cognitive-restructuring'],
    difficulty_level: 'beginner',
    evidence_level: 'research_based',
    is_public: true,
    created_at: '2024-01-15T10:00:00Z',
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
    created_at: '2024-01-14T14:30:00Z',
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
    created_at: '2024-01-13T09:15:00Z',
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
    created_at: '2024-01-10T13:30:00Z',
  },
]

/* =========================
   Helpers (icons/colors)
========================= */

const getContentType = (type?: string) => {
  switch (type) {
    case 'pdf':
      return { cls: 'text-red-600 bg-red-50', Icon: FileText as any, label: 'pdf' }
    case 'video':
      return { cls: 'text-purple-600 bg-purple-50', Icon: Video as any, label: 'video' }
    case 'audio':
      return { cls: 'text-green-600 bg-green-50', Icon: Headphones as any, label: 'audio' }
    case 'interactive':
      return { cls: 'text-blue-600 bg-blue-50', Icon: Zap as any, label: 'interactive' }
    default:
      return { cls: 'text-gray-600 bg-gray-50', Icon: FileText as any, label: type || 'file' }
  }
}

const getDifficultyColor = (level?: string) => {
  switch (level) {
    case 'beginner':
      return 'bg-green-100 text-green-700'
    case 'intermediate':
      return 'bg-yellow-100 text-yellow-700'
    case 'advanced':
      return 'bg-red-100 text-red-700'
    default:
      return 'bg-gray-100 text-gray-700'
  }
}

/* =========================
   Assessments Library (left tab)
========================= */

interface AssessmentLibraryProps {
  onAssign: (templateId: string, clientIds: string[]) => void
  onPreview: (template: any) => void
}

const AssessmentLibrary: React.FC<AssessmentLibraryProps> = ({ onAssign, onPreview }) => {
  const { templates, loading, error } = useAssessments()
  const [searchTerm, setSearchTerm] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')

  const filteredTemplates = useMemo(() => {
    const term = searchTerm.trim().toLowerCase()
    return templates.filter((t: any) => {
      const matchesSearch =
        !term ||
        t.name.toLowerCase().includes(term) ||
        (t.description || '').toLowerCase().includes(term)
      const matchesCategory = categoryFilter === 'all' || t.category === categoryFilter
      return matchesSearch && matchesCategory
    })
  }, [templates, searchTerm, categoryFilter])

  const categories = useMemo(
    () => [
      { id: 'all', name: 'All Categories', count: templates.length },
      ...['depression', 'anxiety', 'trauma', 'stress', 'wellbeing'].map((c) => ({
        id: c,
        name: c[0].toUpperCase() + c.slice(1),
        count: templates.filter((t: any) => t.category === c).length,
      })),
    ],
    [templates]
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
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
    <div className="h-full flex flex-col">
      {/* Sticky/compact filters */}
      <div className="sticky top-0 z-10 bg-white/80 backdrop-blur border-b border-gray-200 p-3">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-blue-600" />
            <h2 className="text-lg font-semibold text-gray-900">Psychometric Assessments</h2>
          </div>
          <div className="text-xs sm:text-sm text-gray-500">
            {filteredTemplates.length} of {templates.length} items
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search assessments…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
          >
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.count})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-y-auto p-3">
        {filteredTemplates.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-center">
              <BookOpen className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <h3 className="text-sm font-medium text-gray-900 mb-1">No assessments found</h3>
              <p className="text-xs text-gray-500">Try adjusting your search or filters</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredTemplates.map((t: any) => (
              <div
                key={t.id}
                className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md hover:border-blue-200 transition-all"
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h3 className="font-semibold text-gray-900">{t.name}</h3>
                    <p className="text-xs text-blue-600 font-medium">{t.abbreviation}</p>
                  </div>
                  <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800 capitalize">
                    {t.category}
                  </span>
                </div>

                <p className="text-sm text-gray-600 mb-3 line-clamp-2">{t.description}</p>

                <div className="flex items-center justify-between text-xs text-gray-500 mb-3">
                  <span>{t.questions?.length || 0} questions</span>
                  <span className="inline-flex items-center gap-1">
                    <Clock className="w-3 h-3" /> ~{t.estimated_duration_minutes} min
                  </span>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => onPreview(t)}
                    className="flex-1 inline-flex items-center justify-center px-3 py-2 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100"
                  >
                    <Eye className="w-3.5 h-3.5 mr-1" />
                    Preview
                  </button>
                  <button
                    onClick={() => onAssign(t.id, [])}
                    className="flex-1 inline-flex items-center justify-center px-3 py-2 text-xs font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700"
                  >
                    <Send className="w-3.5 h-3.5 mr-1" />
                    Assign
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

/* =========================
   Assign Assessment Modal
========================= */

const AssignAssessmentModal: React.FC<{
  templateId: string
  templateName: string
  clients: any[]
  onClose: () => void
  onAssign: (templateId: string, clientIds: string[], options: any) => void
}> = ({ templateId, templateName, clients, onClose, onAssign }) => {
  const [selectedClients, setSelectedClients] = useState<string[]>([])
  const [dueDate, setDueDate] = useState('')
  const [instructions, setInstructions] = useState('')
  const [reminderFrequency, setReminderFrequency] = useState('none')

  const toggleClient = (id: string) =>
    setSelectedClients((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]))

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedClients.length) return
    onAssign(templateId, selectedClients, { dueDate, instructions, reminderFrequency })
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="fixed inset-0 bg-gray-900/50" onClick={onClose} />
        <div className="relative bg-white rounded-xl shadow-xl max-w-2xl w-full">
          <form onSubmit={submit}>
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Assign Assessment</h3>
                <p className="text-sm text-gray-600">{templateName}</p>
              </div>
              <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Select Clients</label>
                <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-lg">
                  {clients.map((c: any) => (
                    <label
                      key={c.id}
                      className="flex items-center p-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                    >
                      <input
                        type="checkbox"
                        className="h-4 w-4 text-blue-600 border-gray-300 rounded mr-3"
                        checked={selectedClients.includes(c.id)}
                        onChange={() => toggleClient(c.id)}
                      />
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {c.first_name} {c.last_name}
                        </div>
                        <div className="text-xs text-gray-500">{c.email}</div>
                      </div>
                    </label>
                  ))}
                  {!clients.length && (
                    <div className="p-6 text-center text-gray-500">
                      <Users className="w-6 h-6 mx-auto mb-2 text-gray-400" />
                      <p className="text-sm">No clients available</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <label className="block">
                  <span className="block text-sm font-medium text-gray-700 mb-2">Due Date (optional)</span>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </label>

                <label className="block">
                  <span className="block text-sm font-medium text-gray-700 mb-2">Reminder Frequency</span>
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
                </label>
              </div>

              <label className="block">
                <span className="block text-sm font-medium text-gray-700 mb-2">Instructions (optional)</span>
                <textarea
                  rows={3}
                  value={instructions}
                  onChange={(e) => setInstructions(e.target.value)}
                  placeholder="Additional instructions or context for the client…"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </label>
            </div>

            <div className="p-6 border-t border-gray-200 flex justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!selectedClients.length}
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

/* =========================
   Assign Resource Modal
========================= */

const AssignResourceModal: React.FC<{
  resource: Resource
  clients: any[]
  onClose: () => void
  onAssign: (resourceId: string, clientIds: string[]) => void
}> = ({ resource, clients, onClose, onAssign }) => {
  const [selectedClients, setSelectedClients] = useState<string[]>([])
  const toggleClient = (id: string) =>
    setSelectedClients((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]))
  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedClients.length) return
    onAssign(resource.id, selectedClients)
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="fixed inset-0 bg-gray-900/50" onClick={onClose} />
        <div className="relative bg-white rounded-xl shadow-xl max-w-lg w-full">
          <form onSubmit={submit}>
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Assign Resource</h3>
              <button type="button" onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 rounded">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              <div>
                <h4 className="font-medium text-gray-900 mb-1">{resource.title}</h4>
                <p className="text-sm text-gray-600">{resource.description}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Select Clients</label>
                <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-lg">
                  {clients.length === 0 ? (
                    <div className="p-6 text-center text-gray-500">
                      <Users className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                      <p className="text-sm">No clients available</p>
                    </div>
                  ) : (
                    clients.map((c: any) => (
                      <label
                        key={c.id}
                        className="flex items-center p-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                      >
                        <input
                          type="checkbox"
                          checked={selectedClients.includes(c.id)}
                          onChange={() => toggleClient(c.id)}
                          className="h-4 w-4 text-blue-600 border-gray-300 rounded mr-3"
                        />
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                            <span className="text-[10px] font-medium text-blue-600">
                              {c.first_name?.[0]}
                              {c.last_name?.[0]}
                            </span>
                          </div>
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {c.first_name} {c.last_name}
                            </div>
                            <div className="text-xs text-gray-500">{c.email}</div>
                          </div>
                        </div>
                      </label>
                    ))
                  )}
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-gray-200 flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!selectedClients.length}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
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

/* =========================
   Main Component
========================= */

export default function ResourceLibrary() {
  const [activeTab, setActiveTab] = useState<'assessments' | 'resources'>('assessments')
  const [resources, setResources] = useState<Resource[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [selectedResource, setSelectedResource] = useState<Resource | null>(null)
  const [showAssignModal, setShowAssignModal] = useState(false)
  const [showAssessmentAssignModal, setShowAssessmentAssignModal] = useState(false)
  const [selectedAssessmentId, setSelectedAssessmentId] = useState('')
  const [selectedAssessmentName, setSelectedAssessmentName] = useState('')
  const [clients, setClients] = useState<any[]>([])
  const [bookmarkedResources, setBookmarkedResources] = useState<string[]>([])
  const [resourcesLoading, setResourcesLoading] = useState(false)
  const [resourcesError, setResourcesError] = useState<string | null>(null)

  const { profile } = useAuth()
  const { templates, assignAssessment } = useAssessments()

  useEffect(() => {
    if (!profile) return
    fetchClients()
  }, [profile])

  useEffect(() => {
    if (!profile || activeTab !== 'resources') return
    fetchResources()
  }, [profile, activeTab])

  const fetchClients = async () => {
    try {
      const { data: relations, error: relationsError } = await supabase
        .from('therapist_client_relations')
        .select('client_id')
        .eq('therapist_id', profile!.id)

      if (relationsError) {
        console.warn('[ResourceLibrary] client relations error:', relationsError)
        setClients([])
        return
      }

      const clientIds = relations?.map((r) => r.client_id) || []
      if (!clientIds.length) {
        setClients([])
        return
      }

      const { data: clientData, error: clientError } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, email')
        .in('id', clientIds)

      if (clientError) {
        console.warn('[ResourceLibrary] profiles error:', clientError)
        setClients([])
        return
      }

      setClients(clientData || [])
    } catch (e) {
      console.error('[ResourceLibrary] fetchClients failed', e)
      setClients([])
    }
  }

  const fetchResources = async () => {
    try {
      setResourcesLoading(true)
      setResourcesError(null)

      const { data, error } = await supabase
        .from('resource_library')
        .select(
          'id, title, category, subcategory, description, content_type, tags, difficulty_level, evidence_level, is_public, created_at'
        )
        .eq('is_public', true)
        .order('created_at', { ascending: false })

      if (error || !data || !data.length) {
        // fall back to sample if empty / RLS blocked
        console.warn('[ResourceLibrary] using sample resources; DB empty or RLS blocked', { error })
        setResources(SAMPLE_RESOURCES)
      } else {
        setResources(data as Resource[])
      }
    } catch (e: any) {
      console.error('[ResourceLibrary] fetchResources crash', e)
      setResources(SAMPLE_RESOURCES)
      setResourcesError('Could not load live resources. Showing samples.')
    } finally {
      setResourcesLoading(false)
    }
  }

  const filteredResources = useMemo(() => {
    const term = searchTerm.trim().toLowerCase()
    return resources.filter((r) => {
      const catOk = selectedCategory === 'all' || r.category === selectedCategory
      const text =
        `${r.title} ${r.description || ''} ${(r.tags || []).join(' ')}`.toLowerCase()
      const searchOk = !term || text.includes(term)
      return catOk && searchOk
    })
  }, [resources, selectedCategory, searchTerm])

  const categoriesWithCounts = useMemo(
    () =>
      CATEGORIES.map((c) => ({
        ...c,
        count: c.id === 'all' ? resources.length : resources.filter((r) => r.category === c.id).length,
      })),
    [resources]
  )

  const toggleBookmark = (id: string) =>
    setBookmarkedResources((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]))

  const assignResource = async (resourceId: string, clientIds: string[]) => {
    try {
      const resource = resources.find((r) => r.id === resourceId)
      if (!resource) return

      const payload = clientIds.map((clientId) => ({
        therapist_id: profile!.id,
        client_id: clientId,
        form_type: 'worksheet',
        title: resource.title,
        instructions: resource.description || 'Please review this resource.',
        status: 'assigned',
      }))

      const { error } = await supabase.from('form_assignments').insert(payload)
      if (error) throw error

      setShowAssignModal(false)
      setSelectedResource(null)
      alert('Resource assigned successfully!')
    } catch (e) {
      console.error('Error assigning resource:', e)
      alert('Error assigning resource. Please try again.')
    }
  }

  const handleAssessmentAssign = async (templateId: string, clientIds: string[], options: any) => {
    try {
      await assignAssessment(templateId, clientIds, options)
      setShowAssessmentAssignModal(false)
      alert('Assessment assigned successfully!')
    } catch (e) {
      console.error('Error assigning assessment:', e)
      alert('Error assigning assessment. Please try again.')
    }
  }

  /* ---------- Resources Tab UI ---------- */

  const renderResourcesTab = () => {
    if (resourcesLoading) {
      return (
        <div className="flex-1 grid place-items-center p-6">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      )
    }

    return (
      <div className="h-full flex flex-col">
        {/* Sticky header + filters */}
        <div className="sticky top-0 z-10 bg-white/80 backdrop-blur border-b border-gray-200 p-3">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Library className="w-5 h-5 text-blue-600" />
              <h2 className="text-lg font-semibold text-gray-900">Resource Library</h2>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded ${viewMode === 'grid' ? 'bg-blue-100 text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}
                aria-label="Grid view"
              >
                <Grid3X3 className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-1.5 rounded ${viewMode === 'list' ? 'bg-blue-100 text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}
                aria-label="List view"
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-2">
            <div className="relative lg:col-span-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search resources…"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div className="flex gap-2 overflow-x-auto">
              {categoriesWithCounts.map((c) => {
                const Icon = c.icon
                const active = selectedCategory === c.id
                return (
                  <button
                    key={c.id}
                    onClick={() => setSelectedCategory(c.id)}
                    className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
                      active ? 'bg-blue-100 text-blue-700 border border-blue-200' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{c.name}</span>
                    <span className={`px-1.5 py-0.5 text-[10px] rounded-full ${active ? 'bg-blue-200 text-blue-800' : 'bg-gray-200 text-gray-600'}`}>
                      {c.count}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          {resourcesError && (
            <div className="mt-2 bg-amber-50 border border-amber-200 text-amber-800 text-xs rounded p-2">
              {resourcesError}
            </div>
          )}
        </div>

        {/* Content area */}
        <div className="flex-1 overflow-y-auto p-3">
          {filteredResources.length === 0 ? (
            <div className="h-full grid place-items-center">
              <div className="text-center">
                <Library className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <h3 className="text-sm font-medium text-gray-900 mb-1">No resources found</h3>
                <p className="text-xs text-gray-500">Try adjusting your search or filters</p>
              </div>
            </div>
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {filteredResources.map((r) => {
                const { cls, Icon, label } = getContentType(r.content_type)
                const isBookmarked = bookmarkedResources.includes(r.id)
                return (
                  <div
                    key={r.id}
                    className="bg-white border border-gray-200 rounded-lg p-3 hover:shadow-md hover:border-blue-200 transition-all"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Icon className="w-4 h-4" />
                        <span className={`px-1.5 py-0.5 rounded text-[11px] capitalize ${cls}`}>{label}</span>
                      </div>
                      <button
                        onClick={() => toggleBookmark(r.id)}
                        className={`p-1 rounded ${isBookmarked ? 'text-yellow-500' : 'text-gray-400 hover:text-yellow-500'}`}
                        aria-label={isBookmarked ? 'Remove bookmark' : 'Bookmark'}
                      >
                        {isBookmarked ? <BookmarkCheck className="w-3.5 h-3.5" /> : <Bookmark className="w-3.5 h-3.5" />}
                      </button>
                    </div>

                    <h3 className="font-medium text-gray-900 text-sm mb-1 line-clamp-2">{r.title}</h3>
                    <p className="text-xs text-gray-600 mb-2 line-clamp-2">{r.description}</p>

                    <div className="flex items-center justify-between mb-2">
                      {r.difficulty_level && (
                        <span className={`px-2 py-0.5 text-[11px] rounded-full ${getDifficultyColor(r.difficulty_level)}`}>
                          {r.difficulty_level}
                        </span>
                      )}
                      <span className="text-[11px] text-gray-500">{new Date(r.created_at).toLocaleDateString()}</span>
                    </div>

                    {r.tags?.length ? (
                      <div className="flex flex-wrap gap-1 mb-2">
                        {r.tags.slice(0, 2).map((tag, i) => (
                          <span key={i} className="px-1.5 py-0.5 text-[11px] bg-gray-100 text-gray-600 rounded">
                            #{tag}
                          </span>
                        ))}
                        {r.tags.length > 2 && (
                          <span className="px-1.5 py-0.5 text-[11px] bg-gray-100 text-gray-500 rounded">
                            +{r.tags.length - 2}
                          </span>
                        )}
                      </div>
                    ) : null}

                    <div className="flex gap-1">
                      <button
                        onClick={() => setSelectedResource(r)}
                        className="flex-1 flex items-center justify-center px-2 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 rounded hover:bg-blue-100"
                      >
                        <Eye className="w-3.5 h-3.5 mr-1" />
                        View
                      </button>
                      <button
                        onClick={() => {
                          setSelectedResource(r)
                          setShowAssignModal(true)
                        }}
                        className="flex-1 flex items-center justify-center px-2 py-1.5 text-xs font-medium text-white bg-blue-600 rounded hover:bg-blue-700"
                      >
                        <Send className="w-3.5 h-3.5 mr-1" />
                        Assign
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="space-y-2">
              {filteredResources.map((r) => {
                const { cls, Icon, label } = getContentType(r.content_type)
                const isBookmarked = bookmarkedResources.includes(r.id)
                return (
                  <div
                    key={r.id}
                    className="bg-white border border-gray-200 rounded-lg p-3 hover:shadow-sm hover:border-blue-200 transition-all"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <Icon className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between mb-1">
                            <h3 className="font-medium text-gray-900 text-sm truncate pr-2">{r.title}</h3>
                            <div className="flex items-center gap-1 flex-shrink-0">
                              <span className={`px-1.5 py-0.5 rounded text-[11px] capitalize ${cls}`}>{label}</span>
                              <button
                                onClick={() => toggleBookmark(r.id)}
                                className={`p-1 rounded ${isBookmarked ? 'text-yellow-500' : 'text-gray-400 hover:text-yellow-500'}`}
                                aria-label={isBookmarked ? 'Remove bookmark' : 'Bookmark'}
                              >
                                {isBookmarked ? <BookmarkCheck className="w-3.5 h-3.5" /> : <Bookmark className="w-3.5 h-3.5" />}
                              </button>
                            </div>
                          </div>
                          <p className="text-xs text-gray-600 mb-2 line-clamp-1">{r.description}</p>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              {r.difficulty_level && (
                                <span
                                  className={`px-2 py-0.5 text-[11px] rounded-full ${getDifficultyColor(r.difficulty_level)}`}
                                >
                                  {r.difficulty_level}
                                </span>
                              )}
                              <span className="text-[11px] text-gray-500">{new Date(r.created_at).toLocaleDateString()}</span>
                            </div>
                            <div className="flex gap-1">
                              <button
                                onClick={() => setSelectedResource(r)}
                                className="flex items-center px-2 py-1 text-xs font-medium text-blue-700 bg-blue-50 rounded hover:bg-blue-100"
                              >
                                <Eye className="w-3.5 h-3.5 mr-1" />
                                View
                              </button>
                              <button
                                onClick={() => {
                                  setSelectedResource(r)
                                  setShowAssignModal(true)
                                }}
                                className="flex items-center px-2 py-1 text-xs font-medium text-white bg-blue-600 rounded hover:bg-blue-700"
                              >
                                <Send className="w-3.5 h-3.5 mr-1" />
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
        </div>

        {/* Preview modal */}
        {selectedResource && !showAssignModal && (
          <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex min-h-screen items-center justify-center p-4">
              <div className="fixed inset-0 bg-gray-900/50" onClick={() => setSelectedResource(null)} />
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

                <div className="p-4 overflow-y-auto max-h-96 space-y-4">
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Description</h4>
                    <p className="text-sm text-gray-700">{selectedResource.description}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">Category</h4>
                      <span className="inline-flex items-center px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full capitalize">
                        {selectedResource.category}
                      </span>
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">Difficulty</h4>
                      <span
                        className={`inline-flex px-2 py-1 text-xs rounded-full ${getDifficultyColor(
                          selectedResource.difficulty_level
                        )}`}
                      >
                        {selectedResource.difficulty_level || '—'}
                      </span>
                    </div>
                  </div>

                  {selectedResource.tags?.length ? (
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">Tags</h4>
                      <div className="flex flex-wrap gap-1">
                        {selectedResource.tags.map((tag, i) => (
                          <span key={i} className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded">
                            #{tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>

                <div className="p-4 border-t border-gray-200 flex gap-2">
                  <button
                    onClick={() => setShowAssignModal(true)}
                    className="flex-1 flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    <Send className="w-4 h-4 mr-2" />
                    Assign to Clients
                  </button>
                  <button
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                    title="Download (placeholder)"
                  >
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
      </div>
    )
  }

  /* ---------- Render ---------- */

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Tabs */}
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
            <div className="flex items-center gap-2">
              <BookOpen className="w-5 h-5" />
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
            <div className="flex items-center gap-2">
              <Library className="w-5 h-5" />
              <span>Resource Library</span>
            </div>
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 min-h-0">
        {activeTab === 'assessments' ? (
          <div className="h-full">
            <AssessmentLibrary
              onAssign={(templateId) => {
                const t = templates.find((x: any) => x.id === templateId)
                if (!t) return
                setSelectedAssessmentId(templateId)
                setSelectedAssessmentName(t.name)
                setShowAssessmentAssignModal(true)
              }}
              onPreview={(t) => {
                // Plug in a real preview when you have a detail page
                console.log('Preview assessment:', t)
                alert(`Preview “${t.name}” (stub)`)
              }}
            />
          </div>
        ) : (
          renderResourcesTab()
        )}
      </div>

      {/* Assign Assessment Modal */}
      {showAssessmentAssignModal && (
        <AssignAssessmentModal
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
