// src/pages/therapist/case/CaseFormulation.tsx
import React, { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../../../lib/supabase'

const CaseFormulation: React.FC = () => {
  const { caseId } = useParams()
  const [text, setText] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let cancel = false
    const run = async () => {
      const { data } = await supabase.from('cases').select('formulation').eq('id', String(caseId)).single()
      if (!cancel) setText(data?.formulation ?? '')
    }
    run()
    return () => { cancel = true }
  }, [caseId])

  const save = async () => {
    setSaving(true)
    await supabase.from('cases').update({ formulation: text }).eq('id', String(caseId))
    setSaving(false)
  }

  return (
    <div className="space-y-4">
      <textarea
        className="w-full border rounded p-2"
        rows={10}
        placeholder="5P / CBT formulation…"
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
      <button onClick={save} className="px-4 py-2 rounded bg-blue-600 text-white disabled:opacity-50" disabled={saving}>
        {saving ? 'Saving…' : 'Save Formulation'}
      </button>
    </div>
  )
}
export default CaseFormulation
