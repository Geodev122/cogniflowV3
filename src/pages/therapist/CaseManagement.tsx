// src/pages/therapist/CaseManagement.tsx
import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { NavLink, Outlet, Route, Routes, useNavigate, useParams } from 'react-router-dom'
import {
  FileText, ClipboardList, Stethoscope, Activity, Pill, BookOpen,
  User, Hash, ShieldAlert, Play, Flag, ChevronRight, Users, Timer, GitBranch, RefreshCw
} from 'lucide-react'

import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'

const IntakeForm = React.lazy(() => import('./case/IntakeForm'))
const CaseFormulation = React.lazy(() => import('./case/CaseFormulation'))
const Diagnosis = React.lazy(() => import('./case/Diagnosis'))
const Intervention = React.lazy(() => import('./case/Intervention'))
const TreatmentPlanning = React.lazy(() => import('./case/TreatmentPlanning'))
const CaseSummary = React.lazy(() => import('./case/CaseSummary'))

type CaseHeader = {
  id: string
  case_number: string | null
  status: string | null
  client_id: string | null
  therapist_id: string | null
  current_phase: string | null
  client_first_name?: string | null
  client_last_name?: string | null
  assigned_therapists?: Array<{ therapist_id: string, first_name?: string | null, last_name?: string | null }>
}

type CasePickerItem = {
  id: string
  case_number: string | null
  client: { first_name: string | null; last_name: string | null } | null
}

const tabs = [
  { to: 'intake',       label: 'Intake',        icon: FileText,       tip: 'View/annotate client intake' },
  { to: 'formulation',  label: 'Formulation',   icon: ClipboardList,  tip: 'Symptoms & clinical model' },
  { to: 'diagnosis',    label: 'Diagnosis',     icon: Stethoscope,    tip: 'DSM/ICD selection & DDx' },
  { to: 'intervention', label: 'Intervention',  icon: Activity,       tip: 'Assessments, goals & packs' },
  { to: 'treatment',    label: 'Treatment',     icon: Pill,           tip: 'Goals, sessions, checkpoints' },
  { to: 'summary',      label: 'Summary',       icon: BookOpen,       tip: 'Full case summary & export' },
] as const

