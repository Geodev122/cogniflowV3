// src/hooks/useAssessments.ts
import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'
import { isRecursionError } from '../utils/helpers'

/* ────────────────────────────────────────────────────────────────────────────
   Types (DB-aligned)
──────────────────────────────────────────────────────────────────────────── */
export interface AssessmentTemplate {
  id: string
  name: string
  abbreviation: string
  category: string
  description: string
  version: string
  questions: any
  scoring_config: any
  interpretation_rules: any
  clinical_cutoffs: any
  instructions: string
  estimated_duration_minutes: number
  evidence_level: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface AssessmentInstance {
  id: string
  template_id: string
  therapist_id: string
  client_id: string
  case_id: string | null
  title: string
  instructions: string | null
  status: string
  assigned_at: string
  due_date: string | null
  started_at: string | null
  completed_at: string | null
  expires_at: string | null
  reminder_frequency: string
  metadata: any
  created_at: string
  updated_at: string

  // expanded convenience fields when joins succeed
  template?: AssessmentTemplate | null
  client?: {
    id: string
    first_name: string | null
    last_name: string | null
    email: string | null
  } | null
}

/* ────────────────────────────────────────────────────────────────────────────
   Column lists (avoid '*')
──────────────────────────────────────────────────────────────────────────── */
const TEMPLATE_COLS =
  'id,name,abbreviation,category,description,version,questions,scoring_config,interpretation_rules,clinical_cutoffs,instructions,estimated_duration_minutes,evidence_level,is_active,created_at,updated_at'

const INSTANCE_COLS =
  'id,template_id,therapist_id,client_id,case_id,title,instructions,status,assigned_at,due_date,started_at,completed_at,expires_at,reminder_frequency,metadata,created_at,updated_at'

const PROFILE_COLS = 'id,first_name,last_name,email'

/* ────────────────────────────────────────────────────────────────────────────
   Hook
──────────────────────────────────────────────────────────────────────────── */
export const useAssessments = () => {
  const [templates, setTemplates] = useState<AssessmentTemplate[]>([])
  const [instances, setInstances] = useState<AssessmentInstance[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { profile } = useAuth()
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)

  const fetchTemplates = useCallback(async () => {
    try {
      setError(null)
      const { data, error } = await supabase
        .from('assessment_templates')
        .select(TEMPLATE_COLS)
        .eq('is_active', true)
        .order('name', { ascending: true })

      if (error) {
        if (isRecursionError(error)) {
          console.error('[useAssessments] RLS recursion in templates:', error)
          setError('Assessment templates are temporarily unavailable.')
        } else {
          console.error('[useAssessments] templates error:', error)
          setError('Failed to load assessment templates.')
        }
        setTemplates([])
        return
      }

      setTemplates((data || []) as AssessmentTemplate[])
    } catch (err) {
      console.error('[useAssessments] templates crash:', err)
      setError('Failed to load assessment templates.')
      setTemplates([])
    }
  }, [])

  const fetchInstances = useCallback(async () => {
    if (!profile?.id) return
    try {
      setError(null)

      // Try embedded join first (fast path)
      const { data, error } = await supabase
        .from('assessment_instances')
        .select(
          `${INSTANCE_COLS},
           template:assessment_templates(${TEMPLATE_COLS}),
           client:profiles(${PROFILE_COLS})`
        )
        .eq('therapist_id', profile.id)
        .order('assigned_at', { ascending: false })

      if (!error && data) {
        setInstances(data as AssessmentInstance[])
        return
      }

      // Fallback: multi-fetch to avoid RLS recursion on joins
      if (error) {
        console.warn('[useAssessments] join failed for instances, falling back:', error)
      }

      const { data: baseRows, error: baseErr } = await supabase
        .from('assessment_instances')
        .select(INSTANCE_COLS)
        .eq('therapist_id', profile.id)
        .order('assigned_at', { ascending: false })

      if (baseErr) {
        if (isRecursionError(baseErr)) {
          console.error('[useAssessments] RLS recursion in instances:', baseErr)
          setError('Assessment instances are temporarily unavailable.')
        } else {
          console.error('[useAssessments] instances error:', baseErr)
          setError('Failed to load assessment instances.')
        }
        setInstances([])
        return
      }

      const rows = (baseRows || []) as AssessmentInstance[]
      if (!rows.length) {
        setInstances([])
        return
      }

      const templateIds = Array.from(new Set(rows.map(r => r.template_id)))
      const clientIds = Array.from(new Set(rows.map(r => r.client_id)))

      const [{ data: tRows }, { data: cRows }] = await Promise.all([
        templateIds.length
          ? supabase.from('assessment_templates').select(TEMPLATE_COLS).in('id', templateIds)
          : Promise.resolve({ data: [] as any[] }),
        clientIds.length
          ? supabase.from('profiles').select(PROFILE_COLS).in('id', clientIds)
          : Promise.resolve({ data: [] as any[] }),
      ])

      const templatesById = new Map<string, AssessmentTemplate>()
      ;(tRows || []).forEach((t: any) => templatesById.set(t.id, t))

      const clientsById = new Map<string, AssessmentInstance['client']>()
      ;(cRows || []).forEach((c: any) =>
        clientsById.set(c.id, { id: c.id, first_name: c.first_name, last_name: c.last_name, email: c.email })
      )

      setInstances(
        rows.map(r => ({
          ...r,
          template: templatesById.get(r.template_id) || null,
          client: clientsById.get(r.client_id) || null,
        }))
      )
    } catch (err) {
      console.error('[useAssessments] instances crash:', err)
      setError('Failed to load assessment instances.')
      setInstances([])
    }
  }, [profile?.id])

  const assignAssessment = useCallback(
    async (
      templateId: string,
      clientIds: string[],
      options: {
        dueDate?: string
        instructions?: string
        reminderFrequency?: 'none' | 'daily' | 'weekly' | 'before_due'
        titleOverride?: string
      } = {}
    ) => {
      if (!profile?.id) return
      const due = options.dueDate?.trim() ? options.dueDate : null
      const reminder_frequency = (options.reminderFrequency || 'none') as string

      try {
        const template = templates.find(t => t.id === templateId)
        if (!template) throw new Error('Template not found')

        // Optional: associate case per client
        const { data: caseRows } = await supabase
          .from('therapist_client_relations')
          .select('client_id') // (use cases table if you have it; left generic here)

        const assignments = clientIds.map(clientId => ({
          template_id: templateId,
          therapist_id: profile.id,
          client_id: clientId,
          case_id: null, // populate if you maintain cases
          title: options.titleOverride || template.name,
          instructions: options.instructions || template.instructions || null,
          due_date: due,
          reminder_frequency,
          status: 'assigned' as const,
          // assigned_at is set by DB default or trigger; omit here
          metadata: {},
        }))

        const { error } = await supabase.from('assessment_instances').insert(assignments)
        if (error) throw error

        await fetchInstances()
        return true
      } catch (err) {
        console.error('[useAssessments] assign error:', err)
        throw err
      }
    },
    [profile?.id, templates, fetchInstances]
  )

  const updateInstanceStatus = useCallback(
    async (instanceId: string, status: AssessmentInstance['status']) => {
      try {
        const updates: Record<string, any> = { status }
        if (status === 'completed') updates.completed_at = new Date().toISOString()
        if (status === 'in_progress') updates.started_at = new Date().toISOString()

        const { error } = await supabase.from('assessment_instances').update(updates).eq('id', instanceId)
        if (error) throw error

        await fetchInstances()
      } catch (err) {
        console.error('[useAssessments] update status error:', err)
        throw err
      }
    },
    [fetchInstances]
  )

  const deleteInstance = useCallback(
    async (instanceId: string) => {
      try {
        const { error } = await supabase.from('assessment_instances').delete().eq('id', instanceId)
        if (error) throw error
        await fetchInstances()
      } catch (err) {
        console.error('[useAssessments] delete instance error:', err)
        throw err
      }
    },
    [fetchInstances]
  )

  const getInstancesByClient = useCallback(
    (clientId: string) => instances.filter(i => i.client_id === clientId),
    [instances]
  )
  const getInstancesByStatus = useCallback(
    (status: string) => instances.filter(i => i.status === status),
    [instances]
  )

  // Initial load
  useEffect(() => {
    let cancelled = false
    const run = async () => {
      if (!profile?.id) return
      setLoading(true)
      try {
        await Promise.all([fetchTemplates(), fetchInstances()])
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    run()
    return () => {
      cancelled = true
    }
  }, [profile?.id, fetchTemplates, fetchInstances])

  // Realtime: keep therapist's instances in sync
  useEffect(() => {
    if (!profile?.id) return
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current)
      channelRef.current = null
    }
    const channel = supabase
      .channel(`assessment_instances:therapist:${profile.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'assessment_instances', filter: `therapist_id=eq.${profile.id}` },
        () => {
          fetchInstances()
        }
      )
      .subscribe()
    channelRef.current = channel
    return () => {
      if (channelRef.current) supabase.removeChannel(channelRef.current)
      channelRef.current = null
    }
  }, [profile?.id, fetchInstances])

  return {
    templates,
    instances,
    loading,
    error,
    assignAssessment,
    updateInstanceStatus,
    deleteInstance,
    getInstancesByClient,
    getInstancesByStatus,
    getTemplatesByCategory: (_category: string) => templates, // no category filter in UI; available on template if needed
    refetch: async () => {
      await Promise.all([fetchTemplates(), fetchInstances()])
    },
  }
}
