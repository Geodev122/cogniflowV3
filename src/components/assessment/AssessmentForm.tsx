// src/components/assessment/AssessmentForm.tsx
import React, { useEffect, useMemo, useRef, useState } from 'react'
import { AssessmentFormProps } from '../../types/assessment'
import { AssessmentRenderer } from './AssessmentRenderer'
import { AssessmentScoringEngine } from '../../lib/assessmentEngine'
import { supabase } from '../../lib/supabase'
import {
  Save, Send, Clock, CheckCircle, AlertTriangle, Brain, BarChart3,
} from 'lucide-react'
import AssessmentReport from './AssessmentReport'

type ScoreRow = {
  id: string
  instance_id: string
  raw_score: number
  scaled_score: number | null
  percentile: number | null
  t_score: number | null
  z_score: number | null
  interpretation_category: string | null
  interpretation_description: string | null
  clinical_significance: string | null
  severity_level: string | null
  recommendations: string | null
  therapist_notes: string | null
  auto_generated: boolean
  calculated_at: string
}

export const AssessmentForm: React.FC<AssessmentFormProps> = ({
  instance,
  onResponse,
  onComplete,
  onSave,
  readonly = false,
  showProgress = true,    // kept for future column/trigger
  showNavigation = true,
}) => {
  const [responses, setResponses] = useState<Record<string, any>>({})
  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [saving, setSaving] = useState(false)
  const [completing, setCompleting] = useState(false)
  const [validationErrors, setValidationErrors] = useState<string[]>([])
  const [showResults, setShowResults] = useState(false)
  const [therapistName, setTherapistName] = useState<string | null>(null)

  const [calculatedScore, setCalculatedScore] = useState<{
    raw: number
    percentOfMax?: number
    interpretation?: {
      category?: string
      description?: string
      recommendations?: string
      clinical_significance?: string
      severity_level?: string
    }
    subscales?: Record<string, number>
    narrative?: string
  } | null>(null)

  const template = instance.template
  const debouncedTimer = useRef<number | null>(null)

  /* ────────────────────────────────────────────────────────────────────────────
     Load therapist display name (for “Passed by” in PDF header)
  ─────────────────────────────────────────────────────────────────────────────*/
  useEffect(() => {
    let cancel = false
    const run = async () => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('first_name,last_name')
          .eq('id', instance.therapist_id)
          .single()
        if (!cancel) {
          if (error || !data) setTherapistName(null)
          else setTherapistName(`${data.first_name || ''} ${data.last_name || ''}`.trim())
        }
      } catch {
        if (!cancel) setTherapistName(null)
      }
    }
    run()
    return () => { cancel = true }
  }, [instance.therapist_id])

  /* ────────────────────────────────────────────────────────────────────────────
     Load existing responses + saved score (if completed)
     - Use the same in-memory map for subscale/narrative to avoid races.
  ─────────────────────────────────────────────────────────────────────────────*/
  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        // 1) Responses
        const { data, error } = await supabase
          .from('assessment_responses')
          .select('question_id, response_value')
          .eq('instance_id', instance.id)

        if (error) throw error
        const map: Record<string, any> = {}
        for (const r of data || []) map[r.question_id] = r.response_value
        if (!cancelled) setResponses(map)

        // 2) If already completed, load the most recent score and regenerate extras
        if (instance.status === 'completed' && template) {
          const { data: scores, error: resErr } = await supabase
            .from('assessment_scores')
            .select(
              'id, instance_id, raw_score, scaled_score, percentile, t_score, z_score, interpretation_category, interpretation_description, clinical_significance, severity_level, recommendations, auto_generated, calculated_at'
            )
            .eq('instance_id', instance.id)
            .order('calculated_at', { ascending: false })
            .limit(1)
            .returns<ScoreRow[]>()

          if (resErr) throw resErr

          const s = scores?.[0]
          if (s && !cancelled) {
            const percentOfMax =
              template.scoring_config?.max_score
                ? Math.round((Number(s.raw_score) / Number(template.scoring_config.max_score)) * 100)
                : undefined

            const engine = new AssessmentScoringEngine(template, map)
            const subs = engine.calculateSubscaleScores?.() ?? undefined
            const narrative = engine.generateNarrativeReport(Number(s.raw_score), {
              category: s.interpretation_category ?? undefined,
              description: s.interpretation_description ?? undefined,
              recommendations: s.recommendations ?? undefined,
              clinical_significance: s.clinical_significance ?? undefined,
              severity_level: s.severity_level ?? undefined,
            })

            setCalculatedScore({
              raw: Number(s.raw_score),
              percentOfMax,
              interpretation: {
                category: s.interpretation_category ?? undefined,
                description: s.interpretation_description ?? undefined,
                clinical_significance: s.clinical_significance ?? undefined,
                severity_level: s.severity_level ?? undefined,
                recommendations: s.recommendations ?? undefined,
              },
              subscales: subs,
              narrative,
            })
          }
        }
      } catch (err) {
        console.error('[AssessmentForm] load error:', err)
      }
    }

    load()
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [instance.id])

  /* ────────────────────────────────────────────────────────────────────────────
     Derived progress
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
     Debounced progress update — (disabled: no column in DB)
     Keep the structure so it’s easy to re-enable after adding column/trigger.
  ─────────────────────────────────────────────────────────────────────────────*/
  // useEffect(() => {
  //   if (!showProgress) return
  //   if (debouncedTimer.current) window.clearTimeout(debouncedTimer.current)
  //   debouncedTimer.current = window.setTimeout(async () => {
  //     try {
  //       await supabase.from('assessment_instances').update({ progress: progressPct }).eq('id', instance.id)
  //     } catch (e) {
  //       console.warn('[AssessmentForm] progress update failed:', e)
  //     }
  //   }, 400)
  //   return () => {
  //     if (debouncedTimer.current) window.clearTimeout(debouncedTimer.current)
  //   }
  // }, [progressPct, instance.id, showProgress])

  /* ────────────────────────────────────────────────────────────────────────────
     On single response change → upsert + move status to in_progress (once)
     Requires unique key on (instance_id, question_id) to avoid dup rows.
  ─────────────────────────────────────────────────────────────────────────────*/
  const handleResponse = async (questionId: string, value: any) => {
    const next = { ...responses, [questionId]: value }
    setResponses(next)
    onResponse?.(questionId, value)

    try {
      const { error: upErr } = await supabase.from('assessment_responses').upsert({
        instance_id: instance.id,
        question_id: questionId,
        item_id: questionId,
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
      const { push } = useToast()
      push({ message: 'Error saving assessment. Please try again.', type: 'error' })
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

      // Finalize responses (idempotent upsert)
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

      // Update instance state
      {
        const { error: instErr } = await supabase
          .from('assessment_instances')
          .update({
            status: 'completed',
            completed_at: new Date().toISOString(),
          })
          .eq('id', instance.id)
        if (instErr) throw instErr
      }

      // Compute score + extras
      const raw = Number(engine.calculateRawScore() ?? 0)
      const max = Number(template?.scoring_config?.max_score ?? 0)
      const percentOfMax = max ? Math.round((raw / max) * 100) : undefined
      const interpretation = engine.getInterpretation(raw) || {}
      const subscales = engine.calculateSubscaleScores?.() ?? undefined
      const narrative = engine.generateNarrativeReport(raw, interpretation)

      // Persist canonical score
      {
        const payload = {
          instance_id: instance.id,
          raw_score: raw,
          scaled_score: null,
          percentile: null,
          t_score: null,
          z_score: null,
          interpretation_category: interpretation.category ?? null,
          interpretation_description: interpretation.description ?? null,
          clinical_significance: interpretation.clinical_significance ?? null,
          severity_level: (interpretation.severity as string) ?? (interpretation.severity_level as string) ?? null,
          recommendations: interpretation.recommendations ?? null,
          therapist_notes: null,
          auto_generated: true,
        }
        // If you’ve added a unique index on (instance_id), this will be idempotent.
        const { error: resErr } = await supabase
          .from('assessment_scores')
          .upsert(payload, { onConflict: 'instance_id' })
        if (resErr) throw resErr
      }

      // Read back saved score (optional consistency)
      const { data: scores, error: readErr } = await supabase
        .from('assessment_scores')
        .select(
          'id, instance_id, raw_score, interpretation_category, interpretation_description, clinical_significance, severity_level, recommendations, calculated_at'
        )
        .eq('instance_id', instance.id)
        .order('calculated_at', { ascending: false })
        .limit(1)
        .returns<ScoreRow[]>()

      if (readErr) throw readErr
      const s = scores?.[0]

      setCalculatedScore({
        raw,
        percentOfMax,
        interpretation: {
          category: s?.interpretation_category ?? interpretation.category,
          description: s?.interpretation_description ?? interpretation.description,
          clinical_significance: s?.clinical_significance ?? interpretation.clinical_significance,
          severity_level: s?.severity_level ?? (interpretation.severity as string) ?? (interpretation.severity_level as string),
          recommendations: s?.recommendations ?? interpretation.recommendations,
        },
        subscales,
        narrative,
      })
      setShowResults(true)

      onComplete?.()
    } catch (e) {
      console.error('[AssessmentForm] complete error:', e)
      const { push } = useToast()
      push({ message: 'Error completing assessment. Please try again.', type: 'error' })
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
        {/* Summary card */}
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
              <div className="text-3xl font-bold text-green-600">{calculatedScore.raw}</div>
              <div className="text-sm text-green-700">Raw Score</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600">
                {calculatedScore.percentOfMax ?? (template.scoring_config?.max_score
                  ? Math.round((calculatedScore.raw / Number(template.scoring_config.max_score)) * 100)
                  : 0)}%
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

        {/* Interpretation details */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
            <Brain className="w-5 h-5 mr-2 text-purple-600" />
            Clinical Interpretation
          </h4>
          <div className="space-y-3">
            <div>
              <span className="font-medium text-gray-700">Category: </span>
              <span className="text-gray-900">{calculatedScore.interpretation?.category || '—'}</span>
            </div>
            <div>
              <span className="font-medium text-gray-700">Description: </span>
              <span className="text-gray-900">{calculatedScore.interpretation?.description || '—'}</span>
            </div>
            {calculatedScore.interpretation?.clinical_significance && (
              <div>
                <span className="font-medium text-gray-700">Clinical significance: </span>
                <span className="text-gray-900">{calculatedScore.interpretation?.clinical_significance}</span>
              </div>
            )}
            {calculatedScore.interpretation?.severity_level && (
              <div>
                <span className="font-medium text-gray-700">Severity: </span>
                <span className="text-gray-900">{calculatedScore.interpretation?.severity_level}</span>
              </div>
            )}
            {calculatedScore.interpretation?.recommendations && (
              <div>
                <span className="font-medium text-gray-700">Recommendations: </span>
                <span className="text-gray-900">{calculatedScore.interpretation?.recommendations}</span>
              </div>
            )}
          </div>
        </div>

        {/* Printable Report */}
        <AssessmentReport
          brandName="MindBridge Health"           // <— Replace with your brand
          logoUrl="/thera-py-icon.png"               // <— Put your logo under public/brand/
          therapistName={therapistName || undefined}
          template={template}
          instance={instance}
          score={{
            raw: calculatedScore.raw,
            percentOfMax: calculatedScore.percentOfMax,
            interpretation: calculatedScore.interpretation,
            subscales: calculatedScore.subscales,
            narrative: calculatedScore.narrative,
          }}
        />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
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
              <span className="capitalize">{String(instance.status).replace('_', ' ')}</span>
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
                  const q = template?.questions.find((qq: any) => qq.id === questionId)
                  return <li key={questionId}>{q?.text || `Question ${questionId}`}</li>
                })}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Renderer */}
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
