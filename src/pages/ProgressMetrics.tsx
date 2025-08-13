import React, { useEffect, useMemo, useState } from 'react'
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Layout } from '../components/Layout'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'

interface Metric {
  client_id: string
  metric_date: string
  metric_type: string
  value: number
}

export default function ProgressMetrics() {
  const [metrics, setMetrics] = useState<Metric[]>([])
  const [clientFilter, setClientFilter] = useState('')
  const [metricFilter, setMetricFilter] = useState('')
  const [loading, setLoading] = useState(true)
  const { profile } = useAuth()

  useEffect(() => {
    if (profile) {
      fetchMetrics()
    }
  }, [profile])

  const fetchMetrics = async () => {
    try {
      const { data, error } = await supabase
        .from('progress_tracking')
        .select('client_id, recorded_at, metric_type, value')
        .order('recorded_at', { ascending: false })

      if (error) throw error

      const formattedMetrics = data?.map(item => ({
        client_id: item.client_id,
        metric_date: item.recorded_at,
        metric_type: item.metric_type,
        value: item.value
      })) || []

      setMetrics(formattedMetrics)
    } catch (error) {
      console.error('Failed to load metrics', error)
    } finally {
      setLoading(false)
    }
  }

  const clients = useMemo(() => Array.from(new Set(metrics.map(m => m.client_id))), [metrics])
  const metricTypes = useMemo(() => Array.from(new Set(metrics.map(m => m.metric_type))), [metrics])

  const filtered = metrics.filter(m =>
    (clientFilter ? m.client_id === clientFilter : true) &&
    (metricFilter ? m.metric_type === metricFilter : true)
  )

  if (loading) {
    return (
      <Layout title="Progress Metrics">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </Layout>
    )
  }

  return (
    <Layout title="Progress Metrics">
      <div className="space-y-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Progress Metrics</h2>
          <div className="flex gap-4 mb-4">
            <select 
              value={clientFilter} 
              onChange={e => setClientFilter(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Clients</option>
              {clients.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            <select 
              value={metricFilter} 
              onChange={e => setMetricFilter(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Metrics</option>
              {metricTypes.map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
          <div className="bg-white rounded-lg border border-gray-200">
            <ResponsiveContainer width="100%" height={400}>
              <LineChart data={filtered}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="metric_date" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </Layout>
  )
}
