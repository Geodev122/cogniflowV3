// src/components/supervisor/SupervisorDashboard.tsx
import React, { useEffect, useState } from 'react'
import {
  Users, FileText, AlertTriangle, CheckCircle, Clock, Eye,
  MessageSquare, BarChart3, Calendar, Shield, Star, TrendingUp
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'

interface SupervisorContract {
  id: string
  contract_name: string
  trimester_start: string
  trimester_end: string
  hourly_rate: number | null
  total_hours: number | null
  total_amount: number | null
  status: 'active' | 'pending' | 'expired' | 'terminated'
  signed_at: string | null
  notes: string | null
  created_at: string
}

interface SupervisionFlag {
  id: string
  case_id: string
  therapist_id: string
  reason: string
  priority: number
  status: 'open' | 'in_progress' | 'resolved' | 'closed'
  created_at: string
  case: {
    case_number: string
    client_id: string
  } | null
  therapist: {
    first_name: string
    last_name: string
  } | null
}

interface CaseSummary {
  case_id: string
  title: string
  content: any | null
  last_highlight: string | null
  ai_summary: string | null
  updated_at: string
  case: {
    case_number: string
    status: string
  } | null
  therapist: {
    first_name: string
    last_name: string
  } | null
}

export const SupervisorDashboard: React.FC = () => {
  const { profile } = useAuth()
  
  const [contract, setContract] = useState<SupervisorContract | null>(null)
  const [flags, setFlags] = useState<SupervisionFlag[]>([])
  const [caseSummaries, setCaseSummaries] = useState<CaseSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'overview' | 'flags' | 'cases' | 'contract'>('overview')

  useEffect(() => {
    if (profile?.role === 'supervisor') {
      loadSupervisorData()
    }
  }, [profile])

  const loadSupervisorData = async () => {
    if (!profile) return

    setLoading(true)
    setError(null)

    try {
      // Load supervisor contract
      const { data: contractData, error: contractError } = await supabase
        .from('supervisor_contracts')
        .select('*')
        .eq('supervisor_id', profile.id)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (contractError && contractError.code !== 'PGRST116') throw contractError
      setContract(contractData)

      // Load supervision flags
      const { data: flagsData, error: flagsError } = await supabase
        .from('supervision_flags')
        .select(`
          *,
          case:cases(case_number, client_id),
          therapist:profiles!supervision_flags_therapist_id_fkey(first_name, last_name)
        `)
        .in('status', ['open', 'in_progress'])
        .order('created_at', { ascending: false })
        .limit(20)

      if (flagsError) throw flagsError
      setFlags(flagsData || [])

      // Load case summaries for flagged cases
      const { data: summariesData, error: summariesError } = await supabase
        .from('case_summaries')
        .select(`
          *,
          case:cases(case_number, status, therapist_id),
          therapist:cases!case_summaries_case_id_fkey(therapist:profiles!cases_therapist_id_fkey(first_name, last_name))
        `)
        .order('updated_at', { ascending: false })
        .limit(10)

      if (summariesError) throw summariesError
      setCaseSummaries(summariesData || [])

    } catch (err: any) {
      console.error('Error loading supervisor data:', err)
      setError(err.message || 'Failed to load supervisor data')
    } finally {
      setLoading(false)
    }
  }

  const resolveFlag = async (flagId: string, resolution: string) => {
    try {
      const { error } = await supabase
        .from('supervision_flags')
        .update({
          status: 'resolved',
          resolved_at: new Date().toISOString(),
          resolved_by: profile?.id,
          resolution_notes: resolution
        })
        .eq('id', flagId)

      if (error) throw error

      // Log supervision action
      await supabase
        .from('audit_logs')
        .insert({
          user_id: profile?.id,
          action: 'supervision_flag_resolved',
          resource_type: 'supervision_flag',
          resource_id: flagId,
          details: {
            resolution_notes: resolution
          }
        })

      await loadSupervisorData()
    } catch (err: any) {
      console.error('Error resolving flag:', err)
      setError('Failed to resolve supervision flag')
    }
  }

  const reviewCaseSummary = async (caseId: string, feedback: string) => {
    try {
      const { error } = await supabase
        .from('case_summaries')
        .update({
          reviewed_by: profile?.id,
          reviewed_at: new Date().toISOString(),
          ai_summary: feedback
        })
        .eq('case_id', caseId)

      if (error) throw error

      // Log supervision review
      await supabase
        .from('audit_logs')
        .insert({
          user_id: profile?.id,
          action: 'case_summary_reviewed',
          resource_type: 'case_summary',
          resource_id: caseId,
          details: {
            feedback: feedback
          }
        })

      await loadSupervisorData()
    } catch (err: any) {
      console.error('Error reviewing case summary:', err)
      setError('Failed to review case summary')
    }
  }

  if (!profile || profile.role !== 'supervisor') {
    return (
      <div className="p-6">
        <div className="bg-white border border-gray-200 rounded-xl p-6 text-center">
          <AlertTriangle className="w-8 h-8 text-amber-600 mx-auto mb-2" />
          <h3 className="text-gray-900 font-semibold">Supervisor access only</h3>
          <p className="text-sm text-gray-600 mt-1">This dashboard is only available to supervisors.</p>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="p-6 grid place-items-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    )
  }

  const renderOverview = () => (
    <div className="space-y-6">
      {/* Contract Status */}
      {contract && (
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Shield className="w-5 h-5 text-blue-600" />
            Current Contract
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <div className="text-sm text-gray-600">Contract Period</div>
              <div className="font-medium text-gray-900">
                {new Date(contract.trimester_start).toLocaleDateString()} - {new Date(contract.trimester_end).toLocaleDateString()}
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-600">Rate & Hours</div>
              <div className="font-medium text-gray-900">
                ${contract.hourly_rate}/hour • {contract.total_hours} hours
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-600">Total Value</div>
              <div className="font-bold text-green-600">${contract.total_amount}</div>
            </div>
          </div>
        </div>
      )}

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Open Flags</p>
              <p className="text-3xl font-bold text-red-600">{flags.filter(f => f.status === 'open').length}</p>
            </div>
            <AlertTriangle className="w-8 h-8 text-red-600" />
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">In Progress</p>
              <p className="text-3xl font-bold text-amber-600">{flags.filter(f => f.status === 'in_progress').length}</p>
            </div>
            <Clock className="w-8 h-8 text-amber-600" />
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Cases Reviewed</p>
              <p className="text-3xl font-bold text-green-600">{caseSummaries.length}</p>
            </div>
            <FileText className="w-8 h-8 text-green-600" />
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Active Therapists</p>
              <p className="text-3xl font-bold text-blue-600">
                {Array.from(new Set(flags.map(f => f.therapist_id))).length}
              </p>
            </div>
            <Users className="w-8 h-8 text-blue-600" />
          </div>
        </div>
      </div>

      {/* Recent Flags */}
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Supervision Flags</h3>
        
        {flags.length === 0 ? (
          <div className="text-center py-8">
            <AlertTriangle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-600">No active supervision flags</p>
          </div>
        ) : (
          <div className="space-y-3">
            {flags.slice(0, 5).map((flag) => (
              <div key={flag.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="font-medium text-gray-900">
                      Case {flag.case?.case_number} - {flag.therapist?.first_name} {flag.therapist?.last_name}
                    </div>
                    <div className="text-sm text-gray-600 mt-1">{flag.reason}</div>
                    <div className="text-xs text-gray-500 mt-1">
                      Flagged: {new Date(flag.created_at).toLocaleDateString()}
                      • Priority: {flag.priority}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full ${
                      flag.status === 'open' ? 'bg-red-100 text-red-700' :
                      flag.status === 'in_progress' ? 'bg-amber-100 text-amber-700' :
                      'bg-green-100 text-green-700'
                    }`}>
                      {flag.status.replace('_', ' ')}
                    </span>
                    
                    <button
                      onClick={() => {
                        const resolution = prompt('Enter your supervision feedback:')
                        if (resolution) resolveFlag(flag.id, resolution)
                      }}
                      className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
                    >
                      <CheckCircle className="w-4 h-4" />
                      Resolve
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )

  const renderFlags = () => (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-gray-900">All Supervision Flags</h3>
      
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Case</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Therapist</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Reason</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Priority</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {flags.map((flag) => (
                <tr key={flag.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">
                    {flag.case?.case_number || 'Unknown'}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {flag.therapist?.first_name} {flag.therapist?.last_name}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-700 max-w-xs truncate">
                    {flag.reason}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full ${
                      flag.priority >= 3 ? 'bg-red-100 text-red-700' :
                      flag.priority === 2 ? 'bg-amber-100 text-amber-700' :
                      'bg-green-100 text-green-700'
                    }`}>
                      {flag.priority >= 3 ? 'High' : flag.priority === 2 ? 'Medium' : 'Low'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full ${
                      flag.status === 'open' ? 'bg-red-100 text-red-700' :
                      flag.status === 'in_progress' ? 'bg-amber-100 text-amber-700' :
                      'bg-green-100 text-green-700'
                    }`}>
                      {flag.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {new Date(flag.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          const resolution = prompt('Enter your supervision feedback:')
                          if (resolution) resolveFlag(flag.id, resolution)
                        }}
                        className="text-blue-600 hover:text-blue-800"
                        title="Resolve flag"
                      >
                        <CheckCircle className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => window.open(`/therapist/case-summary/${flag.case_id}`, '_blank')}
                        className="text-gray-600 hover:text-gray-800"
                        title="View case"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )

  const renderCases = () => (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-gray-900">Case Summaries</h3>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {caseSummaries.map((summary) => (
          <div key={summary.case_id} className="bg-white border border-gray-200 rounded-xl p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h4 className="font-semibold text-gray-900">{summary.title}</h4>
                <div className="text-sm text-gray-600">
                  Case {summary.case?.case_number} • {summary.therapist?.first_name} {summary.therapist?.last_name}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  Updated: {new Date(summary.updated_at).toLocaleDateString()}
                </div>
              </div>
              
              <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full ${
                summary.case?.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
              }`}>
                {summary.case?.status}
              </span>
            </div>

            {summary.last_highlight && (
              <div className="bg-gray-50 rounded-lg p-3 mb-4">
                <div className="text-sm text-gray-700">{summary.last_highlight}</div>
              </div>
            )}

            {summary.ai_summary && (
              <div className="bg-blue-50 rounded-lg p-3 mb-4">
                <div className="text-sm font-medium text-blue-900 mb-1">Supervisor Feedback</div>
                <div className="text-sm text-blue-800">{summary.ai_summary}</div>
              </div>
            )}

            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  const feedback = prompt('Enter your supervision feedback:')
                  if (feedback) reviewCaseSummary(summary.case_id, feedback)
                }}
                className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
              >
                <MessageSquare className="w-4 h-4" />
                Add Feedback
              </button>
              
              <button
                onClick={() => window.open(`/therapist/case-summary/${summary.case_id}`, '_blank')}
                className="inline-flex items-center gap-1 px-3 py-1.5 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm"
              >
                <Eye className="w-4 h-4" />
                View Full Case
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )

  const renderContract = () => (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-gray-900">Contract Details</h3>
      
      {contract ? (
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700">Contract Name</label>
                <div className="mt-1 text-sm text-gray-900">{contract.contract_name}</div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Period</label>
                <div className="mt-1 text-sm text-gray-900">
                  {new Date(contract.trimester_start).toLocaleDateString()} - {new Date(contract.trimester_end).toLocaleDateString()}
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Status</label>
                <div className="mt-1">
                  <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full ${
                    contract.status === 'active' ? 'bg-green-100 text-green-700' :
                    contract.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                    'bg-red-100 text-red-700'
                  }`}>
                    {contract.status}
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700">Hourly Rate</label>
                <div className="mt-1 text-sm text-gray-900">${contract.hourly_rate}</div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Total Hours</label>
                <div className="mt-1 text-sm text-gray-900">{contract.total_hours} hours</div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Total Amount</label>
                <div className="mt-1 text-lg font-bold text-green-600">${contract.total_amount}</div>
              </div>
            </div>
          </div>

          {contract.notes && (
            <div className="mt-6 pt-6 border-t border-gray-200">
              <label className="text-sm font-medium text-gray-700">Notes</label>
              <div className="mt-1 text-sm text-gray-700 whitespace-pre-wrap">{contract.notes}</div>
            </div>
          )}

          {contract.signed_at && (
            <div className="mt-4 text-sm text-gray-600">
              Signed: {new Date(contract.signed_at).toLocaleDateString()}
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl p-6 text-center">
          <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <h4 className="text-lg font-medium text-gray-900 mb-2">No Active Contract</h4>
          <p className="text-gray-600">Contact admin to set up your supervision contract</p>
        </div>
      )}
    </div>
  )

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Shield className="w-6 h-6 text-blue-600" />
            Supervisor Dashboard
          </h2>
          <p className="text-gray-600 mt-1">Manage supervision activities and review cases</p>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-600" />
            <span className="text-red-800">{error}</span>
          </div>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'overview', name: 'Overview', icon: BarChart3 },
            { id: 'flags', name: 'Supervision Flags', icon: AlertTriangle },
            { id: 'cases', name: 'Case Reviews', icon: FileText },
            { id: 'contract', name: 'Contract', icon: Calendar }
          ].map((tab) => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.name}
              </button>
            )
          })}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && renderOverview()}
      {activeTab === 'flags' && renderFlags()}
      {activeTab === 'cases' && renderCases()}
      {activeTab === 'contract' && renderContract()}
    </div>
  )
}

export default SupervisorDashboard