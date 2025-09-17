// src/pages/therapist/case/Diagnosis.tsx
import React, { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../../../lib/supabase'

const Diagnosis: React.FC = () => {
  const { caseId } = useParams()
  const [codes, setCodes] = useState<string>('') // store as CSV or array in JSON
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let cancel = false
    const run = async () => {
      try {
        const { data, error } = await supabase
          .from('cases')
          .select('diagnosis_codes')
          .eq('id', String(caseId))
          .maybeSingle()
        
        if (error) throw error
        if (!cancel) {
          setCodes((data?.diagnosis_codes ?? []).join(', '))
        }
      } catch (e) {
        console.error('Error loading diagnosis codes:', e)
        if (!cancel) setCodes('')
      }
    }
    run()
    return () => { cancel = true }
  }, [caseId])

  const save = async () => {
    setSaving(true)
    try {
      const arr = codes.split(',').map(s => s.trim()).filter(Boolean)
      const { error } = await supabase
        .from('cases')
        .update({ diagnosis_codes: arr })
        .eq('id', String(caseId))
      
      if (error) throw error
      alert('Diagnosis codes saved successfully')
    } catch (e) {
      console.error('Error saving diagnosis codes:', e)
      alert('Error saving diagnosis codes')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-3">
      <input
        className="w-full border rounded p-2"
        placeholder="F33.1, F41.1, …"
        value={codes}
        onChange={(e) => setCodes(e.target.value)}
      />
      <button onClick={save} className="px-4 py-2 rounded bg-blue-600 text-white disabled:opacity-50" disabled={saving}>
        {saving ? 'Saving…' : 'Save Diagnosis'}
      </button>
    </div>
  )
}
export default Diagnosis
