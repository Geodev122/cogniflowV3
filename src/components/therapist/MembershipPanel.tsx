import React, { useEffect, useState } from 'react'
import { AlertTriangle, Loader2 } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'

type SubscriptionRow = {
  id: string
  status: 'active' | 'past_due' | 'canceled' | 'trialing' | 'inactive'
  plan_name: string | null
  current_period_end: string | null
  created_at: string
}

type InvoiceRow = {
  id: string
  number: string | null
  amount_due: number | null
  currency: string | null
  status: 'paid' | 'open' | 'void' | 'uncollectible' | null
  hosted_invoice_url: string | null
  created_at: string
}

export const MembershipPanel: React.FC = () => {
  const { user, profile, loading } = useAuth()
  const [busy, setBusy] = useState(true)
  const [err, setErr] = useState<string | null>(null)
  const [subs, setSubs] = useState<SubscriptionRow[]>([])
  const [invoices, setInvoices] = useState<InvoiceRow[]>([])

  useEffect(() => {
    const run = async () => {
      if (!user) return
      setBusy(true); setErr(null)

      try {
        // Subscriptions (RLS should allow therapist to read own)
        const { data: s, error: se } = await supabase
          .from('subscriptions')
          .select('id,status,plan_name,current_period_end,created_at')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
        if (se) throw se

        // Invoices (optional table; best-effort)
        const { data: inv, error: ie } = await supabase
          .from('invoices')
          .select('id,number,amount_due,currency,status,hosted_invoice_url,created_at')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
        if (ie) {
          // Don’t fail the whole panel if invoices aren’t available due to RLS/absent table
          console.warn('[MembershipPanel] invoices fetch warning:', ie.message)
        }

        setSubs((s || []) as SubscriptionRow[])
        setInvoices((inv || []) as InvoiceRow[])
      } catch (e: any) {
        console.error('[MembershipPanel] load error:', e)
        setErr('Could not load membership data.')
      } finally {
        setBusy(false)
      }
    }
    if (user && profile?.role === 'therapist') run()
  }, [user, profile?.role])

  if (loading) {
    return (
      <div className="p-6 grid place-items-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    )
  }

  if (!user || profile?.role !== 'therapist') {
    return (
      <div className="p-6">
        <div className="bg-white border border-gray-200 rounded-xl p-6 text-center">
          <AlertTriangle className="w-8 h-8 text-amber-600 mx-auto mb-2" />
          <h3 className="text-gray-900 font-semibold">Therapist access only</h3>
          <p className="text-sm text-gray-600 mt-1">Please sign in as a therapist.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Membership</h2>
          {busy && <Loader2 className="w-4 h-4 animate-spin text-blue-600" />}
        </div>

        {err && (
          <div className="mb-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded p-3">
            {err}
          </div>
        )}

        {/* Subscriptions */}
        <div className="space-y-3">
          <div className="text-sm text-gray-700 font-medium">Your subscription</div>
          {subs.length === 0 ? (
            <div className="text-sm text-gray-600">No active subscription found.</div>
          ) : (
            <div className="grid gap-3">
              {subs.map(s => (
                <div key={s.id} className="p-4 border rounded-lg bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-gray-900">
                        {s.plan_name || 'Thera-PY Plan'}
                      </div>
                      <div className="text-sm text-gray-600">
                        Status: <span className="font-medium capitalize">{s.status}</span>
                      </div>
                    </div>
                    <div className="text-xs text-gray-600">
                      Since {new Date(s.created_at).toLocaleDateString()}
                      {s.current_period_end && (
                        <div>Renews {new Date(s.current_period_end).toLocaleDateString()}</div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Invoices */}
        <div className="mt-6 space-y-3">
          <div className="text-sm text-gray-700 font-medium">Invoices</div>
          {invoices.length === 0 ? (
            <div className="text-sm text-gray-600">No invoices available.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-600">
                    <th className="py-2 pr-3">Date</th>
                    <th className="py-2 pr-3">Number</th>
                    <th className="py-2 pr-3">Amount</th>
                    <th className="py-2 pr-3">Status</th>
                    <th className="py-2 pr-3">Link</th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.map(inv => (
                    <tr key={inv.id} className="border-t">
                      <td className="py-2 pr-3">{new Date(inv.created_at).toLocaleDateString()}</td>
                      <td className="py-2 pr-3">{inv.number || '—'}</td>
                      <td className="py-2 pr-3">
                        {typeof inv.amount_due === 'number'
                          ? `${(inv.amount_due / 100).toFixed(2)} ${inv.currency?.toUpperCase() || ''}`
                          : '—'}
                      </td>
                      <td className="py-2 pr-3 capitalize">{inv.status || '—'}</td>
                      <td className="py-2 pr-3">
                        {inv.hosted_invoice_url ? (
                          <a
                            href={inv.hosted_invoice_url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-blue-600 hover:text-blue-800"
                          >
                            View
                          </a>
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
    </div>
  )
}
