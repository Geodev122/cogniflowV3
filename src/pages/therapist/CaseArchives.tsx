import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { 
  Search, Filter, ArrowUpDown, ExternalLink, ArrowRightLeft, Send, RotateCcw,
  Archive, FileText, User, Calendar, AlertTriangle, CheckCircle, Clock,
  Eye, MessageSquare, Upload, X, Plus
} from 'lucide-react'

type CaseRow = {
  id: string
  case_number: string | null
  client_name: string | null
  therapist_name: string | null
  status: 'archived' | 'closed'
  archived_at: string | null
  closed_at: string | null
  last_session_at: string | null
  archive_reason: string | null
  diagnosis_codes: string[] | null
}

type SupervisionModalData = {
  caseId: string
  caseNumber: string | null
  clientName: string | null
}

type ReferralModalData = {
  caseId: string
  caseNumber: string | null
  clientName: string | null
}

type TherapistOption = {
  id: string
  name: string
  email: string
  specializations: string[]
}

export default function CaseArchives() {
  const navigate = useNavigate()
  const { profile } = useAuth()
  
  const [rows, setRows] = useState<CaseRow[]>([])
  const [q, setQ] = useState('')
  const [statusFilter, setStatusFilter] = useState<Set<'archived'|'closed'>>(new Set(['archived']))
  const [loading, setLoading] = useState(true)
  const [sort, setSort] = useState<'archived_at_desc'|'archived_at_asc'>('archived_at_desc')
  const [error, setError] = useState<string | null>(null)

  // Modal states
  const [supervisionModal, setSupervisionModal] = useState<SupervisionModalData | null>(null)
  const [referralModal, setReferralModal] = useState<ReferralModalData | null>(null)
  const [therapistOptions, setTherapistOptions] = useState<TherapistOption[]>([])
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => { 
    if (profile?.role === 'therapist') {
      fetchRows()
      loadTherapistOptions()
    }
  }, [statusFilter, q, sort, profile])

  const fetchRows = async () => {
    if (!profile) return
    
    setLoading(true)
    setError(null)
    
    try {
      const statuses = Array.from(statusFilter.values())
      
      let query = supabase
        .from('cases')
        .select(`
          id,
          case_number,
          status,
          archived_at,
          closed_at,
          last_session_at,
          archive_reason,
          diagnosis_codes,
          client:profiles!cases_client_id_fkey(first_name, last_name),
          therapist:profiles!cases_therapist_id_fkey(first_name, last_name)
        `)
        .eq('therapist_id', profile.id)
        .in('status', statuses.length ? statuses : ['archived', 'closed'])

      if (q.trim()) {
        const searchTerm = `%${q.trim()}%`
        query = query.or(`case_number.ilike.${searchTerm},id.ilike.${searchTerm}`)
      }

      if (sort === 'archived_at_desc') {
        query = query.order('archived_at', { ascending: false, nullsFirst: false })
      } else {
        query = query.order('archived_at', { ascending: true, nullsFirst: true })
      }

      const { data, error } = await query

      if (error) throw error

      const normalized: CaseRow[] = (data || []).map((r: any) => ({
        id: r.id,
        case_number: r.case_number,
        client_name: r.client ? `${r.client.first_name || ''} ${r.client.last_name || ''}`.trim() : null,
        therapist_name: r.therapist ? `${r.therapist.first_name || ''} ${r.therapist.last_name || ''}`.trim() : null,
        status: r.status,
        archived_at: r.archived_at,
        closed_at: r.closed_at,
        last_session_at: r.last_session_at,
        archive_reason: r.archive_reason,
        diagnosis_codes: r.diagnosis_codes
      }))

      setRows(normalized)
    } catch (e: any) {
      console.error('[CaseArchives] fetch error:', e)
      setError('Failed to load archived cases')
      setRows([])
    } finally {
      setLoading(false)
    }
  }

  const loadTherapistOptions = async () => {
    if (!profile) return
    
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, email, professional_details')
        .eq('role', 'therapist')
        .eq('is_active', true)
        .neq('id', profile.id) // Exclude self
        .order('first_name')

      if (error) throw error

      const options: TherapistOption[] = (data || []).map(t => ({
        id: t.id,
        name: `${t.first_name || ''} ${t.last_name || ''}`.trim(),
        email: t.email || '',
        specializations: t.professional_details?.specializations || []
      }))

      setTherapistOptions(options)
    } catch (e: any) {
      console.error('[CaseArchives] load therapists error:', e)
    }
  }

  const manage = (id: string) => {
    navigate(`/therapist/cases/${id}/summary?mode=readOnly`)
  }

  const openSupervisionModal = (row: CaseRow) => {
    setSupervisionModal({
      caseId: row.id,
      caseNumber: row.case_number,
      clientName: row.client_name
    })
  }

  const openReferralModal = (row: CaseRow) => {
    setReferralModal({
      caseId: row.id,
      caseNumber: row.case_number,
      clientName: row.client_name
    })
  }

  const submitSupervision = async (data: {
    notes: string
    priority: number
    supervisorId?: string
    attachments?: File[]
  }) => {
    if (!supervisionModal) return
    
    setSubmitting(true)
    try {
      // Handle file uploads first if any
      const attachmentData = []
      if (data.attachments?.length) {
        for (const file of data.attachments) {
          const filePath = `${profile!.id}/${Date.now()}_${file.name}`
          const { error: uploadError } = await supabase.storage
            .from('supervision-attachments')
            .upload(filePath, file)
          
          if (!uploadError) {
            attachmentData.push({
              filename: file.name,
              file_path: filePath,
              file_size: file.size,
              mime_type: file.type
            })
          }
        }
      }

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/submit-supervision`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          caseId: supervisionModal.caseId,
          supervisorId: data.supervisorId,
          title: `Supervision Request - ${supervisionModal.caseNumber || 'Case'}`,
          notes: data.notes,
          priority: data.priority,
          attachments: attachmentData
        })
      })

      const result = await response.json()
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to submit supervision request')
      }

      setSupervisionModal(null)
      alert('Supervision request submitted successfully')
      
      // Navigate to case management with supervision banner
      navigate(`/therapist/cases/${supervisionModal.caseId}/summary`, {
        state: { supervisionSubmitted: true }
      })
    } catch (e: any) {
      console.error('[CaseArchives] submit supervision error:', e)
      alert(e.message || 'Failed to submit supervision request')
    } finally {
      setSubmitting(false)
    }
  }

  const submitReferral = async (data: {
    toTherapistId: string
    reason: string
    notes: string
  }) => {
    if (!referralModal) return
    
    setSubmitting(true)
    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/request-referral`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          caseId: referralModal.caseId,
          toTherapistId: data.toTherapistId,
          reason: data.reason,
          notes: data.notes
        })
      })

      const result = await response.json()
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to submit referral request')
      }

      setReferralModal(null)
      alert(`Referral request sent to ${result.targetTherapist.name}`)
      
      // Navigate to case management with referral banner
      navigate(`/therapist/cases/${referralModal.caseId}/summary`, {
        state: { referralSubmitted: true, targetTherapist: result.targetTherapist }
      })
    } catch (e: any) {
      console.error('[CaseArchives] submit referral error:', e)
      alert(e.message || 'Failed to submit referral request')
    } finally {
      setSubmitting(false)
    }
  }

  const reopen = async (id: string, caseNumber: string | null) => {
  if (!(await confirmAsync({ title: 'Re-open case', description: `Re-open case ${caseNumber || id.slice(0, 8)}? This will make it active again.` }))) return
    
    try {
      const { error } = await supabase
        .from('cases')
        .update({ 
          status: 'active', 
          archived_at: null, 
          closed_at: null,
          last_activity_at: new Date().toISOString()
        })
        .eq('id', id)
      
      if (error) throw error
      
      // Log the action
      await supabase.rpc('log_case_action', {
        case_id_param: id,
        actor_id_param: profile!.id,
        action_param: 'REOPEN_CASE',
        details_param: { reason: 'Reopened from archives' }
      })
      
      alert('Case reopened successfully')
      await fetchRows()
      
      // Navigate to the reopened case
      navigate(`/therapist/cases/${id}/summary`)
    } catch (e: any) {
      console.error('[CaseArchives] reopen error:', e)
      alert('Failed to reopen case: ' + e.message)
    }
  }

  const toggle = <T,>(set: Set<T>, setter: (v: Set<T>) => void, value: T) => {
    const newSet = new Set(set)
    if (newSet.has(value)) {
      newSet.delete(value)
    } else {
      newSet.add(value)
    }
    setter(newSet)
  }

  const fmt = (dateString: string | null) => 
    dateString ? new Date(dateString).toLocaleDateString() : '—'

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'archived': return 'bg-gray-100 text-gray-700'
      case 'closed': return 'bg-red-100 text-red-700'
      default: return 'bg-blue-100 text-blue-700'
    }
  }

  if (!profile || profile.role !== 'therapist') {
    return (
      <div className="p-6">
        <div className="bg-white border border-gray-200 rounded-xl p-6 text-center">
          <AlertTriangle className="w-8 h-8 text-amber-600 mx-auto mb-2" />
          <h3 className="text-gray-900 font-semibold">Therapist access only</h3>
          <p className="text-sm text-gray-600 mt-1">This section is only available to therapists.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Archive className="w-6 h-6 text-gray-600" />
            Case Archives
          </h2>
          <p className="text-gray-600 mt-1">
            Manage archived and closed cases. Submit for supervision or refer to other therapists.
          </p>
        </div>
        <div className="text-sm text-gray-500">
          {rows.length} case{rows.length !== 1 ? 's' : ''} found
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white border border-gray-200 rounded-xl p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
            <input
              className="pl-9 pr-3 py-2 rounded-lg border border-gray-300 w-72 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Search case number or client name..."
              value={q}
              onChange={e => setQ(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-400" />
            <button
              className={`px-3 py-1.5 rounded-full border text-sm transition-colors ${
                statusFilter.has('archived') 
                  ? 'bg-gray-900 text-white border-gray-900' 
                  : 'border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
              onClick={() => toggle(statusFilter, setStatusFilter, 'archived')}
            >
              Archived
            </button>
            <button
              className={`px-3 py-1.5 rounded-full border text-sm transition-colors ${
                statusFilter.has('closed') 
                  ? 'bg-gray-900 text-white border-gray-900' 
                  : 'border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
              onClick={() => toggle(statusFilter, setStatusFilter, 'closed')}
            >
              Closed
            </button>
          </div>

          <button
            className="ml-auto inline-flex items-center gap-1 px-3 py-2 rounded-lg border border-gray-300 text-sm hover:bg-gray-50"
            onClick={() => setSort(s => s === 'archived_at_desc' ? 'archived_at_asc' : 'archived_at_desc')}
          >
            <ArrowUpDown className="h-4 w-4" />
            Sort by {sort === 'archived_at_desc' ? 'Newest' : 'Oldest'}
          </button>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-600" />
            <span className="text-red-800">{error}</span>
          </div>
        </div>
      )}

      {/* Cases Table */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
        {loading ? (
          <div className="p-12 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4" />
            <p className="text-gray-600">Loading archived cases...</p>
          </div>
        ) : rows.length === 0 ? (
          <div className="p-12 text-center">
            <Archive className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No archived cases found</h3>
            <p className="text-gray-600">
              {q || statusFilter.size < 2 
                ? 'Try adjusting your search or filters.'
                : 'You haven\'t archived any cases yet. Cases can be archived from their management page.'
              }
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr className="text-left">
                  <th className="px-4 py-3 font-medium text-gray-900">Case</th>
                  <th className="px-4 py-3 font-medium text-gray-900">Client</th>
                  <th className="px-4 py-3 font-medium text-gray-900">Status</th>
                  <th className="px-4 py-3 font-medium text-gray-900">Archived</th>
                  <th className="px-4 py-3 font-medium text-gray-900">Last Session</th>
                  <th className="px-4 py-3 font-medium text-gray-900">Diagnosis</th>
                  <th className="px-4 py-3 font-medium text-gray-900">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {rows.map(row => (
                  <tr key={row.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div>
                        <div className="font-medium text-gray-900">
                          {row.case_number || `Case ${row.id.slice(0, 8)}`}
                        </div>
                        <div className="text-xs text-gray-500 font-mono">
                          {row.id.slice(0, 8)}...
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-gray-400" />
                        <span className="text-gray-900">{row.client_name || '—'}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(row.status)}`}>
                        {row.status}
                      </span>
                      {row.archive_reason && (
                        <div className="text-xs text-gray-500 mt-1" title={row.archive_reason}>
                          {row.archive_reason.slice(0, 30)}...
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      {fmt(row.archived_at || row.closed_at)}
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      {fmt(row.last_session_at)}
                    </td>
                    <td className="px-4 py-3">
                      {row.diagnosis_codes?.length ? (
                        <div className="flex flex-wrap gap-1">
                          {row.diagnosis_codes.slice(0, 2).map(code => (
                            <span key={code} className="inline-flex items-center px-2 py-0.5 text-xs bg-blue-100 text-blue-700 rounded">
                              {code}
                            </span>
                          ))}
                          {row.diagnosis_codes.length > 2 && (
                            <span className="text-xs text-gray-500">+{row.diagnosis_codes.length - 2}</span>
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button 
                          className="inline-flex items-center gap-1 px-2 py-1 border border-gray-300 rounded-lg text-xs hover:bg-gray-50 transition-colors"
                          onClick={() => manage(row.id)}
                          title="Open case in read-only mode"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          Manage
                        </button>
                        <button 
                          className="inline-flex items-center gap-1 px-2 py-1 border border-blue-300 bg-blue-50 text-blue-700 rounded-lg text-xs hover:bg-blue-100 transition-colors"
                          onClick={() => openSupervisionModal(row)}
                          title="Submit case for supervision"
                        >
                          <Send className="h-3.5 w-3.5" />
                          Supervise
                        </button>
                        <button 
                          className="inline-flex items-center gap-1 px-2 py-1 border border-purple-300 bg-purple-50 text-purple-700 rounded-lg text-xs hover:bg-purple-100 transition-colors"
                          onClick={() => openReferralModal(row)}
                          title="Refer case to another therapist"
                        >
                          <ArrowRightLeft className="h-3.5 w-3.5" />
                          Refer
                        </button>
                        <button 
                          className="inline-flex items-center gap-1 px-2 py-1 border border-green-300 bg-green-50 text-green-700 rounded-lg text-xs hover:bg-green-100 transition-colors"
                          onClick={() => reopen(row.id, row.case_number)}
                          title="Reopen this case"
                        >
                          <RotateCcw className="h-3.5 w-3.5" />
                          Reopen
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Supervision Modal */}
      {supervisionModal && (
        <SupervisionModal
          data={supervisionModal}
          onSubmit={submitSupervision}
          onClose={() => setSupervisionModal(null)}
          submitting={submitting}
        />
      )}

      {/* Referral Modal */}
      {referralModal && (
        <ReferralModal
          data={referralModal}
          therapistOptions={therapistOptions}
          onSubmit={submitReferral}
          onClose={() => setReferralModal(null)}
          submitting={submitting}
        />
      )}
    </div>
  )
}

// Supervision Modal Component
const SupervisionModal: React.FC<{
  data: SupervisionModalData
  onSubmit: (data: {
    notes: string
    priority: number
    supervisorId?: string
    attachments?: File[]
  }) => void
  onClose: () => void
  submitting: boolean
}> = ({ data, onSubmit, onClose, submitting }) => {
  const [notes, setNotes] = useState('')
  const [priority, setPriority] = useState(1)
  const [supervisorId, setSupervisorId] = useState('')
  const [attachments, setAttachments] = useState<File[]>([])
  const [supervisors, setSupervisors] = useState<Array<{id: string, name: string}>>([])

  useEffect(() => {
    const loadSupervisors = async () => {
      const { data } = await supabase
        .from('profiles')
        .select('id, first_name, last_name')
        .eq('role', 'supervisor')
        .eq('is_active', true)
      
      setSupervisors((data || []).map(s => ({
        id: s.id,
        name: `${s.first_name || ''} ${s.last_name || ''}`.trim()
      })))
    }
    loadSupervisors()
  }, [])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit({
      notes,
      priority,
      supervisorId: supervisorId || undefined,
      attachments: attachments.length ? attachments : undefined
    })
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setAttachments(Array.from(e.target.files))
    }
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen p-4">
        <div className="fixed inset-0 bg-gray-900/50" onClick={onClose} />
        <div className="relative bg-white rounded-xl shadow-xl max-w-2xl w-full">
          <form onSubmit={handleSubmit}>
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Submit for Supervision</h3>
                  <p className="text-sm text-gray-600">
                    Case: {data.caseNumber || data.caseId.slice(0, 8)} • Client: {data.clientName || '—'}
                  </p>
                </div>
                <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Supervisor (Optional)
                </label>
                <select
                  value={supervisorId}
                  onChange={(e) => setSupervisorId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Any available supervisor</option>
                  {supervisors.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Priority Level
                </label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value={1}>Low - Routine consultation</option>
                  <option value={2}>Medium - Clinical guidance needed</option>
                  <option value={3}>High - Complex case requiring attention</option>
                  <option value={4}>Urgent - Safety concerns</option>
                  <option value={5}>Critical - Immediate supervision required</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Notes for Supervisor *
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={4}
                  required
                  placeholder="Describe the specific areas where you need supervision, any concerns, or questions you have about this case..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Attachments (Optional)
                </label>
                <input
                  type="file"
                  multiple
                  accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png"
                  onChange={handleFileChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                {attachments.length > 0 && (
                  <div className="mt-2 text-sm text-gray-600">
                    {attachments.length} file(s) selected: {attachments.map(f => f.name).join(', ')}
                  </div>
                )}
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!notes.trim() || submitting}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {submitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    Submit Request
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

// Referral Modal Component
const ReferralModal: React.FC<{
  data: ReferralModalData
  therapistOptions: TherapistOption[]
  onSubmit: (data: {
    toTherapistId: string
    reason: string
    notes: string
  }) => void
  onClose: () => void
  submitting: boolean
}> = ({ data, therapistOptions, onSubmit, onClose, submitting }) => {
  const [toTherapistId, setToTherapistId] = useState('')
  const [reason, setReason] = useState('')
  const [notes, setNotes] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit({ toTherapistId, reason, notes })
  }

  const selectedTherapist = therapistOptions.find(t => t.id === toTherapistId)

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen p-4">
        <div className="fixed inset-0 bg-gray-900/50" onClick={onClose} />
        <div className="relative bg-white rounded-xl shadow-xl max-w-2xl w-full">
          <form onSubmit={handleSubmit}>
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Refer Case</h3>
                  <p className="text-sm text-gray-600">
                    Case: {data.caseNumber || data.caseId.slice(0, 8)} • Client: {data.clientName || '—'}
                  </p>
                </div>
                <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Refer to Therapist *
                </label>
                <select
                  value={toTherapistId}
                  onChange={(e) => setToTherapistId(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select a therapist...</option>
                  {therapistOptions.map(t => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.email})
                    </option>
                  ))}
                </select>
                {selectedTherapist?.specializations?.length > 0 && (
                  <div className="mt-2 text-sm text-gray-600">
                    Specializations: {selectedTherapist.specializations.join(', ')}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Reason for Referral *
                </label>
                <select
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select a reason...</option>
                  <option value="geographic_relocation">Client relocating to different area</option>
                  <option value="specialization_mismatch">Need therapist with different specialization</option>
                  <option value="scheduling_conflict">Scheduling conflicts</option>
                  <option value="therapeutic_relationship">Therapeutic relationship concerns</option>
                  <option value="complexity_level">Case complexity beyond current scope</option>
                  <option value="personal_circumstances">Personal circumstances</option>
                  <option value="other">Other (specify in notes)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Additional Notes
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={4}
                  placeholder="Provide any additional context, client preferences, or important information for the receiving therapist..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-amber-900">Important</h4>
                    <p className="text-sm text-amber-800 mt-1">
                      The receiving therapist will be notified and can accept or decline this referral. 
                      If accepted, case ownership will transfer to them.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!toTherapistId || !reason || submitting}
                className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
              >
                {submitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                    Sending...
                  </>
                ) : (
                  <>
                    <ArrowRightLeft className="w-4 h-4" />
                    Send Referral
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}