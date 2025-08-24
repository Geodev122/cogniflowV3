import React, { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { AssessmentTemplate, AssessmentLibraryProps } from '../../types/assessment'
import { AssessmentUtils } from '../../lib/assessmentEngine'
import { 
  Library, 
  Search, 
  Filter, 
  Eye, 
  Send, 
  Clock, 
  Star,
  Tag,
  Users,
  Plus,
  Brain,
  Heart,
  Shield,
  Zap,
  BookOpen
} from 'lucide-react'

export const AssessmentLibrary: React.FC<AssessmentLibraryProps> = ({
  category,
  searchTerm = '',
  onAssign,
  onPreview
}) => {
  const [templates, setTemplates] = useState<AssessmentTemplate[]>([])
  const [filteredTemplates, setFilteredTemplates] = useState<AssessmentTemplate[]>([])
  const [selectedCategory, setSelectedCategory] = useState(category || 'all')
  const [localSearchTerm, setLocalSearchTerm] = useState(searchTerm)
  const [evidenceFilter, setEvidenceFilter] = useState('all')
  const [difficultyFilter, setDifficultyFilter] = useState('all')
  const [loading, setLoading] = useState(true)
  const [selectedTemplate, setSelectedTemplate] = useState<AssessmentTemplate | null>(null)

  useEffect(() => {
    fetchTemplates()
  }, [])

  useEffect(() => {
    filterTemplates()
  }, [templates, selectedCategory, localSearchTerm, evidenceFilter, difficultyFilter])

  const fetchTemplates = async () => {
    try {
      const { data, error } = await supabase
        .from('assessment_templates')
        .select('*')
        .eq('is_active', true)
        .order('category', { ascending: true })

      if (error) throw error
      setTemplates(data || [])
    } catch (error) {
      console.error('Error fetching assessment templates:', error)
      setTemplates([])
    } finally {
      setLoading(false)
    }
  }

  const filterTemplates = () => {
    let filtered = templates

    // Category filter
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(t => t.category === selectedCategory)
    }

    // Search filter
    if (localSearchTerm) {
      filtered = filtered.filter(t =>
        t.name.toLowerCase().includes(localSearchTerm.toLowerCase()) ||
        t.abbreviation.toLowerCase().includes(localSearchTerm.toLowerCase()) ||
        t.description.toLowerCase().includes(localSearchTerm.toLowerCase())
      )
    }

    // Evidence level filter
    if (evidenceFilter !== 'all') {
      filtered = filtered.filter(t => t.evidence_level === evidenceFilter)
    }

    setFilteredTemplates(filtered)
  }

  const getCategoryIcon = (cat: string) => {
    const icons = {
      anxiety: Heart,
      depression: Brain,
      trauma: Shield,
      stress: Zap,
      wellbeing: Star,
      general: BookOpen
    }
    return icons[cat as keyof typeof icons] || BookOpen
  }

  const getCategoryColor = (cat: string) => {
    const colors = {
      anxiety: 'text-red-600 bg-red-100',
      depression: 'text-blue-600 bg-blue-100',
      trauma: 'text-purple-600 bg-purple-100',
      stress: 'text-orange-600 bg-orange-100',
      wellbeing: 'text-green-600 bg-green-100',
      general: 'text-gray-600 bg-gray-100'
    }
    return colors[cat as keyof typeof colors] || 'text-gray-600 bg-gray-100'
  }

  const getEvidenceColor = (level: string) => {
    const colors = {
      research_based: 'text-green-700 bg-green-100',
      clinical_consensus: 'text-blue-700 bg-blue-100',
      expert_opinion: 'text-yellow-700 bg-yellow-100'
    }
    return colors[level as keyof typeof colors] || 'text-gray-700 bg-gray-100'
  }

  const categories = [
    { id: 'all', name: 'All Assessments', count: templates.length },
    { id: 'anxiety', name: 'Anxiety', count: templates.filter(t => t.category === 'anxiety').length },
    { id: 'depression', name: 'Depression', count: templates.filter(t => t.category === 'depression').length },
    { id: 'trauma', name: 'Trauma', count: templates.filter(t => t.category === 'trauma').length },
    { id: 'stress', name: 'Stress', count: templates.filter(t => t.category === 'stress').length },
    { id: 'wellbeing', name: 'Wellbeing', count: templates.filter(t => t.category === 'wellbeing').length },
    { id: 'general', name: 'General', count: templates.filter(t => t.category === 'general').length }
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Library className="w-6 h-6 text-blue-600" />
          <h2 className="text-2xl font-bold text-gray-900">Assessment Library</h2>
        </div>
        <div className="text-sm text-gray-600">
          {filteredTemplates.length} of {templates.length} assessments
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Search */}
          <div className="md:col-span-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search assessments..."
                value={localSearchTerm}
                onChange={(e) => setLocalSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          {/* Evidence Level Filter */}
          <div>
            <select
              value={evidenceFilter}
              onChange={(e) => setEvidenceFilter(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Evidence Levels</option>
              <option value="research_based">Research Based</option>
              <option value="clinical_consensus">Clinical Consensus</option>
              <option value="expert_opinion">Expert Opinion</option>
            </select>
          </div>

          {/* Clear Filters */}
          {(localSearchTerm || selectedCategory !== 'all' || evidenceFilter !== 'all') && (
            <button
              onClick={() => {
                setLocalSearchTerm('')
                setSelectedCategory('all')
                setEvidenceFilter('all')
              }}
              className="px-3 py-2 text-sm text-blue-600 hover:text-blue-800 font-medium"
            >
              Clear Filters
            </button>
          )}
        </div>

        {/* Category Pills */}
        <div className="flex flex-wrap gap-2 mt-4">
          {categories.map(cat => {
            const Icon = getCategoryIcon(cat.id)
            const isActive = selectedCategory === cat.id
            
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`flex items-center space-x-2 px-3 py-2 rounded-full text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-blue-100 text-blue-700 border border-blue-200'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{cat.name}</span>
                <span className={`px-2 py-0.5 text-xs rounded-full ${
                  isActive ? 'bg-blue-200 text-blue-800' : 'bg-gray-200 text-gray-600'
                }`}>
                  {cat.count}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Assessment Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredTemplates.map(template => {
          const CategoryIcon = getCategoryIcon(template.category)
          
          return (
            <div key={template.id} className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md hover:border-blue-200 transition-all">
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <CategoryIcon className="w-6 h-6 text-blue-600" />
                  <div>
                    <h3 className="font-semibold text-gray-900">{template.name}</h3>
                    <p className="text-sm text-blue-600 font-medium">{template.abbreviation}</p>
                  </div>
                </div>
                <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getCategoryColor(template.category)}`}>
                  {template.category}
                </span>
              </div>

              {/* Description */}
              <p className="text-sm text-gray-600 mb-4 line-clamp-2">{template.description}</p>

              {/* Metadata */}
              <div className="space-y-2 mb-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Questions:</span>
                  <span className="font-medium text-gray-900">{template.questions.length}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Duration:</span>
                  <span className="font-medium text-gray-900">~{template.estimated_duration_minutes} min</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Max Score:</span>
                  <span className="font-medium text-gray-900">{template.scoring_config.max_score}</span>
                </div>
              </div>

              {/* Evidence Level */}
              <div className="mb-4">
                <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getEvidenceColor(template.evidence_level)}`}>
                  {template.evidence_level.replace('_', ' ')}
                </span>
              </div>

              {/* Actions */}
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
          )
        })}
      </div>

      {/* Empty State */}
      {filteredTemplates.length === 0 && (
        <div className="text-center py-12">
          <Library className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No assessments found</h3>
          <p className="text-gray-600">
            {localSearchTerm || selectedCategory !== 'all' || evidenceFilter !== 'all'
              ? 'Try adjusting your search or filters.'
              : 'No assessment templates are available.'
            }
          </p>
        </div>
      )}

      {/* Template Preview Modal */}
      {selectedTemplate && (
        <AssessmentPreviewModal
          template={selectedTemplate}
          onClose={() => setSelectedTemplate(null)}
          onAssign={(templateId) => onAssign(templateId, [])}
        />
      )}
    </div>
  )
}

// Assessment Preview Modal
interface AssessmentPreviewModalProps {
  template: AssessmentTemplate
  onClose: () => void
  onAssign: (templateId: string) => void
}

const AssessmentPreviewModal: React.FC<AssessmentPreviewModalProps> = ({
  template,
  onClose,
  onAssign
}) => {
  const CategoryIcon = AssessmentUtils.getCategoryIcon(template.category)

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen p-4">
        <div className="fixed inset-0 bg-gray-900 bg-opacity-50" onClick={onClose} />
        
        <div className="relative bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div className="flex items-center space-x-3">
              <span className="text-4xl">{CategoryIcon}</span>
              <div>
                <h3 className="text-xl font-bold text-gray-900">{template.name}</h3>
                <p className="text-blue-600 font-medium">{template.abbreviation}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 overflow-y-auto max-h-96">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Assessment Details */}
              <div className="space-y-4">
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">Description</h4>
                  <p className="text-gray-700">{template.description}</p>
                </div>

                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">Instructions</h4>
                  <p className="text-gray-700">{template.instructions}</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-2">Questions</h4>
                    <p className="text-2xl font-bold text-blue-600">{template.questions.length}</p>
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-2">Duration</h4>
                    <p className="text-2xl font-bold text-green-600">~{template.estimated_duration_minutes}m</p>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">Evidence Level</h4>
                  <span className={`inline-flex px-3 py-1 text-sm font-medium rounded-full ${getEvidenceColor(template.evidence_level)}`}>
                    {template.evidence_level.replace('_', ' ')}
                  </span>
                </div>
              </div>

              {/* Scoring & Interpretation */}
              <div className="space-y-4">
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">Scoring</h4>
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <div className="text-sm space-y-1">
                      <div>Method: <span className="font-medium">{template.scoring_config.method}</span></div>
                      <div>Max Score: <span className="font-medium">{template.scoring_config.max_score}</span></div>
                      {template.scoring_config.reverse_scored_items && template.scoring_config.reverse_scored_items.length > 0 && (
                        <div>Reverse Scored: <span className="font-medium">{template.scoring_config.reverse_scored_items.length} items</span></div>
                      )}
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">Interpretation Ranges</h4>
                  <div className="space-y-2">
                    {template.interpretation_rules.ranges.map((range, index) => (
                      <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                        <span className="text-sm font-medium text-gray-900">{range.label}</span>
                        <span className="text-sm text-gray-600">{range.min}-{range.max}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Clinical Cutoffs */}
                {template.clinical_cutoffs.clinical_cutoff && (
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-2">Clinical Cutoff</h4>
                    <div className="bg-yellow-50 border border-yellow-200 p-3 rounded-lg">
                      <p className="text-sm text-yellow-800">
                        Score ≥ {template.clinical_cutoffs.clinical_cutoff} indicates clinical significance
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Sample Questions */}
            <div className="mt-6">
              <h4 className="font-semibold text-gray-900 mb-3">Sample Questions</h4>
              <div className="space-y-3">
                {template.questions.slice(0, 3).map((question, index) => (
                  <div key={question.id} className="border border-gray-200 rounded-lg p-4">
                    <p className="text-sm font-medium text-gray-900 mb-2">
                      {index + 1}. {question.text}
                    </p>
                    <div className="text-xs text-gray-500">
                      Type: {question.type} • 
                      {question.type === 'scale' && ` Scale: ${question.scale_min}-${question.scale_max}`}
                      {question.type === 'multiple_choice' && ` Options: ${question.options?.length}`}
                    </div>
                  </div>
                ))}
                {template.questions.length > 3 && (
                  <p className="text-sm text-gray-500 text-center">
                    ... and {template.questions.length - 3} more questions
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="p-6 border-t border-gray-200 flex justify-end space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
            >
              Close
            </button>
            <button
              onClick={() => onAssign(template.id)}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Assign to Clients
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}