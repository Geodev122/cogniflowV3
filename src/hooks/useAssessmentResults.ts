// src/hooks/useAssessmentResults.ts
import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'

export type InstanceSummary = {
  instance_id: string
  template_id: string
  therapist_id: string
  client_id: string
  title: string | null
  status: string
  assigned_at: string | null
  due_date: string | null
  completed_at: string | null
  template_name: string
  template_abbrev: string | null
  score_id: string | null
  raw_score: number | null
  scaled_score: number | null
  percentile: number | null
  t_score: number | null
  z_score: number | null
  interpretation_category: string | null
  interpretation_description: string | null
  clinical_significance: string | null
  severity_level: string | null
  recommendations: string | null
  calculated_at: string | null
}

export const useAssessmentResults = (filters?: { clientId?: string; status?: string }) => {
  const [rows, setRows] = useState<InstanceSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchAll = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      let q = supabase
        .from('assessment_instance_latest_score')
        .select('*')
        .order('assigned_at', { ascending: false })

      if (filters?.clientId) q = q.eq('client_id', filters.clientId)
      if (filters?.status)   q = q.eq('status', filters.status)

      const { data, error } = await q
      if (error) throw error
      setRows((data || []) as InstanceSummary[])
    } catch (e:any) {
      setError(e.message || 'Failed to load results.')
      setRows([])
    } finally {
      setLoading(false)
    }
  }, [filters?.clientId, filters?.status])

  useEffect(() => { fetchAll() }, [fetchAll])

  return { rows, loading, error, refetch: fetchAll }
}
