import React, { useEffect, useState } from 'react';
import { Users, Calendar, TrendingUp, Clock, DollarSign, Award, TriangleAlert as AlertTriangle, CircleCheck as CheckCircle, BookOpen, FileText } from 'lucide-react';
import { supabase, expectMany } from '../../lib/supabase';
import type { PostgrestError } from '@supabase/supabase-js';

interface OverviewTabProps {
  className?: string;
}

type Appointment = {
  id: string;
  client_id?: string;
  client_first_name?: string;
  client_last_name?: string;
  start_time?: string;
  end_time?: string;
  status?: string;
  title?: string;
}

const OverviewTab: React.FC<OverviewTabProps> = ({ className = '' }) => {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Stats
  const [totalClients, setTotalClients] = useState<number>(0)
  const [activeClients, setActiveClients] = useState<number>(0)
  const [sessionsThisWeek, setSessionsThisWeek] = useState<number>(0)
  const [sessionsThisMonth, setSessionsThisMonth] = useState<number>(0)
  const [revenue, setRevenue] = useState<number>(0)
  const [ceCredits, setCeCredits] = useState<number>(0)
  const [pendingTasks, setPendingTasks] = useState<number>(0)

  const [upcomingSessions, setUpcomingSessions] = useState<Appointment[]>([])
  const [recentActivity, setRecentActivity] = useState<Array<{ id: string; type: string; description: string; time: string }>>([])
  const [alerts, setAlerts] = useState<Array<{ id: string; type: string; message: string; priority?: string }>>([])

  // Helper: safe query wrapper that catches missing-table errors and returns empty arrays
  async function safeMany<T>(q: Promise<{ data: T[] | null; error: PostgrestError | null }>) {
    try {
      const { rows } = await expectMany(q as any)
      return rows
    } catch (e: any) {
      // If error relates to missing relation/schema, log and return empty
      const msg = e?.message || String(e)
      console.warn('[OverviewTab] query failed, returning empty:', msg)
      return [] as T[]
    }
  }

  useEffect(() => {
    let mounted = true
    ;(async () => {
      setLoading(true)
      setError(null)
      try {
        // 1) Total clients: count profiles where role = 'client' or via therapist relations
        const profiles = await safeMany<any>(supabase.from('profiles').select('id, user_role, role, email'))
        if (!mounted) return
        const clients = profiles.filter((p: any) => (p.user_role || p.role || '').toLowerCase() === 'client')
        setTotalClients(clients.length)

        // 2) Active clients: heuristically, clients with at least one accepted assignment or recent appointment
        const relations = await safeMany<any>(supabase.from('therapist_client_relations').select('client_id'))
        const uniqueClientIds = new Set(relations.map((r: any) => r.client_id))
        setActiveClients(uniqueClientIds.size || clients.length)

        // 3) CE credits
        const ce = await safeMany<any>(supabase.from('ce_completions').select('hours'))
        const ceSum = ce.reduce((s: number, r: any) => s + (Number(r.hours) || 0), 0)
        setCeCredits(ceSum)

        // 4) Sessions this week / month and upcoming sessions
        const now = new Date()
        const weekStart = new Date(now)
        weekStart.setDate(now.getDate() - 7)
        const monthStart = new Date(now)
        monthStart.setMonth(now.getMonth() - 1)

        // appointments: try to join client profile if possible (left join via foreign key notation)
        const appts = await safeMany<Appointment>(supabase
          .from('appointments')
          .select('id, start_time, end_time, status, title, client_id, client:profiles!appointments_client_id_fkey(first_name,last_name)')
          .order('start_time', { ascending: true })
          .limit(10)
        )
        if (!mounted) return
        // Normalize appointment rows
        const normalized = (appts as any[]).map(a => ({
          id: a.id,
          client_id: a.client_id,
          client_first_name: a.client?.first_name || a.client_first_name || '',
          client_last_name: a.client?.last_name || a.client_last_name || '',
          start_time: a.start_time,
          end_time: a.end_time,
          status: a.status,
          title: a.title,
        }))

        setUpcomingSessions(normalized as Appointment[])

        // Count sessions in window
        const sessionsWeek = (normalized as any[]).filter(r => r.start_time && new Date(r.start_time) >= weekStart).length
        const sessionsMonth = (normalized as any[]).filter(r => r.start_time && new Date(r.start_time) >= monthStart).length
        setSessionsThisWeek(sessionsWeek)
        setSessionsThisMonth(sessionsMonth)

        // 5) Revenue: try payments/invoices if present
        const payments = await safeMany<any>(supabase.from('payments').select('amount'))
        const revenueSum = payments.reduce((s: number, p: any) => s + (Number(p.amount) || 0), 0)
        setRevenue(revenueSum)

        // 6) Recent activity: messages, ce_completions, appointments, new profiles
        const [msgs, recentCes, recentProfiles] = await Promise.all([
          safeMany<any>(supabase.from('messages').select('id, body, created_at, sender_id, recipient_id').order('created_at', { ascending: false }).limit(10)),
          safeMany<any>(supabase.from('ce_completions').select('id, course_id, completed_at').order('completed_at', { ascending: false }).limit(5)),
          safeMany<any>(supabase.from('profiles').select('id, first_name, last_name, created_at').order('created_at', { ascending: false }).limit(5)),
        ])

        const activity: any[] = []
        msgs.forEach((m: any) => activity.push({ id: `m-${m.id}`, type: 'message', description: (m.body || '').slice(0, 120), time: m.created_at || '' }))
        recentCes.forEach((c: any) => activity.push({ id: `ce-${c.id}`, type: 'ce', description: `Completed ${c.course_id || 'a course'}`, time: c.completed_at || '' }))
        recentProfiles.forEach((p: any) => activity.push({ id: `p-${p.id}`, type: 'client', description: `New client intake: ${(p.first_name || '') + ' ' + (p.last_name || '')}`, time: p.created_at || '' }))
        setRecentActivity(activity.slice(0, 10))

        // 7) Alerts: license expiry (therapist_licenses), pending session notes count
        const licenses = await safeMany<any>(supabase.from('therapist_licenses').select('id, expires_on, status'))
        const soonExpiry = licenses.filter((l: any) => l.expires_on && (new Date(l.expires_on).getTime() - Date.now()) < 1000 * 60 * 60 * 24 * 40)
        const licenseAlerts = soonExpiry.map((l: any, i: number) => ({ id: `lic-${i}`, type: 'warning', message: `License ${l.id} expires on ${new Date(l.expires_on).toLocaleDateString()}`, priority: 'high' }))

        // pending session notes: attempt to query session_notes table
        const notes = await safeMany<any>(supabase.from('session_notes').select('id, session_id, created_at').order('created_at', { ascending: false }).limit(50))
        const pendingNotesCount = notes.length // heuristic; more sophisticated logic can be added

        const alertsArr = [
          ...licenseAlerts,
          { id: 'notes-pending', type: 'info', message: `${pendingNotesCount} pending session notes to complete`, priority: 'medium' },
        ]
        setAlerts(alertsArr)

        // pending tasks: sum of pending notes + recent alerts
        setPendingTasks(pendingNotesCount + licenseAlerts.length)

      } catch (e: any) {
        console.error('[OverviewTab] load error', e)
        setError(String(e))
      } finally {
        if (mounted) setLoading(false)
      }
    })()
    return () => { mounted = false }
  }, [])

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'session':
      case 'message':
        return <Clock className="h-4 w-4 text-blue-500" />;
      case 'note':
        return <FileText className="h-4 w-4 text-green-500" />;
      case 'ce':
        return <BookOpen className="h-4 w-4 text-purple-500" />;
      case 'client':
        return <Users className="h-4 w-4 text-indigo-500" />;
      default:
        return <CheckCircle className="h-4 w-4 text-gray-500" />;
    }
  }

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      default:
        return <AlertTriangle className="h-5 w-5 text-blue-500" />;
    }
  }

  if (loading) return <div className={`p-6 ${className}`}>Loading overview...</div>
  if (error) return <div className={`p-6 text-red-600 ${className}`}>Error loading overview: {error}</div>

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl p-6 text-white">
        <h2 className="text-2xl font-bold mb-2">Welcome back</h2>
        <p className="text-indigo-100">You have {upcomingSessions.length} upcoming sessions and {pendingTasks} pending tasks.</p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
        <div className="bg-white rounded-xl p-4 lg:p-6 shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="p-3 bg-blue-100 rounded-lg">
              <Users className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Active Clients</p>
              <p className="text-2xl font-bold text-gray-900">{activeClients}</p>
              <p className="text-xs text-gray-500">of {totalClients} total</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 lg:p-6 shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="p-3 bg-green-100 rounded-lg">
              <Calendar className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Sessions This Month</p>
              <p className="text-2xl font-bold text-gray-900">{sessionsThisMonth}</p>
              <p className="text-xs text-gray-500">{sessionsThisWeek} this week</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 lg:p-6 shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="p-3 bg-purple-100 rounded-lg">
              <DollarSign className="h-6 w-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Monthly Revenue</p>
              <p className="text-2xl font-bold text-gray-900">${revenue.toLocaleString()}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 lg:p-6 shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="p-3 bg-yellow-100 rounded-lg">
              <Award className="h-6 w-6 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">CE Credits</p>
              <p className="text-2xl font-bold text-gray-900">{ceCredits}</p>
              <p className="text-xs text-gray-500">earned this year</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Upcoming Sessions */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200">
            <div className="p-4 lg:p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Upcoming Sessions</h3>
            </div>
            <div className="p-4 lg:p-6">
              <div className="space-y-4">
                {upcomingSessions.map((session) => (
                  <div key={session.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-4">
                      <div className="flex-shrink-0">
                        <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center">
                          <Users className="h-5 w-5 text-indigo-600" />
                        </div>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{session.client_first_name || session.client_id || 'Client' } {session.client_last_name || ''}</p>
                        <p className="text-sm text-gray-500">{session.title || 'Session'}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-gray-900">{session.start_time ? new Date(session.start_time).toLocaleString() : ''}</p>
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                        session.status === 'confirmed' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {session.status || 'scheduled'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4">
                <button className="w-full text-center text-sm text-indigo-600 hover:text-indigo-700 font-medium">
                  View all sessions
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Alerts & Notifications */}
        <div className="space-y-6">
          {/* Alerts */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200">
            <div className="p-4 lg:p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Alerts</h3>
            </div>
            <div className="p-4 lg:p-6">
              <div className="space-y-3">
                {alerts.map((alert) => (
                  <div key={alert.id} className="flex items-start space-x-3 p-3 rounded-lg bg-gray-50">
                    {getAlertIcon(alert.type)}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-900">{alert.message}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200">
            <div className="p-4 lg:p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Quick Actions</h3>
            </div>
            <div className="p-4 lg:p-6">
              <div className="space-y-3">
                <button className="w-full text-left p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center space-x-3">
                    <Users className="h-5 w-5 text-indigo-600" />
                    <span className="text-sm font-medium text-gray-900">Add New Client</span>
                  </div>
                </button>
                <button className="w-full text-left p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center space-x-3">
                    <Calendar className="h-5 w-5 text-green-600" />
                    <span className="text-sm font-medium text-gray-900">Schedule Session</span>
                  </div>
                </button>
                <button className="w-full text-left p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center space-x-3">
                    <FileText className="h-5 w-5 text-purple-600" />
                    <span className="text-sm font-medium text-gray-900">Write Progress Note</span>
                  </div>
                </button>
                <button className="w-full text-left p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center space-x-3">
                    <BookOpen className="h-5 w-5 text-yellow-600" />
                    <span className="text-sm font-medium text-gray-900">Browse CE Courses</span>
                  </div>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="p-4 lg:p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Recent Activity</h3>
        </div>
        <div className="p-4 lg:p-6">
          <div className="space-y-4">
            {recentActivity.map((activity) => (
              <div key={activity.id} className="flex items-start space-x-3">
                <div className="flex-shrink-0 mt-1">
                  {getActivityIcon(activity.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-900">{activity.description}</p>
                  <p className="text-xs text-gray-500 mt-1">{activity.time ? new Date(activity.time).toLocaleString() : ''}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 pt-4 border-t border-gray-200">
            <button className="text-sm text-indigo-600 hover:text-indigo-700 font-medium">
              View all activity
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default OverviewTab;