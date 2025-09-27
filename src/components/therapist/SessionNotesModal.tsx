import React, { useState } from 'react'
import { supabase } from '../../lib/supabase'

type Props = {
  open: boolean
  onClose: () => void
  sessionId: string | null
  initialNotes?: string
}

export default function SessionNotesModal({ open, onClose, sessionId, initialNotes }: Props) {
  const [notes, setNotes] = useState<string>(initialNotes || '')
  const [saving, setSaving] = useState(false)

  if (!open) return null

  const save = async () => {
    if (!sessionId) return
    try {
      setSaving(true)
      const { error } = await supabase.from('appointments').update({ notes }).eq('id', sessionId)
      if (error) throw error
      alert('Notes saved')
      onClose()
    } catch (e: any) {
      alert(e?.message || 'Failed to save notes')
    } finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 grid place-items-center" onClick={onClose}>
      <div className="bg-white rounded-lg max-w-lg w-full p-4" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-lg font-semibold mb-2">Session Notes</h3>
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={8} className="w-full border p-2 rounded mb-3" />
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="px-3 py-2 bg-gray-100 rounded">Cancel</button>
          <button onClick={save} disabled={saving} className="px-3 py-2 bg-blue-600 text-white rounded">{saving ? 'Saving...' : 'Save'}</button>
        </div>
      </div>
    </div>
  )
}
