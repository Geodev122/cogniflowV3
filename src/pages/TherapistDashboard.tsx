import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { Layout } from '../components/Layout'
import { TherapistOnboarding } from '../components/therapist/TherapistOnboarding'
import { TherapistProfile } from '../components/therapist/TherapistProfile'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import {
  Users,
  ClipboardList,
  FileText,
  Calendar,
  MessageSquare,
  Library,
  BarChart3,
  Brain,
  Target,
  Clock,
  CheckCircle,
  AlertTriangle,
  ChevronRight,
  Menu,
  X,
  User,
  TrendingUp,
  Building,
  UserCheck,
  Phone,
  Settings,
  Eye,
  Headphones,
  Shield,
  Plus,
  CalendarDays,
  Stethoscope,
  Activity,
  Bell,
  Lightbulb,
  ArrowRight
} from 'lucide-react'
import { Navigate } from 'react-router-dom'

// Lazy load components for better performance
const ClientManagement = React.lazy(() => import('../components/therapist/ClientManagement').then(m => ({ default: m.ClientManagement })))
const CaseManagement = React.lazy(() => import('../components/therapist/CaseManagement').then(m => ({ default: m.CaseManagement })))
const SessionManagement = React.lazy(() => import('../components/therapist/SessionManagement').then(m => ({ default: m.SessionManagement })))
const CommunicationTools = React.lazy(() => import('../components/therapist/CommunicationTools').then(m => ({ default: m.CommunicationTools })))
const ResourceLibrary = React.lazy(() => import('../components/therapist/ResourceLibrary').then(m => ({ default: m.ResourceLibrary })))
const PracticeManagement = React.lazy(() => import('../components/therapist/PracticeManagement').then(m => ({ default: m.PracticeManagement })))

interface DashboardStats {
  totalClients: number
  activeCases: number
  patientsToday: number
  profileCompletion: number
}

interface OnboardingStep {
  id: string
  title: string
  completed: boolean
}

interface TodaySession {
  id: string
  client_name: string
  time: string
  type: string
  notes?: string
}

interface CaseInsight {
  client_name: string
  insight: string
  recommendation: string
  priority: 'high' | 'medium' | 'low'
}

interface Activity {
  id: string
  type: 'client' | 'supervision' | 'admin'
  title: string
  description: string
  time: string
  icon: string
}

