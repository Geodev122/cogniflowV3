import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'

export interface CaseData {
  id: string
  case_number: string | null
  client_id: string
  therapist_id: string
  status: 'open' | 'active' | 'paused' | 'closed' | 'archived' | 'transferred'
  current_phase: string | null
  priority: number | null
  diagnosis_codes: string[] | null
  formulation: string | null
  intake_data: any | null
  treatment_plan: any | null
  data: any | null
  metadata: any | null
  opened_at: string | null
  closed_at: string | null
  archived_at: string | null
  last_activity_at: string | null
  archive_reason: string | null
  last_session_at: string | null
  created_at: string
  updated_at: string
  
  // Populated relations
  client?: {
    id: string
    first_name: string | null
    last_name: string | null
    email: string | null
  } | null
  therapist?: {
    id: string
    first_name: string | null
    last_name: string | null
    email: string | null
  } | null
  assigned_therapists?: Array<{
    therapist_id: string
    first_name: string | null
    last_name: string | null
    role: string | null
    access_level: string | null
  }>
}

export interface CasePermissions {
  canRead: boolean
  canEdit: boolean
  canReopen: boolean
  canArchive: boolean
  canRefer: boolean
  canSubmitSupervision: boolean
  canDelete: boolean
  canTransfer: boolean
}

export interface CaseContextValue {
  caseData: CaseData | null
  permissions: CasePermissions
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
  updateCase: (updates: Partial<CaseData>) => Promise<boolean>
  archiveCase: (reason?: string) => Promise<boolean>
  reopenCase: () => Promise<boolean>
}

const CaseContext = createContext<CaseContextValue | null>(null)

export const useCaseContext = () => {
  const context = useContext(CaseContext)
  if (!context) {
    throw new Error('useCaseContext must be used within a CaseProvider')
  }
  return context
}

export const useCaseData = (caseId: string) => {
  const { profile } = useAuth()
  const [caseData, setCaseData] = useState<CaseData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchCase = useCallback(async () => {
    if (!caseId || !profile) return
    
    setLoading(true)
    setError(null)
    
    try {
      // Fetch case with related data
      const { data: caseRow, error: caseError } = await supabase
        .from('cases')
        .select(`
          *,
          client:profiles!cases_client_id_fkey(id, first_name, last_name, email),
          therapist:profiles!cases_therapist_id_fkey(id, first_name, last_name, email)
        `)
        .eq('id', caseId)
        .single()

      if (caseError) throw caseError

      // Fetch assigned therapists
      const { data: assignedTherapists } = await supabase
        .from('therapist_case_relations')
        .select(`
          therapist_id, role, access_level,
          therapist:profiles!therapist_case_relations_therapist_id_fkey(first_name, last_name)
        `)
        .eq('case_id', caseId)

      const assigned = (assignedTherapists || []).map((rel: any) => ({
        therapist_id: rel.therapist_id,
        first_name: rel.therapist?.first_name,
        last_name: rel.therapist?.last_name,
        role: rel.role,
        access_level: rel.access_level
      }))

      setCaseData({
        ...caseRow,
        assigned_therapists: assigned
      } as CaseData)
    } catch (e: any) {
      console.error('[useCaseData] fetch error:', e)
      setError('Failed to load case data')
      setCaseData(null)
    } finally {
      setLoading(false)
    }
  }, [caseId, profile])

  const derivePermissions = useCallback((caseData: CaseData | null, userProfile: any): CasePermissions => {
    if (!caseData || !userProfile) {
      return {
        canRead: false,
        canEdit: false,
        canReopen: false,
        canArchive: false,
        canRefer: false,
        canSubmitSupervision: false,
        canDelete: false,
        canTransfer: false
      }
    }

    const isOwner = caseData.therapist_id === userProfile.id
    const isSupervisor = userProfile.role === 'supervisor'
    const isAdmin = userProfile.role === 'admin'
    const isAssigned = caseData.assigned_therapists?.some(t => t.therapist_id === userProfile.id) || false
    const isActive = ['open', 'active', 'paused'].includes(caseData.status)
    const isArchived = ['archived', 'closed'].includes(caseData.status)

    return {
      canRead: isOwner || isSupervisor || isAdmin || isAssigned,
      canEdit: (isOwner || isAssigned) && isActive,
      canReopen: (isOwner || isSupervisor || isAdmin) && isArchived,
      canArchive: (isOwner || isSupervisor || isAdmin) && isActive,
      canRefer: isOwner && isActive,
      canSubmitSupervision: isOwner || isAssigned,
      canDelete: isAdmin,
      canTransfer: isOwner || isAdmin
    }
  }, [])

  const updateCase = useCallback(async (updates: Partial<CaseData>): Promise<boolean> => {
    if (!caseData || !profile) return false
    
    try {
      const { error } = await supabase
        .from('cases')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', caseData.id)

      if (error) throw error

      // Log the update
      await supabase.rpc('log_case_action', {
        case_id_param: caseData.id,
        actor_id_param: profile.id,
        action_param: 'UPDATE_CASE',
        details_param: { updated_fields: Object.keys(updates) },
        new_values_param: updates
      })

      await fetchCase()
      return true
    } catch (e: any) {
      console.error('[useCaseData] update error:', e)
      setError('Failed to update case')
      return false
    }
  }, [caseData, profile, fetchCase])

  const archiveCase = useCallback(async (reason?: string): Promise<boolean> => {
    if (!caseData || !profile) return false
    
    try {
      const { error } = await supabase
        .from('cases')
        .update({
          status: 'archived',
          archive_reason: reason || null,
          archived_at: new Date().toISOString(),
          last_activity_at: new Date().toISOString()
        })
        .eq('id', caseData.id)

      if (error) throw error

      await supabase.rpc('log_case_action', {
        case_id_param: caseData.id,
        actor_id_param: profile.id,
        action_param: 'ARCHIVE_CASE',
        details_param: { reason: reason || 'No reason provided' }
      })

      await fetchCase()
      return true
    } catch (e: any) {
      console.error('[useCaseData] archive error:', e)
      setError('Failed to archive case')
      return false
    }
  }, [caseData, profile, fetchCase])

  const reopenCase = useCallback(async (): Promise<boolean> => {
    if (!caseData || !profile) return false
    
    try {
      const { error } = await supabase
        .from('cases')
        .update({
          status: 'active',
          archived_at: null,
          closed_at: null,
          archive_reason: null,
          last_activity_at: new Date().toISOString()
        })
        .eq('id', caseData.id)

      if (error) throw error

      await supabase.rpc('log_case_action', {
        case_id_param: caseData.id,
        actor_id_param: profile.id,
        action_param: 'REOPEN_CASE',
        details_param: { previous_status: caseData.status }
      })

      await fetchCase()
      return true
    } catch (e: any) {
      console.error('[useCaseData] reopen error:', e)
      setError('Failed to reopen case')
      return false
    }
  }, [caseData, profile, fetchCase])

  useEffect(() => {
    if (caseId && profile) {
      fetchCase()
    }
  }, [caseId, profile, fetchCase])

  const permissions = useMemo(() => 
    derivePermissions(caseData, profile), 
    [caseData, profile, derivePermissions]
  )

  return {
    caseData,
    permissions,
    loading,
    error,
    refetch: fetchCase,
    updateCase,
    archiveCase,
    reopenCase
  }
}

export { CaseContext }