// src/components/assessment/AssessmentWorkspace.tsx
import React, { useCallback, useEffect, useMemo, useState } from 'react'
import {
  ChevronLeft,
  FileText,
  User,
  Calendar,
  X,
  AlertTriangle,
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAssessments } from '../../hooks/useAssessments'
import { AssessmentInstance, AssessmentTemplate } from '../../types/assessment'
import AssessmentInstancesList from './AssessmentInstancesList'
import { AssessmentForm } from './AssessmentForm'

type Props = {
  /** Optional: preload and open this instance (e.g., from router) */
  initialInstanceId?: string
  /** Optional: when user closes the workspace */
  onClose?: () => void
}

/**
 * AssessmentWorkspace
 * - Left side: AssessmentInstancesList (filters/search/sort/pagination)
 * - Right side: Active Assessment (AssessmentForm)
 * - Supabase-wired: fetches/refreshes instances and templates as needed
 */
const AssessmentWorkspace: React.FC<Props> = ({ initialInstanceId, onClose }) => {
  const { instances, refetch } = useAssessments()
  const [active, setActive] = useState<AssessmentInstance | null>(null)
  const [loadingActive, setLoadingActive] = useState(false)
  const [activeError, setActiveError] = useState<string | null>(null)

  /** Best-effort: when list refetches and we already had an active instance,
   * re-link to the latest copy of that instance (so status/progress stay fresh) */
  const latestActiveFromList = useMemo(() => {
    if (!active) return null
    return instances.find(i => i.id === active.id) || null
  }, [active, instances])

  useEffect(() => {
    if (latestActiveFromList) {
      // Preserve any locally-attached template if list version lacks it
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
  }, [latestActiveFromList?.status, latestActiveFromList?.due_date, latestActiveFromList?.assigned_at])

  /** Optionally preload by id (e.g., when arriving via deep link) */
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

    if (tmplErr) {
      throw tmplErr
    }

    return { ...instance, template: tmpl }
  }, [])

  const ensureClientLoaded = useCallback(async (instance: AssessmentInstance) => {
    if (instance.client && instance.client.first_name) return instance

    const { data: client, error: clientErr } = await supabase
      .from('profiles')
      .select('id, first_name, last_name, email')
      .eq('id', instance.client_id)
      .single()

    if (clientErr) {
      // Not fatal; just return without client data if RLS blocks
      return instance
    }

    return { ...instance, client }
  }, [])

  const openInstanceById = useCallback(async (id: string) => {
    try {
      setLoadingActive(true)
      setActiveError(null)

      // Base instance
      const { data: base, error: baseErr } = await supabase
        .from('assessment_instances')
        .select('*')
        .eq('id', id)
        .single<AssessmentInstance>()

      if (baseErr || !base) throw baseErr || new Error('Instance not found')

      // Hydrate related data (template, client) without complex joins
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
  }, [ensureClientLoaded, ensureTemplateLoaded])

  const handleOpenFromList = useCallback(async (instance: AssessmentInstance) => {
    try {
      setLoadingActive(true)
      setActiveError(null)

      // We receive a lightweight instance from the list; ensure relations present
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
  }, [ensureClientLoaded, ensureTemplateLoaded])

  const clearActive = () => setActive(null)

  /* ────────────────────────────────────────────────────────────────────────────
     Render helpers
  ─────────────────────────────────────────────────────────────────────────────*/
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
                Assigned: {active.assigned_at ? new Date(active.assigned_at).toLocaleDateString() : '—'}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {onClose && !active ? (
              <button
                onClick={onClose}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded border text-xs hover:bg-gray-50"
              >
                <ChevronLeft className="w-4 h-4" />
                Back
              </button>
            ) : null}
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
          onResponse={() => {
            // no-op here; AssessmentForm already upserts per response
          }}
          onSave={() => {
            // keep list in sync (progress/status might change)
            refetch()
          }}
          onComplete={async () => {
            // After completion, refresh list and re-load active (to reflect completed state & results snapshot)
            await refetch()
            await openInstanceById(active.id)
          }}
          readonly={false}
          showNavigation={true}
          showProgress={true}
        />
      </div>
    )
  }

  /* ────────────────────────────────────────────────────────────────────────────
     Layout
  ─────────────────────────────────────────────────────────────────────────────*/
  return (
    <div className="h-full grid grid-rows-[auto_1fr]">
      {/* Global header */}
      <div className="border-b border-gray-200 bg-white/80 backdrop-blur">
        <div className="px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-600" />
            <h2 className="text-lg font-semibold text-gray-900">Assessment Workspace</h2>
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
        {/* Left: List */}
        <div className="xl:col-span-5 border-r border-gray-200 min-h-0">
          <AssessmentInstancesList onOpenInstance={handleOpenFromList} />
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
