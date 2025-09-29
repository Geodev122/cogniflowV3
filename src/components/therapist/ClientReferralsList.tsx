import React, { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

type Props = { clientId: string }

export const ClientReferralsList: React.FC<Props> = ({ clientId }) => {
  const [rows, setRows] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true
    const run = async () => {
      setLoading(true); setError(null)
      try {
        const { data, error } = await supabase.from('referral_requests').select('id, from_therapist, to_therapist, status, created_at, note').eq('client_id', clientId).order('created_at', { ascending: false })
        if (error) throw error
        if (!mounted) return
        setRows(data || [])
      } catch (e:any) {
        console.error('client referrals', e)
        setError(e?.message || String(e))
      } finally { setLoading(false) }
    }
    if (clientId) run()
    return () => { mounted = false }
  }, [clientId])

  if (!clientId) return null
  if (loading) return <div className="p-4 text-center">Loading…</div>
  if (error) return <div className="p-4 text-red-600">{error}</div>
  if (rows.length === 0) return <div className="p-4 text-sm text-gray-500">No referrals for this client</div>

  return (
    <ul className="space-y-2 p-2">
      {rows.map(r => (
        <li key={r.id} className="p-2 border rounded flex items-center justify-between">
          <div>
            <div className="text-sm">{r.note || 'Referral'}</div>
            <div className="text-xs text-gray-500">Status: {r.status} • {new Date(r.created_at).toLocaleString()}</div>
          </div>
          <div className="text-xs text-gray-500">To: {r.to_therapist}</div>
        </li>
      ))}
    </ul>
  )
}

export default ClientReferralsList
