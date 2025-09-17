// src/pages/therapist/case/Intervention.tsx
import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../../../lib/supabase'
import { useAuth } from '../../../hooks/useAuth'
import {
  Activity, Plus, Search, Brain, BookOpen, Link as LinkIcon, RefreshCw,
  X, ClipboardList, Target, ChevronRight, AlertTriangle, ListChecks, Sparkles
} from 'lucide-react'

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
  metadata?: any
}

type PlanGoal = {
  id?: string
  title: string
  status?: string
  metric?: string | null
  target?: number | null
  smart?: {
    specific?: string
    measurable?: string
    achievable?: string
    relevant?: string
    time_bound?: string
  }
}

type PlanIntervention = {
  id?: string
  title: string
  linked_template_id?: string | null
  resource_id?: string | null
}

type PlanPayload = {
  general_aim?: string
  goals?: PlanGoal[]
  interventions?: PlanIntervention[]
}

/* helpers */
const fmt = (d?: string | null) => (d ? new Date(d).toLocaleString() : 'n/a')
const rid = (p: string) => `${p}-${crypto?.randomUUID?.() ?? Date.now()}`

const Intervention: React.FC = () => {
  const params = useParams<{ caseId: string }>()
  const caseId = params.caseId
  const { profile } = useAuth()
  const therapistId = profile?.id || null

  // UI state
  const [error, setError] = useState<string | null>(null)

  // Assessments
  const [tplQuery, setTplQuery] = useState('')
  const [templates, setTemplates] = useState<TemplateRow[]>([])
  const [loadingTemplates, setLoadingTemplates] = useState(true)

  const [instances, setInstances] = useState<(InstanceRow & { template?: TemplateRow | null; score?: ScoreRow | null })[]>([])
  const [loadingInstances, setLoadingInstances] = useState(true)

  // Resources
  const [resources, setResources] = useState<ResourceRow[]>([])
  const [loadingResources, setLoadingResources] = useState(true)

  // SMART & Packs
  const [smartTemplates, setSmartTemplates] = useState<ResourceRow[]>([])
  const [protocolPacks, setProtocolPacks] = useState<ResourceRow[]>([])
  const [selectedSmartId, setSelectedSmartId] = useState<string>('')
  const [selectedPackId, setSelectedPackId] = useState<string>('')
  const [smartState, setSmartState] = useState<Record<string, any>>({})
  const [packState, setPackState] = useState<Record<string, any>>({})
  const [smartPreview, setSmartPreview] = useState(false)
  const [packPreview, setPackPreview] = useState(false)

  // Plan + aim + session goals
  const [plan, setPlan] = useState<PlanPayload>({ goals: [], interventions: [] })
  const [aim, setAim] = useState<string>('')
  const [savingPlan, setSavingPlan] = useState(false)
  const [planError, setPlanError] = useState<string | null>(null)
  const [sessionGoals, setSessionGoals] = useState<string[]>([])
  const [newSessionGoal, setNewSessionGoal] = useState<string>('')

  /* ───────────────── guards ───────────────── */
  if (!caseId) {
    return (
      <div className="p-4 text-sm bg-amber-50 border border-amber-200 text-amber-800 rounded">
        No <code>caseId</code> provided. Open a specific case first.
      </div>
    )
  }

  /* ───────────────── loaders ───────────────── */
  const loadTemplates = useCallback(async () => {
    try {
      setLoadingTemplates(true)
      setError(null)
      let query = supabase
        .from('assessment_templates')
        .select('id, name, abbreviation, domains, is_active')
        .eq('is_active', true)
        .order('name', { ascending: true })

      if (tplQuery.trim()) query = query.ilike('name', `%${tplQuery}%`)
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

  const loadResources = useCallback(async () => {
    if (!therapistId) return
    try {
      setLoadingResources(true)
      setError(null)
      const { data, error } = await supabase
        .from('resource_library')
        .select('id, title, description, content_type, category, is_public, therapist_owner_id, media_url, storage_path, external_url, created_at, metadata')
        .or(`is_public.eq.true,therapist_owner_id.eq.${therapistId}`)
        .order('created_at', { ascending: false })
        .limit(100)
      if (error) throw error
      const rows = (data ?? []) as ResourceRow[]
      setResources(rows)
      setSmartTemplates(rows.filter(r => r.content_type === 'smart-template'))
      setProtocolPacks(rows.filter(r => r.content_type === 'protocol-pack'))
    } catch (e) {
      console.error('[Intervention] loadResources error:', e)
      setResources([])
      setError('Failed to load resources.')
    } finally {
      setLoadingResources(false)
    }
  }, [therapistId])

  useEffect(() => { void loadResources() }, [loadResources])

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
      const tp = (data?.treatment_plan as any) ?? { goals: [], interventions: [] }
      setPlan(tp)
      setAim(tp?.general_aim ?? '')
    } catch (e) {
      console.error('[Intervention] loadPlan error:', e)
      setPlan({ goals: [], interventions: [] })
      setPlanError('Failed to load treatment plan (linking will still work, but won’t persist).')
    }
  }, [caseId])

  useEffect(() => { void loadPlan() }, [loadPlan])

  const goalOptions = useMemo(
    () => (plan?.goals || []).map((g, idx) => ({ key: g.id || `g-${idx}`, label: g.title })),
    [plan]
  )

  /* ───────────────── actions ───────────────── */
  const assignAssessment = async (template: TemplateRow, goalKey?: string | null) => {
    if (!therapistId || !caseId) return
    try {
      const payload: Partial<InstanceRow> = {
        case_id: caseId,
        client_id: null,
        therapist_id: therapistId,
        template_id: template.id,
        title: template.name,
        status: 'assigned',
        assigned_at: new Date().toISOString()
      }

      const { error } = await supabase
        .from('assessment_instances')
        .insert(payload)
      if (error) throw error

      if (goalKey) {
        const newPlan: PlanPayload = { ...(plan || {}) }
        newPlan.interventions = newPlan.interventions || []
        newPlan.interventions.push({
          id: rid('iv'),
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
      const newPlan: PlanPayload = { ...(plan || {}) }
      newPlan.interventions = newPlan.interventions || []
      newPlan.interventions.push({
        id: rid('res'),
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

  /* SMART: preview + apply */
  const openSmartPreview = () => {
    const tpl = smartTemplates.find(t => t.id === selectedSmartId)
    const defaults = (tpl?.metadata?.defaults ?? {}) as Record<string, any>
    setSmartState((s) => ({ ...defaults, ...s }))
    setSmartPreview(true)
  }

  const applySmartToPlan = async () => {
    const tpl = smartTemplates.find(t => t.id === selectedSmartId)
    if (!tpl) return
    const meta = tpl.metadata || {}
    const goals = [...(plan?.goals || [])]
    goals.push({
      id: rid('g'),
      title: meta?.titleTemplate
        ? String(meta.titleTemplate).replace('{{specific}}', smartState.specific || tpl.title)
        : `SMART: ${tpl.title}`,
      status: 'active',
      metric: smartState.metric ?? meta?.defaults?.metric ?? null,
      target: smartState.target != null ? Number(smartState.target) : null,
      smart: {
        specific: smartState.specific,
        measurable: smartState.measurable,
        achievable: smartState.achievable,
        relevant: smartState.relevant,
        time_bound: smartState.time_bound
      }
    })
    const newPlan: PlanPayload = { ...(plan || {}), goals }
    setPlan(newPlan)
    setSavingPlan(true)
    await supabase.from('cases').update({ treatment_plan: newPlan }).eq('id', caseId)
    setSavingPlan(false)
    setSmartPreview(false)
  }

  /* Protocol Pack: preview + apply (writes plan + agenda) */
  const openPackPreview = () => {
    const pack = protocolPacks.find(p => p.id === selectedPackId)
    const reqs = pack?.metadata?.requirements || []
    const seed: Record<string, any> = {}
    for (const r of reqs) {
      if (r.default !== undefined) seed[r.key] = r.default
    }
    setPackState((s) => ({ ...seed, ...s }))
    setPackPreview(true)
  }

  const applyPackToPlan = async () => {
    if (!therapistId) return
    const pack = protocolPacks.find(p => p.id === selectedPackId)
    if (!pack) return
    const meta = pack.metadata || {}
    const effects = meta.planEffects || {}

    // goals
    const goals = [...(plan?.goals || [])]
    for (const g of (effects.goalsTemplate || [])) {
      goals.push({ id: rid('g'), title: g.title, metric: g.metric ?? null, target: g.target ?? null, status: 'active' })
    }

    // interventions
    const interventions = [...(plan?.interventions || [])]
    for (const iv of (effects.interventionsTemplate || [])) {
      interventions.push({
        id: rid('iv'),
        title: iv.type === 'assessment'
          ? `Assessment: ${iv.template_abbrev}`
          : (iv.title || 'Protocol Resource'),
        linked_template_id: null,
        resource_id: pack.id
      })
    }

    const newPlan: PlanPayload = {
      ...(plan || {}),
      general_aim: plan?.general_aim ?? meta.summary ?? plan?.general_aim,
      goals,
      interventions
    }
    setPlan(newPlan)
    setSavingPlan(true)
    await supabase.from('cases').update({ treatment_plan: newPlan }).eq('id', caseId)
    setSavingPlan(false)

    // agenda (stage for Workspace)
    if (effects.agendaTemplate?.length) {
      const count = Number(packState.sessions ?? 8)
      const items = effects.agendaTemplate
        .slice(0, Math.max(1, count))
        .map((s: any) => ({ session: s.session, items: s.items }))
      await supabase.from('session_agenda').insert({
        case_id: caseId,
        therapist_id: therapistId,
        source: 'protocol-pack',
        title: meta.summary || pack.title,
        payload: { items, homework_mode: packState.homework_mode, assessments: packState.assessments ?? [] }
      })
    }

    setPackPreview(false)
  }

  /* Aim autosave (debounced) */
  useEffect(() => {
    const t = setTimeout(async () => {
      if (!caseId) return
      const next: PlanPayload = { ...(plan || {}), general_aim: aim }
      setPlan(next)
      try {
        await supabase.from('cases').update({ treatment_plan: next }).eq('id', caseId)
      } catch (e) {
        console.error('[Intervention] save aim error:', e)
      }
    }, 600)
    return () => clearTimeout(t)
  }, [aim]) // eslint-disable-line react-hooks/exhaustive-deps

  /* Session goals helpers */
  const addSessionGoal = () => {
    if (!newSessionGoal.trim()) return
    setSessionGoals((g) => [...g, newSessionGoal.trim()])
    setNewSessionGoal('')
  }

  const saveAgenda = async () => {
    if (!therapistId) return
    await supabase.from('session_agenda').insert({
      case_id: caseId,
      therapist_id: therapistId,
      source: 'intervention',
      title: 'Session goals (next)',
      payload: { items: sessionGoals.map((t, i) => ({ session: 'next', items: [t] })) }
    })
    alert('Session goals saved for Workspace.')
  }

  /* dynamic field renderer for SMART/protocol */
  const renderDynamicField = (f: any, state: Record<string, any>, setState: (s: any) => void) => {
    const common = 'w-full border rounded p-2 text-sm'
    const val = state[f.key] ?? ''
    if (f.type === 'textarea') {
      return (
        <div key={f.key} className="mb-2">
          <label className="text-xs text-gray-600">{f.label}</label>
          <textarea className={common} value={val} onChange={e=>setState({ ...state, [f.key]: e.target.value })} />
        </div>
      )
    }
    if (f.type === 'select') {
      return (
        <div key={f.key} className="mb-2">
          <label className="text-xs text-gray-600">{f.label}</label>
          <select className={common} value={val} onChange={e=>setState({ ...state, [f.key]: e.target.value })}>
            <option value="">Select…</option>
            {(f.options || []).map((o: any) => <option key={o} value={o}>{o}</option>)}
          </select>
        </div>
      )
    }
    if (f.type === 'multiselect') {
      return (
        <div key={f.key} className="mb-2">
          <label className="text-xs text-gray-600">{f.label}</label>
          <select multiple className={common} value={val || []} onChange={e => {
            const opts = Array.from(e.target.selectedOptions).map(o => o.value)
            setState({ ...state, [f.key]: opts })
          }}>
            {(f.options || []).map((o: any) => <option key={o} value={o}>{o}</option>)}
          </select>
        </div>
      )
    }
    if (f.type === 'checkbox') {
      return (
        <div key={f.key} className="mb-2 flex items-center gap-2">
          <input type="checkbox" checked={!!val} onChange={e=>setState({ ...state, [f.key]: e.target.checked })} />
          <span className="text-sm">{f.label}</span>
        </div>
      )
    }
    return (
      <div key={f.key} className="mb-2">
        <label className="text-xs text-gray-600">{f.label}</label>
        <input
          type={f.type === 'number' ? 'number' : f.type === 'date' ? 'date' : 'text'}
          className={common}
          value={val}
          onChange={e=>setState({ ...state, [f.key]: e.target.value })}
        />
      </div>
    )
  }

  /* ───────────────── render ───────────────── */
  return (
    <div className="space-y-6">
      {/* Intro */}
      <div className="bg-blue-50 border border-blue-200 text-blue-800 rounded-lg p-3 text-sm flex items-start gap-2">
        <Activity className="w-4 h-4 mt-0.5" />
        <div>
          Intervention is the clinical orchestrator: set your <b>Therapeutic Aim</b>, compose <b>SMART goals</b>, apply <b>Protocol Packs</b>, assign <b>assessments</b>, and link <b>resources</b>. Workspace pulls from here.
        </div>
      </div>

      {error && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded p-2 text-sm flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" /> {error}
        </div>
      )}

      {/* Therapeutic Aim */}
      <div className="bg-white border rounded-xl p-4">
        <div className="flex items-center gap-2 mb-2">
          <Sparkles className="w-5 h-5 text-fuchsia-600" />
          <h3 className="font-semibold text-gray-900">Therapeutic Aim</h3>
        </div>
        <textarea
          value={aim}
          onChange={(e) => setAim(e.target.value)}
          placeholder="One line capturing the overarching therapeutic aim…"
          className="w-full border rounded p-2 text-sm min-h-[72px]"
        />
        <div className="text-[11px] text-gray-500 mt-1">Autosaves to <code>cases.treatment_plan.general_aim</code>.</div>
      </div>

      {/* SMART Templates */}
      <div className="bg-white border rounded-xl p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <ListChecks className="w-5 h-5 text-emerald-600" />
            <h3 className="font-semibold text-gray-900">SMART Goal Templates</h3>
          </div>
          <div className="flex items-center gap-2">
            <select className="border rounded px-2 py-1 text-sm" value={selectedSmartId} onChange={e=>setSelectedSmartId(e.target.value)}>
              <option value="">Choose a SMART template…</option>
              {smartTemplates.map(t => <option key={t.id} value={t.id}>{t.title}</option>)}
            </select>
            <button className="text-sm border rounded px-3 py-1" onClick={openSmartPreview} disabled={!selectedSmartId}>Preview</button>
            <button className="text-sm bg-blue-50 border border-blue-200 text-blue-700 rounded px-3 py-1" onClick={applySmartToPlan} disabled={!selectedSmartId}>Apply to Plan</button>
          </div>
        </div>
        {smartPreview && (() => {
          const tpl = smartTemplates.find(t => t.id === selectedSmartId)
          const fields = tpl?.metadata?.fields || []
          return (
            <div className="mt-3 bg-gray-50 border rounded p-3">
              {fields.map((f: any) => renderDynamicField(f, smartState, setSmartState))}
            </div>
          )
        })()}
      </div>

      {/* Protocol Packs */}
      <div className="bg-white border rounded-xl p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-indigo-600" />
            <h3 className="font-semibold text-gray-900">Protocol Packs</h3>
          </div>
          <div className="flex items-center gap-2">
            <select className="border rounded px-2 py-1 text-sm" value={selectedPackId} onChange={e=>setSelectedPackId(e.target.value)}>
              <option value="">Choose a protocol pack…</option>
              {protocolPacks.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
            </select>
            <button className="text-sm border rounded px-3 py-1" onClick={openPackPreview} disabled={!selectedPackId}>Preview</button>
            <button className="text-sm bg-indigo-50 border border-indigo-200 text-indigo-700 rounded px-3 py-1" onClick={applyPackToPlan} disabled={!selectedPackId}>Apply & Stage</button>
          </div>
        </div>
        {packPreview && (() => {
          const pack = protocolPacks.find(p => p.id === selectedPackId)
          const reqs = pack?.metadata?.requirements || []
          return (
            <div className="mt-3 bg-gray-50 border rounded p-3">
              {reqs.map((f: any) => renderDynamicField(f, packState, setPackState))}
            </div>
          )
        })()}
      </div>

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

      {/* Active & past assessments */}
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

      {/* Plan preview + Save */}
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

            {/* quick add goal (optional) */}
            <div className="mt-2 flex gap-2">
              <input
                className="border rounded px-2 py-1 text-sm flex-1"
                placeholder="Quick add goal title…"
                onKeyDown={async (e) => {
                  const el = e.currentTarget as HTMLInputElement
                  if (e.key === 'Enter' && el.value.trim()) {
                    const goals = [...(plan?.goals || []), { id: rid('g'), title: el.value.trim(), status: 'active' }]
                    const next = { ...(plan || {}), goals }
                    setPlan(next)
                    el.value = ''
                    await supabase.from('cases').update({ treatment_plan: next }).eq('id', caseId)
                  }
                }}
              />
            </div>
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

      {/* Session goals composer */}
      <div className="bg-white border rounded-xl p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <ListChecks className="w-5 h-5 text-amber-600" />
            <h3 className="font-semibold text-gray-900">Session Goals (Next Session)</h3>
          </div>
          <button className="text-xs px-2 py-1 rounded border" onClick={saveAgenda}>Save for Workspace</button>
        </div>
        <div className="flex gap-2 mb-2">
          <input className="border rounded px-2 py-1 text-sm flex-1" placeholder="Add a session goal…" value={newSessionGoal} onChange={e=>setNewSessionGoal(e.target.value)} />
          <button className="text-sm px-3 py-1 border rounded" onClick={addSessionGoal}>Add</button>
        </div>
        {sessionGoals.length ? (
          <ul className="list-disc pl-5 text-sm text-gray-800 space-y-1">
            {sessionGoals.map((g, i) => <li key={i}>{g}</li>)}
          </ul>
        ) : <div className="text-sm text-gray-500">No goals yet.</div>}
      </div>

      <div className="text-[11px] text-gray-500">
        Tip: For long-form clinical interpretations, use session notes after reviewing results — they’ll appear in the Workspace timeline and Case Summary.
      </div>
    </div>
  )
}

export default Intervention
