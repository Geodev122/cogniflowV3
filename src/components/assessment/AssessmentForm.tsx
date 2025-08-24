import React, { useState, useEffect } from 'react'
import { AssessmentInstance, AssessmentFormProps } from '../../types/assessment'
import { AssessmentRenderer } from './AssessmentRenderer'
import { AssessmentScoringEngine } from '../../lib/assessmentEngine'
import { supabase } from '../../lib/supabase'
import { 
  Save, 
  Send, 
  Clock, 
  CheckCircle, 
  AlertTriangle, 
  Brain,
  BarChart3,
  FileText,
  X
} from 'lucide-react'

export const AssessmentForm: React.FC<AssessmentFormProps> = ({
  instance,
  onResponse,
  onComplete,
  onSave,
  readonly = false,
  showProgress = true,
  showNavigation = true
}) => {
  const [responses, setResponses] = useState<Record<string, any>>({})
  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [saving, setSaving] = useState(false)
  const [completing, setCompleting] = useState(false)
  const [validationErrors, setValidationErrors] = useState<string[]>([])
  const [showResults, setShowResults] = useState(false)
  const [calculatedScore, setCalculatedScore] = useState<any>(null)

  useEffect(() => {
    loadExistingResponses()
  }, [instance.id])

  const loadExistingResponses = async () => {
    try {
      const { data, error } = await supabase
        .from('assessment_responses')
        .select('question_id, response_value')
        .eq('instance_id', instance.id)

      if (error) throw error

      const responseMap: Record<string, any> = {}
      data?.forEach(resp => {
        responseMap[resp.question_id] = resp.response_value
      })
      
      setResponses(responseMap)
    } catch (error) {
      console.error('Error loading responses:', error)
    }
  }

  const handleResponse = async (questionId: string, value: any) => {
    const newResponses = { ...responses, [questionId]: value }
    setResponses(newResponses)
    onResponse(questionId, value)

    // Auto-save response
    try {
      await supabase
        .from('assessment_responses')
        .upsert({
          instance_id: instance.id,
          question_id: questionId,
          response_value: value,
          is_final: false
        })

      // Update instance status to in_progress if not already
      if (instance.status === 'assigned') {
        await supabase
          .from('assessment_instances')
          .update({ 
            status: 'in_progress',
            started_at: new Date().toISOString()
          })
          .eq('id', instance.id)
      }
    } catch (error) {
      console.error('Error saving response:', error)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      // Mark all responses as saved but not final
      const responseUpdates = Object.entries(responses).map(([questionId, value]) => ({
        instance_id: instance.id,
        question_id: questionId,
        response_value: value,
        is_final: false
      }))

      const { error } = await supabase
        .from('assessment_responses')
        .upsert(responseUpdates)

      if (error) throw error

      onSave()
    } catch (error) {
      console.error('Error saving assessment:', error)
      alert('Error saving assessment. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const handleComplete = async () => {
    if (!instance.template) return

    setCompleting(true)
    try {
      // Validate responses
      const engine = new AssessmentScoringEngine(instance.template, responses)
      const validation = engine.validateResponses()

      if (!validation.isComplete) {
        setValidationErrors(validation.missingQuestions)
        setCompleting(false)
        return
      }

      // Mark all responses as final
      const responseUpdates = Object.entries(responses).map(([questionId, value]) => ({
        instance_id: instance.id,
        question_id: questionId,
        response_value: value,
        is_final: true,
        response_timestamp: new Date().toISOString()
      }))

      const { error: responseError } = await supabase
        .from('assessment_responses')
        .upsert(responseUpdates)

      if (responseError) throw responseError

      // Update instance status to completed
      const { error: instanceError } = await supabase
        .from('assessment_instances')
        .update({ 
          status: 'completed',
          completed_at: new Date().toISOString()
        })
        .eq('id', instance.id)

      if (instanceError) throw instanceError

      // Calculate score and show results
      const score = engine.calculateRawScore()
      const interpretation = engine.getInterpretation(score)
      const alerts = engine.checkClinicalAlerts(score)
      const narrativeReport = engine.generateNarrativeReport(score, interpretation)

      setCalculatedScore({
        score,
        maxScore: instance.template.scoring_config.max_score,
        interpretation,
        alerts,
        narrativeReport
      })
      setShowResults(true)

      onComplete()
    } catch (error) {
      console.error('Error completing assessment:', error)
      alert('Error completing assessment. Please try again.')
    } finally {
      setCompleting(false)
    }
  }

  const getCompletionPercentage = () => {
    if (!instance.template) return 0
    const totalQuestions = instance.template.questions.length
    const answeredQuestions = Object.keys(responses).length
    return totalQuestions > 0 ? Math.round((answeredQuestions / totalQuestions) * 100) : 0
  }

  const isFormComplete = instance.template?.questions.every(q => 
    responses[q.id] !== undefined && responses[q.id] !== null
  ) || false

  if (showResults && calculatedScore) {
    return (
      <div className="space-y-6">
        {/* Results Header */}
        <div className="bg-green-50 border border-green-200 rounded-lg p-6">
          <div className="flex items-center space-x-3 mb-4">
            <CheckCircle className="w-8 h-8 text-green-600" />
            <div>
              <h3 className="text-xl font-semibold text-green-900">Assessment Complete</h3>
              <p className="text-green-700">{instance.template?.name}</p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600">{calculatedScore.score}</div>
              <div className="text-sm text-green-700">Raw Score</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600">
                {Math.round((calculatedScore.score / calculatedScore.maxScore) * 100)}%
              </div>
              <div className="text-sm text-blue-700">Percentile</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-purple-600">{calculatedScore.interpretation.category}</div>
              <div className="text-sm text-purple-700">Interpretation</div>
            </div>
          </div>
        </div>

        {/* Clinical Alerts */}
        {calculatedScore.alerts.length > 0 && (
          <div className="space-y-2">
            {calculatedScore.alerts.map((alert: any, index: number) => (
              <div key={index} className={`border rounded-lg p-4 ${
                alert.type === 'critical' ? 'bg-red-50 border-red-200' :
                alert.type === 'warning' ? 'bg-yellow-50 border-yellow-200' :
                'bg-blue-50 border-blue-200'
              }`}>
                <div className="flex items-start space-x-2">
                  <AlertTriangle className={`w-5 h-5 mt-0.5 ${
                    alert.type === 'critical' ? 'text-red-600' :
                    alert.type === 'warning' ? 'text-yellow-600' :
                    'text-blue-600'
                  }`} />
                  <div>
                    <p className={`font-medium ${
                      alert.type === 'critical' ? 'text-red-900' :
                      alert.type === 'warning' ? 'text-yellow-900' :
                      'text-blue-900'
                    }`}>
                      {alert.message}
                    </p>
                    {alert.action_required && (
                      <p className="text-sm mt-1 text-gray-600">Action required by therapist</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Interpretation */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
            <Brain className="w-5 h-5 mr-2 text-purple-600" />
            Clinical Interpretation
          </h4>
          <div className="space-y-3">
            <div>
              <span className="font-medium text-gray-700">Category: </span>
              <span className="text-gray-900">{calculatedScore.interpretation.category}</span>
            </div>
            <div>
              <span className="font-medium text-gray-700">Description: </span>
              <span className="text-gray-900">{calculatedScore.interpretation.description}</span>
            </div>
            <div>
              <span className="font-medium text-gray-700">Recommendations: </span>
              <span className="text-gray-900">{calculatedScore.interpretation.recommendations}</span>
            </div>
          </div>
        </div>

        {/* Narrative Report */}
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
          <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
            <FileText className="w-5 h-5 mr-2 text-gray-600" />
            Narrative Report
          </h4>
          <div className="text-sm text-gray-700 whitespace-pre-line font-mono bg-white p-4 rounded border">
            {calculatedScore.narrativeReport}
          </div>
        </div>
      </div>
    )
  }

  if (!instance.template) {
    return (
      <div className="text-center py-8">
        <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900">Template not found</h3>
        <p className="text-gray-600">The assessment template could not be loaded.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Assessment Header */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{instance.template.name}</h2>
            <p className="text-gray-600 mt-1">{instance.template.description}</p>
            <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500">
              <span className="flex items-center">
                <Clock className="w-4 h-4 mr-1" />
                ~{instance.template.estimated_duration_minutes} minutes
              </span>
              <span>{instance.template.questions.length} questions</span>
            </div>
          </div>
          <div className={`inline-flex px-3 py-1 text-sm font-medium rounded-full ${
            instance.status === 'completed' ? 'text-green-600 bg-green-100' :
            instance.status === 'in_progress' ? 'text-blue-600 bg-blue-100' :
            'text-gray-600 bg-gray-100'
          }`}>
            <div className="flex items-center space-x-1">
              {instance.status === 'completed' ? <CheckCircle className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
              <span className="capitalize">{instance.status.replace('_', ' ')}</span>
            </div>
          </div>
        </div>

        {/* Instructions */}
        {instance.instructions && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-blue-800">{instance.instructions}</p>
          </div>
        )}
      </div>

      {/* Validation Errors */}
      {validationErrors.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-start space-x-2">
            <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5" />
            <div>
              <h4 className="font-medium text-red-900">Please complete all required questions</h4>
              <ul className="text-sm text-red-800 mt-1 list-disc list-inside">
                {validationErrors.map(questionId => {
                  const question = instance.template?.questions.find(q => q.id === questionId)
                  return (
                    <li key={questionId}>
                      {question?.text || `Question ${questionId}`}
                    </li>
                  )
                })}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Assessment Renderer */}
      <AssessmentRenderer
        template={instance.template}
        responses={responses}
        onResponse={handleResponse}
        readonly={readonly}
        currentQuestion={showNavigation ? currentQuestion : undefined}
        onQuestionChange={showNavigation ? setCurrentQuestion : undefined}
      />

      {/* Action Buttons */}
      {!readonly && instance.status !== 'completed' && (
        <div className="flex justify-between items-center bg-white border border-gray-200 rounded-lg p-4">
          <div className="text-sm text-gray-600">
            Progress: {getCompletionPercentage()}% complete
          </div>
          
          <div className="flex space-x-3">
            <button
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
            >
              {saving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600 mr-2"></div>
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Save Progress
                </>
              )}
            </button>
            
            <button
              onClick={handleComplete}
              disabled={!isFormComplete || completing}
              className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {completing ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Completing...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Complete Assessment
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Completed Assessment Actions */}
      {instance.status === 'completed' && (
        <div className="flex justify-center space-x-3 bg-white border border-gray-200 rounded-lg p-4">
          <button
            onClick={() => setShowResults(!showResults)}
            className="inline-flex items-center px-4 py-2 text-sm font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100"
          >
            <BarChart3 className="w-4 h-4 mr-2" />
            {showResults ? 'Hide Results' : 'View Results'}
          </button>
        </div>
      )}
    </div>
  )
}