export default function CaseManagement() {
  const { caseId } = useParams<{ caseId: string }>()
  const navigate = useNavigate()
  const { profile } = useAuth()

  const [header, setHeader] = useState<CaseHeader | null>(null)
  const [loading, setLoading] = useState(!!caseId)
  const [error, setError] = useState<string | null>(null)

  const [listLoading, setListLoading] = useState(false)
  const [cases, setCases] = useState<CasePickerItem[]>([])

  const base = useMemo(() => caseId ? `/therapist/cases/${caseId}` : '/therapist/cases', [caseId])

  const loadCaseList = useCallback(async () => {
    if (!profile?.id) return
    try {
      setListLoading(true)
      const { data, error } = await supabase
        .from('cases')
        .select(`
          id, case_number,
          client:profiles!cases_client_id_fkey(first_name, last_name)
        `)
        .eq('therapist_id', profile.id)
        .order('created_at', { ascending: false })
        .limit(40)
      if (error) throw error
      setCases((data ?? []) as any)
    } catch (e) {
      console.error('[CaseManagement] case list error:', e)
      setCases([])
    } finally {
      setListLoading(false)
    }
  }, [profile?.id])

  const loadHeader = useCallback(async () => {
    if (!caseId) { setLoading(false); return }
    setLoading(true)
    setError(null)
    try {
      const { data: c, error: cerr } = await supabase
        .from('cases')
        .select('id, case_number, status, client_id, therapist_id, current_phase')
        .eq('id', caseId)
        .maybeSingle()
      if (cerr) throw cerr
      if (!c) { setHeader(null); setError('Case not found.'); return }

      let clientFirst: string | null = null
      let clientLast: string | null = null
      if (c.client_id) {
        const { data: cp } = await supabase
          .from('profiles')
          .select('id, first_name, last_name')
          .eq('id', c.client_id)
          .maybeSingle()
        clientFirst = cp?.first_name ?? null
        clientLast = cp?.last_name ?? null
      }

      const { data: rels } = await supabase
        .from('therapist_case_relations')
        .select('therapist_id')
        .eq('case_id', caseId)

      let assigned: CaseHeader['assigned_therapists'] = []
      if (rels?.length) {
        const tIds = rels.map(r => r.therapist_id).filter(Boolean)
        if (tIds.length) {
          const { data: tps } = await supabase
            .from('profiles')
            .select('id, first_name, last_name')
            .in('id', tIds)
          assigned = (tps ?? []).map(p => ({
            therapist_id: p.id,
            first_name: p.first_name,
            last_name: p.last_name
          }))
        }
      } else if (c.therapist_id) {
        const { data: tp } = await supabase
          .from('profiles')
          .select('id, first_name, last_name')
          .eq('id', c.therapist_id)
          .maybeSingle()
        assigned = tp ? [{ therapist_id: tp.id, first_name: tp.first_name, last_name: tp.last_name }] : []
      }

      setHeader({
        ...c,
        client_first_name: clientFirst,
        client_last_name: clientLast,
        assigned_therapists: assigned
      })
    } catch (e) {
      console.error('[CaseManagement] header error:', e)
      setError('Failed to load case header.')
    } finally {
      setLoading(false)
    }
  }, [caseId])

  useEffect(() => { void loadHeader() }, [loadHeader])
  useEffect(() => { if (!caseId) loadCaseList() }, [caseId, loadCaseList])

  const launchWorkspace = () => { if (caseId) navigate(`/therapist/workspace/${caseId}`) }
  const openSummary = () => { if (caseId) navigate(`/therapist/cases/${caseId}/summary`) }

  const flagForSupervision = async () => {
    if (!profile?.id || !caseId) return
    try {
      const { error: fErr } = await supabase.from('supervision_flags').insert({
        case_id: caseId,
        therapist_id: profile.id,
        status: 'open',
        reason: 'Flagged from Case Management',
        created_at: new Date().toISOString()
      } as any)
      if (fErr) throw fErr

      const title =
        `${header?.client_first_name ?? ''} ${header?.client_last_name ?? ''}`.trim() ||
        (header?.case_number ? `Case ${header.case_number}` : `Case ${String(caseId).slice(0,6)}…`)

      const { data: latestNote } = await supabase
        .from('session_notes')
        .select('content, updated_at')
        .eq('case_id', caseId)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      const highlightSrc = latestNote?.content
        ? (typeof latestNote.content === 'string' ? latestNote.content : JSON.stringify(latestNote.content))
        : 'Flagged for supervision.'
      const last_highlight = highlightSrc.slice(0, 240)

      const { error: sErr } = await supabase
        .from('case_summaries')
        .upsert({
          case_id: caseId,
          title,
          last_highlight,
          updated_at: new Date().toISOString(),
          updated_by: profile.id
        } as any, { onConflict: 'case_id' } as any)
      if (sErr) throw sErr

      alert('Case flagged for supervision.')
    } catch (e) {
      console.error('[CaseManagement] flag error:', e)
      alert('Could not flag the case (check RLS/policies).')
    }
  }

  const statusBadge = useMemo(() => {
    const s = (header?.status || '').toLowerCase()
    if (s === 'active') return 'bg-green-100 text-green-700'
    if (s === 'paused') return 'bg-amber-100 text-amber-800'
    if (s === 'closed') return 'bg-gray-100 text-gray-700'
    return 'bg-blue-100 text-blue-700'
  }, [header?.status])

  // When no caseId→ show a compact case picker (embedded mode / tab from dashboard)
  if (!caseId) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Case Management</h2>
          <button onClick={loadCaseList} className="text-sm px-3 py-2 border rounded inline-flex items-center gap-1">
            <RefreshCw className="w-4 h-4" /> Refresh
          </button>
        </div>
        {listLoading ? (
          <div className="text-sm text-gray-500">Loading cases…</div>
        ) : cases.length === 0 ? (
          <div className="text-sm text-gray-500">No active cases found.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {cases.map(c => {
              const name = `${c.client?.first_name ?? ''} ${c.client?.last_name ?? ''}`.trim() || 'Client'
              const tag  = c.case_number ? `Case ${c.case_number}` : `Case ${c.id.slice(0,6)}…`
              return (
                <button
                  key={c.id}
                  onClick={() => navigate(`/therapist/cases/${c.id}/intake`)}
                  className="p-4 bg-white border rounded-lg text-left hover:bg-gray-50"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-blue-50 grid place-items-center">
                      <User className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">{name}</div>
                      <div className="text-xs text-gray-500">{tag}</div>
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>
    )
  }

  if (loading) {
    return (
      <div className="h-full grid place-items-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
      </div>
    )
  }
  if (error || !header) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3">{error || 'Case not found.'}</div>
      </div>
    )
  }

  const clientName = `${header.client_first_name ?? ''} ${header.client_last_name ?? ''}`.trim() || 'Client'
  const caseTag = header.case_number ? `Case ${header.case_number}` : `Case ${header.id.slice(0,6)}…`

  return (
    <div className="h-full grid grid-rows-[auto_auto_1fr] overflow-x-hidden">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-blue-50 grid place-items-center">
                <User className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-lg font-semibold text-gray-900">{clientName}</h1>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 inline-flex items-center gap-1">
                    <Hash className="w-3 h-3" /> {caseTag}
                  </span>
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-600">
                  <span className={`px-2 py-0.5 rounded-full inline-flex items-center gap-1 ${statusBadge}`}>
                    <ShieldAlert className="w-3 h-3" /> {header.status ?? 'unknown'}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Timer className="w-3 h-3" /> Phase: {header.current_phase ?? 'n/a'}
                  </span>
                  {header.assigned_therapists?.length ? (
                    <span className="inline-flex items-center gap-1">
                      <Users className="w-3 h-3" /> {header.assigned_therapists.map(t => `${t.first_name ?? ''} ${t.last_name ?? ''}`.trim()).join(', ')}
                    </span>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button onClick={launchWorkspace} className="px-3 py-2 text-sm rounded-lg border hover:bg-gray-50 inline-flex items-center gap-1" title="Launch live session workspace">
                <Play className="w-4 h-4" /> Launch Session
              </button>
              <button onClick={openSummary} className="px-3 py-2 text-sm rounded-lg border hover:bg-gray-50 inline-flex items-center gap-1" title="View case summary">
                <BookOpen className="w-4 h-4" /> View Summary
              </button>
              <button onClick={flagForSupervision} className="px-3 py-2 text-sm rounded-lg bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100 inline-flex items-center gap-1" title="Flag for supervision">
                <Flag className="w-4 h-4" /> Save & Flag
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b bg-white">
        <div className="max-w-7xl mx-auto px-4 py-2 flex gap-2 overflow-x-auto">
          {tabs.map(({ to, label, icon: Icon, tip }) => (
            <NavLink
              key={to}
              to={`${base}/${to}`}
              title={tip}
              className={({ isActive }) =>
                `inline-flex items-center gap-2 px-3 py-2 rounded-md text-sm border whitespace-nowrap ${
                  isActive
                    ? 'bg-blue-50 text-blue-700 border-blue-200'
                    : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                }`
              }
            >
              <Icon className="w-4 h-4" />
              {label}
            </NavLink>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div className="min-h-0 overflow-y-auto">
        <React.Suspense fallback={<div className="p-6"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" /></div>}>
          <Routes>
            <Route path="intake" element={<IntakeForm caseId={caseId!} />} />
            <Route path="formulation" element={<CaseFormulation caseId={caseId!} />} />
            <Route path="diagnosis" element={<Diagnosis caseId={caseId!} />} />
            <Route path="intervention" element={<Intervention caseId={caseId!} />} />
            <Route path="treatment" element={<TreatmentPlanning caseId={caseId!} />} />
            <Route path="summary" element={<CaseSummary caseId={caseId!} />} />
            <Route path="*" element={<IntakeForm caseId={caseId!} />} />
          </Routes>
          <Outlet />
        </React.Suspense>
      </div>

      {/* Foot */}
      <div className="border-t bg-white">
        <div className="max-w-7xl mx-auto px-4 py-2 text-xs text-gray-500 flex items-center gap-1">
          Case Management <ChevronRight className="w-3 h-3" /> {clientName} <ChevronRight className="w-3 h-3" /> {caseTag}
          <span className="ml-auto inline-flex items-center gap-1">
            <GitBranch className="w-3 h-3" /> Versioned updates enabled (intake, formulation, plan)
          </span>
        </div>
      </div>
    </div>
  )
}