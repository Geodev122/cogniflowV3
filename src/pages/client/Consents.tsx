import React, { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { MobileShell } from '../../components/client/MobileShell'
import { CheckCircle, FileText } from 'lucide-react'

type ConsentRow = { id: string; title: string; body?: string | null; case_id?: string | null; signed_at?: string | null }

export default function Consents() {
  const { profile } = useAuth()
  const [rows, setRows] = useState<ConsentRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [signingId, setSigningId] = useState<string | null>(null)

  useEffect(() => {
    let cancel = false
    const load = async () => {
      if (!profile) return
      setLoading(true); setError(null)
      try {
        const { data, error: err } = await supabase
          .from('consents')
          .select('id, title, body, case_id, signed_at')
          .eq('client_id', profile.id)
          .order('created_at', { ascending: false })
          .limit(100)
        if (err) throw err
        if (!cancel) setRows((data || []) as any)
      } catch (e:any) {
        console.warn('[Consents] load', e); if (!cancel) setError('Could not load consent forms.')
      } finally {
        if (!cancel) setLoading(false)
      }
    }
    load()
    return () => { cancel = true }
  }, [profile])

  const sign = async (id: string) => {
    setSigningId(id)
    try {
      const { error } = await supabase
        .from('consents')
        .update({ signed_at: new Date().toISOString() })
        .eq('id', id)
      if (error) throw error
      setRows(prev => prev.map(r => r.id === id ? { ...r, signed_at: new Date().toISOString() } : r))
    } catch (e:any) {
      console.error('[Consents] sign', e)
      alert('Could not sign consent.')
    } finally {
      setSigningId(null)
    }
  }

  return (
    <MobileShell title="Consents">
      <div className="p-3">
        {loading ? (
          <div className="h-[60vh] grid place-items-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 text-red-800 rounded p-3 text-sm">{error}</div>
        ) : rows.length === 0 ? (
          <div className="text-sm text-gray-600">No consent forms assigned.</div>
        ) : (
          <div className="space-y-2">
            {rows.map(r => (
              <div key={r.id} className="bg-white border border-gray-200 rounded-xl p-3">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-blue-600" />
                  <div className="font-medium text-gray-900">{r.title || 'Consent'}</div>
                </div>
                {r.body && <div className="mt-2 text-[12px] text-gray-700 whitespace-pre-wrap">{r.body}</div>}
                <div className="mt-2">
                  {r.signed_at ? (
                    <span className="inline-flex items-center gap-1 text-xs bg-green-100 text-green-700 rounded-full px-2 py-0.5">
                      <CheckCircle className="w-3.5 h-3.5" /> Signed {new Date(r.signed_at).toLocaleDateString()}
                    </span>
                  ) : (
                    <button
                      onClick={() => sign(r.id)}
                      disabled={!!signingId}
                      className="text-xs bg-blue-600 text-white rounded-md px-3 py-1.5 active:scale-[0.99] disabled:opacity-50"
                    >
                      {signingId === r.id ? 'Signing…' : 'Sign'}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </MobileShell>
  )
}
