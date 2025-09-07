// src/components/therapist/CaseManagement.tsx
import React, { useEffect, useMemo, useState, useCallback } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { getRiskColor, getStatusColor, formatDate, isRecursionError } from '../../utils/helpers'
import { CaseFormulation } from './CaseFormulation'
import { InBetweenSessions } from './InBetweenSessions'
import {
  FileText,
  User,
  Calendar,
  TrendingUp,
  ClipboardList,
  Plus,
  Search,
  Filter,
  Eye,
  BarChart3,
  Target,
  MessageSquare,
  Send,
  AlertTriangle,
} from 'lucide-react'

/* =========================
   Types
========================= */

interface Client {
  id: string
  first_name: string
  last_name: string
  email: string
  created_at: string
}

interface Assessment {
  id: string
  assessment_name: string
  score: number
  max_score: number
  date: string
  interpretation: string
}

interface Intervention {
  id: string
  description: string
}

interface Goal {
  id: string
  title: string
  description: string
  target_date: string
  progress: number
  status: 'active' | 'completed' | 'achieved' | 'modified' | 'discontinued'
  interventions: Intervention[]
}

interface Assignment {
  id: string
  type: 'worksheet' | 'exercise' | 'assessment' | 'homework'
  title: string
  description: string
  due_date: string | null
  status: 'assigned' | 'in_progress' | 'completed' | 'overdue'
  assigned_date: string
}

interface CaseFile {
  client: Client
  sessionCount: number
  lastSession?: string
  nextAppointment?: string
  assessments: Assessment[]
  treatmentPlanId?: string
  treatmentPlanTitle?: string
  goals: Goal[]
  assignments: Assignment[]
  riskLevel: string
  progressSummary: string
  caseNotes: string
  caseId?: string
  caseNumber?: string
}

/* =========================
   Component
========================= */

