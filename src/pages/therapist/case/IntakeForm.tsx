// src/pages/therapist/case/IntakeForm.tsx
import React, { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../../../lib/supabase'

const IntakeForm: React.FC = () => {
  const { caseId } = useParams()
  const [values, setValues] = useState<any>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let cancel = false
    const run = async () => {
      setLoading(true)
      try {
        const { data, error } = await supabase
          .from('cases')
          .select('intake_data')
          .eq('id', String(caseId))
          .maybeSingle()
        
        if (error) throw error
        if (!cancel) {
          setValues(data?.intake_data ?? {})
        }
      } catch (e) {
        console.error('Error loading intake data:', e)
        if (!cancel) {
          setValues({})
        }
      } finally {
        if (!cancel) setLoading(false)
      }
    }
    run()
    return () => { cancel = true }
  }, [caseId])

  const save = async () => {
    setSaving(true)
    try {
      const { error } = await supabase
        .from('cases')
        .update({ intake_data: values })
        .eq('id', String(caseId))
      
      if (error) throw error
      alert('Intake data saved successfully')
    } catch (e) {
      console.error('Error saving intake data:', e)
      alert('Error saving intake data')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div>Loading…</div>

  return (
    <div className="space-y-4">
      <textarea
        className="w-full border rounded p-2"
        rows={6}
        placeholder="Presenting problem, history, goals…"
        value={values.notes ?? ''}
        onChange={(e) => setValues((v: any) => ({ ...v, notes: e.target.value }))}
      />
      <button
        onClick={save}
        disabled={saving}
        className="px-4 py-2 rounded bg-blue-600 text-white disabled:opacity-50"
      >
        {saving ? 'Saving…' : 'Save Intake'}
      </button>
    </div>
  )
}
export default IntakeForm
