import React, { useState, useEffect, useCallback, Suspense } from 'react'
import { useNavigate, Navigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import {
  Users, FileText, Calendar, Library, CheckCircle, AlertTriangle, Menu, X, Target, ChevronLeft,
  User, CalendarDays, Brain, Shield, Headphones, Plus, Eye, LogOut, BarChart3, Building2,
  ShieldCheck, Star, Activity, ChevronRight, Play, Crown, Settings, Archive, GraduationCap
} from 'lucide-react'
import { TherapistOnboarding } from '../../components/therapist/TherapistOnboarding'
import TherapistSidebar from '../../components/ui/TherapistSidebar'

// Minimal ErrorBoundary to prevent white screen on render errors
class DashboardErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean; error?: Error }> {
  constructor(props: any) { super(props); this.state = { hasError: false } }
  static getDerivedStateFromError(error: Error) { return { hasError: true, error } }
  componentDidCatch(error: Error, info: any) { console.error('Dashboard render error:', error, info) }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
          <div className="max-w-xl text-center">
            <h2 className="text-lg font-semibold text-red-700">Something went wrong</h2>
            <p className="text-sm text-gray-600 mt-2">An error occurred while loading your dashboard. Please refresh the page or contact support if the problem persists.</p>
            <pre className="mt-4 text-xs text-red-600 whitespace-pre-wrap">{String(this.state.error?.message)}</pre>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

// Lazy chunks (robust default selection to avoid undefined default)
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
  import('../../components/therapist/Clienteles').then(m => ({ default: m.Clienteles ?? (m as any).default ?? m }))
)
const ClinicRentalPanel = React.lazy(() =>
  import('../../components/therapist/ClinicRentalPanel').then(m => ({ default: m.ClinicRentalPanel ?? (m as any).default ?? m }))
)
const LicensingCompliance = React.lazy(() =>
  import('../../components/therapist/LicensingCompliance').then(m => ({ default: m.LicensingCompliance ?? (m as any).default ?? m }))
)
const SupervisionPanel = React.lazy(() =>
  import('../../components/therapist/SupervisionPanel').then(m => ({ default: m.SupervisionPanel ?? (m as any).default ?? m }))
)
const VIPOpportunities = React.lazy(() =>
  import('../../components/therapist/VIPOpportunities').then(m => ({ default: m.VIPOpportunities ?? (m as any).default ?? m }))
)
const MembershipPanel = React.lazy(() =>
  import('../../components/therapist/MembershipPanel').then(m => ({ default: m.MembershipPanel ?? (m as any).default ?? m }))
)
const MembershipManagement = React.lazy(() =>
  import('../../components/admin/MembershipManagement').then(m => ({ default: m.MembershipManagement ?? (m as any).default ?? m }))
)
const SupervisorDashboard = React.lazy(() =>
  import('../../components/supervisor/SupervisorDashboard').then(m => ({ default: m.SupervisorDashboard ?? (m as any).default ?? m }))
)
const ProgressMetrics = React.lazy(() =>
  import('../../components/therapist/ProgressMetrics').then(m => ({ default: m.ProgressMetrics ?? (m as any).default ?? m }))
)
const SimpleTherapistProfile = React.lazy(() =>
  import('../../components/therapist/SimpleTherapistProfile').then(m => ({ default: m.SimpleTherapistProfile ?? (m as any).default ?? m }))
)
const ContinuingEducation = React.lazy(() =>
  import('../../components/therapist/ContinuingEducation').then(m => ({ default: (m as any).ContinuingEducation ?? (m as any).default ?? m }))
)
const SupportTickets = React.lazy(() =>
  import('../../pages/SupportTickets').then(m => ({ default: (m as any).default ?? m }))
)
const CaseArchives = React.lazy(() =>
  import('./CaseArchives').then(m => ({ default: (m as any).default ?? m }))
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
interface CaseInsight { client_name: string; insight: string; recommendation: string; priority: InsightPriority }
interface ActivityItem { id: string; type: 'client' | 'supervision' | 'admin'; title: string; description: string; time: string; icon: string }
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
  | 'overview' | 'clienteles'
  | 'cases' | 'archives' | 'resources'
  | 'sessions' | 'metrics' | 'continuing-education' | 'supervision'
  | 'licensing' | 'clinic' | 'vip'
  | 'membership' | 'admin'
  | 'membership-admin' | 'user-management' | 'system-settings'

type NavGroupKey = 'clientCare' | 'practiceMgmt' | 'profSetting' | 'account' | 'adminTools'
type NavGroup = {
  key: NavGroupKey
  title: string
  expandable: boolean
  items: { id: SectionId, name: string, icon: any }[]
}

const VALID_SECTIONS: SectionId[] = [
  'overview','clienteles','cases','archives','resources','sessions','metrics','continuing-education',
  'supervision','licensing','clinic','vip','membership','admin','membership-admin','user-management','system-settings'
]

export default function TherapistDashboard() {
  const navigate = useNavigate()
  const { profile, signOut } = useAuth()

  useEffect(() => {
    if (!profile) return
    if (profile.role === 'supervisor' || profile.role === 'admin' || profile.role === 'therapist') return
    navigate('/client', { replace: true })
  }, [profile, navigate])


  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(() => {
    const raw = localStorage.getItem('tdb_sidebar_collapsed')
    return raw ? raw === '1' : false
  })
  useEffect(() => {
    localStorage.setItem('tdb_sidebar_collapsed', sidebarCollapsed ? '1' : '0')
  }, [sidebarCollapsed])

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

  const initialActive = (() => {
    const stored = (localStorage.getItem('tdb_active') as SectionId) || 'overview'
    return VALID_SECTIONS.includes(stored) ? stored : 'overview'
  })()
  const [active, setActive] = useState<SectionId>(initialActive)

  // SOLO nav (no title block)
  const navSolo = [
    { id: 'clienteles' as const, name: 'Clienteles', icon: Users },
  ] as const

  const baseGroups: NavGroup[] = [
    {
      key: 'clientCare',
      title: 'Client Care',
      expandable: true,
      items: [
        { id: 'archives', name: 'Case Archives', icon: Archive },
        { id: 'cases', name: 'Case Management', icon: FileText },
        { id: 'resources', name: 'Resource Library', icon: Library },
      ]
    },
    {
      key: 'practiceMgmt',
      title: 'Practice Management',
      expandable: true,
      items: [
        { id: 'sessions', name: 'Session Management', icon: Calendar },
        { id: 'metrics', name: 'Progress Metrics', icon: BarChart3 },
        { id: 'continuing-education', name: 'Continuing Education', icon: GraduationCap },
        { id: 'supervision', name: 'Supervision', icon: Headphones },
      ]
    },
    {
      key: 'profSetting',
      title: 'Professional Setting',
      expandable: false,
      items: [
        { id: 'licensing', name: 'Compliance', icon: ShieldCheck },
        { id: 'clinic', name: 'Clinic Rentals', icon: Building2 },
        { id: 'vip', name: 'VIP Opportunities', icon: Star },
      ]
    },
    {
      key: 'account',
      title: 'Account',
      expandable: false,
      items: [
        { id: 'membership', name: 'Membership', icon: CalendarDays },
        { id: 'admin', name: 'Support/Tickets', icon: Shield },
      ]
    },
  ]

  const isAdmin = profile?.role === 'admin'
  const adminGroup: NavGroup[] = isAdmin ? [{
    key: 'adminTools',
    title: 'Administration',
    expandable: false,
    items: [
      { id: 'membership-admin', name: 'Membership Admin', icon: Crown },
      { id: 'user-management', name: 'User Management', icon: Users },
      { id: 'system-settings', name: 'System Settings', icon: Settings },
    ]
  }] : []

  const navGroups = [...baseGroups, ...adminGroup]

  const [openGroups, setOpenGroups] = useState<Record<NavGroupKey, boolean>>(() => {
    try {
      const raw = localStorage.getItem('tdb_nav_open')
      return raw ? JSON.parse(raw) : { clientCare: true, practiceMgmt: true, profSetting: true, account: true, adminTools: true }
    } catch { return { clientCare: true, practiceMgmt: true, profSetting: true, account: true, adminTools: true } }
  })
  useEffect(() => { localStorage.setItem('tdb_nav_open', JSON.stringify(openGroups)) }, [openGroups])
  const toggleGroup = (key: NavGroupKey) => setOpenGroups(s => ({ ...s, [key]: !s[key] }))

  const fetchDashboardData = useCallback(async () => {
    if (!profile?.id) return
    try {
      setDashboardError(null)
      setLoading(true)

      const { data: clientRelations, error: relationsError } = await supabase
        .from('therapist_client_relations')
        .select('client_id')
        .eq('therapist_id', profile.id)

      if (relationsError) {
        console.warn('[TherapistDashboard] client relations error:', relationsError)
      }

      const { data: activeCases, error: casesError } = await supabase
        .from('cases')
        .select('id')
        .eq('therapist_id', profile.id)
        .eq('status', 'active')

      if (casesError) {
        console.warn('[TherapistDashboard] cases error:', casesError)
      }

      const now = new Date()
      const yyyy = now.getFullYear()
      const mm = String(now.getMonth() + 1).padStart(2, '0')
      const dd = String(now.getDate()).padStart(2, '0')
      const dayStart = `${yyyy}-${mm}-${dd}T00:00:00`
      const dayEnd   = `${yyyy}-${mm}-${dd}T23:59:59`

      const { data: appts, error: apptsError } = await supabase
        .from('appointments')
        .select('id, start_time, end_time, status, notes, client_id, title, case_id')
        .eq('therapist_id', profile.id)
        .gte('start_time', dayStart)
        .lte('start_time', dayEnd)
        .order('start_time', { ascending: true })

      if (apptsError) {
        console.warn('[TherapistDashboard] appointments error:', apptsError)
      }

      const { data: inst, error: instError } = await supabase
        .from('assessment_instances')
        .select('id, template_id, client_id, title, status, assigned_at, completed_at')
        .eq('therapist_id', profile.id)
        .order('assigned_at', { ascending: false })
        .limit(12)

      if (instError) {
        console.warn('[TherapistDashboard] assessment instances error:', instError)
      }

      const inProgressCount = (inst || []).filter(i => i.status === 'in_progress').length

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

      let insights: CaseInsight[] = []
      if (inst && inst.length) {
        const recentIds = inst.map(i => i.id)
        const { data: scores, error: scoresError } = await supabase
          .from('assessment_scores')
          .select('instance_id, severity_level, interpretation_description')
          .in('instance_id', recentIds)
          .order('calculated_at', { ascending: false })
          .limit(50)

        if (scoresError) {
          console.warn('[TherapistDashboard] assessment scores error:', scoresError)
        }

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
        assessmentsInProgress: inProgressCount
      })
      setOnboardingSteps(steps)
      setProfileLive(isProfileLive)
      setTodaySessions(sessions)
      setRecentAssessments(recent3)

      const activities: ActivityItem[] = []
      if (sessions.length) {
        activities.push({ id: 'act-appt', type: 'client', title: `Today's schedule ready`, description: `${sessions.length} appointment(s)`, time: 'today', icon: 'Calendar' })
      }
      if ((inst || []).length) {
        activities.push({ id: 'act-assess', type: 'client', title: 'Assessments updated', description: `${inst?.length} recent assignment(s)`, time: 'recent', icon: 'Activity' })
      }
      setRecentActivities(activities)
      setCaseInsights(insights || [])
    } catch (e) {
      console.error('dashboard fetch error:', e)
      setDashboardError(`Could not load dashboard data: ${e instanceof Error ? e.message : 'Unknown error'}`)
    } finally {
      setLoading(false)
    }
  }, [profile])

  // Safe effect: fetch dashboard data once profile is available
  useEffect(() => {
    if (!profile?.id) return
    let mounted = true
    const timer = setTimeout(() => {
      fetchDashboardData().catch(err => {
        console.error('fetchDashboardData error (init):', err)
        if (mounted) setDashboardError(err instanceof Error ? err.message : String(err))
      })
    }, 100)
    // Auto-open onboarding if user just signed up
    try {
      const openOnboarding = localStorage.getItem('tdb_open_onboarding')
      if (openOnboarding === '1') {
        setShowOnboardingModal(true)
        localStorage.removeItem('tdb_open_onboarding')
      }
    } catch {}
    return () => { mounted = false; clearTimeout(timer) }
  }, [profile?.id, fetchDashboardData])

  // Remove the immediate fetchDashboardData call - we'll handle it with the delay above

  const handleSignOut = async () => {
    setIsSigningOut(true)
    setSignOutError(null)
    try { await signOut() }
    catch (error) { console.error('Error signing out:', error); setSignOutError('Failed to sign out. Please try again.') }
    finally { setIsSigningOut(false) }
  }

  const goto = (id: SectionId) => {
    // Render support/tickets inside the dashboard shell instead of navigating away
    if (id === 'admin') {
      setActive('admin')
      setMobileMenuOpen(false)
      localStorage.setItem('tdb_active', 'admin')
      return
    }
    const safe = VALID_SECTIONS.includes(id) ? id : 'overview'
    setActive(safe)
    setMobileMenuOpen(false)
    localStorage.setItem('tdb_active', safe)
  }

  if (profile && profile.role !== 'therapist' && profile.role !== 'admin' && profile.role !== 'supervisor') return <Navigate to="/client" replace />

  if (profile?.role === 'supervisor') {
    return (
      <div className="min-h-screen bg-gray-50 overflow-x-hidden">
        <React.Suspense fallback={<div className="p-6"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto" /></div>}>
          <SupervisorDashboard />
        </React.Suspense>
      </div>
    )
  }

  // Add comprehensive Overview component
  const Overview = () => (
    <div className="h-full overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Welcome Header */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white rounded-2xl p-6 sm:p-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold mb-2">
              Welcome back, {profile?.first_name || 'Doctor'}!
            </h1>
            <p className="text-blue-100 text-sm sm:text-base">
              {new Date().toLocaleDateString('en-US', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </p>
          </div>
          <div className="flex items-center space-x-3">
            {profileLive && (
            <div className="hidden sm:flex items-center space-x-2 bg-green-500 bg-opacity-20 text-green-100 px-4 py-2 rounded-full">
              <div className="w-2 h-2 bg-green-300 rounded-full animate-pulse" />
              <span className="text-sm font-medium">Profile Live</span>
            </div>
            )}

            {/* Open Workspace CTA */}
            <button
              onClick={() => navigate('/therapist/workspace')}
              className="inline-flex items-center space-x-2 px-3 py-2 bg-white bg-opacity-90 text-sm font-medium rounded-lg shadow hover:shadow-md border border-gray-200"
              title="Open Workspace"
            >
              <Play className="w-4 h-4 text-blue-600" />
              <span className="text-blue-600">Open Workspace</span>
            </button>
          </div>
        </div>
      </div>

      {/* Error Display */}
      {dashboardError && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <div className="flex items-start space-x-3">
            <AlertTriangle className="w-5 h-5 text-red-500 mt-0.5" />
            <div>
              <h4 className="font-medium text-red-900">Dashboard Error</h4>
              <p className="text-sm text-red-800 mt-1">{dashboardError}</p>
              <button
                onClick={fetchDashboardData}
                className="mt-2 text-sm text-red-700 hover:text-red-900 underline"
              >
                Try again
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quick Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <div className="bg-white p-4 sm:p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Clients</p>
              <p className="text-2xl sm:text-3xl font-bold text-blue-600">{stats.totalClients}</p>
            </div>
            <Users className="w-8 h-8 text-blue-600" />
          </div>
        </div>

        <div className="bg-white p-4 sm:p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Active Cases</p>
              <p className="text-2xl sm:text-3xl font-bold text-green-600">{stats.activeCases}</p>
            </div>
            <FileText className="w-8 h-8 text-green-600" />
          </div>
        </div>

        <div className="bg-white p-4 sm:p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Today's Sessions</p>
              <p className="text-2xl sm:text-3xl font-bold text-purple-600">{stats.patientsToday}</p>
            </div>
            <Calendar className="w-8 h-8 text-purple-600" />
          </div>
        </div>

        <div className="bg-white p-4 sm:p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Profile Complete</p>
              <p className="text-2xl sm:text-3xl font-bold text-amber-600">{stats.profileCompletion}%</p>
            </div>
            <User className="w-8 h-8 text-amber-600" />
          </div>
        </div>
      </div>

      {/* Profile Completion */}
      {stats.profileCompletion < 100 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-6">
          <div className="flex items-start space-x-4">
            <div className="flex-shrink-0">
              <AlertTriangle className="w-6 h-6 text-amber-600" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-medium text-amber-900">Complete Your Profile</h3>
              <p className="text-amber-800 mt-1">
                Your profile is {stats.profileCompletion}% complete. Complete all steps to go live and start receiving clients.
              </p>
              <div className="mt-4">
                <div className="flex justify-between text-sm text-amber-700 mb-2">
                  <span>Progress</span>
                  <span>{stats.profileCompletion}%</span>
                </div>
                <div className="w-full bg-amber-200 rounded-full h-2">
                  <div 
                    className="bg-amber-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${stats.profileCompletion}%` }}
                  />
                </div>
              </div>
              <div className="mt-4 space-y-2">
                {onboardingSteps.map((step) => (
                  <div key={step.id} className="flex items-center space-x-2">
                    {step.completed ? (
                      <CheckCircle className="w-4 h-4 text-green-600" />
                    ) : (
                      <div className="w-4 h-4 border-2 border-amber-400 rounded-full" />
                    )}
                    <span className={`text-sm ${step.completed ? 'text-green-800' : 'text-amber-800'}`}>
                      {step.title}
                    </span>
                  </div>
                ))}
              </div>
              <button
                onClick={() => setShowOnboardingModal(true)}
                className="mt-4 inline-flex items-center px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors"
              >
                <Plus className="w-4 h-4 mr-2" />
                Complete Profile
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Today's Schedule */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">Today's Schedule</h3>
            <button
              onClick={() => goto('sessions')}
              className="text-sm text-blue-600 hover:text-blue-800 font-medium"
            >
              View all sessions
            </button>
          </div>
        </div>
        <div className="p-6">
          {todaySessions.length === 0 ? (
            <div className="text-center py-8">
              <Calendar className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No sessions today</h3>
              <p className="mt-1 text-sm text-gray-500">Your schedule is clear for today.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {todaySessions.map((session) => (
                <div key={session.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-start sm:items-center space-x-4">
                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <User className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900">{session.client_name}</h4>
                      <p className="text-sm text-gray-600">{session.time} • {session.type}</p>
                      {session.notes && (
                        <p className="text-xs text-gray-500 mt-1 line-clamp-2">{session.notes}</p>
                      )}
                    </div>
                  </div>
                  <div className="mt-3 sm:mt-0 flex items-center gap-2">
                    {session.case_id && (
                      <button
                        onClick={() => navigate(`/therapist/workspace/${session.case_id}`)}
                        className="inline-flex items-center px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                      >
                        <Play className="w-4 h-4 mr-1" />
                        <span className="hidden sm:inline">Start</span>
                        <span className="sm:hidden">Go</span>
                      </button>
                    )}
                    {session.notes && (
                      <button onClick={() => alert(session.notes)} className="inline-flex items-center px-3 py-2 text-sm bg-white border rounded-lg hover:bg-gray-50">
                        Notes
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent Assessments */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">Recent Assessments</h3>
            <button
              onClick={() => navigate('/therapist/assessments')}
              className="text-sm text-blue-600 hover:text-blue-800 font-medium"
            >
              View all assessments
            </button>
          </div>
        </div>
        <div className="p-6">
          {recentAssessments.length === 0 ? (
            <div className="text-center py-8">
              <Brain className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No recent assessments</h3>
              <p className="mt-1 text-sm text-gray-500">Assign assessments to start tracking client progress.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {recentAssessments.map((assessment) => (
                <div key={assessment.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <h4 className="font-medium text-gray-900">{assessment.title}</h4>
                    <p className="text-sm text-gray-600">
                      {assessment.clientName} • {assessment.abbrev}
                    </p>
                    <p className="text-xs text-gray-500">
                      {assessment.status === 'completed' 
                        ? `Completed ${assessment.completed_at ? new Date(assessment.completed_at).toLocaleDateString() : ''}`
                        : `Assigned ${assessment.assigned_at ? new Date(assessment.assigned_at).toLocaleDateString() : ''}`
                      }
                    </p>
                  </div>
                  <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                    assessment.status === 'completed' ? 'bg-green-100 text-green-800' :
                    assessment.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {assessment.status.replace('_', ' ')}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Case Insights */}
      {caseInsights.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Clinical Insights</h3>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {caseInsights.map((insight, index) => (
                <div key={index} className={`p-4 rounded-lg border-l-4 ${
                  insight.priority === 'high' ? 'bg-red-50 border-red-400' :
                  insight.priority === 'medium' ? 'bg-amber-50 border-amber-400' :
                  'bg-blue-50 border-blue-400'
                }`}>
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-medium text-gray-900">{insight.client_name}</h4>
                      <p className="text-sm text-gray-700 mt-1">{insight.insight}</p>
                      <p className="text-xs text-gray-600 mt-2">{insight.recommendation}</p>
                    </div>
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                      insight.priority === 'high' ? 'bg-red-100 text-red-800' :
                      insight.priority === 'medium' ? 'bg-amber-100 text-amber-800' :
                      'bg-blue-100 text-blue-800'
                    }`}>
                      {insight.priority} priority
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Quick Actions</h3>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <button
              onClick={() => goto('clienteles')}
              className="flex items-center space-x-3 p-4 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
            >
              <Users className="w-6 h-6 text-blue-600" />
              <div className="text-left">
                <div className="font-medium text-gray-900">Manage Clients</div>
                <div className="text-sm text-gray-600">View and add clients</div>
              </div>
            </button>

            <button
              onClick={() => goto('cases')}
              className="flex items-center space-x-3 p-4 bg-green-50 rounded-lg hover:bg-green-100 transition-colors"
            >
              <FileText className="w-6 h-6 text-green-600" />
              <div className="text-left">
                <div className="font-medium text-gray-900">Case Management</div>
                <div className="text-sm text-gray-600">Review active cases</div>
              </div>
            </button>

            <button
              onClick={() => navigate('/therapist/assessments')}
              className="flex items-center space-x-3 p-4 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors"
            >
              <Brain className="w-6 h-6 text-purple-600" />
              <div className="text-left">
                <div className="font-medium text-gray-900">Assessments</div>
                <div className="text-sm text-gray-600">Assign and review</div>
              </div>
            </button>

            <button
              onClick={() => goto('sessions')}
              className="flex items-center space-x-3 p-4 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors"
            >
              <Calendar className="w-6 h-6 text-indigo-600" />
              <div className="text-left">
                <div className="font-medium text-gray-900">Schedule Sessions</div>
                <div className="text-sm text-gray-600">Manage appointments</div>
              </div>
            </button>

            <button
              onClick={() => goto('metrics')}
              className="flex items-center space-x-3 p-4 bg-teal-50 rounded-lg hover:bg-teal-100 transition-colors"
            >
              <BarChart3 className="w-6 h-6 text-teal-600" />
              <div className="text-left">
                <div className="font-medium text-gray-900">Progress Metrics</div>
                <div className="text-sm text-gray-600">Track outcomes</div>
              </div>
            </button>

            <button
              onClick={() => goto('resources')}
              className="flex items-center space-x-3 p-4 bg-rose-50 rounded-lg hover:bg-rose-100 transition-colors"
            >
              <Library className="w-6 h-6 text-rose-600" />
              <div className="text-left">
                <div className="font-medium text-gray-900">Resource Library</div>
                <div className="text-sm text-gray-600">Access materials</div>
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      {recentActivities.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Recent Activity</h3>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {recentActivities.map((activity) => (
                <div key={activity.id} className="flex items-center space-x-4">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    activity.type === 'client' ? 'bg-blue-100' :
                    activity.type === 'supervision' ? 'bg-purple-100' :
                    'bg-gray-100'
                  }`}>
                    <Activity className={`w-5 h-5 ${
                      activity.type === 'client' ? 'text-blue-600' :
                      activity.type === 'supervision' ? 'text-purple-600' :
                      'text-gray-600'
                    }`} />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900">{activity.title}</h4>
                    <p className="text-sm text-gray-600">{activity.description}</p>
                    <p className="text-xs text-gray-500">{activity.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading your dashboard...</p>
          <p className="text-sm text-gray-500 mt-2">Preparing your workspace</p>
        </div>
      </div>
    )
  }

  return (
    <DashboardErrorBoundary>
    <div className="min-h-screen bg-gray-50 overflow-x-hidden">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-40 bg-white shadow-sm border-b border-gray-200">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-3">
                <img src="/thera-py-icon.png" alt="Thera-PY Logo" className="w-8 h-8"
                  onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none' }} />
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

              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
                aria-label="Toggle menu"
              >
                {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>

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
        {/* Sidebar (extracted to shared component) */}
        <TherapistSidebar
          sidebarCollapsed={sidebarCollapsed}
          setSidebarCollapsed={setSidebarCollapsed}
          active={active}
          goto={goto}
          openGroups={openGroups}
          toggleGroup={toggleGroup}
          navGroups={navGroups}
          isAdmin={isAdmin}
        />

        {/* Mobile Nav */}
        {mobileMenuOpen && (
          <div className="md:hidden fixed inset-0 z-50 pt-16">
            <div className="fixed inset-0 bg-gray-600 bg-opacity-75" onClick={() => setMobileMenuOpen(false)} />
            <div className="fixed inset-y-0 left-0 w-64 bg-white shadow-xl pt-16">
              <div className="h-full overflow-y-auto p-4">
                <nav className="space-y-6">
                  <div className="space-y-1">
                    {[{ id: 'clienteles' as const, name: 'Clienteles', icon: Users }].map(item => {
                      const Icon = item.icon as any
                      const isActive = active === item.id
                      return (
                        <button
                          key={item.id}
                          onClick={() => { goto(item.id); setMobileMenuOpen(false) }}
                          className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg transition-all text-sm font-medium ${
                            isActive ? 'text-blue-700 bg-blue-50' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                          }`}
                          aria-current={isActive ? 'page' : undefined}
                        >
                          <Icon className={`w-5 h-5 flex-shrink-0 ${isActive ? 'text-blue-600' : 'text-gray-400'}`} />
                          <span>{item.name}</span>
                        </button>
                      )
                    })}
                  </div>

                  {/* Ensure Overview is present on mobile for discovery */}
                  <div className="space-y-1">
                    <button
                      key="overview-mobile"
                      onClick={() => { goto('overview'); setMobileMenuOpen(false) }}
                      className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg transition-all text-sm font-medium ${
                        active === 'overview' ? 'text-blue-700 bg-blue-50' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                      }`}
                    >
                      <Eye className="w-5 h-5 flex-shrink-0 text-gray-400" />
                      <span>Overview</span>
                    </button>
                  </div>

                  {navGroups.map(group => (
                    <div key={group.key} key-value={group.key}>
                      <div className="flex items-center justify-between">
                        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">{group.title}</h3>
                        {group.expandable && (
                          <button
                            onClick={() => toggleGroup(group.key)}
                            className="px-2 py-1 rounded hover:bg-gray-100"
                          >
                            <ChevronRight className={`w-4 h-4 text-gray-400 transition-transform ${openGroups[group.key] ? 'rotate-90' : ''}`} />
                          </button>
                        )}
                      </div>
                      <div className={`${group.expandable && !openGroups[group.key] ? 'hidden' : ''} space-y-1`}>
                        {group.items.map(tab => {
                          const Icon = tab.icon as any
                          const isActive = active === tab.id
                          return (
                            <button
                              key={tab.id}
                              onClick={() => { goto(tab.id); setMobileMenuOpen(false) }}
                              className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg transition-all text-sm font-medium ${
                                isActive ? 'text-blue-700 bg-blue-50' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                              }`}
                              aria-current={isActive ? 'page' : undefined}
                            >
                              <Icon className={`w-5 h-5 flex-shrink-0 ${isActive ? 'text-blue-600' : 'text-gray-400'}`} />
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
          <main className="min-h-[calc(100vh-4rem)] overflow-y-auto overflow-x-hidden">
            <Suspense fallback={<div className="p-6"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto" /></div>}>
              {active === 'overview'            && <Overview />}
              {active === 'clienteles'          && <Clienteles />}
              {active === 'cases'               && <CaseManagement />}
              {active === 'archives'            && <CaseArchives />}
              {active === 'sessions'            && <SessionManagement />}
              {active === 'metrics'             && <ProgressMetrics />}
              {active === 'resources'           && <ResourceLibrary />}
              {active === 'continuing-education'&& <ContinuingEducation />}
              {active === 'licensing'           && <LicensingCompliance />}
              {active === 'clinic'              && <ClinicRentalPanel />}
              {active === 'supervision'         && <SupervisionPanel />}
              {active === 'vip'                 && <VIPOpportunities />}

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

              {isAdmin && active === 'membership-admin' && <MembershipManagement />}
              {isAdmin && active === 'user-management' && (
                <div className="p-6">
                  <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-8 text-center">
                    <Users className="mx-auto h-10 w-10 text-gray-300 mb-2" />
                    <h3 className="text-gray-900 font-medium">User Management</h3>
                    <p className="text-sm text-gray-600 mt-1">Advanced user management features coming soon.</p>
                  </div>
                </div>
              )}
              {isAdmin && active === 'system-settings' && (
                <div className="p-6">
                  <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-8 text-center">
                    <Settings className="mx-auto h-10 w-10 text-gray-300 mb-2" />
                    <h3 className="text-gray-900 font-medium">System Settings</h3>
                    <p className="text-sm text-gray-600 mt-1">System configuration options coming soon.</p>
                  </div>
                </div>
              )}
            </Suspense>
          </main>
        </div>
      </div>

      {/* Modals */}
      {showOnboardingModal && (
        <TherapistOnboarding onComplete={() => { setShowOnboardingModal(false); fetchDashboardData() }} onClose={() => setShowOnboardingModal(false)} />
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
    </DashboardErrorBoundary>
  )
}