export const TherapistDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>('overview')
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [showOnboardingModal, setShowOnboardingModal] = useState(false)
  const [showProfileModal, setShowProfileModal] = useState(false)
  const [stats, setStats] = useState<DashboardStats>({
    totalClients: 0,
    activeCases: 0,
    patientsToday: 0,
    profileCompletion: 0
  })
  const [onboardingSteps, setOnboardingSteps] = useState<OnboardingStep[]>([])
  const [todaySessions, setTodaySessions] = useState<TodaySession[]>([])
  const [caseInsights, setCaseInsights] = useState<CaseInsight[]>([])
  const [recentActivities, setRecentActivities] = useState<Activity[]>([])
  const [loading, setLoading] = useState(true)
  const [profileLive, setProfileLive] = useState(false)
  const { profile } = useAuth()

  const navigationSections = [
    {
      title: null,
      items: [
        { id: 'overview', name: 'Overview', icon: Target, color: 'blue' }
      ]
    },
    {
      title: 'Client Care',
      items: [
        { id: 'clients', name: 'Client Management', icon: Users, color: 'green' },
        { id: 'cases', name: 'Case Management', icon: FileText, color: 'green' },
        { id: 'resources', name: 'Resource Library', icon: Library, color: 'green' }
      ]
    },
    {
      title: 'Practice Management',
      items: [
        { id: 'sessions', name: 'Session Management', icon: Calendar, color: 'purple' },
        { id: 'clinic', name: 'Clinic Rental', icon: Building, color: 'purple' },
        { id: 'leads', name: 'Client Leads', icon: UserCheck, color: 'purple' },
        { id: 'support', name: 'Practice Support', icon: Settings, color: 'purple' }
      ]
    },
    {
      title: 'Support',
      items: [
        { id: 'supervision', name: 'Supervision', icon: Headphones, color: 'amber' },
        { id: 'admin', name: 'Contact Administrator', icon: Shield, color: 'amber' }
      ]
    }
  ]

  const fetchDashboardData = useCallback(async () => {
    if (!profile) return

    try {
      // Fetch total clients
      const { data: clientRelations } = await supabase
        .from('therapist_client_relations')
        .select('client_id')
        .eq('therapist_id', profile.id)

      // Fetch active cases
      const { data: activeCases } = await supabase
        .from('cases')
        .select('id')
        .eq('therapist_id', profile.id)
        .eq('status', 'active')

      // Fetch today's sessions
      const today = new Date().toISOString().split('T')[0]
      const { data: todayAppointments } = await supabase
        .from('appointments')
        .select(`
          id,
          appointment_date,
          appointment_type,
          notes,
          profiles!appointments_client_id_fkey(first_name, last_name)
        `)
        .eq('therapist_id', profile.id)
        .gte('appointment_date', today)
        .lt('appointment_date', today + 'T23:59:59')

      // Calculate profile completion
      const steps = [
        { id: 'basic', title: 'Basic Information', completed: !!profile.whatsapp_number },
        { id: 'professional', title: 'Professional Details', completed: !!profile.professional_details },
        { id: 'verification', title: 'Verification', completed: profile.verification_status === 'verified' },
        { id: 'bio', title: 'Bio & Story', completed: !!(profile.professional_details?.bio && profile.professional_details.bio.length > 150) },
        { id: 'locations', title: 'Practice Locations', completed: !!(profile.professional_details?.practice_locations?.length > 0) }
      ]

      const completedSteps = steps.filter(step => step.completed).length
      const profileCompletion = Math.round((completedSteps / steps.length) * 100)
      const isProfileLive = profileCompletion === 100 && profile.verification_status === 'verified'

      setStats({
        totalClients: clientRelations?.length || 0,
        activeCases: activeCases?.length || 0,
        patientsToday: todayAppointments?.length || 0,
        profileCompletion
      })

      setOnboardingSteps(steps)
      setProfileLive(isProfileLive)

      // Set today's sessions
      setTodaySessions(todayAppointments?.map(apt => ({
        id: apt.id,
        client_name: `${apt.profiles?.first_name || 'Unknown'} ${apt.profiles?.last_name || 'Client'}`,
        time: new Date(apt.appointment_date).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        type: apt.appointment_type,
        notes: apt.notes
      })) || [])

      // Mock case insights (future AI feature)
      setCaseInsights([
        {
          client_name: 'John Smith',
          insight: 'Showing consistent improvement in anxiety scores',
          recommendation: 'Consider reducing session frequency to bi-weekly',
          priority: 'medium'
        },
        {
          client_name: 'Emily Davis',
          insight: 'Missed last two assignments',
          recommendation: 'Schedule check-in call to assess barriers',
          priority: 'high'
        }
      ])

      // Mock recent activities
      setRecentActivities([
        {
          id: '1',
          type: 'client',
          title: 'John completed PHQ-9 assessment',
          description: 'Score improved from 15 to 12',
          time: '2 hours ago',
          icon: 'CheckCircle'
        },
        {
          id: '2',
          type: 'supervision',
          title: 'New supervision session available',
          description: 'Dr. Wilson has scheduled group supervision',
          time: '1 day ago',
          icon: 'Headphones'
        },
        {
          id: '3',
          type: 'admin',
          title: 'Platform update notification',
          description: 'New features added to assessment tools',
          time: '2 days ago',
          icon: 'Bell'
        }
      ])

    } catch (error) {
      console.error('Error fetching dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }, [profile])

  useEffect(() => {
    if (profile) {
      fetchDashboardData()
    }
  }, [profile, fetchDashboardData])

  if (profile && profile.role !== 'therapist') {
    return <Navigate to="/client" replace />
  }

  const handleOnboardingComplete = () => {
    setShowOnboardingModal(false)
    fetchDashboardData()
  }

  const getColorClasses = (color: string) => {
    const colors = {
      blue: 'text-blue-600 bg-blue-50 hover:bg-blue-100 border-blue-200',
      green: 'text-green-600 bg-green-50 hover:bg-green-100 border-green-200',
      purple: 'text-purple-600 bg-purple-50 hover:bg-purple-100 border-purple-200',
      amber: 'text-amber-600 bg-amber-50 hover:bg-amber-100 border-amber-200'
    }
    return colors[color as keyof typeof colors] || colors.blue
  }

  const renderOverview = () => (
    <div className="space-y-6">
      {/* Onboarding Widget - Only show if not completed */}
      {!profileLive && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Onboarding</h3>
            <span className="text-sm text-gray-500">{stats.profileCompletion}% complete</span>
          </div>
          
          <div className="space-y-3 mb-4">
            {onboardingSteps.map((step, index) => (
              <div key={step.id} className="flex items-center space-x-3">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                  step.completed ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-500'
                }`}>
                  {step.completed ? <CheckCircle className="w-4 h-4" /> : <span className="text-xs">{index + 1}</span>}
                </div>
                <span className={`text-sm ${step.completed ? 'text-gray-700' : 'text-gray-500'}`}>
                  {step.title}
                </span>
              </div>
            ))}
          </div>
          
          <button
            onClick={() => setShowOnboardingModal(true)}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Continue Setup
          </button>
        </div>
      )}

      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-6 rounded-xl shadow-lg">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold mb-1">Welcome back, Dr. {profile?.first_name}!</h2>
            <p className="text-blue-100">{new Date().toLocaleDateString('en-US', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}</p>
          </div>
          {profileLive && (
            <div className="flex items-center space-x-2 bg-green-500 bg-opacity-20 px-3 py-1 rounded-full">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              <span className="text-sm text-green-100">Profile Live</span>
            </div>
          )}
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Clients</p>
              <p className="text-3xl font-bold text-blue-600">{stats.totalClients}</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-full">
              <Users className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Active Cases</p>
              <p className="text-3xl font-bold text-green-600">{stats.activeCases}</p>
            </div>
            <div className="p-3 bg-green-100 rounded-full">
              <FileText className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Patients Today</p>
              <p className="text-3xl font-bold text-purple-600">{stats.patientsToday}</p>
            </div>
            <div className="p-3 bg-purple-100 rounded-full">
              <CalendarDays className="h-6 w-6 text-purple-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Roster Calendar */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900">Today's Schedule</h3>
          <button
            onClick={() => setActiveTab('sessions')}
            className="inline-flex items-center px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
          >
            <Plus className="w-4 h-4 mr-1" />
            Schedule
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
            {todaySessions.map((session) => (
              <div key={session.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <User className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900">{session.client_name}</h4>
                    <p className="text-sm text-gray-600">{session.time} • {session.type}</p>
                  </div>
                </div>
                <button className="text-blue-600 hover:text-blue-800">
                  <Eye className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Case Insights */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center space-x-3 mb-6">
          <div className="p-2 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg">
            <Brain className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">AI Case Insights</h3>
            <p className="text-sm text-gray-600">Powered by advanced analytics</p>
          </div>
          <div className="ml-auto">
            <span className="inline-flex items-center px-2 py-1 bg-purple-100 text-purple-800 text-xs font-medium rounded-full">
              Coming Soon
            </span>
          </div>
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
                  insight.priority === 'high' ? 'bg-red-100 text-red-800' :
                  insight.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-green-100 text-green-800'
                }`}>
                  {insight.priority}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Activities */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-6">Recent Activities</h3>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Client Activities */}
          <div>
            <h4 className="font-medium text-green-900 mb-3 flex items-center">
              <Users className="w-4 h-4 mr-2 text-green-600" />
              Client Activities
            </h4>
            <div className="space-y-3">
              {recentActivities.filter(a => a.type === 'client').map((activity) => (
                <div key={activity.id} className="p-3 bg-green-50 rounded-lg">
                  <p className="text-sm font-medium text-green-900">{activity.title}</p>
                  <p className="text-xs text-green-700">{activity.description}</p>
                  <p className="text-xs text-green-600 mt-1">{activity.time}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Supervision Updates */}
          <div>
            <h4 className="font-medium text-amber-900 mb-3 flex items-center">
              <Headphones className="w-4 h-4 mr-2 text-amber-600" />
              Supervision Updates
            </h4>
            <div className="space-y-3">
              {recentActivities.filter(a => a.type === 'supervision').map((activity) => (
                <div key={activity.id} className="p-3 bg-amber-50 rounded-lg">
                  <p className="text-sm font-medium text-amber-900">{activity.title}</p>
                  <p className="text-xs text-amber-700">{activity.description}</p>
                  <p className="text-xs text-amber-600 mt-1">{activity.time}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Admin Updates */}
          <div>
            <h4 className="font-medium text-blue-900 mb-3 flex items-center">
              <Shield className="w-4 h-4 mr-2 text-blue-600" />
              Admin Updates
            </h4>
            <div className="space-y-3">
              {recentActivities.filter(a => a.type === 'admin').map((activity) => (
                <div key={activity.id} className="p-3 bg-blue-50 rounded-lg">
                  <p className="text-sm font-medium text-blue-900">{activity.title}</p>
                  <p className="text-xs text-blue-700">{activity.description}</p>
                  <p className="text-xs text-blue-600 mt-1">{activity.time}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-6">Quick Actions</h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <button
            onClick={() => setActiveTab('clients')}
            className="p-4 bg-green-50 hover:bg-green-100 rounded-lg transition-colors group"
          >
            <Users className="w-8 h-8 text-green-600 mx-auto mb-2" />
            <p className="text-sm font-medium text-green-900">Add Client</p>
          </button>
          
          <button
            onClick={() => setActiveTab('sessions')}
            className="p-4 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors group"
          >
            <Calendar className="w-8 h-8 text-purple-600 mx-auto mb-2" />
            <p className="text-sm font-medium text-purple-900">Schedule Session</p>
          </button>
          
          <button
            onClick={() => setActiveTab('resources')}
            className="p-4 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors group"
          >
            <Library className="w-8 h-8 text-blue-600 mx-auto mb-2" />
            <p className="text-sm font-medium text-blue-900">Assign Assessment</p>
          </button>
          
          <button
            onClick={() => setActiveTab('cases')}
            className="p-4 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors group"
          >
            <FileText className="w-8 h-8 text-indigo-600 mx-auto mb-2" />
            <p className="text-sm font-medium text-indigo-900">View Cases</p>
          </button>
        </div>
      </div>
    </div>
  )

  const renderFutureContent = (title: string, description: string, icon: React.ElementType) => {
    const Icon = icon
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
        <Icon className="mx-auto h-16 w-16 text-gray-400 mb-4" />
        <h3 className="text-xl font-medium text-gray-900 mb-2">{title}</h3>
        <p className="text-gray-600 mb-6">{description}</p>
        <div className="inline-flex items-center px-4 py-2 bg-gray-100 text-gray-700 rounded-lg">
          <Clock className="w-4 h-4 mr-2" />
          Coming Soon
        </div>
      </div>
    )
  }

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return renderOverview()
      case 'clients':
        return (
          <React.Suspense fallback={<div className="flex justify-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>}>
            <ClientManagement />
          </React.Suspense>
        )
      case 'cases':
        return (
          <React.Suspense fallback={<div className="flex justify-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>}>
            <CaseManagement />
          </React.Suspense>
        )
      case 'resources':
        return (
          <React.Suspense fallback={<div className="flex justify-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>}>
            <ResourceLibrary />
          </React.Suspense>
        )
      case 'sessions':
        return (
          <React.Suspense fallback={<div className="flex justify-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>}>
            <SessionManagement />
          </React.Suspense>
        )
      case 'leads':
        return (
          <React.Suspense fallback={<div className="flex justify-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>}>
            <CommunicationTools />
          </React.Suspense>
        )
      case 'support':
        return (
          <React.Suspense fallback={<div className="flex justify-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>}>
            <PracticeManagement />
          </React.Suspense>
        )
      case 'clinic':
        return renderFutureContent('Clinic Rental Management', 'Manage your clinic space rentals and bookings', Building)
      case 'supervision':
        return renderFutureContent('Professional Supervision', 'Connect with supervisors and track supervision hours', Headphones)
      case 'admin':
        return renderFutureContent('Contact Administrator', 'Get support and contact platform administrators', Shield)
      default:
        return renderOverview()
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
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
              <div className="logo-container">
                <img 
                  src="/logosmall1 copy copy.png" 
                  alt="Thera-PY Logo" 
                  className="logo-image"
                />
                <h1 className="logo-text logo-text-medium">
                  <span className="logo-thera">Thera</span><span className="logo-py">-PY</span>
                </h1>
              </div>
              <div className="hidden sm:block">
                <p className="text-sm text-gray-500">Therapist Portal</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              {profileLive && (
                <div className="hidden sm:flex items-center space-x-2 bg-green-100 text-green-800 px-3 py-1 rounded-full">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
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

              {/* Mobile Menu Button */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
              >
                {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="flex pt-16">
        {/* Fixed Sidebar - Desktop */}
        <div className="hidden md:flex flex-col w-64 bg-white border-r border-gray-200 fixed left-0 top-16 bottom-0">
          <div className="flex-1 overflow-y-auto p-4">
            <nav className="space-y-6">
              {navigationSections.map((section, sectionIndex) => (
                <div key={sectionIndex}>
                  {section.title && (
                    <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                      {section.title}
                    </h3>
                  )}
                  <div className="space-y-1">
                    {section.items.map((tab) => {
                      const Icon = tab.icon
                      const isActive = activeTab === tab.id
                      const colorClasses = getColorClasses(tab.color)
                      
                      return (
                        <button
                          key={tab.id}
                          onClick={() => setActiveTab(tab.id)}
                          className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg transition-all text-sm font-medium ${
                            isActive
                              ? colorClasses
                              : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                          }`}
                        >
                          <Icon className={`w-5 h-5 flex-shrink-0 ${
                            isActive ? `text-${tab.color}-600` : 'text-gray-400'
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

        {/* Mobile Navigation Overlay */}
        {mobileMenuOpen && (
          <div className="md:hidden fixed inset-0 z-50 pt-16">
            <div className="fixed inset-0 bg-gray-600 bg-opacity-75" onClick={() => setMobileMenuOpen(false)} />
            <div className="fixed inset-y-0 left-0 w-64 bg-white shadow-xl pt-16">
              <div className="h-full overflow-y-auto p-4">
                <nav className="space-y-6">
                  {navigationSections.map((section, sectionIndex) => (
                    <div key={sectionIndex}>
                      {section.title && (
                        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                          {section.title}
                        </h3>
                      )}
                      <div className="space-y-1">
                        {section.items.map((tab) => {
                          const Icon = tab.icon
                          const isActive = activeTab === tab.id
                          const colorClasses = getColorClasses(tab.color)
                          
                          return (
                            <button
                              key={tab.id}
                              onClick={() => {
                                setActiveTab(tab.id)
                                setMobileMenuOpen(false)
                              }}
                              className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg transition-all text-sm font-medium ${
                                isActive
                                  ? colorClasses
                                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                              }`}
                            >
                              <Icon className={`w-5 h-5 flex-shrink-0 ${
                                isActive ? `text-${tab.color}-600` : 'text-gray-400'
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
        <div className="flex-1 md:ml-64">
          <main className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
            {renderTabContent()}
          </main>
        </div>
      </div>

      {/* Modals */}
      {showOnboardingModal && (
        <TherapistOnboarding 
          onComplete={handleOnboardingComplete}
          onClose={() => setShowOnboardingModal(false)}
        />
      )}

      {showProfileModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => setShowProfileModal(false)} />
            
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full max-h-[90vh] overflow-y-auto">
              <div className="bg-white">
                <div className="flex items-center justify-between p-6 border-b border-gray-200">
                  <h3 className="text-lg font-medium text-gray-900">Professional Profile</h3>
                  <button
                    onClick={() => setShowProfileModal(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
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

// Simple Modern Profile Component
const SimpleTherapistProfile: React.FC<{ profile: any; onEdit: () => void }> = ({ profile, onEdit }) => {
  const professionalDetails = profile?.professional_details || {}
  
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="text-center">
        <div className="w-24 h-24 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <User className="w-12 h-12 text-blue-600" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900">
          {profile?.first_name} {profile?.last_name}
        </h2>
        <p className="text-gray-600">{profile?.email}</p>
        <div className="mt-4">
          <span className={`inline-flex px-3 py-1 text-sm font-medium rounded-full ${
            profile?.verification_status === 'verified' 
              ? 'bg-green-100 text-green-800' 
              : 'bg-yellow-100 text-yellow-800'
          }`}>
            {profile?.verification_status === 'verified' ? 'Verified Professional' : 'Verification Pending'}
          </span>
        </div>
      </div>

      {/* Contact Info */}
      <div className="bg-gray-50 rounded-lg p-4">
        <h3 className="font-medium text-gray-900 mb-3">Contact Information</h3>
        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <Phone className="w-4 h-4 text-gray-500" />
            <span className="text-sm text-gray-700">{profile?.whatsapp_number || 'Not provided'}</span>
          </div>
        </div>
      </div>

      {/* Professional Details */}
      {professionalDetails.specializations && (
        <div className="bg-gray-50 rounded-lg p-4">
          <h3 className="font-medium text-gray-900 mb-3">Specializations</h3>
          <div className="flex flex-wrap gap-2">
            {professionalDetails.specializations.map((spec: string, index: number) => (
              <span key={index} className="inline-flex px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                {spec}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Languages */}
      {professionalDetails.languages && (
        <div className="bg-gray-50 rounded-lg p-4">
          <h3 className="font-medium text-gray-900 mb-3">Languages</h3>
          <div className="flex flex-wrap gap-2">
            {professionalDetails.languages.map((lang: string, index: number) => (
              <span key={index} className="inline-flex px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                {lang}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Bio */}
      {professionalDetails.bio && (
        <div className="bg-gray-50 rounded-lg p-4">
          <h3 className="font-medium text-gray-900 mb-3">About</h3>
          <p className="text-sm text-gray-700 leading-relaxed">{professionalDetails.bio}</p>
        </div>
      )}

      {/* Qualifications */}
      {professionalDetails.qualifications && (
        <div className="bg-gray-50 rounded-lg p-4">
          <h3 className="font-medium text-gray-900 mb-3">Qualifications</h3>
          <div className="space-y-1">
            {professionalDetails.qualifications.split('\n').filter((qual: string) => qual.trim()).map((qualification: string, index: number) => (
              <div key={index} className="flex items-start space-x-2">
                <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                <span className="text-sm text-gray-700">{qualification.trim()}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Edit Button */}
      <div className="text-center">
        <button
          onClick={onEdit}
          className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <User className="w-4 h-4 mr-2" />
          Edit Profile
        </button>
      </div>
    </div>
  )
}