export const CaseManagement: React.FC = () => {
  const [caseFiles, setCaseFiles] = useState<CaseFile[]>([])
  const [selectedCase, setSelectedCase] = useState<CaseFile | null>(null)
  const [activeTab, setActiveTab] = useState<
    'overview' | 'formulation' | 'goals' | 'assignments' | 'between-sessions' | 'progress' | 'notes'
  >('overview')

  const [searchTerm, setSearchTerm] = useState('')
  const [riskFilter, setRiskFilter] = useState('all')
  const [loading, setLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const [showNewAssignment, setShowNewAssignment] = useState(false) // (kept for parity with your UX)
  const { profile } = useAuth()

  /* ---------- Data Fetch (batched) ---------- */

  const fetchCaseFiles = useCallback(async () => {
    if (!profile) return
    setLoading(true)
    setErrorMsg(null)

    try {
      // 1) active cases + client basics
      const { data: casesData, error: casesError } = await supabase
        .from('cases')
        .select(
          `
          id, case_number, client_id, therapist_id, status, created_at,
          profiles:profiles!cases_client_id_fkey (
            id, first_name, last_name, email, created_at
          )
        `
        )
        .eq('therapist_id', profile.id)
        .eq('status', 'active')
        .order('created_at', { ascending: false })

      if (casesError) {
        if (isRecursionError(casesError)) {
          console.error('RLS recursion error in case management:', casesError)
        } else {
          console.error('Error fetching cases:', casesError)
        }
        setCaseFiles([])
        return
      }

      if (!casesData || !casesData.length) {
        setCaseFiles([])
        return
      }

      const clientIds = Array.from(
        new Set(
          (casesData || [])
            .map((c: any) => c.profiles?.id)
            .filter(Boolean)
        )
      ) as string[]

      // 2) batch fetch all related tables
      // appointments for these clients & therapist
      const [{ data: appts }, { data: plans }, { data: profiles }, { data: assignments }, { data: goalRows }] =
        await Promise.all([
          supabase
            .from('appointments')
            .select('id, client_id, therapist_id, appointment_date, status')
            .eq('therapist_id', profile.id)
            .in('client_id', clientIds),

          supabase
            .from('treatment_plans')
            .select('id, client_id, therapist_id, title, status')
            .eq('therapist_id', profile.id)
            .in('client_id', clientIds),

          supabase
            .from('client_profiles')
            .select('client_id, therapist_id, risk_level, notes')
            .eq('therapist_id', profile.id)
            .in('client_id', clientIds),

          supabase
            .from('form_assignments')
            .select('id, client_id, therapist_id, form_type, title, instructions, status, due_date, assigned_at')
            .eq('therapist_id', profile.id)
            .in('client_id', clientIds),

          // goals for all plans in one go
          // (fetch after plans exist — but here we request with empty list fallback)
          (async () => {
            const planIds = (plans || []).map((p: any) => p.id)
            if (!planIds.length) return { data: [] as any[] }
            return await supabase
              .from('therapy_goals')
              .select('id, treatment_plan_id, goal_text, notes, target_date, progress_percentage, status, created_at')
              .in('treatment_plan_id', planIds)
              .order('created_at', { ascending: false })
          })(),
        ])

      // Guard: if RLS or other failures silently return null data
      const safeAppts = appts || []
      const safePlans = plans || []
      const safeProfiles = profiles || []
      const safeAssignments = assignments || []
      const safeGoals = goalRows || []

      // helper maps
      const planByClient = new Map<string, any>()
      for (const p of safePlans) {
        // choose first active or most recent; keep it simple
        if (!planByClient.has(p.client_id)) planByClient.set(p.client_id, p)
      }

      const goalsByPlan = new Map<string, any[]>()
      for (const g of safeGoals) {
        const arr = goalsByPlan.get(g.treatment_plan_id) || []
        arr.push(g)
        goalsByPlan.set(g.treatment_plan_id, arr)
      }

      const assignmentsByClient = new Map<string, any[]>()
      for (const a of safeAssignments) {
        const arr = assignmentsByClient.get(a.client_id) || []
        arr.push(a)
        assignmentsByClient.set(a.client_id, arr)
      }

      const apptsByClient = new Map<string, any[]>()
      for (const a of safeAppts) {
        const arr = apptsByClient.get(a.client_id) || []
        arr.push(a)
        apptsByClient.set(a.client_id, arr)
      }

      const clientProfileByClient = new Map<string, any>()
      for (const cp of safeProfiles) {
        clientProfileByClient.set(cp.client_id, cp)
      }

      // compose CaseFile[]
      const composed: CaseFile[] = (casesData || [])
        .map((c: any) => {
          const client: Client | null = c.profiles
            ? {
                id: c.profiles.id,
                first_name: c.profiles.first_name,
                last_name: c.profiles.last_name,
                email: c.profiles.email,
                created_at: c.profiles.created_at,
              }
            : null

          if (!client) return null

          const clientAppts = (apptsByClient.get(client.id) || []).slice().sort((a, b) =>
            new Date(a.appointment_date).getTime() - new Date(b.appointment_date).getTime()
          )

          const completed = clientAppts.filter((a) => a.status === 'completed')
          const upcoming = clientAppts.filter(
            (a) => a.status === 'scheduled' && new Date(a.appointment_date) > new Date()
          )

          const plan = planByClient.get(client.id)
          const goalRowsForPlan = plan ? goalsByPlan.get(plan.id) || [] : []

          const goals: Goal[] = goalRowsForPlan.map((g: any) => ({
            id: g.id,
            title: g.goal_text,
            description: g.notes || '',
            target_date: g.target_date || '',
            progress: g.progress_percentage || 0,
            status: g.status,
            interventions: [],
          }))

          const assignedList = assignmentsByClient.get(client.id) || []
          const assignmentsMapped: Assignment[] = assignedList.map((a: any) => ({
            id: a.id,
            type: a.form_type,
            title: a.title,
            description: a.instructions || '',
            due_date: a.due_date || null,
            status: a.status,
            assigned_date: a.assigned_at,
          }))

          const cp = clientProfileByClient.get(client.id)

          return {
            client,
            caseId: c.id,
            caseNumber: c.case_number,
            sessionCount: completed.length,
            lastSession: completed.length ? completed[completed.length - 1].appointment_date : undefined,
            nextAppointment: upcoming.length ? upcoming[0].appointment_date : undefined,
            assessments: [], // hook up later when you add assessment results table
            treatmentPlanId: plan?.id,
            treatmentPlanTitle: plan?.title,
            goals,
            assignments: assignmentsMapped,
            riskLevel: cp?.risk_level || 'low',
            progressSummary: cp?.notes || 'No progress notes available',
            caseNotes: cp?.notes || '',
          } as CaseFile
        })
        .filter(Boolean) as CaseFile[]

      setCaseFiles(composed)
    } catch (err: any) {
      console.error('Error fetching case files (batched):', err)
      if (isRecursionError(err)) {
        console.error('RLS recursion detected in case management')
      } else {
        setErrorMsg('Failed to load cases. Please try again.')
      }
      setCaseFiles([])
    } finally {
      setLoading(false)
    }
  }, [profile])

  useEffect(() => {
    if (profile) fetchCaseFiles()
  }, [profile, fetchCaseFiles])

  /* ---------- Mutations (kept simple; same behavior as before) ---------- */

  const handleCreatePlan = async () => {
    if (!selectedCase || !profile) return
    const title = prompt('Treatment plan title:')
    if (!title) return
    try {
      const { error } = await supabase.from('treatment_plans').insert({
        client_id: selectedCase.client.id,
        therapist_id: profile.id,
        title,
        status: 'active',
      })
      if (error) throw error
      await fetchCaseFiles()
      alert('Treatment plan created successfully!')
    } catch (error) {
      console.error('Error creating plan:', error)
      alert('Error creating treatment plan. Please try again.')
    }
  }

  const handleAddGoal = async () => {
    if (!selectedCase?.treatmentPlanId) return
    const text = prompt('Goal description:')
    if (!text) return
    try {
      const { error } = await supabase.from('therapy_goals').insert({
        treatment_plan_id: selectedCase.treatmentPlanId,
        goal_text: text,
        progress_percentage: 0,
        status: 'active',
      })
      if (error) throw error
      await fetchCaseFiles()
      alert('Goal added successfully!')
    } catch (error) {
      console.error('Error adding goal:', error)
      alert('Error adding goal. Please try again.')
    }
  }

  const handleCompleteGoal = async (goalId: string) => {
    try {
      const { error } = await supabase
        .from('therapy_goals')
        .update({ progress_percentage: 100, status: 'achieved' })
        .eq('id', goalId)
      if (error) throw error
      await fetchCaseFiles()
      alert('Goal marked as achieved!')
    } catch (error) {
      console.error('Error updating goal:', error)
      alert('Error updating goal. Please try again.')
    }
  }

  const handleAddIntervention = async (goalId: string) => {
    const description = prompt('Intervention description:')
    if (!description) return
    try {
      const { data: goal } = await supabase.from('therapy_goals').select('notes').eq('id', goalId).single()
      const existingNotes = goal?.notes || ''
      const updatedNotes = existingNotes ? `${existingNotes}\n• ${description}` : `• ${description}`
      const { error } = await supabase.from('therapy_goals').update({ notes: updatedNotes }).eq('id', goalId)
      if (error) throw error
      await fetchCaseFiles()
      alert('Intervention added successfully!')
    } catch (error) {
      console.error('Error adding intervention:', error)
      alert('Error adding intervention. Please try again.')
    }
  }

  /* ---------- Filtering / Derived ---------- */

  const filteredCases = useMemo(() => {
    const term = searchTerm.trim().toLowerCase()
    return caseFiles.filter((c) => {
      const name = `${c.client.first_name} ${c.client.last_name}`.toLowerCase()
      const matchesSearch = !term || name.includes(term) || c.client.email.toLowerCase().includes(term)
      const matchesRisk = riskFilter === 'all' || c.riskLevel === riskFilter
      return matchesSearch && matchesRisk
    })
  }, [caseFiles, searchTerm, riskFilter])

  /* ---------- Loading / Error ---------- */

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (errorMsg) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-red-600" />
          <span className="text-red-800">{errorMsg}</span>
        </div>
      </div>
    )
  }

  /* ---------- Selected Case View ---------- */

  if (selectedCase) {
    return (
      <div className="space-y-6">
        {/* Case Header */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
            <button
              onClick={() => setSelectedCase(null)}
              className="text-blue-600 hover:text-blue-800 font-medium text-sm sm:text-base"
            >
              ← Back to Case Management
            </button>
            <div className={`inline-flex px-3 py-1 text-xs sm:text-sm font-medium rounded-full ${getRiskColor(
              selectedCase.riskLevel
            )}`}>
              Risk Level: {selectedCase.riskLevel}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
            <div className="min-w-0">
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900 truncate">
                {selectedCase.client.first_name} {selectedCase.client.last_name}
              </h2>
              <p className="text-gray-600 truncate">{selectedCase.client.email}</p>
              <p className="text-sm text-gray-500">
                Case: {selectedCase.caseNumber} • Client since {formatDate(selectedCase.client.created_at)}
              </p>
            </div>
            <div className="hidden sm:flex">
              <button
                onClick={() => setShowNewAssignment(true)}
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                <Send className="w-4 h-4 mr-2" />
                Assign Task
              </button>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="sticky top-0 z-10 bg-white/80 backdrop-blur border-b border-gray-200">
          <nav className="-mb-px flex gap-4 overflow-x-auto no-scrollbar px-1">
            {[
              { id: 'overview', name: 'Overview', icon: FileText },
              { id: 'formulation', name: 'Case Formulation', icon: Target },
              { id: 'goals', name: 'Goals & Treatment', icon: Target },
              { id: 'assignments', name: 'Assignments', icon: ClipboardList },
              { id: 'between-sessions', name: 'Between Sessions', icon: Calendar },
              { id: 'progress', name: 'Progress Tracking', icon: TrendingUp },
              { id: 'notes', name: 'Case Notes', icon: MessageSquare },
            ].map((tab) => {
              const Icon = tab.icon
              const isActive = activeTab === (tab.id as any)
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center gap-2 py-3 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                    isActive
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span>{tab.name}</span>
                </button>
              )
            })}
          </nav>
        </div>

        {/* Mobile FAB */}
        <button
          onClick={() => setShowNewAssignment(true)}
          className="sm:hidden fixed bottom-20 right-4 z-30 rounded-full shadow-lg bg-blue-600 hover:bg-blue-700 text-white w-14 h-14 flex items-center justify-center"
          aria-label="Assign Task"
        >
          <Send className="w-6 h-6" />
        </button>

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Case Summary & Assessments */}
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Case Summary</h3>
                <div className="prose prose-gray max-w-none">
                  <p className="text-gray-700">{selectedCase.progressSummary}</p>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Assessments</h3>
                {selectedCase.assessments.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">No assessments completed yet</p>
                ) : (
                  <div className="space-y-3">
                    {selectedCase.assessments.slice(0, 3).map((assessment) => (
                      <div
                        key={assessment.id}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                      >
                        <div>
                          <h4 className="font-medium text-gray-900">{assessment.assessment_name}</h4>
                          <p className="text-sm text-gray-600">{formatDate(assessment.date)}</p>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-bold text-gray-900">
                            {assessment.score}/{assessment.max_score}
                          </div>
                          <div className="text-xs text-gray-500">{assessment.interpretation}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Quick Stats & Actions */}
            <div className="space-y-6">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Stats</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Total Sessions</span>
                    <span className="font-semibold text-gray-900">{selectedCase.sessionCount}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Active Goals</span>
                    <span className="font-semibold text-gray-900">
                      {selectedCase.goals.filter((g) => g.status === 'active').length}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Pending Tasks</span>
                    <span className="font-semibold text-gray-900">
                      {selectedCase.assignments.filter((a) => a.status === 'assigned').length}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Last Session</span>
                    <span className="font-semibold text-gray-900">{formatDate(selectedCase.lastSession)}</span>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
                <div className="space-y-2">
                  <button className="w-full flex items-center gap-2 p-2.5 text-left hover:bg-gray-50 rounded-lg">
                    <ClipboardList className="w-4 h-4 text-blue-600" />
                    <span className="text-sm">Assign Assessment</span>
                  </button>
                  <button className="w-full flex items-center gap-2 p-2.5 text-left hover:bg-gray-50 rounded-lg">
                    <Target className="w-4 h-4 text-green-600" />
                    <span className="text-sm">Assign Worksheet</span>
                  </button>
                  <button className="w-full flex items-center gap-2 p-2.5 text-left hover:bg-gray-50 rounded-lg">
                    <Send className="w-4 h-4 text-purple-600" />
                    <span className="text-sm">Assign Exercise</span>
                  </button>
                  <button className="w-full flex items-center gap-2 p-2.5 text-left hover:bg-gray-50 rounded-lg">
                    <Calendar className="w-4 h-4 text-orange-600" />
                    <span className="text-sm">Schedule Session</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'formulation' && (
          <CaseFormulation caseFile={selectedCase} onUpdate={fetchCaseFiles} />
        )}

        {activeTab === 'goals' && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            {!selectedCase.treatmentPlanId ? (
              <div className="text-center py-8">
                <Target className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No treatment plan</h3>
                <p className="mt-1 text-sm text-gray-500">Create a plan to start setting goals.</p>
                <button
                  onClick={handleCreatePlan}
                  className="mt-4 inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  New Plan
                </button>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold text-gray-900">{selectedCase.treatmentPlanTitle}</h3>
                  <button
                    onClick={handleAddGoal}
                    className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Goal
                  </button>
                </div>

                {selectedCase.goals.length === 0 ? (
                  <div className="text-center py-8">
                    <Target className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-sm font-medium text-gray-900">No goals set</h3>
                    <p className="mt-1 text-sm text-gray-500">Start by adding treatment goals for this client.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {selectedCase.goals.map((goal) => (
                      <div key={goal.id} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium text-gray-900">{goal.title}</h4>
                            <p className="text-sm text-gray-600 mt-1">{goal.description}</p>
                            {goal.interventions.length > 0 && (
                              <ul className="mt-2 list-disc list-inside text-sm text-gray-600">
                                {goal.interventions.map((i) => (
                                  <li key={i.id}>{i.description}</li>
                                ))}
                              </ul>
                            )}
                            <button
                              onClick={() => handleAddIntervention(goal.id)}
                              className="mt-2 text-sm text-blue-600 hover:text-blue-800"
                            >
                              Add Intervention
                            </button>
                          </div>
                          <span
                            className={`inline-flex px-2.5 py-1 text-xs font-medium rounded-full ${getStatusColor(
                              goal.status
                            )}`}
                          >
                            {goal.status}
                          </span>
                        </div>

                        <div className="flex items-center justify-between mt-2">
                          <div className="flex items-center gap-4">
                            <div className="text-sm text-gray-500">Target: {formatDate(goal.target_date)}</div>
                            <div className="flex items-center gap-2">
                              <div className="w-24 bg-gray-200 rounded-full h-2">
                                <div className="bg-green-600 h-2 rounded-full" style={{ width: `${goal.progress}%` }} />
                              </div>
                              <span className="text-sm text-gray-600">{goal.progress}%</span>
                            </div>
                          </div>
                          {goal.progress < 100 && (
                            <button
                              onClick={() => handleCompleteGoal(goal.id)}
                              className="text-sm text-green-600 hover:text-green-800"
                            >
                              Mark Complete
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {activeTab === 'assignments' && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900">Client Assignments</h3>
              <button
                onClick={() => setShowNewAssignment(true)}
                className="hidden sm:inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                <Plus className="w-4 h-4 mr-2" />
                New Assignment
              </button>
            </div>

            {selectedCase.assignments.length === 0 ? (
              <div className="text-center py-8">
                <ClipboardList className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No assignments</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Assign worksheets, exercises, or assessments to this client.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {selectedCase.assignments.map((assignment) => (
                  <div key={assignment.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="font-medium text-gray-900">{assignment.title}</h4>
                          <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800">
                            {assignment.type}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 mb-2">{assignment.description}</p>
                        <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
                          <span>Assigned: {formatDate(assignment.assigned_date)}</span>
                          <span>Due: {formatDate(assignment.due_date || undefined)}</span>
                        </div>
                      </div>
                      <span
                        className={`inline-flex px-2.5 py-1 text-xs font-medium rounded-full ${getStatusColor(
                          assignment.status
                        )}`}
                      >
                        {assignment.status.replace('_', ' ')}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Mobile New Assignment button */}
            <button
              onClick={() => setShowNewAssignment(true)}
              className="sm:hidden mt-6 w-full inline-flex items-center justify-center px-4 py-2 text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              New Assignment
            </button>
          </div>
        )}

        {activeTab === 'between-sessions' && (
          <InBetweenSessions caseFile={selectedCase} onUpdate={fetchCaseFiles} />
        )}

        {activeTab === 'progress' && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-6">Progress Tracking</h3>
            <div className="text-center py-12 text-gray-500">
              <BarChart3 className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Progress Charts</h3>
              <p className="text-gray-600">Visual progress tracking and analytics will be displayed here.</p>
            </div>
          </div>
        )}

        {activeTab === 'notes' && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-6">Case Notes</h3>
            <textarea
              className="w-full h-64 p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Add case notes, session summaries, observations..."
              defaultValue={selectedCase.caseNotes}
            />
            <div className="mt-4 flex justify-end">
              <button className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                Save Notes
              </button>
            </div>
          </div>
        )}
      </div>
    )
  }

  /* ---------- List View ---------- */

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Case Management</h2>
          <p className="text-gray-600">
            Comprehensive case management with goals, assignments, and progress tracking
          </p>
        </div>
      </div>

      {/* Sticky Filters */}
      <div className="sticky top-0 z-10 bg-white/80 backdrop-blur border border-gray-200 rounded-lg shadow-sm">
        <div className="p-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 items-start">
            {/* Search */}
            <label className="block sm:col-span-2">
              <span className="sr-only">Search clients</span>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search clients…"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 sm:py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                  inputMode="search"
                />
              </div>
            </label>

            {/* Risk filter */}
            <label className="block">
              <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
                <Filter className="w-4 h-4 text-gray-400" />
                <span>Risk</span>
              </div>
              <select
                value={riskFilter}
                onChange={(e) => setRiskFilter(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-3 sm:py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              >
                <option value="all">All risk levels</option>
                <option value="low">Low</option>
                <option value="moderate">Moderate</option>
                <option value="high">High</option>
                <option value="crisis">Crisis</option>
              </select>
            </label>
          </div>
        </div>
      </div>

      {/* Case Files Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
        {filteredCases.map((caseFile) => (
          <div
            key={caseFile.client.id}
            className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6 hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                  <User className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">
                    {caseFile.client.first_name} {caseFile.client.last_name}
                  </h3>
                  <p className="text-sm text-gray-600">{caseFile.client.email}</p>
                  <p className="text-xs text-gray-500">{caseFile.caseNumber}</p>
                </div>
              </div>
              <div className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getRiskColor(caseFile.riskLevel)}`}>
                {caseFile.riskLevel}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 sm:gap-4 mb-4">
              <div className="text-center">
                <div className="text-lg sm:text-xl font-bold text-blue-600">{caseFile.sessionCount}</div>
                <div className="text-xs text-gray-600">Sessions</div>
              </div>
              <div className="text-center">
                <div className="text-lg sm:text-xl font-bold text-green-600">
                  {caseFile.goals.filter((g) => g.status === 'active').length}
                </div>
                <div className="text-xs text-gray-600">Goals</div>
              </div>
              <div className="text-center">
                <div className="text-lg sm:text-xl font-bold text-purple-600">
                  {caseFile.assignments.filter((a) => a.status === 'assigned').length}
                </div>
                <div className="text-xs text-gray-600">Pending</div>
              </div>
            </div>

            <div className="space-y-2 text-sm text-gray-600 mb-4">
              <div className="flex items-center justify-between gap-3">
                <span className="shrink-0">Last Session:</span>
                <span className="truncate text-right">{formatDate(caseFile.lastSession)}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="shrink-0">Next Session:</span>
                <span className="truncate text-right">{formatDate(caseFile.nextAppointment)}</span>
              </div>
            </div>

            <button
              onClick={() => {
                setSelectedCase(caseFile)
                setActiveTab('overview')
              }}
              className="w-full inline-flex items-center justify-center px-4 py-2 text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
            >
              <Eye className="w-4 h-4 mr-2" />
              Open Case
            </button>
          </div>
        ))}
      </div>

      {filteredCases.length === 0 && (
        <div className="text-center py-12">
          <FileText className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No cases found</h3>
          <p className="mt-1 text-sm text-gray-500">
            {searchTerm || riskFilter !== 'all'
              ? 'Try adjusting your search or filters.'
              : 'Add clients to your roster to create cases.'}
          </p>
        </div>
      )}
    </div>
  )
}

export default CaseManagement
