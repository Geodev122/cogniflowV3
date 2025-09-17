import React, { useState, useEffect, useCallback, Suspense } from 'react'
import { useNavigate, Navigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import {
  Users, FileText, Calendar, Library, CheckCircle, AlertTriangle, Menu, X, Target, ChevronLeft,
  User, CalendarDays, Brain, Shield, Headphones, Plus, Eye, LogOut, BarChart3, Building2,
  ShieldCheck, Star, Activity, ChevronRight, Play
} from 'lucide-react'
import { TherapistOnboarding } from '../../components/therapist/TherapistOnboarding'

// NOTE: Client management removed; leads removed; Clinic Rentals moved to Profession Management
const SessionManagement = React.lazy(() =>
  import('../../pages/therapist/SessionManagement').then(m => ({ default: (m as any).default ?? m }))
)
const CaseManagement = React.lazy(() =>
  import('../../pages/therapist/CaseManagement').then(m => ({ default: (m as any).default ?? m }))
)
const ResourceLibrary = React.lazy(() =>
  import('../../pages/therapist/ResourceLibrary').then(m => ({ default: (m as any).default ?? m }))
)

const Clienteles = React.lazy(() =>
  import('../../components/therapist/Clienteles').then(m => ({ default: m.Clienteles }))
)
// 🚫 SessionBoard tab removed — Session Board now lives inside the Workspace only
const ClinicRentalPanel = React.lazy(() =>
  import('../../components/therapist/ClinicRentalPanel').then(m => ({ default: m.ClinicRentalPanel }))
)
const LicensingCompliance = React.lazy(() =>
  import('../../components/therapist/LicensingCompliance').then(m => ({ default: m.LicensingCompliance }))
)
const SupervisionPanel = React.lazy(() =>
  import('../../components/therapist/SupervisionPanel').then(m => ({ default: m.SupervisionPanel }))
)
const VIPOpportunities = React.lazy(() =>
  import('../../components/therapist/VIPOpportunities').then(m => ({ default: m.VIPOpportunities }))
)
const MembershipPanel = React.lazy(() =>
  import('../../components/therapist/MembershipPanel').then(m => ({ default: m.MembershipPanel }))
)
const ProgressMetrics = React.lazy(() =>
  import('../../components/therapist/ProgressMetrics').then(m => ({ default: m.ProgressMetrics }))
)
const SimpleTherapistProfile = React.lazy(() =>
  import('../../components/therapist/SimpleTherapistProfile').then(m => ({ default: m.SimpleTherapistProfile }))
)

interface DashboardStats {
  totalClients: number
  activeCases: number
  patientsToday: number
  profileCompletion: number
  assessmentsInProgress: number
}

interface OnboardingStep { id: string; title: string; completed: boolean }
interface TodaySession { id: string; client_name: string; time: string; type?: string; notes?: string; case_id?: string | null }

type InsightPriority = 'high' | 'medium' | 'low'
interface CaseInsight {
  client_name: string
  insight: string
  recommendation: string
  priority: InsightPriority
}

interface ActivityItem {
  id: string
  type: 'client' | 'supervision' | 'admin'
  title: string
  description: string
  time: string
  icon: string
}

interface RecentAssessmentItem {
  id: string
  title: string
  status: 'assigned' | 'in_progress' | 'completed' | 'expired' | 'cancelled'
  clientName: string
  abbrev?: string
  assigned_at?: string
  completed_at?: string
}

type SectionId =
  | 'overview' | 'clienteles' | 'cases' | 'sessions'
  | 'metrics' | 'resources'
  | 'licensing' | 'supervision' | 'vip' | 'clinic'
  | 'profile' | 'membership' | 'admin'

export default function TherapistDashboard() {
  const navigate = useNavigate()
  const { profile, signOut } = useAuth()

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [showOnboardingModal, setShowOnboardingModal] = useState(false)
  const [showProfileModal, setShowProfileModal] = useState(false)

  const [stats, setStats] = useState<DashboardStats>({
    totalClients: 0, activeCases: 0, patientsToday: 0, profileCompletion: 0, assessmentsInProgress: 0
  })
  const [onboardingSteps, setOnboardingSteps] = useState<OnboardingStep[]>([])
  const [todaySessions, setTodaySessions] = useState<TodaySession[]>([])
  const [caseInsights, setCaseInsights] = useState<CaseInsight[]>([])
  const [recentActivities, setRecentActivities] = useState<ActivityItem[]>([])
  const [recentAssessments, setRecentAssessments] = useState<RecentAssessmentItem[]>([])

  const [loading, setLoading] = useState(true)
  const [dashboardError, setDashboardError] = useState<string | null>(null)
  const [profileLive, setProfileLive] = useState(false)
  const [isSigningOut, setIsSigningOut] = useState(false)
  const [signOutError, setSignOutError] = useState<string | null>(null)
  const [active, setActive] = useState<SectionId>('overview')

  // NAV: updated — Session Board removed from dashboard (it’s inside Workspace now)
  const navigationSections = [
    { title: null, items: [{ id: 'overview', name: 'Overview', icon: Target }] },
    {
      title: 'Client Care',
      items: [
        { id: 'clienteles', name: 'Clienteles', icon: Users },
        { id: 'cases', name: 'Case Management', icon: FileText },
        { id: 'resources', name: 'Resource Library', icon: Library },
        // Route link for the assessments workspace (kept only here)
        { id: 'assessmentsRoute' as const, name: 'Assessments', icon: Brain as any },
      ]
    },
    {
      title: 'Practice Management',
      items: [
        { id: 'sessions', name: 'Session Management', icon: Calendar },
        { id: 'metrics', name: 'Progress Metrics', icon: BarChart3 },
      ]
    },
    {
      title: 'Profession Management',
      items: [
        { id: 'licensing', name: 'Compliance', icon: ShieldCheck },
        { id: 'clinic', name: 'Clinic Rentals', icon: Building2 }, // moved here
        { id: 'supervision', name: 'Supervision', icon: Headphones },
        { id: 'vip', name: 'VIP Opportunities', icon: Star },
      ]
    },
    {
      title: 'Account',
      items: [
        { id: 'profile', name: 'Therapist Profile', icon: User },
        { id: 'membership', name: 'Membership', icon: CalendarDays },
        { id: 'admin', name: 'Support/Tickets', icon: Shield }, // renamed
      ]
    }
  ] as const

  const fetchDashboardData = useCallback(async () => {
    if (!profile?.id) return
    try {
      setDashboardError(null)
      setLoading(true)

      // Clients linked to therapist
      const { data: clientRelations } = await supabase
        .from('therapist_client_relations')
        .select('client_id')
        .eq('therapist_id', profile.id)

      // Active cases
      const { data: activeCases } = await supabase
        .from('cases')
        .select('id')
        .eq('therapist_id', profile.id)
        .eq('status', 'active')

      // Today appointments (include case_id so we can deep-link Workspace)
      const now = new Date()
      const yyyy = now.getFullYear()
      const mm = String(now.getMonth() + 1).padStart(2, '0')
      const dd = String(now.getDate()).padStart(2, '0')
      const dayStart = `${yyyy}-${mm}-${dd}T00:00:00`
      const dayEnd = `${yyyy}-${mm}-${dd}T23:59:59`

      const { data: appts } = await supabase
        .from('appointments')
        .select('id, start_time, end_time, status, notes, client_id, title, case_id')
        .eq('therapist_id', profile.id)
        .gte('start_time', dayStart)
        .lte('start_time', dayEnd)
        .order('start_time', { ascending: true })

      // Recent assessment instances
      const { data: inst } = await supabase
        .from('assessment_instances')
        .select('id, template_id, client_id, title, status, assigned_at, completed_at')
        .eq('therapist_id', profile.id)
        .order('assigned_at', { ascending: false })
        .limit(12)

      const inProgressCount = (inst || []).filter(i => i.status === 'in_progress').length

      // Resolve names (RLS-safe, no joins)
      const templateIds = Array.from(new Set((inst || []).map(i => i.template_id)))
      const clientIdsFromInst = Array.from(new Set((inst || []).map(i => i.client_id)))
      const clientIdsFromAppts = Array.from(new Set((appts || []).map(a => a.client_id)))
      const allClientIds = Array.from(new Set([...clientIdsFromInst, ...clientIdsFromAppts])).filter(Boolean) as string[]

      const [{ data: tpls }, { data: clients }] = await Promise.all([
        templateIds.length
          ? supabase.from('assessment_templates').select('id, abbreviation, name').in('id', templateIds)
          : Promise.resolve({ data: [] as any[] }),
        allClientIds.length
          ? supabase.from('profiles').select('id, first_name, last_name').in('id', allClientIds)
          : Promise.resolve({ data: [] as any[] })
      ])

      const clientsById = new Map((clients || []).map((c: any) => [c.id, c]))

      // Build today's sessions
      const sessions = (appts || []).map(apt => {
        const c = clientsById.get(apt.client_id)
        const appointmentTime = apt.start_time
        return {
          id: apt.id,
          client_name: `${c?.first_name || 'Unknown'} ${c?.last_name || 'Client'}`.trim(),
          time: appointmentTime ? new Date(appointmentTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—',
          type: apt.title || apt.status,
          notes: apt.notes || undefined,
          case_id: apt.case_id ?? null
        } as TodaySession
      })

      // Recent assessments list
      const recent3: RecentAssessmentItem[] = (inst || [])
        .slice(0, 3)
        .map(i => {
          const c = clientsById.get(i.client_id)
          const t = (tpls || []).find((tp: any) => tp.id === i.template_id)
          return {
            id: i.id,
            title: i.title || t?.name || 'Assessment',
            status: i.status as RecentAssessmentItem['status'],
            clientName: `${c?.first_name || ''} ${c?.last_name || ''}`.trim() || 'Client',
            abbrev: t?.abbreviation,
            assigned_at: i.assigned_at || undefined,
            completed_at: i.completed_at || undefined
          }
        })

      // Insights from latest assessment_scores severity
      let insights: CaseInsight[] = []
      if (inst && inst.length) {
        const recentIds = inst.map(i => i.id)
        const { data: scores } = await supabase
          .from('assessment_scores')
          .select('instance_id, severity_level, interpretation_description')
          .in('instance_id', recentIds)
          .order('calculated_at', { ascending: false })
          .limit(50)

        const byInstance = new Map<string, any>((scores || []).map(s => [s.instance_id, s]))
        insights = recent3
          .map(item => {
            const s = byInstance.get(item.id)
            if (!s?.severity_level) return null
            const sev = String(s.severity_level).toLowerCase()
            const priority: InsightPriority = sev.includes('severe') ? 'high' : sev.includes('moderate') ? 'medium' : 'low'
            if (priority === 'low') return null
            return {
              client_name: item.clientName,
              insight: s.interpretation_description || 'Review clinical interpretation',
              recommendation: 'Open assessment results for recommended actions.',
              priority
            } as CaseInsight
          })
          .filter(Boolean) as CaseInsight[]
      }

      // Onboarding completion
      const steps: OnboardingStep[] = [
        { id: 'basic',         title: 'Basic Information',     completed: !!profile.first_name && !!profile.last_name },
        { id: 'professional',  title: 'Professional Details',  completed: !!profile.professional_details },
        { id: 'verification',  title: 'Verification',          completed: profile.verification_status === 'verified' },
        { id: 'bio',           title: 'Bio & Story',           completed: !!(profile.professional_details?.bio && profile.professional_details.bio.length > 150) },
        { id: 'locations',     title: 'Practice Locations',    completed: !!(profile.professional_details?.practice_locations?.length > 0) },
      ]
      const completedSteps = steps.filter(s => s.completed).length
      const profileCompletion = Math.round((completedSteps / steps.length) * 100)
      const isProfileLive = profileCompletion === 100 && profile.verification_status === 'verified'

      setStats({
        totalClients: clientRelations?.length || 0,
        activeCases: activeCases?.length || 0,
        patientsToday: sessions.length,
        profileCompletion,
        assessmentsInProgress: (inst || []).filter(i => i.status === 'in_progress').length
      })
      setOnboardingSteps(steps)
      setProfileLive(isProfileLive)
      setTodaySessions(sessions)
      setRecentAssessments(recent3)

      // Activity feed
      const activities: ActivityItem[] = []
      if (sessions.length) {
        activities.push({
          id: 'act-appt',
          type: 'client',
          title: 'Today’s schedule ready',
          description: `${sessions.length} appointment(s)`,
          time: 'today',
          icon: 'Calendar'
        })
      }
      if ((inst || []).length) {
        activities.push({
          id: 'act-assess',
          type: 'client',
          title: 'Assessments updated',
          description: `${inst?.length} recent assignment(s)`,
          time: 'recent',
          icon: 'Activity'
        })
      }
      setRecentActivities(activities)
      setCaseInsights(insights || [])
    } catch (e) {
      console.error('dashboard fetch error:', e)
      setDashboardError('Could not load dashboard data.')
    } finally {
      setLoading(false)
    }
  }, [profile])

  useEffect(() => { if (profile?.id) fetchDashboardData() }, [profile?.id, fetchDashboardData])

  const handleSignOut = async () => {
    setIsSigningOut(true)
    setSignOutError(null)
    try { await signOut() }
    catch (error) { console.error('Error signing out:', error); setSignOutError('Failed to sign out. Please try again.') }
    finally { setIsSigningOut(false) }
  }

  if (profile && profile.role !== 'therapist') return <Navigate to="/client" replace />

  const handleOnboardingComplete = () => { setShowOnboardingModal(false); fetchDashboardData() }
  const goto = (id: SectionId) => { setActive(id); setMobileMenuOpen(false) }

  const Overview = () => (
    <div className="h-full overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-6">
      {!profileLive && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Onboarding</h3>
            <span className="text-sm text-gray-500">{stats.profileCompletion}% complete</span>
          </div>
          <div className="space-y-3 mb-4">
            {onboardingSteps.map((step, index) => (
              <div key={step.id} className="flex items-center space-x-3">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center ${step.completed ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-500'}`}>
                  {step.completed ? <CheckCircle className="w-4 h-4" /> : <span className="text-xs">{index + 1}</span>}
                </div>
                <span className={`text-sm ${step.completed ? 'text-gray-700' : 'text-gray-500'}`}>{step.title}</span>
              </div>
            ))}
          </div>
          <button onClick={() => setShowOnboardingModal(true)} className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors">
            Continue Setup
          </button>
        </div>
      )}

      {dashboardError && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3">
          {dashboardError}
        </div>
      )}

      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-6 rounded-xl shadow-lg">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold mb-1">Welcome back{profile?.first_name ? `, Dr. ${profile.first_name}!` : '!'}</h2>
            <p className="text-blue-100">{new Date().toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
          </div>
          {/* Access Workspace (general entry) */}
          <button
            onClick={() => navigate('/therapist/workspace')}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white text-blue-700 hover:bg-blue-50 font-medium shadow-sm"
          >
            <Play className="w-4 h-4" />
            Access Workspace
          </button>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Active Cases</p>
              <p className="text-3xl font-bold text-green-600">{stats.activeCases}</p>
            </div>
            <div className="p-3 bg-green-100 rounded-full"><FileText className="h-6 w-6 text-green-600" /></div>
          </div>
        </div>
        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Today’s Sessions</p>
              <p className="text-3xl font-bold text-purple-600">{stats.patientsToday}</p>
            </div>
            <div className="p-3 bg-purple-100 rounded-full"><CalendarDays className="h-6 w-6 text-purple-600" /></div>
          </div>
        </div>
        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Clients</p>
              <p className="text-3xl font-bold text-blue-600">{stats.totalClients}</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-full"><Users className="h-6 w-6 text-blue-600" /></div>
          </div>
        </div>
        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Assessments In Progress</p>
              <p className="text-3xl font-bold text-amber-600">{stats.assessmentsInProgress}</p>
            </div>
            <div className="p-3 bg-amber-100 rounded-full"><Brain className="h-6 w-6 text-amber-600" /></div>
          </div>
        </div>
        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Profile</p>
              <p className="text-3xl font-bold text-indigo-600">{stats.profileCompletion}%</p>
            </div>
            <div className="p-3 bg-indigo-100 rounded-full"><ShieldCheck className="h-6 w-6 text-indigo-600" /></div>
          </div>
        </div>
      </div>

      {/* Row: Today's schedule + Recent Assessments */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Today's schedule */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Today's Schedule</h3>
            <button onClick={() => goto('sessions')} className="inline-flex items-center px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm">
              <Plus className="w-4 h-4 mr-1" /> Schedule
            </button>
          </div>
          {todaySessions.length === 0 ? (
            <div className="text-center py-8">
              <Calendar className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h4 className="text-lg font-medium text-gray-900 mb-2">No sessions today</h4>
              <p className="text-gray-600">Your schedule is clear for today</p>
            </div>
          ) : (
            <div className="space-y-3">
              {todaySessions.map(session => (
                <div key={session.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center"><User className="w-5 h-5 text-blue-600" /></div>
                    <div>
                      <h4 className="font-medium text-gray-900">{session.client_name}</h4>
                      <p className="text-sm text-gray-600">
                        {session.time}{session.type ? ` • ${session.type}` : ''}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      className="text-blue-600 hover:text-blue-800"
                      onClick={() =>
                        session.case_id
                          ? navigate(`/cases/${session.case_id}/workspace`) // ✅ deep-link to Workspace for this case
                          : navigate('/therapist/workspace')
                      }
                      title="Open Workspace"
                    >
                      <Play className="w-4 h-4" />
                    </button>
                    <button className="text-blue-600 hover:text-blue-800" title="View">
                      <Eye className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Assessments */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <div className="p-2 bg-blue-100 rounded-lg"><Brain className="w-5 h-5 text-blue-600" /></div>
              <h3 className="text-lg font-semibold text-gray-900">Recent Assessments</h3>
            </div>
            <button
              onClick={() => navigate('/therapist/assessments')}
              className="inline-flex items-center text-sm text-blue-700 hover:text-blue-900"
            >
              Open Workspace <ChevronRight className="w-4 h-4 ml-1" />
            </button>
          </div>

          {recentAssessments.length === 0 ? (
            <div className="text-center py-10">
              <Activity className="w-10 h-10 text-gray-300 mx-auto mb-2" />
              <p className="text-gray-600 text-sm">No assessment activity yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentAssessments.map(a => (
                <button
                  key={a.id}
                  onClick={() => navigate(`/therapist/assessments/${a.id}`)}
                  className="w-full text-left p-4 bg-gray-50 hover:bg-gray-100 rounded-lg border border-gray-200 flex items-center justify-between"
                >
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-medium text-gray-900">{a.title}</span>
                      {a.abbrev && <span className="text-xs bg-blue-100 text-blue-700 rounded-full px-2 py-0.5">{a.abbrev}</span>}
                    </div>
                    <div className="text-sm text-gray-600 mt-0.5">{a.clientName}</div>
                  </div>
                  <span
                    className={`text-xs px-2 py-1 rounded-full ${
                      a.status === 'completed'
                        ? 'bg-green-100 text-green-700'
                        : a.status === 'in_progress'
                        ? 'bg-blue-100 text-blue-700'
                        : a.status === 'assigned'
                        ? 'bg-gray-100 text-gray-700'
                        : 'bg-amber-100 text-amber-700'
                    }`}
                  >
                    {a.status.replace('_', ' ')}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Case Insights */}
      {caseInsights.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center space-x-3 mb-6">
            <div className="p-2 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg">
              <Brain className="w-5 h-5 text-white" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900">Case Insights</h3>
          </div>
          <div className="space-y-4">
            {caseInsights.map((insight, index) => (
              <div key={index} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900">{insight.client_name}</h4>
                    <p className="text-sm text-gray-600 mt-1">{insight.insight}</p>
                    <p className="text-sm text-blue-600 mt-2">💡 {insight.recommendation}</p>
                  </div>
                  <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                    insight.priority === 'high' ? 'bg-red-100 text-red-800'
                      : insight.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'
                  }`}>{insight.priority}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-6">Quick Actions</h3>
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <button onClick={() => goto('clienteles')} className="p-4 bg-green-50 hover:bg-green-100 rounded-lg transition-colors group">
            <Users className="w-8 h-8 text-green-600 mx-auto mb-2" />
            <p className="text-sm font-medium text-green-900">Find Client</p>
          </button>
          <button onClick={() => goto('sessions')} className="p-4 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors group">
            <Calendar className="w-8 h-8 text-purple-600 mx-auto mb-2" />
            <p className="text-sm font-medium text-purple-900">Schedule Session</p>
          </button>
          <button onClick={() => navigate('/therapist/workspace')} className="p-4 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors group">
            <Play className="w-8 h-8 text-blue-600 mx-auto mb-2" />
            <p className="text-sm font-medium text-blue-900">Access Workspace</p>
          </button>
          <button onClick={() => navigate('/therapist/assessments')} className="p-4 bg-amber-50 hover:bg-amber-100 rounded-lg transition-colors group">
            <Brain className="w-8 h-8 text-amber-600 mx-auto mb-2" />
            <p className="text-sm font-medium text-amber-900">Assessments</p>
          </button>
          <button onClick={() => goto('cases')} className="p-4 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors group">
            <FileText className="w-8 h-8 text-indigo-600 mx-auto mb-2" />
            <p className="text-sm font-medium text-indigo-900">View Cases</p>
          </button>
        </div>
      </div>
    </div>
  )

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Fixed Header */}
      <header className="fixed top-0 left-0 right-0 z-40 bg-white shadow-sm border-b border-gray-200">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-3">
                <img
                  src="/thera-py-icon.png"
                  alt="Thera-PY Logo"
                  className="w-8 h-8"
                  onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
                />
                <img
                  src="/thera-py-image.png"
                  alt="Thera-PY"
                  className="h-6"
                  onError={(e) => { (e.currentTarget as HTMLImageElement).outerHTML = '<span>Thera-PY</span>' }}
                />
              </div>
              <div className="hidden sm:block"><p className="text-sm text-gray-500">Therapist Portal</p></div>
            </div>

            <div className="flex items-center space-x-4">
              {profileLive && (
                <div className="hidden sm:flex items-center space-x-2 bg-green-100 text-green-800 px-3 py-1 rounded-full">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                  <span className="text-sm font-medium">Profile Live</span>
                </div>
              )}

              <button
                onClick={() => setShowProfileModal(true)}
                className="flex items-center space-x-2 text-sm text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-md px-3 py-2 transition-colors"
              >
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <span className="text-xs font-medium text-blue-600">
                    {profile?.first_name?.[0]}{profile?.last_name?.[0]}
                  </span>
                </div>
                <div className="hidden sm:block text-left">
                  <div className="font-medium">{profile?.first_name} {profile?.last_name}</div>
                  <div className="text-xs text-gray-500">View Profile</div>
                </div>
              </button>

              <button
                onClick={handleSignOut}
                disabled={isSigningOut}
                className="flex items-center space-x-1 sm:space-x-2 px-2 sm:px-3 py-2 text-xs sm:text-sm text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title="Sign out"
              >
                {isSigningOut
                  ? <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600" />
                  : <LogOut className="w-4 h-4" />}
                <span className="hidden sm:inline">{isSigningOut ? 'Signing out...' : 'Sign out'}</span>
              </button>

              {/* Mobile Menu Button */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
                aria-label="Toggle menu"
              >
                {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>

          {/* Sign out error notification */}
          {signOutError && (
            <div className="bg-red-50 border-l-4 border-red-400 p-3">
              <div className="flex items-center">
                <AlertTriangle className="w-4 h-4 text-red-400 mr-2" />
                <span className="text-sm text-red-700">{signOutError}</span>
                <button onClick={() => setSignOutError(null)} className="ml-auto text-red-400 hover:text-red-600">×</button>
              </div>
            </div>
          )}
        </div>
      </header>

      <div className="flex pt-16">
        {/* Sidebar (desktop) */}
        <aside className={`hidden md:flex flex-col ${sidebarCollapsed ? 'w-16' : 'w-64'} bg-white border-r border-gray-200 fixed left-0 top-16 bottom-0 transition-all duration-300 shadow-lg z-30`}>
          <div className="flex-shrink-0 border-b border-gray-100">
            <div className="p-4 flex items-center justify-between">
              {!sidebarCollapsed && (
                <h3 className="text-sm font-semibold text-gray-800 flex items-center">
                  <Target className="w-4 h-4 mr-2 text-blue-600" /> Navigation
                </h3>
              )}
              <button
                onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                className={`w-8 h-8 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center ${sidebarCollapsed ? 'mx-auto' : ''}`}
                title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              >
                <ChevronLeft className={`w-4 h-4 transition-all duration-300 ${sidebarCollapsed ? 'rotate-180' : ''}`} />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-3">
            <nav className="space-y-6">
              {navigationSections.map((section, idx) => (
                <div key={idx}>
                  {section.title && !sidebarCollapsed && (
                    <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 px-2 flex items-center">
                      <div className="w-4 h-0.5 bg-gray-300 mr-2" />
                      {section.title}
                      <div className="flex-1 h-0.5 bg-gray-300 ml-2" />
                    </h4>
                  )}
                  <div className="space-y-1">
                    {section.items.map(tab => {
                      const Icon = tab.icon as any
                      const isActive = active === (tab.id as SectionId)
                      const isAssessmentsRoute = tab.id === 'assessmentsRoute'
                      return (
                        <button
                          key={tab.id as string}
                          onClick={() => {
                            if (isAssessmentsRoute) navigate('/therapist/assessments')
                            else setActive(tab.id as SectionId)
                          }}
                          className={`w-full flex items-center ${sidebarCollapsed ? 'justify-center' : 'space-x-3'} px-3 py-3 rounded-xl transition-all duration-200 text-sm font-medium ${
                            isActive ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow'
                                     : isAssessmentsRoute ? 'text-amber-900 bg-amber-50 hover:bg-amber-100'
                                     : 'text-gray-700 hover:bg-gray-50'
                          }`}
                          aria-current={isActive ? 'page' : undefined}
                          title={sidebarCollapsed ? tab.name : undefined}
                        >
                          <Icon className={`w-5 h-5 flex-shrink-0 ${
                            isActive ? 'text-white' :
                            isAssessmentsRoute ? 'text-amber-600' :
                            'text-gray-400'
                          }`} />
                          {!sidebarCollapsed && <span className="font-medium">{tab.name}</span>}
                        </button>
                      )
                    })}
                  </div>
                </div>
              ))}
            </nav>
          </div>

          {!sidebarCollapsed && (
            <div className="flex-shrink-0 border-t border-gray-100 p-4 text-center text-xs text-gray-400">
              Thera-PY v1.0.0
            </div>
          )}
        </aside>

        {/* Mobile Navigation Overlay */}
        {mobileMenuOpen && (
          <div className="md:hidden fixed inset-0 z-50 pt-16">
            <div className="fixed inset-0 bg-gray-600 bg-opacity-75" onClick={() => setMobileMenuOpen(false)} />
            <div className="fixed inset-y-0 left-0 w-64 bg-white shadow-xl pt-16">
              <div className="h-full overflow-y-auto p-4">
                <nav className="space-y-6">
                  {navigationSections.map((section, idx) => (
                    <div key={idx}>
                      {section.title && <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">{section.title}</h3>}
                      <div className="space-y-1">
                        {section.items.map(tab => {
                          const Icon = tab.icon as any
                          const isActive = active === (tab.id as SectionId)
                          const isAssessmentsRoute = tab.id === 'assessmentsRoute'
                          return (
                            <button
                              key={tab.id as string}
                              onClick={() => {
                                if (isAssessmentsRoute) { setMobileMenuOpen(false); navigate('/therapist/assessments') }
                                else { goto(tab.id as SectionId) }
                              }}
                              className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg transition-all text-sm font-medium ${
                                isActive ? 'text-blue-700 bg-blue-50'
                                : isAssessmentsRoute ? 'text-amber-800 bg-amber-50 hover:bg-amber-100'
                                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                              }`}
                              aria-current={isActive ? 'page' : undefined}
                            >
                              <Icon className={`w-5 h-5 flex-shrink-0 ${
                                isActive ? 'text-blue-600'
                                : isAssessmentsRoute ? 'text-amber-600'
                                : 'text-gray-400'
                              }`} />
                              <span>{tab.name}</span>
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  ))}
                </nav>
              </div>
            </div>
          </div>
        )}

        {/* Main Content */}
        <div className={`flex-1 transition-all duration-300 ${sidebarCollapsed ? 'md:ml-16' : 'md:ml-64'} bg-gray-50 min-h-0`}>
          <main className="min-h-[calc(100vh-4rem)] overflow-y-auto">
            <Suspense fallback={<div className="p-6"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto" /></div>}>
              {active === 'overview'      && <Overview />}
              {active === 'clienteles'    && <Clienteles />}
              {active === 'cases'         && <CaseManagement />}
              {active === 'sessions'      && <SessionManagement />}
              {/* 🚫 sessionBoard removed */}
              {active === 'metrics'       && <ProgressMetrics />}
              {active === 'resources'     && <ResourceLibrary />}
              {active === 'licensing'     && <LicensingCompliance />}
              {active === 'clinic'        && <ClinicRentalPanel />}
              {active === 'supervision'   && <SupervisionPanel />}
              {active === 'vip'           && <VIPOpportunities />}
              {active === 'profile'       && (
                <div className="p-6">
                  <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-8">
                    <SimpleTherapistProfile
                      profile={profile}
                      onEdit={() => setShowOnboardingModal(true)}
                    />
                  </div>
                </div>
              )}
              {active === 'membership'    && <MembershipPanel />}
              {active === 'admin'         && (
                <div className="p-6">
                  <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-8 text-center">
                    <Shield className="mx-auto h-10 w-10 text-gray-300 mb-2" />
                    <h3 className="text-gray-900 font-medium">Support / Tickets</h3>
                    <p className="text-sm text-gray-600 mt-1">Use the Support/Tickets page in your account menu.</p>
                  </div>
                </div>
              )}
            </Suspense>
          </main>
        </div>
      </div>

      {/* Modals */}
      {showOnboardingModal && (
        <TherapistOnboarding onComplete={handleOnboardingComplete} onClose={() => setShowOnboardingModal(false)} />
      )}

      {showProfileModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => setShowProfileModal(false)} />
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full max-h-[90vh] overflow-y-auto">
              <div className="bg-white">
                <div className="flex items-center justify-between p-6 border-b border-gray-200">
                  <h3 className="text-lg font-medium text-gray-900">Professional Profile</h3>
                  <button onClick={() => setShowProfileModal(false)} className="text-gray-400 hover:text-gray-600">
                    <X className="h-6 w-6" />
                  </button>
                </div>
                <div className="p-6">
                  <SimpleTherapistProfile
                    profile={profile}
                    onEdit={() => {
                      setShowProfileModal(false)
                      setShowOnboardingModal(true)
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
