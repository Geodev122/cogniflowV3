import React, { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export const TherapistSearchModal: React.FC = () => {
  const [open, setOpen] = useState(false)
  const [clientId, setClientId] = useState<string | null>(null)
  const [q, setQ] = useState('')
  const [results, setResults] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const handler = (e: any) => { setClientId(e.detail?.clientId || null); setOpen(true) }
    window.addEventListener('open-therapist-search', handler as any)
    return () => window.removeEventListener('open-therapist-search', handler as any)
  }, [])

  useEffect(() => {
    let mounted = true
    const run = async () => {
      if (!q) return setResults([])
      setLoading(true)
      try {
        const { data } = await supabase.from('profiles').select('id, first_name, last_name, email').ilike('first_name', `%${q}%`).or(`last_name.ilike.%${q}%`)
        if (!mounted) return
        setResults(data || [])
      } catch (e) {
        console.error('therapist search', e)
      } finally { setLoading(false) }
    }
    const t = setTimeout(run, 250)
    return () => { mounted = false; clearTimeout(t) }
  }, [q])

  const select = async (therapistId: string) => {
    if (!clientId) return
    try {
      // call RPC to create referral
      const { data, error } = await supabase.rpc('create_referral_request', { p_from: supabase.auth.user()?.id, p_to: therapistId, p_client: clientId, p_note: null, p_metadata: null }) as any
      if (error) throw error
      setOpen(false)
      alert('Referral sent')
    } catch (e: any) {
      console.error('referral create', e)
      alert('Could not send referral: ' + (e?.message || e))
    }
  }

  if (!open) return null
  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
      <div className="relative max-w-lg mx-auto mt-24 bg-white rounded shadow p-4">
        <h3 className="font-medium">Refer client</h3>
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search therapist by name" className="w-full border rounded px-2 py-1 my-2" />
        <div className="max-h-64 overflow-auto">
          {loading ? <div>Loading…</div> : results.map(r => (
            <div key={r.id} className="py-2 flex items-center justify-between border-b">
              <div>{r.first_name} {r.last_name} <div className="text-xs text-gray-500">{r.email}</div></div>
              <button onClick={() => select(r.id)} className="px-3 py-1 rounded bg-blue-600 text-white">Select</button>
            </div>
          ))}
        </div>
        <div className="mt-2 text-right"><button onClick={() => setOpen(false)} className="px-3 py-1 rounded border">Close</button></div>
      </div>
    </div>
  )
}

export default TherapistSearchModal
