import React, { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { Users, CheckCircle, X, Clock } from 'lucide-react'
import { useToasts } from '../ui/ToastContext'
import ConfirmModal from '../ui/ConfirmModal'

export const TherapistReferralsInbox: React.FC = () => {
  const { profile } = useAuth()
  const [loading, setLoading] = useState(false)
  const [rows, setRows] = useState<any[]>([])
  const [error, setError] = useState<string | null>(null)
  const { push } = useToasts()
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [confirmPayload, setConfirmPayload] = useState<{id: string, accept: boolean} | null>(null)

  const fetch = async () => {
    if (!profile?.id) return
    setLoading(true)
    setError(null)
    try {
      const { data, error } = await supabase
        .from('referral_requests')
        .select('id, client_id, from_therapist, to_therapist, status, note, metadata, created_at')
        .eq('to_therapist', profile.id)
        .order('created_at', { ascending: false })
      if (error) throw error
      // enrich with simple client and from therapist names
      const ids = Array.from(new Set([...(data || []).map((r:any)=>r.client_id), ...(data || []).map((r:any)=>r.from_therapist)]))
      const { data: people } = await supabase.from('profiles').select('id, first_name, last_name').in('id', ids)
      const byId = new Map((people || []).map((p:any) => [p.id, p]))
      setRows((data || []).map((r:any) => ({ ...r, client: byId.get(r.client_id) || null, from: byId.get(r.from_therapist) || null })))
    } catch (e:any) {
      console.error('fetch referrals', e)
      setError(e?.message || String(e))
      setRows([])
    } finally { setLoading(false) }
  }

  useEffect(() => { fetch() }, [profile?.id])

  const respond = async (id: string, accept: boolean) => {
    try {
      setLoading(true)
      const { data, error } = await supabase.rpc('respond_referral_by_therapist', { p_request: id, p_accept: accept }) as any
      if (error) throw error
      await supabase.from('referral_request_audits').insert({ referral_request_id: id, action: accept ? 'accepted_by_therapist_web' : 'rejected_by_therapist_web', actor: profile?.id })
      await fetch()
      push({ type: 'success', message: `Referral ${accept ? 'accepted' : 'rejected'}` })
    } catch (e:any) {
      console.error('respond referral', e)
      const msg = e?.message || String(e)
      setError(msg)
      push({ type: 'error', message: msg })
    } finally { setLoading(false) }
  }

  return (
    <div className="bg-white border rounded-lg shadow-sm p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-medium">Referrals Inbox</h3>
        <div className="text-sm text-gray-500">Incoming referrals to you</div>
      </div>
      {loading ? (
        <div className="py-8 grid place-items-center"><div className="animate-spin h-6 w-6 border-b-2 rounded-full border-blue-600"/></div>
      ) : error ? (
        <div className="text-red-600 p-3 bg-red-50 rounded">{error}</div>
      ) : rows.length === 0 ? (
        <div className="text-center py-8 text-gray-500">No referrals</div>
      ) : (
        <ul className="space-y-3">
          {rows.map(r => (
            <li key={r.id} className="p-3 border rounded flex items-start justify-between">
              <div>
                <div className="text-sm font-medium">{r.client ? `${r.client.first_name || ''} ${r.client.last_name || ''}` : r.client_id}</div>
                <div className="text-xs text-gray-500">From: {r.from ? `${r.from.first_name || ''} ${r.from.last_name || ''}` : r.from_therapist} • {new Date(r.created_at).toLocaleString()}</div>
                {r.note && <div className="mt-2 text-sm text-gray-700">{r.note}</div>}
              </div>
              <div className="flex flex-col items-end gap-2">
                <div className="text-xs px-2 py-1 rounded text-white" style={{ background: r.status === 'pending_therapist' ? '#F59E0B' : r.status === 'pending_client' ? '#3B82F6' : r.status === 'completed' ? '#10B981' : '#6B7280' }}>{r.status}</div>
                {r.status === 'pending_therapist' && (
                  <div className="flex gap-2">
                    <button onClick={() => { setConfirmPayload({ id: r.id, accept: true }); setConfirmOpen(true) }} className="px-3 py-1 rounded bg-green-600 text-white text-sm">Accept</button>
                    <button onClick={() => { setConfirmPayload({ id: r.id, accept: false }); setConfirmOpen(true) }} className="px-3 py-1 rounded bg-red-600 text-white text-sm">Reject</button>
                  </div>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
      <ConfirmModal
        open={confirmOpen}
        title={confirmPayload?.accept ? 'Accept referral' : 'Reject referral'}
        description={confirmPayload?.accept ? 'Accepting will request the client to confirm and link them to the referred therapist.' : 'Rejecting will decline this referral.'}
        confirmLabel={confirmPayload?.accept ? 'Accept' : 'Reject'}
        loading={loading}
        onConfirm={async () => { if (confirmPayload) await respond(confirmPayload.id, confirmPayload.accept); setConfirmOpen(false); setConfirmPayload(null) }}
        onCancel={() => { setConfirmOpen(false); setConfirmPayload(null) }}
      />
    </div>
  )
}

export default TherapistReferralsInbox
