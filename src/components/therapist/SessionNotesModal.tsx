import React, { useEffect, useRef, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useToast } from '../ui/Toast'

type Props = {
  open: boolean
  onClose: () => void
  sessionId: string | null
  initialNotes?: string
}

export default function SessionNotesModal({ open, onClose, sessionId, initialNotes }: Props) {
  const [notes, setNotes] = useState<string>(initialNotes || '')
  const [saving, setSaving] = useState(false)
  const panelRef = useRef<HTMLDivElement | null>(null)
  const { push } = useToast()

  useEffect(() => { setNotes(initialNotes || '') }, [initialNotes])

  // focus trap: focus panel on open
  useEffect(() => {
    if (!open) return
    const prev = document.activeElement as HTMLElement | null
    setTimeout(() => panelRef.current?.focus(), 120)
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { onClose(); return }
      if (e.key !== 'Tab') return
      const node = panelRef.current
      if (!node) return
      const focusable = node.querySelectorAll<HTMLElement>("a[href], button, textarea, input, select, [tabindex]:not([tabindex='-1'])")
      if (focusable.length === 0) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (e.shiftKey) {
        if (document.activeElement === first) { e.preventDefault(); last.focus() }
      } else {
        if (document.activeElement === last) { e.preventDefault(); first.focus() }
      }
    }
    document.addEventListener('keydown', handleKey)
    return () => { document.removeEventListener('keydown', handleKey); prev?.focus?.() }
  }, [open])

  if (!open) return null

  const save = async () => {
    if (!sessionId) return
    // optimistic UI: close panel immediately and show saving toast
    const old = notes
    onClose()
    push({ message: 'Saving notes...', type: 'info' })
    try {
      setSaving(true)
      const { error } = await supabase.from('appointments').update({ notes }).eq('id', sessionId)
      if (error) throw error
      push({ message: 'Notes saved', type: 'success' })
    } catch (e: any) {
      // If save failed, show error and re-open panel with old value
      push({ message: e?.message || 'Failed to save notes', type: 'error' })
      setTimeout(() => {
        setNotes(old)
        // reopen panel
      }, 200)
    } finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1" onClick={onClose} />
      <div role="dialog" aria-modal="true" ref={panelRef} tabIndex={-1} className="w-full sm:w-96 bg-white border-l shadow-lg p-4 overflow-y-auto">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold">Session Notes</h3>
          <button onClick={onClose} className="text-gray-500">Close</button>
        </div>
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={12} className="w-full border p-2 rounded mb-3" />
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="px-3 py-2 bg-gray-100 rounded">Cancel</button>
          <button onClick={save} disabled={saving} className="px-3 py-2 bg-blue-600 text-white rounded">{saving ? 'Saving...' : 'Save'}</button>
        </div>
      </div>
    </div>
  )
}
