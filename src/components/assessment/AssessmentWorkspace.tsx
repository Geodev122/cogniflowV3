// src/components/assessment/AssessmentWorkspace.tsx
import React, { useCallback, useEffect, useMemo, useState } from 'react'
import {
  ChevronLeft,
  FileText,
  User,
  Calendar,
  X,
  AlertTriangle,
  Filter,
  BarChart3,
  Printer
} from 'lucide-react'
import { useSearchParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAssessments } from '../../hooks/useAssessments'
import { AssessmentInstance, AssessmentTemplate } from '../../types/assessment'
import AssessmentInstancesList from './AssessmentInstancesList'
import { AssessmentForm } from './AssessmentForm'

type Props = {
  /** Optional: preload and open this instance (e.g., from router deep-link) */
  initialInstanceId?: string
  /** Optional: when user closes the workspace */
  onClose?: () => void
}

type LatestScore = {
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

const AssessmentWorkspace: React.FC<Props> = ({ initialInstanceId, onClose }) => {
  const { instances, refetch } = useAssessments()

  // ────────────────────────────────────────────────────────────────────────────
  // URL client filter (honor ?clientId=)
  // ────────────────────────────────────────────────────────────────────────────
  const [searchParams, setSearchParams] = useSearchParams()
  const urlClientId = searchParams.get('clientId') || null
  const [clientFilterId, setClientFilterId] = useState<string | null>(urlClientId)
  const [clientFilterName, setClientFilterName] = useState<string>('')

  useEffect(() => {
    setClientFilterId(urlClientId)
  }, [urlClientId])

  useEffect(() => {
    let cancel = false
    const loadClient = async () => {
      if (!clientFilterId) { setClientFilterName(''); return }
      const { data, error } = await supabase
        .from('profiles')
        .select('first_name,last_name')
        .eq('id', clientFilterId)
        .single()
      if (!cancel) {
        if (error || !data) setClientFilterName('')
        else setClientFilterName(`${data.first_name || ''} ${data.last_name || ''}`.trim())
      }
    }
    loadClient()
    return () => { cancel = true }
  }, [clientFilterId])

  const clearClientFilter = () => {
    setClientFilterId(null)
    const sp = new URLSearchParams(searchParams)
    sp.delete('clientId')
    setSearchParams(sp, { replace: true })
  }

  // ────────────────────────────────────────────────────────────────────────────
  // Active assessment (right pane)
  // ────────────────────────────────────────────────────────────────────────────
  const [active, setActive] = useState<AssessmentInstance | null>(null)
  const [loadingActive, setLoadingActive] = useState(false)
  const [activeError, setActiveError] = useState<string | null>(null)

  /** Latest score for the active instance (Phase 3 addition) */
  const [latestScore, setLatestScore] = useState<LatestScore | null>(null)
  const [loadingScore, setLoadingScore] = useState(false)
  const [scoreError, setScoreError] = useState<string | null>(null)

  /** When list refreshes, relink to freshest copy of the active instance */
  const latestActiveFromList = useMemo(() => {
    if (!active) return null
    return instances.find(i => i.id === active.id) || null
  }, [active, instances])

  useEffect(() => {
    if (latestActiveFromList) {
      setActive(prev => {
        if (!prev) return latestActiveFromList
        return {
          ...latestActiveFromList,
          template: latestActiveFromList.template || prev.template,
          client: latestActiveFromList.client || prev.client,
        }
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    latestActiveFromList?.status,
    latestActiveFromList?.due_date,
    latestActiveFromList?.assigned_at,
  ])

  /** Deep link: preload by instance id */
  useEffect(() => {
    if (!initialInstanceId) return
    openInstanceById(initialInstanceId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialInstanceId])

  const ensureTemplateLoaded = useCallback(async (instance: AssessmentInstance) => {
    if (instance.template) return instance
    const { data: tmpl, error: tmplErr } = await supabase
      .from('assessment_templates')
      .select('*')
      .eq('id', instance.template_id)
      .single<AssessmentTemplate>()
    if (tmplErr) throw tmplErr
    return { ...instance, template: tmpl }
  }, [])

  const ensureClientLoaded = useCallback(async (instance: AssessmentInstance) => {
    if (instance.client && instance.client.first_name) return instance
    const { data: client, error: clientErr } = await supabase
      .from('profiles')
      .select('id, first_name, last_name, email')
      .eq('id', instance.client_id)
      .single()
    if (clientErr || !client) return instance // Not fatal (RLS may hide)
    return { ...instance, client }
  }, [])

  const openInstanceById = useCallback(
    async (id: string) => {
      try {
        setLoadingActive(true)
        setActiveError(null)

        const { data: base, error: baseErr } = await supabase
          .from('assessment_instances')
          .select('*')
          .eq('id', id)
          .single<AssessmentInstance>()

        if (baseErr || !base) throw baseErr || new Error('Instance not found')

        let hydrated = await ensureTemplateLoaded(base)
        hydrated = await ensureClientLoaded(hydrated)
        setActive(hydrated)
      } catch (e: any) {
        console.error('[AssessmentWorkspace] openInstanceById error:', e)
        setActiveError('Could not load assessment instance.')
        setActive(null)
      } finally {
        setLoadingActive(false)
      }
    },
    [ensureClientLoaded, ensureTemplateLoaded]
  )

  const handleOpenFromList = useCallback(
    async (instance: AssessmentInstance) => {
      try {
        setLoadingActive(true)
        setActiveError(null)
        let hydrated = await ensureTemplateLoaded(instance)
        hydrated = await ensureClientLoaded(hydrated)
        setActive(hydrated)
      } catch (e: any) {
        console.error('[AssessmentWorkspace] handleOpenFromList error:', e)
        setActiveError('Could not open assessment.')
        setActive(null)
      } finally {
        setLoadingActive(false)
      }
    },
    [ensureClientLoaded, ensureTemplateLoaded]
  )

  const clearActive = () => {
    setActive(null)
    setLatestScore(null)
    setScoreError(null)
  }

  // ────────────────────────────────────────────────────────────────────────────
  // Phase 3: fetch latest score when active completed or changes
  // ────────────────────────────────────────────────────────────────────────────
  const fetchLatestScore = useCallback(
    async (instanceId: string) => {
      setLoadingScore(true)
      setScoreError(null)
      try {
        const { data, error } = await supabase
          .from('assessment_scores')
          .select(
            'id,instance_id,raw_score,scaled_score,percentile,t_score,z_score,interpretation_category,interpretation_description,clinical_significance,severity_level,recommendations,therapist_notes,auto_generated,calculated_at'
          )
          .eq('instance_id', instanceId)
          .order('calculated_at', { ascending: false })
          .limit(1)

        if (error) throw error
        setLatestScore((data && data.length ? data[0] : null) as LatestScore | null)
      } catch (e: any) {
        console.error('[AssessmentWorkspace] fetchLatestScore error:', e)
        setLatestScore(null)
        setScoreError('Could not load latest score.')
      } finally {
        setLoadingScore(false)
      }
    },
    []
  )

  useEffect(() => {
    if (!active?.id) return
    if (active.status === 'completed') {
      fetchLatestScore(active.id)
    } else {
      setLatestScore(null)
      setScoreError(null)
    }
  }, [active?.id, active?.status, fetchLatestScore])

  // ────────────────────────────────────────────────────────────────────────────
  // Right pane pieces
  // ────────────────────────────────────────────────────────────────────────────
  const RightPaneHeader = () => {
    if (!active) {
      return (
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-gray-500" />
            <h3 className="text-base font-semibold text-gray-900">Assessment</h3>
          </div>
        </div>
      )
    }

    return (
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-start justify-between">
          <div className="min-w-0">
            <div className="text-xs text-gray-500 mb-1">Selected assessment</div>
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-blue-600" />
              <h3 className="text-base font-semibold text-gray-900 truncate">
                {active.title || active.template?.name || 'Assessment'}
              </h3>
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-600">
              <span className="inline-flex items-center gap-1">
                <User className="w-3.5 h-3.5" />
                {active.client ? `${active.client.first_name} ${active.client.last_name}` : '—'}
              </span>
              <span className="inline-flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                Assigned:{' '}
                {active.assigned_at
                  ? new Date(active.assigned_at).toLocaleDateString()
                  : '—'}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {active && (
              <button
                onClick={clearActive}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded border text-xs hover:bg-gray-50"
                title="Close assessment"
              >
                <X className="w-4 h-4" />
                Close
              </button>
            )}
          </div>
        </div>
      </div>
    )
  }

  const ResultsCard = () => {
    if (active?.status !== 'completed') return null

    const max = Number(
      (active?.template as any)?.scoring_config?.max_score ?? (active?.template as any)?.schema?.scoring?.max_score ?? 0
    )
    const raw = latestScore?.raw_score ?? null
    const pct = raw != null && max ? Math.round((Number(raw) / max) * 100) : null

    return (
      <div className="mt-4 bg-white border border-gray-200 rounded-lg p-4">
        <div className="flex items-start justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-gray-500 text-xs">
              <BarChart3 className="w-4 h-4" />
              <span>Results</span>
            </div>
            <h4 className="text-base font-semibold text-gray-900">
              {active?.title || active?.template?.name}
            </h4>
            {latestScore?.calculated_at && (
              <div className="text-xs text-gray-500">
                Scored: {new Date(latestScore.calculated_at).toLocaleString()}
              </div>
            )}
          </div>
          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded border text-sm hover:bg-gray-50"
            title="Export (print to PDF)"
          >
            <Printer className="w-4 h-4" />
            Export
          </button>
        </div>

        {/* States */}
        {loadingScore && (
          <div className="mt-3 text-sm text-gray-600">Loading latest score…</div>
        )}
        {scoreError && (
          <div className="mt-3 bg-red-50 border border-red-200 rounded p-3 text-sm text-red-800 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            {scoreError}
          </div>
        )}

        {!loadingScore && !scoreError && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3">
              <div className="text-center border rounded-lg p-3">
                <div className="text-2xl font-bold">{raw ?? '—'}</div>
                <div className="text-xs text-gray-500">Raw Score</div>
              </div>
              <div className="text-center border rounded-lg p-3">
                <div className="text-2xl font-bold">{pct != null ? `${pct}%` : '—'}</div>
                <div className="text-xs text-gray-500">Percent of Max</div>
              </div>
              <div className="text-center border rounded-lg p-3">
                <div className="text-lg font-semibold">
                  {latestScore?.interpretation_category || '—'}
                </div>
                <div className="text-xs text-gray-500">Interpretation</div>
              </div>
            </div>

            {latestScore?.interpretation_description && (
              <div className="mt-3 text-sm text-gray-700">
                <span className="font-medium text-gray-800">Summary: </span>
                {latestScore.interpretation_description}
              </div>
            )}
            {latestScore?.recommendations && (
              <div className="mt-2 text-sm text-gray-700">
                <span className="font-medium text-gray-800">Recommendations: </span>
                {latestScore.recommendations}
              </div>
            )}
          </>
        )}
      </div>
    )
  }

  const RightPaneBody = () => {
    if (loadingActive) {
      return (
        <div className="flex-1 grid place-items-center p-6">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      )
    }

    if (activeError) {
      return (
        <div className="p-6">
          <div className="bg-red-50 border border-red-200 rounded p-3 text-sm text-red-800 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            {activeError}
          </div>
        </div>
      )
    }

    if (!active) {
      return (
        <div className="p-6">
          <div className="border border-dashed rounded-lg p-6 text-center text-gray-500">
            Select an assessment from the list to begin.
          </div>
        </div>
      )
    }

    return (
      <div className="p-4">
        <AssessmentForm
          instance={active}
          onResponse={() => { /* no-op; AssessmentForm already upserts per response */ }}
          onSave={() => {
            refetch() // keep list in sync (progress/status might change)
          }}
          onComplete={async () => {
            await refetch()
            await openInstanceById(active.id)
            await fetchLatestScore(active.id) // ensure results panel populates immediately
          }}
          readonly={false}
          showNavigation={true}
          showProgress={true}
        />

        {/* Phase 3: Results panel for completed assessments */}
        <ResultsCard />
      </div>
    )
  }

  // ────────────────────────────────────────────────────────────────────────────
  // Layout
  // ────────────────────────────────────────────────────────────────────────────
  return (
    <div className="h-full grid grid-rows-[auto_1fr]">
      {/* Global header */}
      <div className="border-b border-gray-200 bg-white/80 backdrop-blur">
        <div className="px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-600" />
            <h2 className="text-lg font-semibold text-gray-900">Assessment Workspace</h2>
            {clientFilterId && (
              <span className="ml-3 inline-flex items-center gap-1.5 text-xs bg-blue-50 text-blue-700 border border-blue-200 rounded-full px-2 py-1">
                <Filter className="w-3.5 h-3.5" />
                {clientFilterName || 'Selected Client'}
                <button
                  onClick={clearClientFilter}
                  className="ml-1 rounded hover:bg-blue-100 p-0.5"
                  title="Clear client filter"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
          </div>

          {onClose && (
            <button
              onClick={onClose}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded border text-sm hover:bg-gray-50"
            >
              <ChevronLeft className="w-4 h-4" />
              Back
            </button>
          )}
        </div>
      </div>

      {/* Content: responsive split */}
      <div className="min-h-0 grid grid-cols-1 xl:grid-cols-12">
        {/* Left: Instances List */}
        <div className="xl:col-span-5 border-r border-gray-200 min-h-0">
          <AssessmentInstancesList
            onOpenInstance={handleOpenFromList}
            initialClientId={clientFilterId || undefined}
            onClientFilterChange={(nextId) => {
              setClientFilterId(nextId || null)
              const sp = new URLSearchParams(searchParams)
              if (nextId) sp.set('clientId', nextId)
              else sp.delete('clientId')
              setSearchParams(sp, { replace: true })
            }}
          />
        </div>

        {/* Right: Active Assessment */}
        <div className="xl:col-span-7 min-h-0 flex flex-col">
          <RightPaneHeader />
          <div className="min-h-0 overflow-y-auto">
            <RightPaneBody />
          </div>
        </div>
      </div>
    </div>
  )
}

export default AssessmentWorkspace
