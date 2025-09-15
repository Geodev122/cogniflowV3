import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Brain, AlertTriangle, Calendar, Play, Eye } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { supabase } from '../../lib/supabase'
import { AssessmentForm } from '../../components/assessment/AssessmentForm'
import type { AssessmentInstance, AssessmentTemplate } from '../../types/assessment'
import { MobileShell } from '../../components/client/MobileShell'

type Row = AssessmentInstance & {
  template?: Pick<AssessmentTemplate, 'id' | 'name' | 'abbreviation'>
}

export default function ClientAssessments() {
  const { user, profile, loading } = useAuth()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()

  const [rows, setRows] = useState<Row[]>([])
  const [busy, setBusy] = useState(true)
  const [err, setErr] = useState<string | null>(null)

  const [active, setActive] = useState<Row | null>(null)

  const instanceIdFromUrl = searchParams.get('instanceId')
  const isClient = profile?.role === 'client'

  // responsive: show split view only on xl
  const [isXL, setIsXL] = useState<boolean>(() => window.matchMedia('(min-width: 1280px)').matches)
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1280px)')
    const onChange = () => setIsXL(mq.matches)
    mq.addEventListener?.('change', onChange)
    return () => mq.removeEventListener?.('change', onChange)
  }, [])

  const load = async () => {
    if (!user) return
    setBusy(true); setErr(null)
    try {
      const { data: inst, error } = await supabase
        .from('assessment_instances')
        .select('id, title, status, template_id, assigned_at, due_date, completed_at, progress')
        .eq('client_id', user.id)
        .order('assigned_at', { ascending: false })

      if (error) throw error

      const templateIds = Array.from(new Set((inst || []).map(i => i.template_id)))
      const { data: tpls } = templateIds.length
        ? await supabase.from('assessment_templates').select('id, name, abbreviation').in('id', templateIds)
        : { data: [] as any[] }

      const hydrated: Row[] = (inst || []).map(i => ({
        ...(i as any),
        template: (tpls || []).find(t => t.id === i.template_id) || undefined,
      }))

      setRows(hydrated)
    } catch (e: any) {
      console.error('[ClientAssessments] load error', e)
      setErr('Could not load your assessments.')
    } finally {
      setBusy(false)
    }
  }

  useEffect(() => { if (user && isClient) load() }, [user, isClient])

  // auto-open by ?instanceId= (xl only)
  useEffect(() => {
    if (!instanceIdFromUrl || !rows.length) return
    const hit = rows.find(r => r.id === instanceIdFromUrl)
    if (hit) setActive(hit)
  }, [instanceIdFromUrl, rows])

  const statusTone = useMemo(() => ({
    completed: 'bg-green-100 text-green-700',
    in_progress: 'bg-blue-100 text-blue-700',
    assigned: 'bg-gray-100 text-gray-700',
    expired: 'bg-amber-100 text-amber-700',
    cancelled: 'bg-red-100 text-red-700',
  } as const), [])

  const openDesktop = (r: Row) => {
    setActive(r)
    const sp = new URLSearchParams(searchParams)
    sp.set('instanceId', r.id)
    setSearchParams(sp, { replace: true })
  }
  const closeDesktop = () => {
    setActive(null)
    const sp = new URLSearchParams(searchParams)
    sp.delete('instanceId')
    setSearchParams(sp, { replace: true })
  }

  // unified open: xl inline; mobile navigates to dedicated player route (same page using ?instanceId)
  const open = (r: Row) => {
    if (isXL) openDesktop(r)
    else setSearchParams({ instanceId: r.id }, { replace: false })
  }

  if (loading) {
    return (
      <MobileShell title="Assignments">
        <div className="min-h-[60vh] grid place-items-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
        </div>
      </MobileShell>
    )
  }

  if (!user || !isClient) {
    return (
      <MobileShell title="Assignments">
        <div className="max-w-lg mx-auto mt-16">
          <div className="bg-white border border-gray-200 rounded-xl p-6 text-center">
            <AlertTriangle className="w-8 h-8 text-amber-600 mx-auto mb-2" />
            <h2 className="text-lg font-semibold text-gray-900 mb-1">Client access only</h2>
            <p className="text-sm text-gray-600">Please sign in as a client.</p>
          </div>
        </div>
      </MobileShell>
    )
  }

  return (
    <MobileShell title="Assignments">
      <div className={`min-h-screen ${isXL ? 'p-4 sm:p-6 lg:p-8 bg-gray-50' : 'p-3'}`}>
        <div className={`${isXL ? 'max-w-6xl mx-auto grid grid-cols-1 xl:grid-cols-12 gap-4' : ''}`}>
          {/* Left: list */}
          <div className={`${isXL ? 'xl:col-span-5' : ''}`}>
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Brain className="w-5 h-5 text-blue-600" />
                  <h2 className="text-base font-semibold text-gray-900">Assessments</h2>
                </div>
                <button onClick={() => load()} className="px-3 py-1.5 rounded border text-sm hover:bg-gray-50">Refresh</button>
              </div>

              {err && <div className="mb-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded p-2">{err}</div>}

              {busy ? (
                <div className="py-10 grid place-items-center">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600" />
                </div>
              ) : rows.length === 0 ? (
                <div className="py-8 text-center text-gray-600">
                  <Brain className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                  No assessments
                </div>
              ) : (
                <div className="space-y-3">
                  {rows.map(r => {
                    const isOverdue = r.due_date && r.status !== 'completed' && new Date(r.due_date).getTime() < Date.now()
                    const canFill = r.status === 'assigned' || r.status === 'in_progress'
                    return (
                      <div key={r.id} className={`p-4 border rounded-lg ${isOverdue ? 'ring-1 ring-red-100' : 'bg-gray-50'}`}>
                        <div className="flex items-start justify-between">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className={`text-xs px-2 py-0.5 rounded-full ${statusTone[r.status]}`}>{r.status.replace('_',' ')}</span>
                              {isOverdue && (
                                <span className="inline-flex items-center gap-1 text-xs text-red-700 bg-red-50 border border-red-200 rounded-full px-2 py-0.5">
                                  <AlertTriangle className="w-3 h-3" /> Overdue
                                </span>
                              )}
                            </div>
                            <div className="mt-1 font-semibold text-gray-900 truncate">{r.title || r.template?.name || 'Assessment'}</div>
                            <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-gray-600">
                              <span className="inline-flex items-center gap-1">
                                <Calendar className="w-3.5 h-3.5" />
                                Assigned: {r.assigned_at ? new Date(r.assigned_at).toLocaleDateString() : '—'}
                              </span>
                              <span className="inline-flex items-center gap-1">
                                <Calendar className="w-3.5 h-3.5" />
                                Due: {r.due_date ? new Date(r.due_date).toLocaleDateString() : '—'}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            {canFill ? (
                              <button
                                onClick={() => open(r)}
                                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md bg-blue-600 text-white text-sm hover:bg-blue-700"
                              >
                                <Play className="w-4 h-4" /> {r.status === 'assigned' ? 'Start' : 'Resume'}
                              </button>
                            ) : (
                              <button
                                onClick={() => open(r)}
                                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md border text-sm hover:bg-gray-50"
                              >
                                <Eye className="w-4 h-4" /> View
                              </button>
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

          {/* Right: form (desktop only) */}
          {isXL && (
            <div className="xl:col-span-7 min-h-0">
              <div className="bg-white rounded-xl border border-gray-200 h-full flex flex-col">
                <div className="p-4 border-b border-gray-200 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Brain className="w-5 h-5 text-blue-600" />
                    <h3 className="text-base font-semibold text-gray-900">Assessment</h3>
                  </div>
                  {active && (
                    <button onClick={closeDesktop} className="px-3 py-1.5 rounded border text-sm hover:bg-gray-50">Close</button>
                  )}
                </div>
                <div className="min-h-0 overflow-y-auto p-4">
                  {!active ? (
                    <div className="border border-dashed rounded-lg p-6 text-center text-gray-500">
                      Select an assessment from the list to begin.
                    </div>
                  ) : (
                    <AssessmentForm
                      instance={active}
                      readonly={active.status === 'completed' || active.status === 'cancelled' || active.status === 'expired'}
                      showNavigation
                      showProgress
                      onResponse={() => {}}
                      onSave={() => load()}
                      onComplete={async () => {
                        await load()
                        const updated = rows.find(r => r.id === active.id)
                        if (updated) setActive(updated)
                      }}
                    />
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </MobileShell>
  )
}
