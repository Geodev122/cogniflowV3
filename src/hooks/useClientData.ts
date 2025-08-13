import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'
import { isRecursionError } from '../utils/helpers'

interface Worksheet {
  id: string // assignment id
  worksheet_id: string
  title: string
  content: any
  responses: any
  status: 'assigned' | 'in_progress' | 'completed'
  created_at: string
  updated_at: string
  completed_at: string | null
}

interface PsychometricForm {
  id: string
  form_type: string
  title: string
  questions: any[]
  responses: any
  score: number
  status: 'assigned' | 'completed'
  created_at: string
  completed_at: string | null
}

interface Exercise {
  id: string
  exercise_type: string
  title: string
  description: string
  game_config: any
  progress: any
  status: 'assigned' | 'in_progress' | 'completed'
  created_at: string
  last_played_at: string | null
}

interface ProgressData {
  date: string
  value: number
  metric_type: string
}

export const useClientData = () => {
  const [worksheets, setWorksheets] = useState<Worksheet[]>([])
  const [psychometricForms, setPsychometricForms] = useState<PsychometricForm[]>([])
  const [exercises, setExercises] = useState<Exercise[]>([])
  const [progressData, setProgressData] = useState<ProgressData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { profile } = useAuth()

  const fetchWorksheets = useCallback(async () => {
    if (!profile) return

    try {
      // First try to get CBT worksheets
      const { data: cbtData, error: cbtError } = await supabase
        .from('cbt_worksheets')
        .select('*')
        .eq('client_id', profile.id)
        .order('created_at', { ascending: false })
        .limit(20)

      if (cbtError) {
        if (isRecursionError(cbtError)) {
          console.error('RLS recursion error in worksheets:', cbtError)
          setError('Unable to load worksheets due to database configuration')
          return
        }
        console.warn('CBT worksheets fetch failed, trying worksheet assignments:', cbtError)
        
        // Fallback to worksheet assignments
        const { data: assignmentData, error: assignmentError } = await supabase
          .from('worksheet_assignments')
          .select('*')
          .eq('client_id', profile.id)
          .order('assigned_at', { ascending: false })
          .limit(20)
        
        if (assignmentError) {
          if (isRecursionError(assignmentError)) {
            console.error('RLS recursion error in worksheet assignments:', assignmentError)
            setError('Unable to load worksheet assignments')
            return
          }
          throw assignmentError
        }
        
        setWorksheets(assignmentData || [])
        return
      }
      
      setWorksheets(cbtData || [])
    } catch (error) {
      console.error('Error fetching worksheets:', error)
      if (isRecursionError(error)) {
        console.error('RLS recursion error:', error)
        setError('Database configuration error')
        return
      }
      setError('Failed to load worksheets')
    }
  }, [profile])

  const fetchPsychometricForms = useCallback(async () => {
    if (!profile) return

    try {
      const { data, error } = await supabase
        .from('psychometric_forms')
        .select(`
          id, form_type, title, questions, responses, score, status, created_at, completed_at
        `)
        .eq('client_id', profile.id)
        .order('created_at', { ascending: false })
        .limit(20)

      if (error) {
        if (isRecursionError(error)) {
          console.error('RLS recursion error in psychometric forms:', error)
          setError('Unable to load assessments due to database configuration')
          return
        }
        throw error
      }

      setPsychometricForms(data || [])
    } catch (error) {
      console.error('Error fetching psychometric forms:', error)
      if (isRecursionError(error)) {
        console.error('RLS recursion error:', error)
        setError('Database configuration error')
        return
      }
      setError('Failed to load assessments')
    }
  }, [profile])

  const fetchExercises = useCallback(async () => {
    if (!profile) return

    try {
      const { data, error } = await supabase
        .from('therapeutic_exercises')
        .select(`
          id, exercise_type, title, description, game_config, progress, status, created_at, last_played_at
        `)
        .eq('client_id', profile.id)
        .order('created_at', { ascending: false })
        .limit(20)

      if (error) {
        if (isRecursionError(error)) {
          console.error('RLS recursion error in exercises:', error)
          setError('Unable to load exercises due to database configuration')
          return
        }
        throw error
      }

      setExercises(data || [])
    } catch (error) {
      console.error('Error fetching exercises:', error)
      if (isRecursionError(error)) {
        console.error('RLS recursion error:', error)
        setError('Database configuration error')
        return
      }
      setError('Failed to load exercises')
    }
  }, [profile])

  const fetchProgressData = useCallback(async () => {
    if (!profile) return

    try {
      const { data, error } = await supabase
        .from('progress_tracking')
        .select('recorded_at, value, metric_type')
        .eq('client_id', profile.id)
        .order('recorded_at', { ascending: true })
        .limit(100)

      if (error) {
        if (isRecursionError(error)) {
          console.error('RLS recursion error in progress tracking:', error)
          setError('Unable to load progress data due to database configuration')
          return
        }
        throw error
      }

      const formattedData = data?.map(item => ({
        date: item.recorded_at,
        value: item.value,
        metric_type: item.metric_type
      })) || []
      setProgressData(formattedData)
    } catch (error) {
      console.error('Error fetching progress data:', error)
      if (isRecursionError(error)) {
        console.error('RLS recursion error:', error)
        setError('Database configuration error')
        return
      }
      setError('Failed to load progress data')
    }
  }, [profile])

  const fetchAllData = useCallback(async () => {
    if (!profile) return

    setLoading(true)
    try {
      await Promise.all([
        fetchWorksheets(),
        fetchPsychometricForms(),
        fetchExercises(),
        fetchProgressData()
      ])
    } catch (error) {
      console.error('Error fetching client data:', error)
      if (isRecursionError(error)) {
        console.error('RLS policy recursion detected in fetchAllData')
        setError('Database configuration error - please contact support')
      }
    } finally {
      setLoading(false)
    }
  }, [profile, fetchWorksheets, fetchPsychometricForms, fetchExercises, fetchProgressData])

  const updateWorksheet = useCallback(async (assignmentId: string, content: any, status: string) => {
    try {
      const { error } = await supabase
        .from('worksheet_assignments')
        .update({
          responses: content,
          status,
          completed_at: status === 'completed' ? new Date().toISOString() : null
        })
        .eq('id', assignmentId)

      if (error) throw error

      // Update local state
      setWorksheets(prev => prev.map(w =>
        w.id === assignmentId
          ? { ...w, content, responses: content, status: status as any, completed_at: status === 'completed' ? new Date().toISOString() : w.completed_at }
          : w
      ))
    } catch (error) {
      console.error('Error updating worksheet:', error)
      throw error
    }
  }, [])

  const completePsychometricForm = useCallback(async (formId: string, responses: any, score: number) => {
    try {
      const { error } = await supabase
        .from('psychometric_forms')
        .update({ 
          responses, 
          score,
          status: 'completed',
          completed_at: new Date().toISOString()
        })
        .eq('id', formId)

      if (error) throw error

      // Add to progress tracking
      const form = psychometricForms.find(f => f.id === formId)
      if (form) {
        await supabase
          .from('progress_tracking')
          .insert({
            client_id: profile!.id,
            metric_type: form.form_type,
            value: score,
            source_type: 'psychometric',
            source_id: formId
          })
      }

      // Update local state
      setPsychometricForms(prev => prev.map(f => 
        f.id === formId ? { ...f, responses, score, status: 'completed', completed_at: new Date().toISOString() } : f
      ))

      // Refresh progress data
      await fetchProgressData()
    } catch (error) {
      console.error('Error completing form:', error)
      throw error
    }
  }, [profile, psychometricForms, fetchProgressData])

  const updateExerciseProgress = useCallback(async (exerciseId: string, progress: any, status: string) => {
    try {
      const { error } = await supabase
        .from('therapeutic_exercises')
        .update({ 
          progress, 
          status,
          last_played_at: new Date().toISOString()
        })
        .eq('id', exerciseId)

      if (error) throw error

      // Update local state
      setExercises(prev => prev.map(e => 
        e.id === exerciseId ? { ...e, progress, status: status as any, last_played_at: new Date().toISOString() } : e
      ))
    } catch (error) {
      console.error('Error updating exercise:', error)
      throw error
    }
  }, [])

  useEffect(() => {
    if (profile) {
      fetchAllData()
    }
  }, [profile, fetchAllData])

  return {
    worksheets,
    psychometricForms,
    exercises,
    progressData,
    loading,
    error,
    updateWorksheet,
    completePsychometricForm,
    updateExerciseProgress,
    refetch: fetchAllData
  }
}