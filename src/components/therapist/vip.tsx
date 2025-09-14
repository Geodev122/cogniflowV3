import React, { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { Star, Loader2 } from 'lucide-react'

export const VIPOpportunities: React.FC = () => {
  const [offers, setOffers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    ;(async () => {
      const { data } = await supabase
        .from('vip_offers')
        .select('*')
        .gte('expires_on', new Date().toISOString().slice(0, 10))
        .order('expires_on', { ascending: true })
      setOffers(data || [])
      setLoading(false)
    })()
  }, [])

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-2 mb-4">
        <Star className="w-6 h-6 text-blue-600" />
        <h2 className="text-2xl font-bold text-gray-900">VIP Opportunities</h2>
      </div>

      <div className="bg-white border rounded-lg shadow-sm">
        {loading ? (
          <div className="py-12 grid place-items-center"><Loader2 className="w-6 h-6 animate-spin text-blue-600" /></div>
        ) : offers.length === 0 ? (
          <div className="py-12 text-center">
            <Star className="w-10 h-10 text-gray-300 mx-auto mb-2" />
            <div className="text-gray-900 font-medium">No active offers</div>
            <div className="text-sm text-gray-600">New opportunities will appear here.</div>
          </div>
        ) : (
          <ul className="divide-y">
            {offers.map(o => (
              <li key={o.id} className="p-4 hover:bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="min-w-0">
                    <div className="font-medium text-gray-900 truncate">{o.title}</div>
                    <div className="text-sm text-gray-700 mt-1">{o.body}</div>
                    <div className="text-xs text-gray-500 mt-1">Expires: {o.expires_on}</div>
                  </div>
                  {o.cta_url && (
                    <a className="ml-3 shrink-0 px-3 py-1.5 bg-blue-600 text-white rounded text-xs hover:bg-blue-700" href={o.cta_url} target="_blank" rel="noreferrer">
                      {o.cta_label || 'Learn more'}
                    </a>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
export default VIPOpportunities
