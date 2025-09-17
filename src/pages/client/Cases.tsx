import React, { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { MobileShell } from '../../components/client/MobileShell'
import { BarChart3, Send } from 'lucide-react'

type CaseRow = { id: string; case_number?: string | null; status: string; data?: any; therapist_id?: string | null }

export default function Cases() {
  const { profile } = useAuth()
  const [rows, setRows] = useState<CaseRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  useEffect(() => {
    let cancel = false
    const load = async () => {
      if (!profile) return
      setLoading(true); setError(null)
      try {
        const { data, error: err } = await supabase
          .from('cases')
          .select('id, case_number, status, therapist_id, treatment_plan, data')
          .eq('client_id', profile.id)
          .order('created_at', { ascending: false })
        if (err) throw err
        if (!cancel) setRows((data || []) as CaseRow[])
      } catch (e:any) {
        console.error('[Cases] load', e); if (!cancel) setError('Could not load your cases.')
      } finally {
        if (!cancel) setLoading(false)
      }
    }
    load()
    return () => { cancel = true }
  }, [profile])

  const request = async (type: 'end_therapy' | 'referral', caseId: string) => {
    const reason = prompt(type === 'end_therapy' ? 'Optional message about ending therapy:' : 'Optional message about referral:')
    setSubmitting(true); setMsg(null)
    try {
      await supabase.from('client_requests').insert({
        client_id: profile?.id, case_id: caseId, therapist_id: rows.find(r=>r.id===caseId)?.therapist_id || null,
        type, message: reason || null, status: 'open'
      } as any)
      setMsg('Request sent to your therapist.')
    } catch (e:any) {
      console.warn('[Cases] request', e); setMsg('Could not send request (feature may be disabled).')
    } finally { setSubmitting(false) }
  }

  return (
    <MobileShell title="Your Cases">
      <div className="p-3">
        {loading ? (
          <div className="h-[60vh] grid place-items-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 text-red-800 rounded p-3 text-sm">{error}</div>
        ) : rows.length === 0 ? (
          <div className="text-sm text-gray-600">No cases yet.</div>
        ) : (
          <div className="space-y-2">
            {msg && <div className="text-xs text-gray-600">{msg}</div>}
            {rows.map(c => (
              <div key={c.id} className="bg-white border border-gray-200 rounded-xl p-3">
                <div className="flex items-center justify-between">
                  <div className="font-medium text-gray-900">{c.case_number || `Case ${c.id.slice(0,6)}`}</div>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    c.status === 'active' ? 'bg-blue-100 text-blue-700' :
                    c.status === 'closed' ? 'bg-gray-100 text-gray-700' : 'bg-amber-100 text-amber-700'
                  }`}>{c.status}</span>
                </div>
                {/* Basic progress summary from case.data.plan or metrics */}
                <div className="mt-1 text-[11px] text-gray-600 flex items-center gap-1">
                  <BarChart3 className="w-3.5 h-3.5" />
                  {c.treatment_plan?.goals?.length || c.data?.treatment_plan?.goals?.length || c.data?.plan?.goals?.length
                    ? `${c.treatment_plan?.goals?.length || c.data?.treatment_plan?.goals?.length || c.data?.plan?.goals?.length} goal(s) set`
                    : 'Treatment plan not available yet'}
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <button
                    onClick={()=>request('end_therapy', c.id)}
                    disabled={submitting}
                    className="text-xs px-2 py-1.5 rounded border hover:bg-gray-50 flex items-center gap-1 disabled:opacity-50"
                  >
                    <Send className="w-3.5 h-3.5" /> Request end
                  </button>
                  <button
                    onClick={()=>request('referral', c.id)}
                    disabled={submitting}
                    className="text-xs px-2 py-1.5 rounded border hover:bg-gray-50 flex items-center gap-1 disabled:opacity-50"
                  >
                    <Send className="w-3.5 h-3.5" /> Ask referral
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </MobileShell>
  )
}
