// src/pages/therapist/case/Intervention.tsx
import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../../../lib/supabase'
import { useAuth } from '../../../hooks/useAuth'
import {
  Activity, FileText, Plus, Search, Brain, BookOpen, Link as LinkIcon, RefreshCw,
  CheckCircle, X, ClipboardList, Target, ChevronRight, AlertTriangle
} from 'lucide-react'

/* =========================================================
   Types — aligned with your existing tables/usage
   (assessment_templates, assessment_instances, assessment_scores, resource_library)
========================================================= */
type TemplateRow = {
  id: string
  name: string
  abbreviation?: string | null
  domains?: string[] | null
  is_active?: boolean | null
}

type InstanceRow = {
  id: string
  case_id: string
  client_id: string | null
  therapist_id: string
  template_id: string
  title?: string | null
  status: 'assigned' | 'in_progress' | 'completed' | 'expired' | 'cancelled'
  assigned_at?: string | null
  completed_at?: string | null
}

type ScoreRow = {
  instance_id: string
  total_score?: number | null
  severity_level?: string | null
  interpretation_description?: string | null
  calculated_at?: string | null
}

type ResourceRow = {
  id: string
  title: string
  description?: string | null
  content_type?: string | null
  category?: string | null
  is_public: boolean
  therapist_owner_id?: string | null
  media_url?: string | null
  storage_path?: string | null
  external_url?: string | null
  created_at?: string
}

type PlanPayload = {
  goals?: Array<{ id?: string; title: string; status?: string }>
  interventions?: Array<{ id?: string; title: string; linked_template_id?: string | null; resource_id?: string | null }>
}

/* =========================================================
   Helpers
========================================================= */
const fmt = (d?: string | null) => (d ? new Date(d).toLocaleString() : 'n/a')

