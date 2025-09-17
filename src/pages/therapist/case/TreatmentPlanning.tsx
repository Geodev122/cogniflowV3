// src/pages/therapist/case/TreatmentPlanning.tsx
import React, { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../../../lib/supabase'

const TreatmentPlanning: React.FC = () => {
  const { caseId } = useParams()
  const [plan, setPlan] = useState<any>({ goals: [], interventions: [] })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let cancel = false
    const run = async () => {
      try {
        const { data, error } = await supabase
          .from('cases')
          .select('treatment_plan')
          .eq('id', String(caseId))
          .maybeSingle()
        
        if (error) throw error
        if (data && !cancel) {
          setPlan(data.treatment_plan || { goals: [], interventions: [] })
        }
      } catch (e) {
        console.error('Error loading treatment plan:', e)
        if (!cancel) setPlan({ goals: [], interventions: [] })
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
        .update({ treatment_plan: plan })
        .eq('id', String(caseId))
      
      if (error) throw error
      alert('Treatment plan saved successfully')
    } catch (e) {
      console.error('Error saving treatment plan:', e)
      alert('Error saving treatment plan')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      <textarea
        className="w-full border rounded p-2"
        rows={8}
        placeholder="Goals & interventions JSON or prose…"
        value={JSON.stringify(plan, null, 2)}
        onChange={(e) => {
          try { setPlan(JSON.parse(e.target.value)) } catch {}
        }}
      />
      <button onClick={save} className="px-4 py-2 rounded bg-blue-600 text-white disabled:opacity-50" disabled={saving}>
        {saving ? 'Saving…' : 'Save Plan'}
      </button>
    </div>
  )
}
export default TreatmentPlanning
