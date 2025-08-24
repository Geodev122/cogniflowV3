import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'
import { isRecursionError } from '../utils/helpers'

interface AssessmentTemplate {
  id: string
  name: string
  abbreviation: string
  category: string
  description: string
  questions: any[]
  scoring_config: any
  interpretation_rules: any
  clinical_cutoffs: any
  instructions: string
  estimated_duration_minutes: number
  evidence_level: string
  is_active: boolean
  created_at: string
}

interface AssessmentInstance {
  id: string
  template_id: string
  therapist_id: string
  client_id: string
  case_id?: string
  title: string
  instructions?: string
  status: string
  assigned_at: string
  due_date?: string
  completed_at?: string
  template?: AssessmentTemplate
  client?: {
    first_name: string
    last_name: string
    email: string
  }
}

export const useAssessments = () => {
  const [templates, setTemplates] = useState<AssessmentTemplate[]>([])
  const [instances, setInstances] = useState<AssessmentInstance[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { profile } = useAuth()

  const fetchTemplates = useCallback(async () => {
    try {
      setError(null)
      const { data, error } = await supabase
        .from('assessment_templates')
        .select('*')
        .eq('is_active', true)
        .order('category', { ascending: true })

      if (error) {
        if (isRecursionError(error)) {
          console.error('RLS recursion error in assessment templates:', error)
          setError('Database configuration error')
          setTemplates([])
          return
        }
        console.error('Error fetching assessment templates:', error)
        setError('Failed to load assessment templates')
        setTemplates([])
        return
      }

      setTemplates(data || [])
      setError(null)
    } catch (error) {
      console.error('Error fetching assessment templates:', error)
      setError('Failed to load assessment templates')
      setTemplates([])
    }
  }, [])

  const fetchInstances = useCallback(async () => {
    if (!profile) return

    try {
      setError(null)
      const { data, error } = await supabase
        .from('assessment_instances')
        .select('*')
        .eq('therapist_id', profile.id)
        .order('assigned_at', { ascending: false })

      if (error) {
        if (isRecursionError(error)) {
          console.error('RLS recursion error in assessment instances:', error)
          setError('Database configuration error')
          setInstances([])
          return
        }
        console.error('Error fetching assessment instances:', error)
        setError('Failed to load assessment instances')
        setInstances([])
        return
      }

      // Get additional data separately to avoid complex joins
      const instanceIds = data?.map(i => i.id) || []
      const templateIds = [...new Set(data?.map(i => i.template_id) || [])]
      const clientIds = [...new Set(data?.map(i => i.client_id) || [])]

      let templatesData: any[] = []
      let clientsData: any[] = []

      if (templateIds.length > 0) {
        const { data: templates } = await supabase
          .from('assessment_templates')
          .select('*')
          .in('id', templateIds)
        templatesData = templates || []
      }

      if (clientIds.length > 0) {
        const { data: clients } = await supabase
          .from('profiles')
          .select('id, first_name, last_name, email')
          .in('id', clientIds)
        clientsData = clients || []
      }

      const formattedInstances = data?.map(instance => ({
        ...instance,
        template: templatesData.find(t => t.id === instance.template_id),
        client: clientsData.find(c => c.id === instance.client_id)
      })) || []

      setInstances(formattedInstances)
      setError(null)
    } catch (error) {
      console.error('Error fetching assessment instances:', error)
      setError('Failed to load assessment instances')
      setInstances([])
    }
  }, [profile])

  const assignAssessment = useCallback(async (
    templateId: string, 
    clientIds: string[], 
    options: {
      dueDate?: string
      instructions?: string
      reminderFrequency?: string
    } = {}
  ) => {
    if (!profile) return

    try {
      const template = templates.find(t => t.id === templateId)
      if (!template) throw new Error('Template not found')

      // Get case IDs for clients
      const { data: cases } = await supabase
        .from('cases')
        .select('id, client_id')
        .eq('therapist_id', profile.id)
        .in('client_id', clientIds)

      const assignments = clientIds.map(clientId => {
        const clientCase = cases?.find(c => c.client_id === clientId)
        
        return {
          template_id: templateId,
          therapist_id: profile.id,
          client_id: clientId,
          case_id: clientCase?.id,
          title: template.name,
          instructions: options.instructions || template.instructions,
          due_date: options.dueDate,
          reminder_frequency: options.reminderFrequency || 'none',
          status: 'assigned'
        }
      })

      const { error } = await supabase
        .from('assessment_instances')
        .insert(assignments)

      if (error) throw error

      await fetchInstances()
      return true
    } catch (error) {
      console.error('Error assigning assessment:', error)
      throw error
    }
  }, [profile, templates, fetchInstances])

  const updateInstanceStatus = useCallback(async (instanceId: string, status: string) => {
    try {
      const updates: any = { status }
      
      if (status === 'completed') {
        updates.completed_at = new Date().toISOString()
      } else if (status === 'in_progress') {
        updates.started_at = new Date().toISOString()
      }

      const { error } = await supabase
        .from('assessment_instances')
        .update(updates)
        .eq('id', instanceId)

      if (error) throw error

      await fetchInstances()
    } catch (error) {
      console.error('Error updating instance status:', error)
      throw error
    }
  }, [fetchInstances])

  const deleteInstance = useCallback(async (instanceId: string) => {
    try {
      const { error } = await supabase
        .from('assessment_instances')
        .delete()
        .eq('id', instanceId)

      if (error) throw error

      await fetchInstances()
    } catch (error) {
      console.error('Error deleting instance:', error)
      throw error
    }
  }, [fetchInstances])

  const getInstancesByClient = useCallback((clientId: string) => {
    return instances.filter(instance => instance.client_id === clientId)
  }, [instances])

  const getInstancesByStatus = useCallback((status: string) => {
    return instances.filter(instance => instance.status === status)
  }, [instances])

  const getTemplatesByCategory = useCallback((category: string) => {
    return templates.filter(template => template.category === category)
  }, [templates])

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      
      try {
        await Promise.all([
          fetchTemplates(),
          fetchInstances()
        ])
      } catch (error) {
        console.error('Error fetching assessment data:', error)
        setLoading(false)
      }
    }

    if (profile) {
      fetchData()
    }
  }, [profile, fetchTemplates, fetchInstances])

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
    getTemplatesByCategory,
    refetch: () => {
      fetchTemplates()
      fetchInstances()
    }
  }
}