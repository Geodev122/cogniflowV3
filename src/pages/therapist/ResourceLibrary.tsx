// src/components/therapist/ResourceLibrary.tsx
import React, { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { useAssessments } from '../../hooks/useAssessments'
import {
  Library, Search, Grid3X3, List, Eye, Send, BookOpen, FileText, Video, Headphones, X,
  Users, Zap, BookmarkCheck, Bookmark, Download, AlertTriangle, Clock, Link as LinkIcon, Trash2
} from 'lucide-react'

/* =========================
   Types & Constants
========================= */

type ContentType = 'pdf' | 'video' | 'audio' | 'interactive' | 'course' | string

interface Resource {
  id: string
  title: string
  category: 'worksheet' | 'educational' | 'intervention' | 'protocol' | string
  subcategory?: string | null
  description?: string | null
  content_type?: ContentType | null
  tags?: string[] | null
  difficulty_level?: 'beginner' | 'intermediate' | 'advanced' | string | null
  evidence_level?: string | null
  is_public?: boolean | null
  created_at: string
  media_url?: string | null
  storage_path?: string | null
  external_url?: string | null
  interactive_schema?: any | null
  course_manifest?: any | null
}

const CATEGORIES = [
  { id: 'all', name: 'All', icon: Library },
  { id: 'worksheet', name: 'Worksheets', icon: FileText },
  { id: 'educational', name: 'Educational', icon: BookOpen },
  { id: 'intervention', name: 'Interventions', icon: Zap },
  { id: 'protocol', name: 'Protocols', icon: Headphones },
] as const

/* =========================
   Helpers (icons/colors)
========================= */

const getContentType = (type?: string | null) => {
  switch (type) {
    case 'pdf':
      return { cls: 'text-red-600 bg-red-50', Icon: FileText as any, label: 'pdf' }
    case 'video':
      return { cls: 'text-purple-600 bg-purple-50', Icon: Video as any, label: 'video' }
    case 'audio':
      return { cls: 'text-green-600 bg-green-50', Icon: Headphones as any, label: 'audio' }
    case 'interactive':
      return { cls: 'text-blue-600 bg-blue-50', Icon: Zap as any, label: 'interactive' }
    case 'course':
      return { cls: 'text-indigo-600 bg-indigo-50', Icon: BookOpen as any, label: 'course' }
    default:
      return { cls: 'text-gray-600 bg-gray-50', Icon: FileText as any, label: type || 'file' }
  }
}

const getDifficultyColor = (level?: string | null) => {
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

// Safe insert helper: tries insert, and if PostgREST reports a missing column
// like "column resource_library.interactive_schema does not exist", it will
// remove that column from the payload and retry once. Returns { data, error }.
async function tryInsertResource(payload: any, selectCols: string) {
  // first attempt
  let { data, error } = await supabase.from('resource_library').insert(payload).select(selectCols).single()
  if (!error) return { data, error: null }

  const msg = String((error && (error as any).message) || error)
  const colMatch = msg.match(/column\s+"?([a-z0-9_]+)"?\s+does not exist/i)
  if (!colMatch) return { data: null, error }

  const missingCol = colMatch[1]
  // remove the column from payload and retry
  const reduced: any = { ...(payload || {}) }
  if (missingCol in reduced) delete reduced[missingCol]

  // also remove missing column from select list safely
  const cols = selectCols.split(',').map((s) => s.trim()).filter(Boolean)
  const filteredCols = cols.filter((c) => c !== missingCol).join(', ')

  const retry = await supabase.from('resource_library').insert(reduced).select(filteredCols || cols.join(', ')).single()
  return { data: (retry as any).data, error: (retry as any).error || null }
}

/* =========================
   Assessments Library (left tab)
========================= */

type ReminderFrequency = 'none' | 'daily' | 'weekly' | 'before_due'

interface AssessmentLibraryProps {
  onAssign: (templateId: string, clientIds: string[], options: { dueDate?: string; instructions?: string; reminderFrequency?: ReminderFrequency }) => void
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
  <div className="h-full flex flex-col overflow-x-hidden">
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
                    onClick={() => onAssign(t.id, [], {})}
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
  onAssign: (templateId: string, clientIds: string[], options: { dueDate?: string; instructions?: string; reminderFrequency?: ReminderFrequency }) => void
}> = ({ templateId, templateName, clients, onClose, onAssign }) => {
  const [selectedClients, setSelectedClients] = useState<string[]>([])
  const [dueDate, setDueDate] = useState('')
  const [instructions, setInstructions] = useState('')
  const [reminderFrequency, setReminderFrequency] = useState<ReminderFrequency>('none')

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
                    onChange={(e) => setReminderFrequency(e.target.value as ReminderFrequency)}
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
   Create Resource Modal (PDF/Video/Audio/Interactive)
========================= */

const CreateResourceModal: React.FC<{
  onClose: () => void
  onCreated: (resource: Resource) => void
}> = ({ onClose, onCreated }) => {
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState('worksheet')
  const [description, setDescription] = useState('')
  const [contentType, setContentType] = useState<ContentType>('pdf')
  const [difficulty, setDifficulty] = useState('beginner')
  const [tags, setTags] = useState<string>('')
  const [file, setFile] = useState<File | null>(null)
  const [externalUrl, setExternalUrl] = useState('')
  const [loading, setLoading] = useState(false)

  // Minimal interactive builder
  type InteractiveItem = { id: string; prompt: string; type: 'rating'; scale: number }
  const [interactiveItems, setInteractiveItems] = useState<InteractiveItem[]>([
    { id: crypto.randomUUID(), prompt: 'How are you feeling today?', type: 'rating', scale: 5 }
  ])

  const addInteractiveItem = () =>
    setInteractiveItems(prev => [...prev, { id: crypto.randomUUID(), prompt: '', type: 'rating', scale: 5 }])

  const removeInteractiveItem = (id: string) =>
    setInteractiveItems(prev => prev.filter(i => i.id !== id))

  const updateInteractiveItem = (id: string, updates: Partial<InteractiveItem>) =>
    setInteractiveItems(prev => prev.map(i => (i.id === id ? { ...i, ...updates } : i)))

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return
    try {
      setLoading(true)

      let storage_path: string | null = null
      let media_url: string | null = null
      const ext_url: string | null = externalUrl?.trim() || null
      let interactive_schema: any | null = null

      if (contentType === 'interactive') {
        interactive_schema = {
          version: 1,
          items: interactiveItems.map(({ id, prompt, type, scale }) => ({ id, prompt, type, scale })),
        }
      }

      // If we have a file, upload to storage
      if (file) {
        const key = `uploads/${Date.now()}_${file.name}`
        const { error: upErr } = await supabase.storage.from('resource_files').upload(key, file, {
          cacheControl: '3600',
          upsert: false,
        })
        if (upErr) throw upErr
        storage_path = key
        const { data: pub } = supabase.storage.from('resource_files').getPublicUrl(key)
        media_url = pub?.publicUrl || null
      }

      // pick best final url
      const finalUrl = media_url || ext_url || null

      const { data, error } = await tryInsertResource(
          {
            title,
            category,
            description,
            content_type: contentType,
            difficulty_level: difficulty,
            tags: tags
              .split(',')
              .map((t) => t.trim())
              .filter(Boolean),
            is_public: true,
            media_url: finalUrl,
            storage_path,
            external_url: ext_url,
            interactive_schema,
          },
          'id, title, category, subcategory, description, content_type, tags, difficulty_level, evidence_level, is_public, created_at, media_url, storage_path, external_url, interactive_schema, course_manifest'
        )
      if ((error as any) || !data) throw error || new Error('Insert returned no data')
      onCreated(data as Resource)
      onClose()
    } catch (err) {
      console.error('CreateResource error:', err)
      const msg = err && (err as any).message ? (err as any).message : String(err)
      alert(`Could not create resource: ${msg}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="fixed inset-0 bg-gray-900/50" onClick={onClose} />
        <div className="relative bg-white rounded-xl shadow-xl max-w-2xl w-full">
          <form onSubmit={submit}>
            <div className="p-5 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Create Resource</h3>
              <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <label className="block">
                  <span className="block text-sm font-medium text-gray-700 mb-2">Title</span>
                  <input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </label>

                <label className="block">
                  <span className="block text-sm font-medium text-gray-700 mb-2">Category</span>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    {CATEGORIES.filter(c=>c.id!=='all').map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </label>
              </div>

              <label className="block">
                <span className="block text-sm font-medium text-gray-700 mb-2">Description</span>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <label className="block">
                  <span className="block text-sm font-medium text-gray-700 mb-2">Content Type</span>
                  <select
                    value={contentType}
                    onChange={(e) => setContentType(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="pdf">PDF</option>
                    <option value="video">Video</option>
                    <option value="audio">Audio</option>
                    <option value="interactive">Interactive (rating)</option>
                  </select>
                </label>

                <label className="block">
                  <span className="block text-sm font-medium text-gray-700 mb-2">Difficulty</span>
                  <select
                    value={difficulty}
                    onChange={(e) => setDifficulty(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="beginner">Beginner</option>
                    <option value="intermediate">Intermediate</option>
                    <option value="advanced">Advanced</option>
                  </select>
                </label>

                <label className="block">
                  <span className="block text-sm font-medium text-gray-700 mb-2">Tags (comma separated)</span>
                  <input
                    value={tags}
                    onChange={(e) => setTags(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </label>
              </div>

              {(contentType === 'pdf' || contentType === 'audio' || contentType === 'video') && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <label className="block">
                    <span className="block text-sm font-medium text-gray-700 mb-2">
                      Upload file (stored)
                    </span>
                    <input
                      type="file"
                      accept={contentType === 'pdf' ? 'application/pdf' : contentType === 'audio' ? 'audio/*' : 'video/*'}
                      onChange={(e) => setFile(e.target.files?.[0] || null)}
                      className="w-full text-sm"
                    />
                  </label>
                  <label className="block">
                    <span className="block text-sm font-medium text-gray-700 mb-2">
                      or External URL (YouTube/Vimeo/hosted)
                    </span>
                    <div className="relative">
                      <LinkIcon className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        value={externalUrl}
                        onChange={(e) => setExternalUrl(e.target.value)}
                        placeholder="https://…"
                        className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  </label>
                </div>
              )}

              {contentType === 'interactive' && (
                <div className="border border-gray-200 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium text-gray-900">Interactive Builder</h4>
                    <button
                      type="button"
                      onClick={addInteractiveItem}
                      className="text-sm px-2 py-1 rounded bg-blue-50 text-blue-700 hover:bg-blue-100"
                    >
                      + Add question
                    </button>
                  </div>

                  <div className="space-y-3 max-h-64 overflow-y-auto">
                    {interactiveItems.map((it) => (
                      <div key={it.id} className="grid grid-cols-1 sm:grid-cols-6 gap-2 items-center">
                        <input
                          value={it.prompt}
                          onChange={(e) => updateInteractiveItem(it.id, { prompt: e.target.value })}
                          placeholder="Prompt"
                          className="sm:col-span-4 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                        <select
                          value={it.scale}
                          onChange={(e) => updateInteractiveItem(it.id, { scale: Number(e.target.value) })}
                          className="sm:col-span-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                          {[3,4,5,7,10].map(n => <option key={n} value={n}>{n}-point</option>)}
                        </select>
                        <button
                          type="button"
                          onClick={() => removeInteractiveItem(it.id)}
                          className="sm:col-span-1 px-2 py-2 rounded border text-gray-600 hover:bg-gray-50 flex items-center justify-center"
                          title="Remove"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                    {!interactiveItems.length && (
                      <div className="text-sm text-gray-500">No questions yet.</div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="p-5 border-t border-gray-200 flex justify-end gap-2">
              <button type="button" onClick={onClose} className="px-4 py-2 border rounded-lg text-gray-700 hover:bg-gray-50">
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || !title.trim()}
                className="px-6 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? 'Saving…' : 'Create'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

/* =========================
   Create Course Modal (eLearning)
========================= */

type CourseLesson = { id: string; title: string; type: 'text' | 'video' | 'audio' | 'pdf' | 'interactive' | 'link'; url?: string; content?: string }
type CourseModule = { id: string; title: string; lessons: CourseLesson[] }

const CreateCourseModal: React.FC<{
  onClose: () => void
  onCreated: (resource: Resource) => void
}> = ({ onClose, onCreated }) => {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [difficulty, setDifficulty] = useState('beginner')
  const [category, setCategory] = useState('educational')
  const [modules, setModules] = useState<CourseModule[]>([
    { id: crypto.randomUUID(), title: 'Module 1', lessons: [] }
  ])
  const [saving, setSaving] = useState(false)

  const addModule = () => setModules(prev => [...prev, { id: crypto.randomUUID(), title: `Module ${prev.length+1}`, lessons: [] }])
  const removeModule = (id: string) => setModules(prev => prev.filter(m => m.id !== id))
  const updateModuleTitle = (id: string, title: string) => setModules(prev => prev.map(m => m.id === id ? { ...m, title } : m))

  const addLesson = (moduleId: string) => setModules(prev => prev.map(m => m.id === moduleId ? {
    ...m, lessons: [...m.lessons, { id: crypto.randomUUID(), title: 'New lesson', type: 'text', content: '' }]
  } : m))

  const updateLesson = (moduleId: string, lessonId: string, updates: Partial<CourseLesson>) =>
    setModules(prev => prev.map(m => {
      if (m.id !== moduleId) return m
      return { ...m, lessons: m.lessons.map(l => l.id === lessonId ? { ...l, ...updates } : l) }
    }))

  const removeLesson = (moduleId: string, lessonId: string) =>
    setModules(prev => prev.map(m => m.id === moduleId ? { ...m, lessons: m.lessons.filter(l => l.id !== lessonId) } : m))

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return
    try {
      setSaving(true)
      const manifest = {
        version: 1,
        title,
        description,
        difficulty_level: difficulty,
        modules: modules.map(m => ({
          title: m.title,
          lessons: m.lessons.map(l => ({
            title: l.title,
            type: l.type,
            url: l.url || null,
            content: l.content || null
          }))
        }))
      }

      const { data, error } = await tryInsertResource(
          {
            title,
            description,
            category,
            content_type: 'course',
            difficulty_level: difficulty,
            is_public: true,
            tags: [],
            course_manifest: manifest,
          },
          'id, title, category, subcategory, description, content_type, tags, difficulty_level, evidence_level, is_public, created_at, media_url, storage_path, external_url, interactive_schema, course_manifest'
        )

      if ((error as any) || !data) throw error || new Error('Insert returned no data')
      onCreated(data as Resource)
      onClose()
    } catch (err) {
      console.error('CreateCourse error:', err)
      const msg = err && (err as any).message ? (err as any).message : String(err)
      alert(`Could not create course: ${msg}`)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="fixed inset-0 bg-gray-900/50" onClick={onClose} />
        <div className="relative bg-white rounded-xl shadow-xl max-w-3xl w-full">
          <form onSubmit={submit}>
            <div className="p-5 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Create Course</h3>
              <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <label className="block">
                  <span className="block text-sm font-medium text-gray-700 mb-2">Course Title</span>
                  <input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    required
                  />
                </label>
                <label className="block">
                  <span className="block text-sm font-medium text-gray-700 mb-2">Category</span>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    {CATEGORIES.filter(c=>c.id!=='all').map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </label>
              </div>

              <label className="block">
                <span className="block text-sm font-medium text-gray-700 mb-2">Description</span>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </label>

              <label className="block">
                <span className="block text-sm font-medium text-gray-700 mb-2">Difficulty</span>
                <select
                  value={difficulty}
                  onChange={(e) => setDifficulty(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 max-w-xs"
                >
                  <option value="beginner">Beginner</option>
                  <option value="intermediate">Intermediate</option>
                  <option value="advanced">Advanced</option>
                </select>
              </label>

              <div className="border border-gray-200 rounded-lg">
                <div className="flex items-center justify-between p-3 border-b">
                  <h4 className="font-medium text-gray-900">Modules & Lessons</h4>
                  <button type="button" onClick={addModule} className="text-sm px-2 py-1 rounded bg-indigo-50 text-indigo-700 hover:bg-indigo-100">
                    + Add Module
                  </button>
                </div>

                <div className="p-3 space-y-4 max-h-80 overflow-y-auto">
                  {modules.map((m) => (
                    <div key={m.id} className="border rounded-lg">
                      <div className="flex items-center justify-between p-3 border-b bg-gray-50">
                        <input
                          value={m.title}
                          onChange={(e) => updateModuleTitle(m.id, e.target.value)}
                          className="font-medium text-gray-900 bg-transparent outline-none flex-1"
                        />
                        <button
                          type="button"
                          onClick={() => removeModule(m.id)}
                          className="ml-2 text-gray-500 hover:text-red-600"
                          title="Remove module"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="p-3 space-y-3">
                        {m.lessons.map((l) => (
                          <div key={l.id} className="grid grid-cols-1 md:grid-cols-6 gap-2 items-start">
                            <input
                              value={l.title}
                              onChange={(e) => updateLesson(m.id, l.id, { title: e.target.value })}
                              placeholder="Lesson title"
                              className="md:col-span-2 px-3 py-2 border rounded"
                            />
                            <select
                              value={l.type}
                              onChange={(e) => updateLesson(m.id, l.id, { type: e.target.value as CourseLesson['type'] })}
                              className="md:col-span-1 px-3 py-2 border rounded"
                            >
                              <option value="text">Text</option>
                              <option value="video">Video</option>
                              <option value="audio">Audio</option>
                              <option value="pdf">PDF</option>
                              <option value="interactive">Interactive</option>
                              <option value="link">Link</option>
                            </select>
                            <input
                              value={l.url || ''}
                              onChange={(e) => updateLesson(m.id, l.id, { url: e.target.value })}
                              placeholder="URL (for video/audio/pdf/link)"
                              className="md:col-span-2 px-3 py-2 border rounded"
                            />
                            <button
                              type="button"
                              onClick={() => removeLesson(m.id, l.id)}
                              className="md:col-span-1 px-2 py-2 rounded border text-gray-600 hover:bg-gray-50 flex items-center justify-center"
                              title="Remove lesson"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                            {l.type === 'text' && (
                              <textarea
                                value={l.content || ''}
                                onChange={(e) => updateLesson(m.id, l.id, { content: e.target.value })}
                                placeholder="Lesson text content…"
                                className="md:col-span-6 px-3 py-2 border rounded"
                                rows={3}
                              />
                            )}
                          </div>
                        ))}
                        <button
                          type="button"
                          onClick={() => addLesson(m.id)}
                          className="text-sm px-2 py-1 rounded bg-gray-100 text-gray-700 hover:bg-gray-200"
                        >
                          + Add lesson
                        </button>
                      </div>
                    </div>
                  ))}

                  {!modules.length && (
                    <div className="text-sm text-gray-500">No modules yet.</div>
                  )}
                </div>
              </div>
            </div>

            <div className="p-5 border-t border-gray-200 flex justify-end gap-2">
              <button type="button" onClick={onClose} className="px-4 py-2 border rounded-lg text-gray-700 hover:bg-gray-50">
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving || !title.trim()}
                className="px-6 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50"
              >
                {saving ? 'Saving…' : 'Create Course'}
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

  // Shared state
  const [clients, setClients] = useState<any[]>([])
  const [clientsError, setClientsError] = useState<string | null>(null)
  const [clientsLoading, setClientsLoading] = useState<boolean>(false)
  const { profile } = useAuth()

  // Assessments state
  const { templates, assignAssessment } = useAssessments()
  const [showAssessmentAssignModal, setShowAssessmentAssignModal] = useState(false)
  const [selectedAssessmentId, setSelectedAssessmentId] = useState('')
  const [selectedAssessmentName, setSelectedAssessmentName] = useState('')

  // Resources state
  const [resources, setResources] = useState<Resource[]>([])
  const [resourcesLoading, setResourcesLoading] = useState(false)
  const [resourcesError, setResourcesError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [bookmarkedResources, setBookmarkedResources] = useState<string[]>([])
  const [selectedResource, setSelectedResource] = useState<Resource | null>(null)
  const [showAssignModal, setShowAssignModal] = useState(false)
  const [showCreateResource, setShowCreateResource] = useState(false)
  const [showCreateCourse, setShowCreateCourse] = useState(false)

  // Load therapist's clients once we have a profile
  useEffect(() => {
    const run = async () => {
      if (!profile?.id) {
        setClients([])
        return
      }
      setClientsLoading(true)
      setClientsError(null)
      try {
        const { data: relations, error: relErr } = await supabase
          .from('therapist_client_relations')
          .select('client_id')
          .eq('therapist_id', profile.id as any)

        if (relErr) throw relErr
  const clientIds = ((relations as any[]) || []).map((r: any) => r.client_id)
        if (clientIds.length === 0) {
          setClients([])
          return
        }

        const { data: clientRows, error: cErr } = await supabase
          .from('profiles')
          .select('id, first_name, last_name, email')
          .in('id', clientIds)

        if (cErr) throw cErr
        setClients(clientRows || [])
      } catch (e) {
        console.warn('[ResourceLibrary] fetchClients error:', e)
        setClients([])
        setClientsError('Could not load client list.')
      } finally {
        setClientsLoading(false)
      }
    }
    run()
  }, [profile])

  // Load resources only on the Resources tab. Public resources are visible
  // even when profile is not yet available, so don't gate on profile.
  useEffect(() => {
    const run = async () => {
      if (activeTab !== 'resources') return
      setResourcesLoading(true)
      setResourcesError(null)
      try {
        const { data, error } = await supabase
          .from('resource_library')
          .select(
            'id, title, category, subcategory, description, content_type, tags, difficulty_level, evidence_level, is_public, created_at, media_url, storage_path, external_url, interactive_schema, course_manifest'
          )
          .eq('is_public', true)
          .order('created_at', { ascending: false })

        if (error) {
          console.error('[ResourceLibrary] supabase error fetching resources:', error)
          setResources([])
          setResourcesError(error.message ?? String(error))
          return
        }
        setResources((data as Resource[]) || [])
      } catch (e) {
        console.error('[ResourceLibrary] fetchResources error:', e)
        setResources([])
        setResourcesError(e instanceof Error ? e.message : String(e))
      } finally {
        setResourcesLoading(false)
      }
    }
    run()
  }, [activeTab])

  // Derived
  const filteredResources = useMemo(() => {
    const term = searchTerm.trim().toLowerCase()
    return resources.filter(r => {
      const catOk = selectedCategory === 'all' || r.category === selectedCategory
      const text = `${r.title} ${r.description || ''} ${(r.tags || []).join(' ')}`.toLowerCase()
      const searchOk = !term || text.includes(term)
      return catOk && searchOk
    })
  }, [resources, selectedCategory, searchTerm])

  const categoriesWithCounts = useMemo(
    () =>
      CATEGORIES.map(c => ({
        ...c,
        count: c.id === 'all' ? resources.length : resources.filter(r => r.category === c.id).length,
      })),
    [resources]
  )

  // Actions
  const toggleBookmark = (id: string) =>
    setBookmarkedResources(prev => (prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]))

  const assignResource = async (resourceId: string, clientIds: string[]) => {
    try {
      const res = resources.find(r => r.id === resourceId)
      if (!res || !profile?.id) return

      // NOTE: If you have an `assigned_resources` table, switch to it here.
      const payload = clientIds.map(clientId => ({
        therapist_id: profile.id,
        client_id: clientId,
        form_type: 'worksheet',
        title: res.title,
        instructions: res.description || 'Please review this resource.',
        status: 'assigned',
        resource_id: resourceId,
      }))

  const { error } = await supabase.from('form_assignments').insert(payload as any)
      if (error) throw error

      setShowAssignModal(false)
      setSelectedResource(null)
      alert('Resource assigned successfully!')
    } catch (e) {
      console.error('Error assigning resource:', e)
      alert('Error assigning resource. Please try again.')
    }
  }

  const handleAssessmentAssign = async (
    templateId: string,
    clientIds: string[],
    options: { dueDate?: string; instructions?: string; reminderFrequency?: ReminderFrequency }
  ) => {
    try {
      await assignAssessment(templateId, clientIds, options)
      setShowAssessmentAssignModal(false)
      alert('Assessment assigned successfully!')
    } catch (e) {
      console.error('Error assigning assessment:', e)
      alert('Error assigning assessment. Please try again.')
    }
  }

  // Render resources tab
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
        {/* Filters header */}
        <div className="sticky top-0 z-10 bg-white/90 backdrop-blur border-b border-gray-200 px-3 py-4">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search resources, titles, tags…"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-12 pr-3 py-3 text-sm md:text-base border border-gray-200 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
                {categoriesWithCounts.map((c) => {
                  const Icon = c.icon
                  const active = selectedCategory === c.id
                  return (
                    <button
                      key={c.id}
                      onClick={() => setSelectedCategory(c.id)}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                        active ? 'bg-blue-100 text-blue-700 border border-blue-200' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span>{c.name}</span>
                      <span className={`ml-1 px-2 py-0.5 text-[11px] rounded-full ${active ? 'bg-blue-200 text-blue-800' : 'bg-gray-200 text-gray-600'}`}>
                        {c.count}
                      </span>
                    </button>
                  )
                })}
              </div>

              {(resourcesError || clientsError) && (
                <div className="mt-2 space-y-1">
                  {resourcesError && (
                    <div className="bg-amber-50 border border-amber-200 text-amber-800 text-xs rounded p-2">
                      {resourcesError}
                    </div>
                  )}
                  {clientsError && (
                    <div className="bg-amber-50 border border-amber-200 text-amber-800 text-xs rounded p-2">
                      {clientsError}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="flex items-center gap-3">
              <div className="hidden md:flex items-center gap-2">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 rounded ${viewMode === 'grid' ? 'bg-blue-100 text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}
                  aria-label="Grid view"
                >
                  <Grid3X3 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 rounded ${viewMode === 'list' ? 'bg-blue-100 text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}
                  aria-label="List view"
                >
                  <List className="w-4 h-4" />
                </button>
              </div>

              <div className="inline-flex rounded-xl border border-gray-200 bg-white overflow-hidden shadow-sm">
                <button
                  onClick={() => setShowCreateResource(true)}
                  className="px-4 py-2 text-sm md:text-base font-medium text-gray-700 hover:bg-blue-50 hover:text-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                >
                  New Resource
                </button>
                <div className="w-px bg-gray-200" aria-hidden="true" />
                <button
                  onClick={() => setShowCreateCourse(true)}
                  className="px-4 py-2 text-sm md:text-base font-medium text-gray-700 hover:bg-indigo-50 hover:text-indigo-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                >
                  New Course
                </button>
              </div>
            </div>
          </div>
        </div>

  {/* Content */}
  <div className="flex-1 overflow-y-auto p-3 min-w-0">
          {filteredResources.length === 0 ? (
            <div className="h-full grid place-items-center">
              <div className="text-center">
                <Library className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <h3 className="text-sm font-medium text-gray-900 mb-1">No resources</h3>
                <p className="text-xs text-gray-500">Try another filter or create one above.</p>
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

                    <div className="flex gap-1">
                      <button
                        onClick={() => setSelectedResource(r)}
                        className="flex-1 flex items-center justify-center px-2 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100"
                      >
                        <Eye className="w-3.5 h-3.5 mr-1" />
                        Preview
                      </button>
                      <button
                        onClick={() => { setSelectedResource(r); setShowAssignModal(true) }}
                        className="flex-1 flex items-center justify-center px-2 py-1.5 text-xs font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700"
                      >
                        <Send className="w-3.5 h-3.5 mr-1" />
                        Assign
                      </button>
                      {r.media_url && (
                        <a
                          href={r.media_url}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center justify-center px-2 py-1.5 text-xs font-medium border rounded-md hover:bg-gray-50"
                          title="Open"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </a>
                      )}
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
                    className="bg-white border border-gray-200 rounded-lg p-3 hover:shadow-md hover:border-blue-200 transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2 shrink-0">
                        <Icon className="w-4 h-4" />
                        <span className={`px-1.5 py-0.5 rounded text-[11px] capitalize ${cls}`}>{label}</span>
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between">
                          <h3 className="font-medium text-gray-900 text-sm truncate">{r.title}</h3>
                          <div className="flex items-center gap-2 shrink-0">
                            {r.difficulty_level && (
                              <span className={`px-2 py-0.5 text-[11px] rounded-full ${getDifficultyColor(r.difficulty_level)}`}>
                                {r.difficulty_level}
                              </span>
                            )}
                            <span className="text-[11px] text-gray-500">{new Date(r.created_at).toLocaleDateString()}</span>
                          </div>
                        </div>
                        <p className="text-xs text-gray-600 line-clamp-1">{r.description}</p>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => toggleBookmark(r.id)}
                          className={`p-1 rounded ${isBookmarked ? 'text-yellow-500' : 'text-gray-400 hover:text-yellow-500'}`}
                          aria-label={isBookmarked ? 'Remove bookmark' : 'Bookmark'}
                        >
                          {isBookmarked ? <BookmarkCheck className="w-3.5 h-3.5" /> : <Bookmark className="w-3.5 h-3.5" />}
                        </button>
                        <button
                          onClick={() => setSelectedResource(r)}
                          className="px-2 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100"
                        >
                          Preview
                        </button>
                        <button
                          onClick={() => { setSelectedResource(r); setShowAssignModal(true) }}
                          className="px-2 py-1.5 text-xs font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700"
                        >
                          Assign
                        </button>
                        {r.media_url && (
                          <a
                            href={r.media_url}
                            target="_blank"
                            rel="noreferrer"
                            className="px-2 py-1.5 text-xs font-medium border rounded-md hover:bg-gray-50"
                            title="Open"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      {/* Top segmented tabs */}
      <div className="sticky top-0 z-20 bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-3 py-3">
          <div
            className="inline-flex rounded-2xl p-1 bg-gray-100 border border-gray-200 shadow-sm"
            role="tablist"
            aria-label="Library Tabs"
          >
            <button
              role="tab"
              aria-selected={activeTab === 'assessments'}
              onClick={() => setActiveTab('assessments')}
              className={`px-5 py-3 text-sm md:text-base font-semibold rounded-xl transition ${
                activeTab === 'assessments'
                  ? 'bg-white shadow text-blue-700 border border-gray-200'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Psychometric Assessments
            </button>
            <button
              role="tab"
              aria-selected={activeTab === 'resources'}
              onClick={() => setActiveTab('resources')}
              className={`ml-2 px-5 py-3 text-sm md:text-base font-semibold rounded-xl transition ${
                activeTab === 'resources'
                  ? 'bg-white shadow text-blue-700 border border-gray-200'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Resources & Courses
            </button>
          </div>
        </div>
      </div>

      {/* Tab content */}
      <div className="flex-1 min-h-0">
        {activeTab === 'assessments' ? (
          <AssessmentLibrary
            onAssign={(templateId) => {
              setSelectedAssessmentId(templateId)
              const t = templates.find(tt => tt.id === templateId)
              setSelectedAssessmentName(t?.name || 'Assessment')
              setShowAssessmentAssignModal(true)
            }}
            onPreview={(t) => {
              // hook up to your existing preview flow if present
              console.log('Preview assessment:', t?.id)
            }}
          />
        ) : (
          renderResourcesTab()
        )}
      </div>

      {/* Modals */}
      {showAssignModal && selectedResource && (
        <AssignResourceModal
          resource={selectedResource}
          clients={clients}
          onClose={() => { setShowAssignModal(false); setSelectedResource(null) }}
          onAssign={assignResource}
        />
      )}

      {showAssessmentAssignModal && (
        <AssignAssessmentModal
          templateId={selectedAssessmentId}
          templateName={selectedAssessmentName}
          clients={clients}
          onClose={() => setShowAssessmentAssignModal(false)}
          onAssign={handleAssessmentAssign}
        />
      )}

      {showCreateResource && (
        <CreateResourceModal
          onClose={() => setShowCreateResource(false)}
          onCreated={(res) => setResources(prev => [res, ...prev])}
        />
      )}

      {showCreateCourse && (
        <CreateCourseModal
          onClose={() => setShowCreateCourse(false)}
          onCreated={(res) => setResources(prev => [res, ...prev])}
        />
      )}
    </div>
  )
}
