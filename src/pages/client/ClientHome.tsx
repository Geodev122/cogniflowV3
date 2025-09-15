import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Calendar, Brain, FileText, AlertTriangle, User } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { supabase } from '../../lib/supabase'

type TodaySession = {
  id: string
  time: string
  therapistName: string
  appointment_type: string | null
}

type RecentAssessment = {
  id: string
  title: string
  status: 'assigned' | 'in_progress' | 'completed' | 'expired' | 'cancelled'
  assigned_at?: string | null
  completed_at?: string | null
  template_abbrev?: string | null
}

const SectionCard: React.FC<{ title: string; children: React.ReactNode; right?: React.ReactNode }> = ({ title, children, right }) => (
  <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
    <div className="flex items-center justify-between mb-4">
      <h3 className="text-base font-semibold text-gray-900">{title}</h3>
      {right}
    </div>
    {children}
  </div>
)

const Chip = ({ text, tone }: { text: string; tone?: 'green'|'blue'|'amber'|'gray'|'red' }) => {
  const map = {
    green:'bg-green-100 text-green-700',
    blue:'bg-blue-100 text-blue-700',
    amber:'bg-amber-100 text-amber-700',
    red:'bg-red-100 text-red-700',
    gray:'bg-gray-100 text-gray-700',
  } as const
  return <span className={`text-xs px-2 py-1 rounded-full ${map[tone||'gray']}`}>{text}</span>
}

