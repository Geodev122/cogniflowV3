// src/components/assessment/AssessmentForm.tsx
import React, { useEffect, useMemo, useRef, useState } from 'react'
import { AssessmentFormProps } from '../../types/assessment'
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
} from 'lucide-react'

type DbResultRow = {
  id: string
  instance_id: string
  total_score: number | null
  max_score: number | null
  subscale_scores: any | null
  interpretation: any | null
  alerts: any | null
  narrative_report: string | null
  created_at: string
}

export const AssessmentForm: React.FC<AssessmentFormProps> = ({
  instance,
  onResponse,
  onComplete,
  onSave,
  readonly = false,
  showProgress = true,
  showNavigation = true,
}) => {
  const [responses, setResponses] = useState<Record<string, any>>({})
  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [saving, setSaving] = useState(false)
  const [completing, setCompleting] = useState(false)
  const [validationErrors, setValidationErrors] = useState<string[]>([])
  const [showResults, setShowResults] = useState(false)
  const [calculatedScore, setCalculatedScore] = useState<{
    score: number
    maxScore: number
    interpretation: any
    alerts: any[]
    narrativeReport: string
    subscaleScores?: Record<string, number>
  } | null>(null)

  const template = instance.template
  const debouncedTimer = useRef<number | null>(null)

  /* ────────────────────────────────────────────────────────────────────────────
     Load existing responses + saved result (if completed)
  ─────────────────────────────────────────────────────────────────────────────*/
  useEffect(() => {
    const load = async () => {
      try {
        // Responses
        const { data, error } = await supabase
          .from('assessment_responses')
          .select('question_id, response_value')
          .eq('instance_id', instance.id)

        if (error) throw error

        const map: Record<string, any> = {}
        for (const r of data || []) map[r.question_id] = r.response_value
        setResponses(map)
      } catch (err) {
        console.error('[AssessmentForm] load responses error:', err)
      }

      // Existing results (if completed)
      if (instance.status === 'completed') {
        try {
          const { data: resRows, error: resErr } = await supabase
            .from('assessment_results')
            .select(
              'id, instance_id, total_score, max_score, interpretation, alerts, narrative_report, subscale_scores, created_at'
            )
            .eq('instance_id', instance.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .returns<DbResultRow[]>()

          if (resErr) throw resErr

          if (resRows && resRows.length) {
            const r = resRows[0]
            setCalculatedScore({
              score: Number(r.total_score ?? 0),
              maxScore: Number(r.max_score ?? (template?.scoring_config?.max_score ?? 0)),
              interpretation: r.interpretation,
              alerts: Array.isArray(r.alerts) ? r.alerts : [],
              narrativeReport: r.narrative_report || '',
              subscaleScores: r.subscale_scores || undefined,
            })
          }
        } catch (err) {
          console.error('[AssessmentForm] load results error:', err)
        }
      }
    }

    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [instance.id])

  /* ────────────────────────────────────────────────────────────────────────────
     Derived: progress %
  ─────────────────────────────────────────────────────────────────────────────*/
  const totalQuestions = template?.questions?.length ?? 0
  const answeredQuestions = useMemo(
    () =>
      Object.keys(responses).filter(
        (k) => responses[k] !== undefined && responses[k] !== null && responses[k] !== ''
      ).length,
    [responses]
  )
  const progressPct = totalQuestions > 0 ? Math.round((answeredQuestions / totalQuestions) * 100) : 0

  // Only required questions must be answered to complete
  const isFormComplete =
    !!template?.questions
      ?.filter((q: any) => q.required !== false)
      .every((q: any) => responses[q.id] !== undefined && responses[q.id] !== null && responses[q.id] !== '')

  /* ────────────────────────────────────────────────────────────────────────────
     Debounced progress update on instance
  ─────────────────────────────────────────────────────────────────────────────*/
  useEffect(() => {
    if (!showProgress) return
    if (debouncedTimer.current) window.clearTimeout(debouncedTimer.current)
    debouncedTimer.current = window.setTimeout(async () => {
      try {
        await supabase.from('assessment_instances').update({ progress: progressPct }).eq('id', instance.id)
      } catch (e) {
        console.warn('[AssessmentForm] progress update failed:', e)
      }
    }, 400)
    return () => {
      if (debouncedTimer.current) window.clearTimeout(debouncedTimer.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [progressPct, instance.id])

  /* ────────────────────────────────────────────────────────────────────────────
     On single response change → upsert + move status to in_progress (once)
  ─────────────────────────────────────────────────────────────────────────────*/
  const handleResponse = async (questionId: string, value: any) => {
    const next = { ...responses, [questionId]: value }
    setResponses(next)
    onResponse?.(questionId, value)

    try {
      const { error: upErr } = await supabase.from('assessment_responses').upsert({
        instance_id: instance.id,
        question_id: questionId,
        response_value: value,
        is_final: false,
      })
      if (upErr) throw upErr

      if (instance.status === 'assigned') {
        await supabase
          .from('assessment_instances')
          .update({
            status: 'in_progress',
            started_at: new Date().toISOString(),
          })
          .eq('id', instance.id)
      }
    } catch (e) {
      console.error('[AssessmentForm] save response error:', e)
    }
  }

  /* ────────────────────────────────────────────────────────────────────────────
     Manual save (marks NOT final)
  ─────────────────────────────────────────────────────────────────────────────*/
  const handleSave = async () => {
    setSaving(true)
    try {
      const rows = Object.entries(responses).map(([qid, val]) => ({
        instance_id: instance.id,
        question_id: qid,
        response_value: val,
        is_final: false,
      }))
      if (rows.length) {
        const { error } = await supabase.from('assessment_responses').upsert(rows)
        if (error) throw error
      }
      onSave?.()
    } catch (e) {
      console.error('[AssessmentForm] save error:', e)
      alert('Error saving assessment. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  /* ────────────────────────────────────────────────────────────────────────────
     Complete flow: validate → finalize → compute → persist → read back
  ─────────────────────────────────────────────────────────────────────────────*/
  const handleComplete = async () => {
    if (!template) return
    setCompleting(true)

    try {
      // Validate
      const engine = new AssessmentScoringEngine(template, responses)
      const validation = engine.validateResponses()
      if (!validation.isComplete) {
        setValidationErrors(validation.missingQuestions)
        setCompleting(false)
        return
      }

      // Finalize responses
      const rows = Object.entries(responses).map(([qid, val]) => ({
        instance_id: instance.id,
        question_id: qid,
        response_value: val,
        is_final: true,
        response_timestamp: new Date().toISOString(),
      }))
      if (rows.length) {
        const { error: respErr } = await supabase.from('assessment_responses').upsert(rows)
        if (respErr) throw respErr
      }

      // Update instance
      {
        const { error: instErr } = await supabase
          .from('assessment_instances')
          .update({
            status: 'completed',
            completed_at: new Date().toISOString(),
            progress: 100,
          })
          .eq('id', instance.id)
        if (instErr) throw instErr
      }

      // Compute result
      const score = engine.calculateRawScore()
      const maxScore =
        template?.scoring_config?.max_score != null
          ? Number(template.scoring_config.max_score)
          : Number(score)
      const interpretation = engine.getInterpretation(score)
      const alerts = engine.checkClinicalAlerts(score)
      const narrativeReport = engine.generateNarrativeReport(score, interpretation)
      const subscaleScores = engine.calculateSubscaleScores?.() ?? undefined

      // Persist canonical result (idempotent upsert on unique(instance_id))
      {
        const { error: resErr } = await supabase.from('assessment_results').upsert(
          {
            instance_id: instance.id,
            total_score: Number(score),
            max_score: Number(maxScore),
            interpretation,
            alerts,
            narrative_report: narrativeReport,
            subscale_scores: subscaleScores ?? null,
          },
          { onConflict: 'instance_id' }
        )
        if (resErr) throw resErr
      }

      // Read back the saved snapshot we’ll display
      const { data: resRows, error: readErr } = await supabase
        .from('assessment_results')
        .select(
          'id, instance_id, total_score, max_score, interpretation, alerts, narrative_report, subscale_scores, created_at'
        )
        .eq('instance_id', instance.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .returns<DbResultRow[]>()

      if (readErr) throw readErr

      const saved = resRows?.[0]
      setCalculatedScore({
        score: saved ? Number(saved.total_score ?? score) : Number(score),
        maxScore: saved ? Number(saved.max_score ?? maxScore) : Number(maxScore),
        interpretation: saved?.interpretation ?? interpretation,
        alerts: (saved?.alerts as any[]) ?? alerts,
        narrativeReport: saved?.narrative_report ?? narrativeReport,
        subscaleScores: (saved?.subscale_scores as Record<string, number> | null) || undefined,
      })
      setShowResults(true)

      onComplete?.()
    } catch (e) {
      console.error('[AssessmentForm] complete error:', e)
      alert('Error completing assessment. Please try again.')
    } finally {
      setCompleting(false)
    }
  }

  /* ────────────────────────────────────────────────────────────────────────────
     UI
  ─────────────────────────────────────────────────────────────────────────────*/
  if (!template) {
    return (
      <div className="text-center py-8">
        <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900">Template not found</h3>
        <p className="text-gray-600">The assessment template could not be loaded.</p>
      </div>
    )
  }

  if (showResults && calculatedScore) {
    return (
      <div className="space-y-6">
        {/* Results Header */}
        <div className="bg-green-50 border border-green-200 rounded-lg p-6">
          <div className="flex items-center space-x-3 mb-4">
            <CheckCircle className="w-8 h-8 text-green-600" />
            <div>
              <h3 className="text-xl font-semibold text-green-900">Assessment Complete</h3>
              <p className="text-green-700">{template?.name}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600">{calculatedScore.score}</div>
              <div className="text-sm text-green-700">Raw Score</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600">
                {calculatedScore.maxScore
                  ? Math.round((calculatedScore.score / calculatedScore.maxScore) * 100)
                  : 0}
                %
              </div>
              <div className="text-sm text-blue-700">Percent of Max</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-purple-600">
                {calculatedScore.interpretation?.category}
              </div>
              <div className="text-sm text-purple-700">Interpretation</div>
            </div>
          </div>
        </div>

        {/* Clinical Alerts */}
        {Array.isArray(calculatedScore.alerts) && calculatedScore.alerts.length > 0 && (
          <div className="space-y-2">
            {calculatedScore.alerts.map((alert: any, idx: number) => (
              <div
                key={idx}
                className={`border rounded-lg p-4 ${
                  alert.type === 'critical'
                    ? 'bg-red-50 border-red-200'
                    : alert.type === 'warning'
                    ? 'bg-yellow-50 border-yellow-200'
                    : 'bg-blue-50 border-blue-200'
                }`}
              >
                <div className="flex items-start space-x-2">
                  <AlertTriangle
                    className={`w-5 h-5 mt-0.5 ${
                      alert.type === 'critical'
                        ? 'text-red-600'
                        : alert.type === 'warning'
                        ? 'text-yellow-600'
                        : 'text-blue-600'
                    }`}
                  />
                  <div>
                    <p
                      className={`font-medium ${
                        alert.type === 'critical'
                          ? 'text-red-900'
                          : alert.type === 'warning'
                          ? 'text-yellow-900'
                          : 'text-blue-900'
                      }`}
                    >
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
              <span className="text-gray-900">{calculatedScore.interpretation?.category}</span>
            </div>
            <div>
              <span className="font-medium text-gray-700">Description: </span>
              <span className="text-gray-900">{calculatedScore.interpretation?.description}</span>
            </div>
            <div>
              <span className="font-medium text-gray-700">Recommendations: </span>
              <span className="text-gray-900">{calculatedScore.interpretation?.recommendations}</span>
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

  return (
    <div className="space-y-6">
      {/* Assessment Header */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{template.name}</h2>
            <p className="text-gray-600 mt-1">{template.description}</p>
            <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500">
              <span className="flex items-center">
                <Clock className="w-4 h-4 mr-1" />
                ~{template.estimated_duration_minutes} minutes
              </span>
              <span>{template.questions.length} questions</span>
            </div>
          </div>
          <div
            className={`inline-flex px-3 py-1 text-sm font-medium rounded-full ${
              instance.status === 'completed'
                ? 'text-green-600 bg-green-100'
                : instance.status === 'in_progress'
                ? 'text-blue-600 bg-blue-100'
                : 'text-gray-600 bg-gray-100'
            }`}
          >
            <div className="flex items-center space-x-1">
              {instance.status === 'completed' ? <CheckCircle className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
              <span className="capitalize">{instance.status.replace('_', ' ')}</span>
            </div>
          </div>
        </div>

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
                {validationErrors.map((questionId) => {
                  const question = template?.questions.find((q: any) => q.id === questionId)
                  return <li key={questionId}>{question?.text || `Question ${questionId}`}</li>
                })}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Assessment Renderer */}
      <AssessmentRenderer
        template={template}
        responses={responses}
        onResponse={handleResponse}
        readonly={readonly}
        currentQuestion={showNavigation ? currentQuestion : undefined}
        onQuestionChange={showNavigation ? setCurrentQuestion : undefined}
      />

      {/* Actions */}
      {!readonly && instance.status !== 'completed' && (
        <div className="flex justify-between items-center bg-white border border-gray-200 rounded-lg p-4">
          <div className="text-sm text-gray-600">Progress: {progressPct}% complete</div>
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

      {/* Completed actions */}
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
