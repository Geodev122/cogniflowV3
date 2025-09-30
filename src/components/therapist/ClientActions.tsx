import React, { useState } from 'react'
import { Copy, FileText, Brain, MessageSquare, Edit, Users } from 'lucide-react'
import { supabase } from '../../lib/supabase'

type Props = {
  clientId: string
  patientCode?: string | null
  isMine: boolean
  assignmentStatus?: string | null
  onRefresh?: () => void
}

export const ClientActions: React.FC<Props> = ({ clientId, patientCode, isMine, assignmentStatus, onRefresh }) => {
  const [loading, setLoading] = useState(false)

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(patientCode || clientId)
      // noop — UI may show toast elsewhere
    } catch (e) {
      console.warn('copy failed', e)
    }
  }

  const createCase = async () => {
    try {
      setLoading(true)
      await supabase.rpc('create_case_for_client', { p_client_id: clientId, p_case_number: null, p_initial_payload: {} })
      onRefresh?.()
    } catch (e) {
      console.error('createCase error', e)
    } finally { setLoading(false) }
  }

  // Open a simple modal to initiate a referral — the modal component lives separately
  const refer = async () => {
    // show TherapistSearchModal via custom event so we don't tightly couple imports
    const ev = new CustomEvent('open-therapist-search', { detail: { clientId } })
    window.dispatchEvent(ev)
  }

  return (
    <div className="flex items-center gap-2 justify-end">
      <button onClick={copy} title="Copy ID" className="p-2 rounded hover:bg-gray-100"><Copy className="w-4 h-4"/></button>
      <button onClick={createCase} disabled={!isMine || loading} title="Create Case" className="p-2 rounded hover:bg-gray-100"><FileText className="w-4 h-4"/></button>
      <button onClick={() => window.location.assign(`/therapist/comms?clientId=${encodeURIComponent(clientId)}`)} title="Message" className="p-2 rounded hover:bg-gray-100"><MessageSquare className="w-4 h-4"/></button>
      <button onClick={() => window.location.assign(`/therapist/assessments?clientId=${encodeURIComponent(clientId)}`)} title="Assessments" className="p-2 rounded hover:bg-gray-100"><Brain className="w-4 h-4"/></button>
      <button onClick={refer} title="Refer" className="p-2 rounded hover:bg-gray-100"><Users className="w-4 h-4"/></button>
    </div>
  )
}

export default ClientActions