export default function ClientHome() {
  const { user, profile, loading } = useAuth()
  const navigate = useNavigate()

  const [busy, setBusy] = useState(true)
  const [err, setErr] = useState<string | null>(null)
  const [todaySessions, setTodaySessions] = useState<TodaySession[]>([])
  const [assessments, setAssessments] = useState<RecentAssessment[]>([])

  const isClient = profile?.role === 'client'

  useEffect(() => {
    const run = async () => {
      if (!user || !isClient) return
      setBusy(true); setErr(null)
      try {
        // Today range
        const now = new Date()
        const yyyy = now.getFullYear()
        const mm = String(now.getMonth() + 1).padStart(2, '0')
        const dd = String(now.getDate()).padStart(2, '0')
        const start = `${yyyy}-${mm}-${dd}T00:00:00`
        const end   = `${yyyy}-${mm}-${dd}T23:59:59`

        // Appointments for the client
        const { data: appts, error: apptErr } = await supabase
          .from('appointments')
          .select(`
            id, appointment_date, appointment_type, therapist_id,
            therapist:profiles!appointments_therapist_id_fkey(first_name,last_name)
          `)
          .eq('client_id', user.id)
          .gte('appointment_date', start)
          .lte('appointment_date', end)

        if (apptErr) throw apptErr

        setTodaySessions((appts || []).map(a => ({
          id: a.id as string,
          time: new Date(a.appointment_date as string).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          therapistName: `${(a as any).therapist?.first_name || 'Therapist'} ${(a as any).therapist?.last_name || ''}`.trim(),
          appointment_type: (a as any).appointment_type ?? null,
        })))

        // Client's assessment instances (recent)
        const { data: inst, error: instErr } = await supabase
          .from('assessment_instances')
          .select('id, title, status, template_id, assigned_at, completed_at')
          .eq('client_id', user.id)
          .order('assigned_at', { ascending: false })
          .limit(10)

        if (instErr) throw instErr

        const templateIds = Array.from(new Set((inst || []).map(i => i.template_id)))
        const { data: tpls } = templateIds.length
          ? await supabase.from('assessment_templates').select('id, abbreviation').in('id', templateIds)
          : { data: [] as any[] }

        setAssessments((inst || []).map(i => ({
          id: i.id as string,
          title: (i as any).title || 'Assessment',
          status: i.status as any,
          assigned_at: i.assigned_at,
          completed_at: i.completed_at,
          template_abbrev: (tpls || []).find(t => t.id === i.template_id)?.abbreviation ?? null,
        })))
      } catch (e: any) {
        console.error('[ClientHome] load error', e)
        setErr('Could not load your dashboard data.')
      } finally {
        setBusy(false)
      }
    }
    if (user && isClient) run()
  }, [user, isClient])

  const statusTone = useMemo(() => ({
    completed: 'green',
    in_progress: 'blue',
    assigned: 'gray',
    expired: 'amber',
    cancelled: 'red',
  } as const), [])

  if (loading) {
    return (
      <div className="min-h-[60vh] grid place-items-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
      </div>
    )
  }

  if (!user || !isClient) {
    return (
      <div className="max-w-lg mx-auto mt-16">
        <div className="bg-white border border-gray-200 rounded-xl p-6 text-center">
          <AlertTriangle className="w-8 h-8 text-amber-600 mx-auto mb-2" />
          <h2 className="text-lg font-semibold text-gray-900 mb-1">Client access only</h2>
          <p className="text-sm text-gray-600">Please sign in as a client or contact your therapist.</p>
          <Link to="/login" className="inline-flex items-center px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 mt-3">
            Go to sign in
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Greeting */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-6 rounded-xl shadow">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold mb-1">Hi {profile?.first_name}!</h2>
              <p className="text-blue-100">Here’s what’s on your plate.</p>
            </div>
            <button
              onClick={() => navigate('/client/profile')}
              className="inline-flex items-center gap-2 bg-white/15 hover:bg-white/25 px-3 py-2 rounded-lg text-sm"
            >
              <User className="w-4 h-4" /> Profile
            </button>
          </div>
        </div>

        {err && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded p-3">
            {err}
          </div>
        )}

        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-xl border border-gray-200">
            <div className="text-sm text-gray-600">Today’s Sessions</div>
            <div className="text-3xl font-semibold text-blue-600">{busy ? '—' : todaySessions.length}</div>
          </div>
          <div className="bg-white p-4 rounded-xl border border-gray-200">
            <div className="text-sm text-gray-600">Assessments</div>
            <div className="text-3xl font-semibold text-amber-600">{busy ? '—' : assessments.length}</div>
          </div>
          <div className="bg-white p-4 rounded-xl border border-gray-200">
            <div className="text-sm text-gray-600">Pending</div>
            <div className="text-3xl font-semibold text-purple-600">
              {busy ? '—' : assessments.filter(a => a.status === 'assigned' || a.status === 'in_progress').length}
            </div>
          </div>
          <div className="bg-white p-4 rounded-xl border border-gray-200">
            <div className="text-sm text-gray-600">Completed</div>
            <div className="text-3xl font-semibold text-green-600">
              {busy ? '—' : assessments.filter(a => a.status === 'completed').length}
            </div>
          </div>
        </div>

        {/* Today */}
        <SectionCard
          title="Today’s Schedule"
          right={<button onClick={() => navigate('/client/profile')} className="text-sm text-blue-700 hover:text-blue-900">View profile</button>}
        >
          {busy ? (
            <div className="py-10 grid place-items-center">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600" />
            </div>
          ) : todaySessions.length === 0 ? (
            <div className="text-center py-10 text-gray-600">
              <Calendar className="w-10 h-10 text-gray-300 mx-auto mb-2" />
              Nothing scheduled for today
            </div>
          ) : (
            <div className="space-y-3">
              {todaySessions.map(s => (
                <div key={s.id} className="flex items-center justify-between p-4 bg-gray-50 border border-gray-200 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-100 grid place-items-center">
                      <Calendar className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">{s.time}</div>
                      <div className="text-sm text-gray-600">with {s.therapistName}</div>
                    </div>
                  </div>
                  {s.appointment_type && <Chip text={s.appointment_type} tone="blue" />}
                </div>
              ))}
            </div>
          )}
        </SectionCard>

        {/* Assessments */}
        <SectionCard
          title="Your Assessments"
          right={<button onClick={() => navigate('/client/assessments')} className="text-sm text-blue-700 hover:text-blue-900">Open all</button>}
        >
          {busy ? (
            <div className="py-10 grid place-items-center">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600" />
            </div>
          ) : assessments.length === 0 ? (
            <div className="text-center py-10 text-gray-600">
              <Brain className="w-10 h-10 text-gray-300 mx-auto mb-2" />
              No assessments yet
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              {assessments.slice(0, 6).map(a => (
                <button
                  key={a.id}
                  onClick={() => navigate(`/client/assessments?instanceId=${a.id}`)}
                  className="w-full text-left p-4 bg-gray-50 hover:bg-gray-100 rounded-lg border border-gray-200 flex items-center justify-between"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900">{a.title}</span>
                      {a.template_abbrev && <Chip text={a.template_abbrev} tone="blue" />}
                    </div>
                    <div className="text-xs text-gray-600 mt-1">
                      Assigned {a.assigned_at ? new Date(a.assigned_at).toLocaleDateString() : '—'}
                    </div>
                  </div>
                  <Chip
                    text={a.status.replace('_',' ')}
                    tone={statusTone[a.status] as any}
                  />
                </button>
              ))}
            </div>
          )}
        </SectionCard>

        {/* Docs */}
        <SectionCard title="Shared Documents">
          <div className="text-sm text-gray-600">
            Your therapist may share files and results here in the future.
            <div className="mt-2 inline-flex items-center gap-1 text-gray-500">
              <FileText className="w-4 h-4" /> Coming soon
            </div>
          </div>
        </SectionCard>
      </div>
    </div>
  )
}
