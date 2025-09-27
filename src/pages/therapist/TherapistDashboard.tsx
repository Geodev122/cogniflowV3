import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
impimport { Users, FileText, Calendar, Library, CircleCheck as CheckCircle, TriangleAlert as AlertTriangle, Menu, X, Target, ChevronLeft, User, CalendarDays, Brain, Shield, Headphones, Plus, Eye, LogOut, ChartBar as BarChart3, Building2, ShieldCheck, Star, Activity, ChevronRight, Play, Crown, Settings, Archive, GraduationCap } from 'lucide-react'om '../../components/therapist/SessionManagement'
import { CommunicationTools } from '../../components/therapist/CommunicationTools'
import { ProgressMetrics } from '../../components/therapist/ProgressMetrics'
import { TreatmentPlanning } from '../../components/therapist/TreatmentPlanning'
import { WorksheetManagement } from '../../components/therapist/WorksheetManagement'
import { DocumentationCompliance } from '../../components/therapist/DocumentationCompliance'
import { PracticeManagement } from '../../components/therapist/PracticeManagement'
import { TherapistProfile } from '../../components/therapist/TherapistProfile'
import { TherapistOnboarding } from '../../components/therapist/TherapistOnboarding'
import { SimpleTherapistProfile } from '../../components/therapist/SimpleTherapistProfile'
import { SupervisionPanel } from '../../components/therapist/SupervisionPanel'
import { VIPOpportunities } from '../../components/therapist/VIPOpportunities'
import { ContinuingEducation } from '../../components/therapist/ContinuingEducation'
import { LicensingCompliance } from '../../components/therapist/LicensingCompliance'
import { ClinicRentalPanel } from '../../components/therapist/ClinicRentalPanel'
import { MembershipPanel } from '../../components/therapist/MembershipPanel'
import TherapistSidebar from '../../components/ui/TherapistSidebar'

// Icons
import {
  BarChart3, Users, Calendar, MessageSquare, ClipboardList, Target,
  FileText, Settings, User, Brain, Activity, BookOpen, Award,
  Building2, Star, GraduationCap, Shield, CreditCard, Headphones,
  ChevronDown, Bell, Search, Plus, RefreshCw, AlertTriangle,
  CheckCircle, TrendingUp, Clock, DollarSign, Home
} from 'lucide-react'

// Types
type NavGroupKey = 'clinical' | 'practice' | 'professional' | 'admin'

type NavTab = {
  id: string
  name: string
  icon: React.ComponentType<any>
  component: React.ComponentType<any>
  description?: string
}

type NavGroup = {
  key: NavGroupKey
  title: string
  expandable: boolean
  items: NavTab[]
}

type DashboardStats = {
  totalClients: number
  activeClients: number
  upcomingAppointments: number
  pendingAssessments: number
  completedAssessments: number
  monthlyRevenue: number
  sessionCompletionRate: number
  clientSatisfaction: number
  newClients: number
  totalSessions: number
}

