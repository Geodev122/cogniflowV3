import React, { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { isRecursionError } from '../../utils/helpers'
import { 
  BarChart3, 
  Users, 
  Calendar, 
  DollarSign, 
  TrendingUp,
  Clock,
  Target,
  Award,
  AlertTriangle,
  CheckCircle
} from 'lucide-react'

interface PracticeStats {
  totalClients: number
  activeClients: number
  monthlyRevenue: number
  sessionCount: number
  averageRating: number
  responseTime: string
  completionRate: number
  noShowRate: number
}

export default function PracticeManagement() {
  const [stats, setStats] = useState<PracticeStats>({
    totalClients: 0,
    activeClients: 0,
    monthlyRevenue: 0,
    sessionCount: 0,
    averageRating: 0,
    responseTime: '0 hours',
    completionRate: 0,
    noShowRate: 0
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { profile } = useAuth()

  useEffect(() => {
    if (profile) {
      fetchPracticeStats()
    }
  }, [profile])

  const fetchPracticeStats = async () => {
    if (!profile) return

    try {
      setLoading(true)
      setError(null)

      // Fetch practice analytics
      const { data: analyticsData, error: analyticsError } = await supabase
        .from('practice_analytics')
        .select('*')
        .eq('therapist_id', profile.id)
        .order('created_at', { ascending: false })

      if (analyticsError) {
        if (isRecursionError(analyticsError)) {
          console.error('RLS recursion error in practice analytics:', analyticsError)
          setError('Database configuration error - please contact support')
          return
        }
        console.warn('Practice analytics not available:', analyticsError)
      }

      // Calculate stats from available data
      const { data: clientRelations, error: relationsError } = await supabase
        .from('therapist_client_relations')
        .select('client_id')
        .eq('therapist_id', profile.id)

      if (relationsError) {
        if (isRecursionError(relationsError)) {
          console.error('RLS recursion error in practice client relations:', relationsError)
          setError('Database configuration error - please contact support')
          return
        }
        console.warn('Error fetching client relations for practice stats:', relationsError)
      }

      const { data: appointments, error: appointmentsError } = await supabase
        .from('appointments')
        .select('status, appointment_date')
        .eq('therapist_id', profile.id)

      if (appointmentsError) {
        if (isRecursionError(appointmentsError)) {
          console.error('RLS recursion error in practice appointments:', appointmentsError)
          setError('Database configuration error - please contact support')
          return
        }
        console.warn('Error fetching appointments for practice stats:', appointmentsError)
      }

      const totalClients = clientRelations?.length || 0
      const completedSessions = appointments?.filter(a => a.status === 'completed').length || 0
      const noShows = appointments?.filter(a => a.status === 'no_show').length || 0
      const totalSessions = appointments?.length || 0

      setStats({
        totalClients,
        activeClients: totalClients,
        monthlyRevenue: completedSessions * 150, // Estimated at $150 per session
        sessionCount: completedSessions,
        averageRating: 4.8, // Default rating
        responseTime: '< 2 hours',
        completionRate: totalSessions > 0 ? Math.round((completedSessions / totalSessions) * 100) : 0,
        noShowRate: totalSessions > 0 ? Math.round((noShows / totalSessions) * 100) : 0
      })
    } catch (error) {
      console.error('Error fetching practice stats:', error)
      if (isRecursionError(error)) {
        setError('Database configuration error - please contact support')
      } else {
        setError('Failed to load practice statistics')
      }
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-center space-x-2">
          <AlertTriangle className="w-5 h-5 text-red-600" />
          <span className="text-red-800">{error}</span>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Practice Management</h2>
        <p className="text-gray-600">Monitor your practice performance and analytics</p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center space-x-3">
            <Users className="w-8 h-8 text-blue-600" />
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.totalClients}</p>
              <p className="text-sm text-gray-600">Total Clients</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center space-x-3">
            <Calendar className="w-8 h-8 text-green-600" />
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.sessionCount}</p>
              <p className="text-sm text-gray-600">Sessions This Month</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center space-x-3">
            <DollarSign className="w-8 h-8 text-purple-600" />
            <div>
              <p className="text-2xl font-bold text-gray-900">${stats.monthlyRevenue.toLocaleString()}</p>
              <p className="text-sm text-gray-600">Monthly Revenue</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center space-x-3">
            <Award className="w-8 h-8 text-yellow-600" />
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.averageRating}</p>
              <p className="text-sm text-gray-600">Average Rating</p>
            </div>
          </div>
        </div>
      </div>

      {/* Performance Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Session Performance</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Completion Rate</span>
              <div className="flex items-center space-x-2">
                <div className="w-24 bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-green-600 h-2 rounded-full"
                    style={{ width: `${stats.completionRate}%` }}
                  ></div>
                </div>
                <span className="text-sm font-medium text-gray-900">{stats.completionRate}%</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600">No-Show Rate</span>
              <div className="flex items-center space-x-2">
                <div className="w-24 bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-red-600 h-2 rounded-full"
                    style={{ width: `${stats.noShowRate}%` }}
                  ></div>
                </div>
                <span className="text-sm font-medium text-gray-900">{stats.noShowRate}%</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Response Time</span>
              <span className="text-sm font-medium text-gray-900">{stats.responseTime}</span>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Client Engagement</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Active Clients</span>
              <span className="text-sm font-medium text-gray-900">{stats.activeClients}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Average Sessions/Client</span>
              <span className="text-sm font-medium text-gray-900">
                {stats.totalClients > 0 ? Math.round(stats.sessionCount / stats.totalClients) : 0}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Client Satisfaction</span>
              <span className="text-sm font-medium text-gray-900">{stats.averageRating}/5.0</span>
            </div>
          </div>
        </div>
      </div>

      {/* Insights */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Practice Insights</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <span className="font-medium text-green-900">Strengths</span>
            </div>
            <ul className="text-sm text-green-800 space-y-1">
              <li>• High client retention rate</li>
              <li>• Excellent response time</li>
              <li>• Strong assessment completion</li>
            </ul>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-2">
              <Clock className="w-5 h-5 text-amber-600" />
              <span className="font-medium text-amber-900">Opportunities</span>
            </div>
            <ul className="text-sm text-amber-800 space-y-1">
              <li>• Increase session frequency</li>
              <li>• Expand service offerings</li>
              <li>• Implement group sessions</li>
            </ul>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-2">
              <Target className="w-5 h-5 text-blue-600" />
              <span className="font-medium text-blue-900">Goals</span>
            </div>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Reach 50 active clients</li>
              <li>• Maintain 95% completion rate</li>
              <li>• Reduce no-show rate to &lt;5%</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}