/* =========================================================
   Component
========================================================= */
const Intervention: React.FC = () => {
  const { caseId } = useParams<{ caseId: string }>()
  const { profile } = useAuth()

  // Search & pickers
  const [tplQuery, setTplQuery] = useState('')
  const [templates, setTemplates] = useState<TemplateRow[]>([])
  const [loadingTemplates, setLoadingTemplates] = useState(true)

  // Assigned instances in this case
  const [instances, setInstances] = useState<(InstanceRow & { template?: TemplateRow | null; score?: ScoreRow | null })[]>([])
  const [loadingInstances, setLoadingInstances] = useState(true)

  // Resource library (public + my private)
  const [resources, setResources] = useState<ResourceRow[]>([])
  const [loadingResources, setLoadingResources] = useState(true)

  // Treatment plan (to link assessments/resources to goals)
  const [plan, setPlan] = useState<PlanPayload>({ goals: [], interventions: [] })
  const [savingPlan, setSavingPlan] = useState(false)
  const [planError, setPlanError] = useState<string | null>(null)

  // Errors
  const [error, setError] = useState<string | null>(null)

  const therapistId = profile?.id || null

  /* ---------------------------
     Load templates (catalog)
  --------------------------- */
  const loadTemplates = useCallback(async () => {
    try {
      setLoadingTemplates(true)
      setError(null)
      let query = supabase
        .from('assessment_templates')
        .select('id, name, abbreviation, domains, is_active')
        .eq('is_active', true)
        .order('name', { ascending: true })

      if (tplQuery.trim()) {
        // naive search over name/abbrev
        query = query.ilike('name', `%${tplQuery}%`)
      }

      const { data, error } = await query
      if (error) throw error
      setTemplates((data ?? []) as TemplateRow[])
    } catch (e) {
      console.error('[Intervention] loadTemplates error:', e)
      setTemplates([])
      setError('Failed to load assessment templates.')
    } finally {
      setLoadingTemplates(false)
    }
  }, [tplQuery])

  useEffect(() => { void loadTemplates() }, [loadTemplates])

  /* ---------------------------
     Load existing instances for this case + latest score
  --------------------------- */
  const loadInstances = useCallback(async () => {
    if (!caseId || !therapistId) return
    try {
      setLoadingInstances(true)
      setError(null)

      const { data: inst, error: iErr } = await supabase
        .from('assessment_instances')
        .select('id, case_id, client_id, therapist_id, template_id, title, status, assigned_at, completed_at')
        .eq('case_id', caseId)
        .order('assigned_at', { ascending: false })
      if (iErr) throw iErr

      const templateIds = Array.from(new Set((inst ?? []).map(i => i.template_id)))
      const [{ data: tpls }, { data: scores }] = await Promise.all([
        templateIds.length
          ? supabase.from('assessment_templates').select('id, name, abbreviation').in('id', templateIds)
          : Promise.resolve({ data: [] as any[] }),
        (inst ?? []).length
          ? supabase
              .from('assessment_scores')
              .select('instance_id, total_score, severity_level, interpretation_description, calculated_at')
              .in('instance_id', (inst ?? []).map(i => i.id))
          : Promise.resolve({ data: [] as any[] })
      ])

      const tplById = new Map((tpls ?? []).map((t: any) => [t.id, t]))
      const scoreByInst = new Map((scores ?? []).map((s: any) => [s.instance_id, s]))

      const withRefs = (inst ?? []).map(i => ({
        ...i,
        template: tplById.get(i.template_id) || null,
        score: scoreByInst.get(i.id) || null
      }))

      setInstances(withRefs as any)
    } catch (e) {
      console.error('[Intervention] loadInstances error:', e)
      setInstances([])
      setError('Failed to load assigned assessments.')
    } finally {
      setLoadingInstances(false)
    }
  }, [caseId, therapistId])

  useEffect(() => { void loadInstances() }, [loadInstances])

  /* ---------------------------
     Load resources — public or mine
  --------------------------- */
  const loadResources = useCallback(async () => {
    if (!therapistId) return
    try {
      setLoadingResources(true)
      setError(null)
      const { data, error } = await supabase
        .from('resource_library')
        .select('id, title, description, content_type, category, is_public, therapist_owner_id, media_url, storage_path, external_url, created_at')
        .or(`is_public.eq.true,therapist_owner_id.eq.${therapistId}`)
        .order('created_at', { ascending: false })
        .limit(50)
      if (error) throw error
      setResources((data ?? []) as ResourceRow[])
    } catch (e) {
      console.error('[Intervention] loadResources error:', e)
      setResources([])
      setError('Failed to load resources.')
    } finally {
      setLoadingResources(false)
    }
  }, [therapistId])

  useEffect(() => { void loadResources() }, [loadResources])

  /* ---------------------------
     Load treatment plan to link items
  --------------------------- */
  const loadPlan = useCallback(async () => {
    if (!caseId) return
    try {
      setPlanError(null)
      const { data, error } = await supabase
        .from('cases')
        .select('treatment_plan')
        .eq('id', caseId)
        .single()
      if (error) throw error
      setPlan((data?.treatment_plan as any) ?? { goals: [], interventions: [] })
    } catch (e) {
      console.error('[Intervention] loadPlan error:', e)
      setPlan({ goals: [], interventions: [] })
      setPlanError('Failed to load treatment plan (linking will still work, but won’t persist).')
    }
  }, [caseId])

  useEffect(() => { void loadPlan() }, [loadPlan])

  const goalOptions = useMemo(() => (plan?.goals || []).map((g, idx) => ({ key: g.id || `g-${idx}`, label: g.title })), [plan])

  /* ---------------------------
     Actions
  --------------------------- */
  const assignAssessment = async (template: TemplateRow, goalKey?: string | null) => {
    if (!therapistId || !caseId) return
    try {
      const payload = {
        case_id: caseId,
        client_id: null,                 // optional if your flow sets it
        therapist_id: therapistId,
        template_id: template.id,
        title: template.name,
        status: 'assigned',
        assigned_at: new Date().toISOString()
      } as Partial<InstanceRow>

      const { data, error } = await supabase
        .from('assessment_instances')
        .insert(payload)
        .select('id')
        .single()
      if (error) throw error

      // Optionally link the new assignment to a goal in the plan payload
      if (goalKey) {
        const newPlan = { ...(plan || {}) }
        newPlan.interventions = newPlan.interventions || []
        newPlan.interventions.push({
          id: `i-${Date.now()}`,
          title: `Assessment: ${template.name}`,
          linked_template_id: template.id,
          resource_id: null
        })
        setPlan(newPlan)
        setSavingPlan(true)
        await supabase.from('cases').update({ treatment_plan: newPlan }).eq('id', caseId)
        setSavingPlan(false)
      }

      await loadInstances()
      alert('Assessment assigned.')
    } catch (e) {
      console.error('[Intervention] assignAssessment error:', e)
      alert('Could not assign assessment (check RLS & schema).')
    }
  }

  const cancelAssignment = async (instanceId: string) => {
    try {
      const { error } = await supabase
        .from('assessment_instances')
        .update({ status: 'cancelled' })
        .eq('id', instanceId)
      if (error) throw error
      await loadInstances()
    } catch (e) {
      console.error('[Intervention] cancelAssignment error:', e)
      alert('Could not cancel.')
    }
  }

  const attachResourceToPlan = async (res: ResourceRow, goalKey?: string | null) => {
    if (!caseId) return
    try {
      const newPlan = { ...(plan || {}) }
      newPlan.interventions = newPlan.interventions || []
      newPlan.interventions.push({
        id: `r-${Date.now()}`,
        title: `Resource: ${res.title}`,
        linked_template_id: null,
        resource_id: res.id
      })
      setPlan(newPlan)
      setSavingPlan(true)
      await supabase.from('cases').update({ treatment_plan: newPlan }).eq('id', caseId)
      setSavingPlan(false)
      alert('Resource linked to plan.')
    } catch (e) {
      console.error('[Intervention] attachResourceToPlan error:', e)
      alert('Could not link resource (check RLS).')
    }
  }

  /* =========================================================
     Render
  ========================================================= */
  return (
    <div className="space-y-6">
      {/* Header note */}
      <div className="bg-blue-50 border border-blue-200 text-blue-800 rounded-lg p-3 text-sm flex items-start gap-2">
        <Activity className="w-4 h-4 mt-0.5" />
        <div>
          Use this tab to <b>assign assessments</b>, review <b>auto-scored results</b>, add brief interpretations, and <b>link items to treatment goals</b>. Data here feeds the Workspace and the Summary.
        </div>
      </div>

      {error && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded p-2 text-sm flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" /> {error}
        </div>
      )}

      {/* Row: Assign assessments & library */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Assessments Catalog */}
        <div className="bg-white border rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Brain className="w-5 h-5 text-blue-600" />
              <h3 className="font-semibold text-gray-900">Assessment Catalog</h3>
            </div>
            <button onClick={() => void loadTemplates()} className="text-xs px-2 py-1 rounded border inline-flex items-center gap-1">
              <RefreshCw className="w-3 h-3" /> Refresh
            </button>
          </div>

          <div className="flex items-center gap-2 mb-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-gray-400 absolute left-2 top-2.5" />
              <input
                value={tplQuery}
                onChange={(e) => setTplQuery(e.target.value)}
                placeholder="Search by name/abbrev (e.g., PHQ-9, GAD-7)…"
                className="w-full pl-8 pr-3 py-2 border rounded"
              />
            </div>
          </div>

          {loadingTemplates ? (
            <div className="text-sm text-gray-500">Loading…</div>
          ) : templates.length === 0 ? (
            <div className="text-sm text-gray-500">No templates found.</div>
          ) : (
            <div className="space-y-2">
              {templates.slice(0, 20).map(t => (
                <div key={t.id} className="border rounded p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium text-gray-900">{t.name}</div>
                      <div className="text-xs text-gray-500">{t.abbreviation || '—'}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <select className="text-xs border rounded px-2 py-1" defaultValue="">
                        <option value="">No goal link</option>
                        {goalOptions.map(g => (
                          <option key={g.key} value={g.key}>{g.label}</option>
                        ))}
                      </select>
                      <button
                        onClick={(e) => {
                          const sel = (e.currentTarget.previousSibling as HTMLSelectElement)
                          const goalKey = sel.value || null
                          void assignAssessment(t, goalKey)
                        }}
                        className="text-xs px-2 py-1 rounded bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 inline-flex items-center gap-1"
                      >
                        <Plus className="w-3 h-3" /> Assign
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              {templates.length > 20 && (
                <div className="text-[11px] text-gray-500">Showing 20 of {templates.length}. Refine search to narrow.</div>
              )}
            </div>
          )}
        </div>

        {/* Resource Library quick link/attach */}
        <div className="bg-white border rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-indigo-600" />
              <h3 className="font-semibold text-gray-900">Resources (Public & Mine)</h3>
            </div>
            <button onClick={() => void loadResources()} className="text-xs px-2 py-1 rounded border inline-flex items-center gap-1">
              <RefreshCw className="w-3 h-3" /> Refresh
            </button>
          </div>

          {loadingResources ? (
            <div className="text-sm text-gray-500">Loading…</div>
          ) : resources.length === 0 ? (
            <div className="text-sm text-gray-500">No resources found.</div>
          ) : (
            <div className="space-y-2">
              {resources.slice(0, 12).map(r => (
                <div key={r.id} className="border rounded p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium text-gray-900">{r.title}</div>
                      <div className="text-xs text-gray-500">
                        {r.category || '—'} {r.is_public ? '• public' : '• private'}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {r.external_url ? (
                        <a href={r.external_url} target="_blank" rel="noreferrer" className="text-xs inline-flex items-center gap-1 text-blue-700 hover:underline">
                          <LinkIcon className="w-3 h-3" /> Open
                        </a>
                      ) : r.media_url ? (
                        <a href={r.media_url} target="_blank" rel="noreferrer" className="text-xs inline-flex items-center gap-1 text-blue-700 hover:underline">
                          <LinkIcon className="w-3 h-3" /> Open
                        </a>
                      ) : null}
                      <select className="text-xs border rounded px-2 py-1" defaultValue="">
                        <option value="">Link to no goal</option>
                        {goalOptions.map(g => (
                          <option key={g.key} value={g.key}>{g.label}</option>
                        ))}
                      </select>
                      <button
                        onClick={(e) => {
                          const sel = (e.currentTarget.previousSibling as HTMLSelectElement)
                          const goalKey = sel.value || null
                          void attachResourceToPlan(r, goalKey)
                        }}
                        className="text-xs px-2 py-1 rounded bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100 inline-flex items-center gap-1"
                      >
                        <Plus className="w-3 h-3" /> Link to Plan
                      </button>
                    </div>
                  </div>
                  {r.description ? <div className="text-sm text-gray-700 mt-1">{r.description}</div> : null}
                </div>
              ))}
              {resources.length > 12 && (
                <div className="text-[11px] text-gray-500">Showing 12 of {resources.length}. Use Resource Library for full view.</div>
              )}
            </div>
          )}

          <div className="text-[11px] text-gray-500 mt-3">
            Need to upload or create something new? Use the full <b>Resource Library</b> page from the dashboard.
          </div>
        </div>
      </div>

      {/* Row: Active assignments & results */}
      <div className="bg-white border rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-amber-600" />
            <h3 className="font-semibold text-gray-900">Active & Past Assessments</h3>
          </div>
          <button onClick={() => void loadInstances()} className="text-xs px-2 py-1 rounded border inline-flex items-center gap-1">
            <RefreshCw className="w-3 h-3" /> Refresh
          </button>
        </div>

        {loadingInstances ? (
          <div className="text-sm text-gray-500">Loading…</div>
        ) : instances.length === 0 ? (
          <div className="text-sm text-gray-500">No assessments assigned yet.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {instances.map(inst => (
              <div key={inst.id} className="border rounded p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium text-gray-900">{inst.title || inst.template?.name || 'Assessment'}</div>
                    <div className="text-xs text-gray-500">
                      {(inst.template?.abbreviation || '').toUpperCase() || '—'} • Assigned {fmt(inst.assigned_at)}
                    </div>
                  </div>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full ${
                      inst.status === 'completed'
                        ? 'bg-green-100 text-green-700'
                        : inst.status === 'in_progress'
                        ? 'bg-blue-100 text-blue-700'
                        : inst.status === 'assigned'
                        ? 'bg-gray-100 text-gray-700'
                        : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {inst.status.replace('_', ' ')}
                  </span>
                </div>

                {/* Score/Interpretation */}
                {inst.score ? (
                  <div className="mt-2 bg-gray-50 border rounded p-2">
                    <div className="text-xs text-gray-600">
                      Score: <b>{inst.score.total_score ?? '—'}</b> • Severity: <b>{inst.score.severity_level ?? '—'}</b>
                    </div>
                    {inst.score.interpretation_description ? (
                      <div className="text-sm text-gray-800 mt-1 whitespace-pre-wrap">
                        {inst.score.interpretation_description}
                      </div>
                    ) : (
                      <div className="text-xs text-gray-500 mt-1">No interpretation saved yet.</div>
                    )}
                    <div className="text-[11px] text-gray-400 mt-1">Updated: {fmt(inst.score.calculated_at)}</div>
                  </div>
                ) : (
                  <div className="mt-2 text-xs text-gray-500">No score yet.</div>
                )}

                {/* Actions */}
                <div className="mt-3 flex items-center gap-2">
                  {inst.status !== 'completed' && inst.status !== 'cancelled' && (
                    <button
                      onClick={() => void cancelAssignment(inst.id)}
                      className="text-xs px-2 py-1 rounded border hover:bg-gray-50 inline-flex items-center gap-1"
                      title="Cancel assignment"
                    >
                      <X className="w-3 h-3" /> Cancel
                    </button>
                  )}
                  <a
                    href={`/therapist/assessments/${inst.id}`}
                    className="text-xs px-2 py-1 rounded bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 inline-flex items-center gap-1"
                    title="Open detailed results"
                  >
                    Open <ChevronRight className="w-3 h-3" />
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Treatment plan link preview */}
      <div className="bg-white border rounded-xl p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Target className="w-5 h-5 text-emerald-600" />
            <h3 className="font-semibold text-gray-900">Linked to Treatment Plan</h3>
          </div>
          <button
            onClick={async () => {
              try {
                setSavingPlan(true)
                await supabase.from('cases').update({ treatment_plan: plan }).eq('id', String(caseId))
              } catch (e) {
                console.error('[Intervention] manual save plan error:', e)
                alert('Failed to save plan.')
              } finally {
                setSavingPlan(false)
              }
            }}
            className="text-xs px-2 py-1 rounded border inline-flex items-center gap-1 disabled:opacity-50"
            disabled={savingPlan}
          >
            {savingPlan ? 'Saving…' : 'Save'}
          </button>
        </div>

        {planError && (
          <div className="mt-2 bg-amber-50 border border-amber-200 text-amber-800 rounded p-2 text-xs flex items-center gap-2">
            <AlertTriangle className="w-3 h-3" /> {planError}
          </div>
        )}

        <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="border rounded p-3">
            <div className="text-sm font-medium text-gray-900 mb-1">Goals</div>
            {(plan?.goals || []).length === 0 ? (
              <div className="text-xs text-gray-500">No goals in plan.</div>
            ) : (
              <ul className="text-sm text-gray-800 list-disc pl-4 space-y-1">
                {(plan?.goals || []).map((g, idx) => <li key={g.id || `g-${idx}`}>{g.title}</li>)}
              </ul>
            )}
          </div>
          <div className="border rounded p-3">
            <div className="text-sm font-medium text-gray-900 mb-1">Interventions</div>
            {(plan?.interventions || []).length === 0 ? (
              <div className="text-xs text-gray-500">No linked items yet.</div>
            ) : (
              <ul className="text-sm text-gray-800 list-disc pl-4 space-y-1">
                {(plan?.interventions || []).map((iv, idx) => (
                  <li key={iv.id || `iv-${idx}`}>{iv.title}</li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      {/* Footer hint */}
      <div className="text-[11px] text-gray-500">
        Tip: For long-form clinical interpretations, use session notes after reviewing results — they’ll appear in the Workspace timeline and Case Summary.
      </div>
    </div>
  )
}

export default Intervention