const TherapistDashboard: React.FC = () => {
  const navigate = useNavigate()
  const { profile, loading: authLoading, error: authError } = useAuth()
  
  // UI State
  const [activeTab, setActiveTab] = useState('overview')
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [openGroups, setOpenGroups] = useState<Record<NavGroupKey, boolean>>({
    clinical: true,
    practice: false,
    professional: false,
    admin: false
  })

  // Data State
  const [stats, setStats] = useState<DashboardStats>({
    totalClients: 0,
    activeClients: 0,
    upcomingAppointments: 0,
    pendingAssessments: 0,
    completedAssessments: 0,
    monthlyRevenue: 0,
    sessionCompletionRate: 0,
    clientSatisfaction: 0,
    newClients: 0,
    totalSessions: 0
  })

  // Loading and Error States
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [showProfileEdit, setShowProfileEdit] = useState(false)

  // Refs
  const loadingRef = useRef(false)

  // Check if user needs onboarding
  const needsOnboarding = useMemo(() => {
    if (!profile) return false
    const details = profile.professional_details as any
    return !details || !details.specializations || !details.bio || profile.verification_status !== 'verified'
  }, [profile])

  // Navigation configuration
  const navGroups: NavGroup[] = useMemo(() => [
    {
      key: 'clinical',
      title: 'Clinical Work',
      expandable: true,
      items: [
        { id: 'clienteles', name: 'Clienteles', icon: Users, component: Clienteles, description: 'Manage your client roster' },
        { id: 'case-files', name: 'Case Files', icon: FileText, component: CaseFiles, description: 'Comprehensive case management' },
        { id: 'assessments', name: 'Assessments', icon: ClipboardList, component: AssessmentTools, description: 'Psychometric tools & screening' },
        { id: 'sessions', name: 'Sessions', icon: Calendar, component: SessionManagement, description: 'Schedule & manage sessions' },
        { id: 'communication', name: 'Communication', icon: MessageSquare, component: CommunicationTools, description: 'Client communication hub' },
        { id: 'progress', name: 'Progress', icon: TrendingUp, component: ProgressMetrics, description: 'Track client outcomes' },
        { id: 'treatment', name: 'Treatment Planning', icon: Target, component: TreatmentPlanning, description: 'Plan & track interventions' },
        { id: 'worksheets', name: 'Worksheets', icon: Brain, component: WorksheetManagement, description: 'CBT worksheets & exercises' }
      ]
    },
    {
      key: 'practice',
      title: 'Practice Management',
      expandable: true,
      items: [
        { id: 'practice-overview', name: 'Practice Overview', icon: BarChart3, component: PracticeManagement, description: 'Practice analytics & insights' },
        { id: 'documentation', name: 'Documentation', icon: FileText, component: DocumentationCompliance, description: 'Clinical documentation' },
        { id: 'clinic-rental', name: 'Clinic Rental', icon: Building2, component: ClinicRentalPanel, description: 'Book clinic spaces' },
        { id: 'membership', name: 'Membership', icon: CreditCard, component: MembershipPanel, description: 'Subscription & billing' }
      ]
    },
    {
      key: 'professional',
      title: 'Professional Development',
      expandable: true,
      items: [
        { id: 'continuing-education', name: 'Continuing Education', icon: GraduationCap, component: ContinuingEducation, description: 'CE courses & credits' },
        { id: 'licensing', name: 'Licensing & Compliance', icon: Shield, component: LicensingCompliance, description: 'License management' },
        { id: 'supervision', name: 'Supervision', icon: Headphones, component: SupervisionPanel, description: 'Clinical supervision' },
        { id: 'vip-opportunities', name: 'VIP Opportunities', icon: Star, component: VIPOpportunities, description: 'Exclusive opportunities' },
        { id: 'resource-library', name: 'Resource Library', icon: BookOpen, component: () => <div className="p-6">Resource Library coming soon</div>, description: 'Clinical resources' }
      ]
    }
  ], [])

  const isAdmin = profile?.role === 'admin' || profile?.role === 'supervisor'

  // Data fetching
  const fetchDashboardStats = useCallback(async () => {
    if (!profile?.id || loadingRef.current) return
    
    loadingRef.current = true
    setLoading(true)
    setError(null)

    try {
      // Add small delay to ensure profile is fully loaded
      await new Promise(resolve => setTimeout(resolve, 100))

      const [
        clientsResult,
        appointmentsResult,
        assessmentsResult,
        analyticsResult
      ] = await Promise.allSettled([
        // Clients count
        supabase
          .from('therapist_client_relations')
          .select('client_id', { count: 'exact' })
          .eq('therapist_id', profile.id),

        // Appointments
        supabase
          .from('appointments')
          .select('id, status, appointment_date', { count: 'exact' })
          .eq('therapist_id', profile.id)
          .gte('appointment_date', new Date().toISOString()),

        // Assessments
        supabase
          .from('assessment_instances')
          .select('id, status', { count: 'exact' })
          .eq('therapist_id', profile.id),

        // Practice analytics
        supabase
          .from('practice_analytics')
          .select('metric_name, metric_value')
          .eq('therapist_id', profile.id)
          .eq('metric_date', new Date().toISOString().split('T')[0])
      ])

      // Process results with fallbacks
      const totalClients = clientsResult.status === 'fulfilled' ? (clientsResult.value.count || 0) : 0
      
      const upcomingAppointments = appointmentsResult.status === 'fulfilled' 
        ? (appointmentsResult.value.data?.filter(a => a.status === 'scheduled').length || 0)
        : 0

      const assessmentData = assessmentsResult.status === 'fulfilled' ? assessmentsResult.value.data || [] : []
      const pendingAssessments = assessmentData.filter(a => a.status === 'assigned').length
      const completedAssessments = assessmentData.filter(a => a.status === 'completed').length

      // Analytics with fallbacks
      const analyticsData = analyticsResult.status === 'fulfilled' ? analyticsResult.value.data || [] : []
      const analyticsMap = new Map(analyticsData.map(a => [a.metric_name, a.metric_value]))

      setStats({
        totalClients,
        activeClients: totalClients, // Assume all are active for demo
        upcomingAppointments,
        pendingAssessments,
        completedAssessments,
        monthlyRevenue: analyticsMap.get('monthly_revenue') || 0,
        sessionCompletionRate: analyticsMap.get('session_completion_rate') || 0,
        clientSatisfaction: analyticsMap.get('client_satisfaction') || 0,
        newClients: analyticsMap.get('new_clients_month') || 0,
        totalSessions: analyticsMap.get('total_sessions') || 0
      })

    } catch (err: any) {
      console.error('[TherapistDashboard] fetchDashboardStats error:', err)
      if (isRecursionError(err)) {
        setError('Database configuration issue detected. Please contact support.')
      } else {
        setError('Failed to load dashboard data. Some features may be limited.')
      }
    } finally {
      setLoading(false)
      loadingRef.current = false
    }
  }, [profile?.id])

  // Effects
  useEffect(() => {
    if (profile?.id && profile.role === 'therapist') {
      fetchDashboardStats()
    } else if (!authLoading && profile && profile.role !== 'therapist') {
      setError('This dashboard is only available to therapists.')
      setLoading(false)
    }
  }, [profile, authLoading, fetchDashboardStats])

  // Handlers
  const toggleGroup = (key: NavGroupKey) => {
    setOpenGroups(prev => ({ ...prev, [key]: !prev[key] }))
  }

  const goto = (tabId: string) => {
    setActiveTab(tabId)
  }

  const handleOnboardingComplete = () => {
    setShowOnboarding(false)
    fetchDashboardStats()
  }

  // Get active component
  const ActiveComponent = useMemo(() => {
    if (activeTab === 'overview') return null
    
    for (const group of navGroups) {
      const tab = group.items.find(item => item.id === activeTab)
      if (tab) return tab.component
    }
    return null
  }, [activeTab, navGroups])

  // Loading states
  if (authLoading) {
    return (
      <div className="min-h-screen grid place-items-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading your dashboard...</p>
        </div>
      </div>
    )
  }

  if (authError) {
    return (
      <div className="min-h-screen grid place-items-center bg-gray-50">
        <div className="text-center max-w-md">
          <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Authentication Error</h2>
          <p className="text-gray-600 mb-4">{authError}</p>
          <button
            onClick={() => navigate('/login')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Return to Login
          </button>
        </div>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="min-h-screen grid place-items-center bg-gray-50">
        <div className="text-center">
          <p className="text-gray-600">No profile found. Please log in again.</p>
          <button
            onClick={() => navigate('/login')}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Login
          </button>
        </div>
      </div>
    )
  }

  if (profile.role !== 'therapist') {
    return (
      <div className="min-h-screen grid place-items-center bg-gray-50">
        <div className="text-center max-w-md">
          <AlertTriangle className="h-12 w-12 text-amber-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Access Restricted</h2>
          <p className="text-gray-600 mb-4">This dashboard is only available to therapists.</p>
          <button
            onClick={() => navigate('/')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Return Home
          </button>
        </div>
      </div>
    )
  }

  // Show onboarding if needed
  if (needsOnboarding && showOnboarding) {
    return <TherapistOnboarding onComplete={handleOnboardingComplete} />
  }

  // Show profile edit modal
  if (showProfileEdit) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
          <div className="p-6 border-b">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">Edit Profile</h2>
              <button
                onClick={() => setShowProfileEdit(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            </div>
          </div>
          <div className="p-6">
            <SimpleTherapistProfile onSave={() => setShowProfileEdit(false)} />
          </div>
        </div>
      </div>
    )
  }

  // Overview Component
  const Overview = () => (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold mb-2">
              Welcome back, Dr. {profile.last_name || profile.first_name}
            </h1>
            <p className="text-blue-100">
              {needsOnboarding 
                ? "Complete your profile setup to unlock all features"
                : "Here's what's happening in your practice today"
              }
            </p>
          </div>
          <div className="flex gap-3">
            {needsOnboarding && (
              <button
                onClick={() => setShowOnboarding(true)}
                className="px-4 py-2 bg-white text-blue-600 rounded-lg hover:bg-blue-50 font-medium"
              >
                Complete Setup
              </button>
            )}
            <button
              onClick={() => setShowProfileEdit(true)}
              className="px-4 py-2 bg-white/20 text-white rounded-lg hover:bg-white/30 font-medium"
            >
              Edit Profile
            </button>
          </div>
        </div>
      </div>

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl p-6 shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Clients</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalClients}</p>
            </div>
            <div className="h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <Users className="h-6 w-6 text-blue-600" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm">
            <span className="text-green-600 font-medium">+{stats.newClients}</span>
            <span className="text-gray-600 ml-1">new this month</span>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Upcoming Sessions</p>
              <p className="text-2xl font-bold text-gray-900">{stats.upcomingAppointments}</p>
            </div>
            <div className="h-12 w-12 bg-green-100 rounded-lg flex items-center justify-center">
              <Calendar className="h-6 w-6 text-green-600" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm">
            <Clock className="h-4 w-4 text-gray-400 mr-1" />
            <span className="text-gray-600">Next: Today 2:00 PM</span>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Pending Assessments</p>
              <p className="text-2xl font-bold text-gray-900">{stats.pendingAssessments}</p>
            </div>
            <div className="h-12 w-12 bg-amber-100 rounded-lg flex items-center justify-center">
              <ClipboardList className="h-6 w-6 text-amber-600" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm">
            <span className="text-gray-600">{stats.completedAssessments} completed</span>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Client Satisfaction</p>
              <p className="text-2xl font-bold text-gray-900">{stats.clientSatisfaction || 4.8}/5.0</p>
            </div>
            <div className="h-12 w-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <Star className="h-6 w-6 text-purple-600" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm">
            <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
            <span className="text-green-600">+0.2 from last month</span>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-xl p-6 shadow-sm border">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <button
            onClick={() => goto('sessions')}
            className="flex items-center p-4 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
          >
            <Plus className="h-5 w-5 text-blue-600 mr-3" />
            <span className="font-medium text-blue-900">Schedule Session</span>
          </button>
          <button
            onClick={() => goto('clienteles')}
            className="flex items-center p-4 bg-green-50 rounded-lg hover:bg-green-100 transition-colors"
          >
            <Users className="h-5 w-5 text-green-600 mr-3" />
            <span className="font-medium text-green-900">Add Client</span>
          </button>
          <button
            onClick={() => goto('assessments')}
            className="flex items-center p-4 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors"
          >
            <ClipboardList className="h-5 w-5 text-purple-600 mr-3" />
            <span className="font-medium text-purple-900">Create Assessment</span>
          </button>
          <button
            onClick={() => goto('communication')}
            className="flex items-center p-4 bg-amber-50 rounded-lg hover:bg-amber-100 transition-colors"
          >
            <MessageSquare className="h-5 w-5 text-amber-600 mr-3" />
            <span className="font-medium text-amber-900">Send Message</span>
          </button>
        </div>
      </div>

      {/* Recent Activity & Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl p-6 shadow-sm border">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
          <div className="space-y-4">
            <div className="flex items-start space-x-3">
              <div className="h-2 w-2 bg-green-500 rounded-full mt-2"></div>
              <div className="flex-1">
                <p className="text-sm text-gray-900">Session completed with John D.</p>
                <p className="text-xs text-gray-500">2 hours ago</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <div className="h-2 w-2 bg-blue-500 rounded-full mt-2"></div>
              <div className="flex-1">
                <p className="text-sm text-gray-900">New assessment assigned to Sarah M.</p>
                <p className="text-xs text-gray-500">4 hours ago</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <div className="h-2 w-2 bg-purple-500 rounded-full mt-2"></div>
              <div className="flex-1">
                <p className="text-sm text-gray-900">Treatment plan updated for Mike R.</p>
                <p className="text-xs text-gray-500">1 day ago</p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Alerts & Reminders</h3>
          <div className="space-y-4">
            {needsOnboarding && (
              <div className="flex items-start space-x-3 p-3 bg-amber-50 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-amber-900">Complete Profile Setup</p>
                  <p className="text-xs text-amber-700">Finish your profile to access all features</p>
                </div>
              </div>
            )}
            <div className="flex items-start space-x-3 p-3 bg-blue-50 rounded-lg">
              <Bell className="h-5 w-5 text-blue-600 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-blue-900">License Renewal Due</p>
                <p className="text-xs text-blue-700">Your license expires in 90 days</p>
              </div>
            </div>
            <div className="flex items-start space-x-3 p-3 bg-green-50 rounded-lg">
              <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-green-900">CE Credits on Track</p>
                <p className="text-xs text-green-700">26/30 credits completed this period</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <TherapistSidebar
        navGroups={navGroups}
        activeTab={activeTab}
        openGroups={openGroups}
        sidebarCollapsed={sidebarCollapsed}
        onTabChange={goto}
        onToggleGroup={toggleGroup}
        onToggleSidebar={() => setSidebarCollapsed(!sidebarCollapsed)}
        profile={profile}
        stats={stats}
      />

      {/* Main Content */}
      <div className={`flex-1 transition-all duration-300 ${sidebarCollapsed ? 'ml-16' : 'ml-80'}`}>
        {/* Header */}
        <header className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <h1 className="text-2xl font-bold text-gray-900">
                {activeTab === 'overview' ? 'Dashboard Overview' : 
                 navGroups.flatMap(g => g.items).find(item => item.id === activeTab)?.name || 'Dashboard'}
              </h1>
              {loading && (
                <RefreshCw className="h-5 w-5 text-gray-400 animate-spin" />
              )}
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="relative">
                <Search className="h-5 w-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search..."
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <button className="relative p-2 text-gray-400 hover:text-gray-600">
                <Bell className="h-6 w-6" />
                <span className="absolute top-0 right-0 h-2 w-2 bg-red-500 rounded-full"></span>
              </button>
              <div className="flex items-center space-x-3">
                <img
                  src={profile.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(profile.first_name + ' ' + profile.last_name)}&background=3B82F6&color=fff`}
                  alt={`${profile.first_name} ${profile.last_name}`}
                  className="h-8 w-8 rounded-full"
                />
                <span className="text-sm font-medium text-gray-700">
                  {profile.first_name} {profile.last_name}
                </span>
              </div>
            </div>
          </div>
        </header>

        {/* Content Area */}
        <main className="p-6">
          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center">
                <AlertTriangle className="h-5 w-5 text-red-600 mr-2" />
                <span className="text-red-800">{error}</span>
              </div>
            </div>
          )}

          {activeTab === 'overview' ? (
            <Overview />
          ) : ActiveComponent ? (
            <ActiveComponent />
          ) : (
            <div className="text-center py-12">
              <p className="text-gray-500">Component not found</p>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}

export default TherapistDashboard