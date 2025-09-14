import React, { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { CreditCard, Loader2 } from 'lucide-react'

export const MembershipPanel: React.FC = () => {
  const { profile } = useAuth()
  const [sub, setSub] = useState<any | null>(null)
  const [invoices, setInvoices] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    ;(async () => {
      if (!profile?.id) return
      setLoading(true)
      const [{ data: s }, { data: inv }] = await Promise.all([
        supabase.from('subscriptions').select('*').eq('therapist_id', profile.id).maybeSingle(),
        supabase.from('invoices').select('*').eq('therapist_id', profile.id).order('created_at', { ascending: false }).limit(10),
      ])
      setSub(s || null)
      setInvoices(inv || [])
      setLoading(false)
    })()
  }, [profile?.id])

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-4">
      <div className="flex items-center gap-2">
        <CreditCard className="w-6 h-6 text-blue-600" />
        <h2 className="text-2xl font-bold text-gray-900">Membership</h2>
      </div>

      <div className="bg-white border rounded-lg shadow-sm p-4">
        {loading ? (
          <div className="py-8 grid place-items-center"><Loader2 className="w-6 h-6 animate-spin text-blue-600" /></div>
        ) : !sub ? (
          <div className="text-sm text-gray-700">No active subscription. Please contact admin to activate your membership.</div>
        ) : (
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="text-sm">
              <div><span className="text-gray-600">Status:</span> <span className="font-medium">{sub.status}</span></div>
              <div><span className="text-gray-600">Renews on:</span> <span className="font-medium">{sub.renewal_on || '—'}</span></div>
            </div>
            <div className="text-xs text-gray-500">For upgrades/renewal changes, contact support.</div>
          </div>
        )}
      </div>

      <div className="bg-white border rounded-lg shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200">
          <div className="font-semibold text-sm text-gray-900">Invoices</div>
        </div>
        {loading ? (
          <div className="py-8 grid place-items-center"><Loader2 className="w-6 h-6 animate-spin text-blue-600" /></div>
        ) : invoices.length === 0 ? (
          <div className="py-10 text-center text-sm text-gray-600">No invoices yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-gray-50 text-xs uppercase text-gray-600">
                <tr>
                  <th className="text-left px-4 py-3">Date</th>
                  <th className="text-left px-4 py-3">Amount</th>
                  <th className="text-left px-4 py-3">Status</th>
                  <th className="text-right px-4 py-3">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y text-sm">
                {invoices.map(inv => (
                  <tr key={inv.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">{new Date(inv.created_at).toLocaleDateString()}</td>
                    <td className="px-4 py-3">${(inv.amount_cents / 100).toFixed(2)}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        inv.status === 'paid' ? 'bg-green-100 text-green-700'
                          : inv.status === 'void' ? 'bg-gray-100 text-gray-700' : 'bg-yellow-100 text-yellow-700'
                      }`}>{inv.status}</span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {inv.invoice_url ? (
                        <a href={inv.invoice_url} target="_blank" rel="noreferrer" className="px-3 py-1.5 bg-blue-600 text-white rounded text-xs hover:bg-blue-700">View</a>
                      ) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
export default import React, { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { CreditCard, Loader2 } from 'lucide-react'

export const MembershipPanel: React.FC = () => {
  const { profile } = useAuth()
  const [sub, setSub] = useState<any | null>(null)
  const [invoices, setInvoices] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    ;(async () => {
      if (!profile?.id) return
      setLoading(true)
      const [{ data: s }, { data: inv }] = await Promise.all([
        supabase.from('subscriptions').select('*').eq('therapist_id', profile.id).maybeSingle(),
        supabase.from('invoices').select('*').eq('therapist_id', profile.id).order('created_at', { ascending: false }).limit(10),
      ])
      setSub(s || null)
      setInvoices(inv || [])
      setLoading(false)
    })()
  }, [profile?.id])

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-4">
      <div className="flex items-center gap-2">
        <CreditCard className="w-6 h-6 text-blue-600" />
        <h2 className="text-2xl font-bold text-gray-900">Membership</h2>
      </div>

      <div className="bg-white border rounded-lg shadow-sm p-4">
        {loading ? (
          <div className="py-8 grid place-items-center"><Loader2 className="w-6 h-6 animate-spin text-blue-600" /></div>
        ) : !sub ? (
          <div className="text-sm text-gray-700">No active subscription. Please contact admin to activate your membership.</div>
        ) : (
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="text-sm">
              <div><span className="text-gray-600">Status:</span> <span className="font-medium">{sub.status}</span></div>
              <div><span className="text-gray-600">Renews on:</span> <span className="font-medium">{sub.renewal_on || '—'}</span></div>
            </div>
            <div className="text-xs text-gray-500">For upgrades/renewal changes, contact support.</div>
          </div>
        )}
      </div>

      <div className="bg-white border rounded-lg shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200">
          <div className="font-semibold text-sm text-gray-900">Invoices</div>
        </div>
        {loading ? (
          <div className="py-8 grid place-items-center"><Loader2 className="w-6 h-6 animate-spin text-blue-600" /></div>
        ) : invoices.length === 0 ? (
          <div className="py-10 text-center text-sm text-gray-600">No invoices yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-gray-50 text-xs uppercase text-gray-600">
                <tr>
                  <th className="text-left px-4 py-3">Date</th>
                  <th className="text-left px-4 py-3">Amount</th>
                  <th className="text-left px-4 py-3">Status</th>
                  <th className="text-right px-4 py-3">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y text-sm">
                {invoices.map(inv => (
                  <tr key={inv.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">{new Date(inv.created_at).toLocaleDateString()}</td>
                    <td className="px-4 py-3">${(inv.amount_cents / 100).toFixed(2)}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        inv.status === 'paid' ? 'bg-green-100 text-green-700'
                          : inv.status === 'void' ? 'bg-gray-100 text-gray-700' : 'bg-yellow-100 text-yellow-700'
                      }`}>{inv.status}</span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {inv.invoice_url ? (
                        <a href={inv.invoice_url} target="_blank" rel="noreferrer" className="px-3 py-1.5 bg-blue-600 text-white rounded text-xs hover:bg-blue-700">View</a>
                      ) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
export default MembershipPanel

