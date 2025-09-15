import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Calendar, ClipboardList, ChevronRight, Activity, ShieldCheck, AlertTriangle } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { MobileShell } from '../../components/client/MobileShell'

type NextAppt = { id: string; when: string; type?: string | null; therapist_name?: string }
type MiniAssessment = { id: string; title: string; status: string; due_date?: string | null; abbrev?: string | null }

export default function ClientHome() {
  const navigate = useNavigate()
  const { profile } = useAuth()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [nextAppt, setNextAppt] = useState<NextAppt | null>(null)
  const [assess, setAssess] = useState<MiniAssessment[]>([])
  const [alertsCount, setAlertsCount] = useState(0)

  useEffect(() => {
    let cancel = false
    const load = async () => {
      if (!profile) return
      setLoading(true); setError(null)
      try {
        // Next appointment today→future
        const nowIso = new Date().toISOString()
        const { data: appts, error: apptErr } = await supabase
          .from('appointments')
          .select(`
            id, appointment_date, appointment_type, therapist_id,
            therapist:profiles!appointments_therapist_id_fkey(first_name,last_name)
          `)
          .eq('client_id', profile.id)
          .gte('appointment_date', nowIso)
          .order('appointment_date', { ascending: true })
          .limit(1)
        if (apptErr) throw apptErr
        if (!cancel) {
          const a = appts?.[0]
          setNextAppt(a ? {
            id: a.id,
            when: new Date(a.appointment_date).toLocaleString([], { hour: '2-digit', minute: '2-digit', month: 'short', day: 'numeric' }),
            type: a.appointment_type,
            therapist_name: `${a.therapist?.first_name || ''} ${a.therapist?.last_name || ''}`.trim() || undefined
          } : null)
        }

        // Top assessments (assigned/in_progress first)
        const { data: inst, error: instErr } = await supabase
          .from('assessment_instances')
          .select('id, title, status, due_date, template_id')
          .eq('client_id', profile.id)
          .order('assigned_at', { ascending: false })
          .limit(8)
        if (instErr) throw instErr

        let abbrevMap = new Map<string, string>()
        const tplIds = Array.from(new Set((inst || []).map(r => r.template_id))).filter(Boolean) as string[]
        if (tplIds.length) {
          const { data: tpls } = await supabase
            .from('assessment_templates')
            .select('id, abbreviation')
            .in('id', tplIds)
          tpls?.forEach(t => abbrevMap.set(t.id, t.abbreviation || ''))
        }

        const sorted = (inst || []).sort((a, b) => {
          const s = (v: string) => v === 'assigned' ? 0 : v === 'in_progress' ? 1 : 2
          return s(a.status) - s(b.status)
        })

        if (!cancel) {
          setAssess(
            sorted.map(i => ({
              id: i.id,
              title: i.title || 'Assessment',
              status: i.status,
              due_date: i.due_date,
              abbrev: abbrevMap.get(i.template_id) || null
            }))
          )
        }

        // optional: alerts based on latest results
        const ids = (inst || []).map(i => i.id)
        if (ids.length) {
          const { data: results } = await supabase
            .from('assessment_results')
            .select('alerts')
            .in('instance_id', ids)
            .order('created_at', { ascending: false })
            .limit(20)
          const count = (results || []).reduce((acc, r:any) => acc + (Array.isArray(r.alerts) ? r.alerts.length : 0), 0)
          if (!cancel) setAlertsCount(count)
        }
      } catch (e:any) {
        console.error('[ClientHome] load error', e); if (!cancel) setError('Could not load your dashboard.')
      } finally {
        if (!cancel) setLoading(false)
      }
    }
    load()
    return () => { cancel = true }
  }, [profile])

  return (
    <MobileShell title="Your Care">
      {loading ? (
        <div className="h-[70vh] grid place-items-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      ) : error ? (
        <div className="p-4">
          <div className="bg-red-50 border border-red-200 rounded p-3 text-sm text-red-800">{error}</div>
        </div>
      ) : (
        <div className="p-3 space-y-4">
          {/* Welcome */}
          <div className="rounded-xl p-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
            <div className="text-sm opacity-80">Welcome back</div>
            <div className="text-xl font-semibold mt-0.5">{profile?.first_name}</div>
            <div className="mt-3 text-xs text-blue-100">
              Track your progress, complete assigned activities, and manage your sessions — all here.
            </div>
          </div>

          {/* KPI cards (mobile) */}
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => navigate('/client/assessments')}
              className="bg-white border border-gray-200 rounded-xl p-3 text-left active:scale-[0.99]"
            >
              <div className="flex items-center justify-between">
                <div className="text-xs text-gray-500">Assessments</div>
                <ClipboardList className="w-4 h-4 text-blue-600" />
              </div>
              <div className="mt-1 text-lg font-semibold">{assess.filter(a => a.status !== 'completed').length}</div>
              <div className="text-[11px] text-gray-500">to complete</div>
            </button>

            <button
              onClick={() => navigate('/client/cases')}
              className="bg-white border border-gray-200 rounded-xl p-3 text-left active:scale-[0.99]"
            >
              <div className="flex items-center justify-between">
                <div className="text-xs text-gray-500">Alerts</div>
                <Activity className="w-4 h-4 text-amber-600" />
              </div>
              <div className="mt-1 text-lg font-semibold">{alertsCount}</div>
              <div className="text-[11px] text-gray-500">latest from results</div>
            </button>
          </div>

          {/* Next appointment */}
          <div className="bg-white border border-gray-200 rounded-xl">
            <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-purple-600" />
                <div className="text-sm font-medium text-gray-900">Your next session</div>
              </div>
              <button className="text-xs text-blue-700" onClick={() => navigate('/client/appointments')}>See all</button>
            </div>
            <div className="p-4">
              {!nextAppt ? (
                <div className="text-sm text-gray-600">No upcoming appointments.</div>
              ) : (
                <button
                  onClick={() => navigate('/client/appointments')}
                  className="w-full flex items-center justify-between text-left"
                >
                  <div>
                    <div className="font-medium text-gray-900">{nextAppt.when}</div>
                    <div className="text-xs text-gray-600">{nextAppt.type || 'Session'} {nextAppt.therapist_name ? `• with ${nextAppt.therapist_name}` : ''}</div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-400" />
                </button>
              )}
            </div>
          </div>

          {/* Quick actions */}
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <div className="text-sm font-medium text-gray-900 mb-3">Quick actions</div>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => navigate('/client/consents')}
                className="border border-gray-200 rounded-lg p-3 text-left active:scale-[0.99]"
              >
                <ShieldCheck className="w-5 h-5 text-green-600" />
                <div className="mt-1 text-sm font-medium">Consents</div>
                <div className="text-[11px] text-gray-500">Review & sign</div>
              </button>
              <button
                onClick={() => navigate('/client/assessments')}
                className="border border-gray-200 rounded-lg p-3 text-left active:scale-[0.99]"
              >
                <ClipboardList className="w-5 h-5 text-blue-600" />
                <div className="mt-1 text-sm font-medium">Assignments</div>
                <div className="text-[11px] text-gray-500">Fill now</div>
              </button>
            </div>
          </div>

          {/* Recently assigned assessments */}
          <div className="bg-white border border-gray-200 rounded-xl">
            <div className="px-4 py-3 border-b border-gray-100 text-sm font-medium text-gray-900">Recent assignments</div>
            <div className="divide-y">
              {assess.length === 0 && (
                <div className="p-4 text-sm text-gray-600">No recent assignments.</div>
              )}
              {assess.slice(0,4).map(a => (
                <button
                  key={a.id}
                  onClick={() => navigate(`/client/assessments/${a.id}`)}
                  className="w-full text-left px-4 py-3 hover:bg-gray-50 flex items-center justify-between"
                >
                  <div>
                    <div className="text-sm font-medium text-gray-900">{a.title}</div>
                    <div className="text-[11px] text-gray-600">
                      {(a.abbrev ? `${a.abbrev} • ` : '') + (a.status === 'completed' ? 'Completed' : (a.due_date ? `Due ${new Date(a.due_date).toLocaleDateString()}` : 'Assigned'))}
                    </div>
                  </div>
                  {a.status === 'completed'
                    ? <span className="text-xs bg-green-100 text-green-700 rounded-full px-2 py-0.5">done</span>
                    : <span className="text-xs bg-blue-100 text-blue-700 rounded-full px-2 py-0.5">open</span>
                  }
                </button>
              ))}
            </div>
          </div>

          {/* Info / safety */}
          <div className="bg-amber-50 border border-amber-200 text-amber-900 rounded-xl p-3 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            If this is an emergency, call your local emergency number.
          </div>
        </div>
      )}
    </MobileShell>
  )
}
