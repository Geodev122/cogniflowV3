// src/pages/ProgressMetrics.tsx
import React, { useEffect, useMemo, useState } from 'react'
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { Calendar, LineChart as LineChartIcon, Users, AlertTriangle } from 'lucide-react'

type MetricRow = {
  client_id: string
  recorded_at: string
  metric_type: string
  value: number
}

type Metric = {
  client_id: string
  metric_date: string
  metric_type: string
  value: number
}

type ClientMap = Record<
  string,
  {
    name: string
    email?: string
  }
>

const formatShortDate = (iso?: string) =>
  iso ? new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : ''

const formatLongDateTime = (iso?: string) =>
  iso
    ? new Date(iso).toLocaleString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : '—'

export default function ProgressMetrics() {
  const { profile } = useAuth()
  const [metrics, setMetrics] = useState<Metric[]>([])
  const [clientMap, setClientMap] = useState<ClientMap>({})
  const [clientFilter, setClientFilter] = useState<string>('')
  const [metricFilter, setMetricFilter] = useState<string>('')
  const [range, setRange] = useState<'30' | '90' | '180' | 'all'>('90')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!profile) return
    let isMounted = true

    const fetchAll = async () => {
      try {
        setLoading(true)
        setError(null)

        // get the therapist's clients
        const { data: relations, error: relErr } = await supabase
          .from('therapist_client_relations')
          .select('client_id')
          .eq('therapist_id', profile.id)

        if (relErr) throw relErr
        const clientIds = relations?.map(r => r.client_id) ?? []

        if (clientIds.length === 0) {
          if (!isMounted) return
          setMetrics([])
          setClientMap({})
          return
        }

        // hydrate names
        const { data: clientProfiles, error: profErr } = await supabase
          .from('profiles')
          .select('id, first_name, last_name, email')
          .in('id', clientIds)

        if (profErr) throw profErr

        const map: ClientMap = {}
        for (const p of clientProfiles || []) {
          map[p.id] = {
            name: [p.first_name, p.last_name].filter(Boolean).join(' ') || 'Client',
            email: p.email,
          }
        }

        // load metrics only for the therapist's clients (and optionally time range)
        const sinceISO =
          range === 'all'
            ? undefined
            : new Date(Date.now() - Number(range) * 24 * 60 * 60 * 1000).toISOString()

        let query = supabase
          .from('progress_tracking')
          .select('client_id, recorded_at, metric_type, value')
          .in('client_id', clientIds)
          .order('recorded_at', { ascending: true }) // chronological for chart

        if (sinceISO) query = query.gte('recorded_at', sinceISO)

        const { data, error: metErr } = await query
        if (metErr) throw metErr

        const formatted: Metric[] =
          data?.map((item: MetricRow) => ({
            client_id: item.client_id,
            metric_date: item.recorded_at,
            metric_type: item.metric_type,
            value: item.value,
          })) || []

        if (!isMounted) return
        setClientMap(map)
        setMetrics(formatted)
      } catch (e: any) {
        console.error('Failed to load progress metrics:', e)
        if (!isMounted) return
        setError('Unable to load metrics. Please try again.')
        setClientMap({})
        setMetrics([])
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    fetchAll()
    return () => {
      isMounted = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile, range])

  const clients = useMemo(
    () =>
      Array.from(
        new Set(metrics.map(m => m.client_id))
      ).map(id => ({ id, name: clientMap[id]?.name || id })),
    [metrics, clientMap]
  )

  const metricTypes = useMemo(
    () => Array.from(new Set(metrics.map(m => m.metric_type))),
    [metrics]
  )

  const filtered = useMemo(
    () =>
      metrics.filter(
        m =>
          (!clientFilter || m.client_id === clientFilter) &&
          (!metricFilter || m.metric_type === metricFilter)
      ),
    [metrics, clientFilter, metricFilter]
  )

  const lastUpdated = filtered.length > 0 ? filtered[filtered.length - 1].metric_date : undefined
  const totalPoints = filtered.length
  const average =
    totalPoints > 0 ? filtered.reduce((acc, m) => acc + (m.value ?? 0), 0) / totalPoints : 0

  // simple “trend” calc: last 3 vs previous 3 (if available)
  const trend = useMemo(() => {
    if (filtered.length < 6) return null
    const last3 = filtered.slice(-3)
    const prev3 = filtered.slice(-6, -3)
    const avgLast = last3.reduce((s, m) => s + m.value, 0) / 3
    const avgPrev = prev3.reduce((s, m) => s + m.value, 0) / 3
    const delta = avgLast - avgPrev
    const pct = avgPrev !== 0 ? (delta / Math.abs(avgPrev)) * 100 : 0
    return { delta, pct }
  }, [filtered])

  // Loading
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Header skeleton */}
          <div className="h-9 w-56 bg-gray-200 rounded"></div>
          {/* Cards skeleton */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                <div className="h-6 w-24 bg-gray-200 rounded mb-3"></div>
                <div className="h-8 w-20 bg-gray-200 rounded"></div>
              </div>
            ))}
          </div>
          {/* Chart skeleton */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 h-[420px]">
            <div className="h-full w-full bg-gray-100 rounded" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Page Header */}
        <div className="flex items-start sm:items-center sm:justify-between flex-col sm:flex-row">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Progress Metrics</h1>
            <p className="text-gray-600 mt-1">Track outcomes and client-reported measures over time</p>
          </div>

          {/* Filters */}
          <div className="mt-4 sm:mt-0 flex flex-wrap gap-2">
            <select
              value={clientFilter}
              onChange={e => setClientFilter(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
            >
              <option value="">All clients</option>
              {clients.map(c => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>

            <select
              value={metricFilter}
              onChange={e => setMetricFilter(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
            >
              <option value="">All metrics</option>
              {metricTypes.map(t => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>

            <select
              value={range}
              onChange={e => setRange(e.target.value as any)}
              className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
            >
              <option value="30">Last 30 days</option>
              <option value="90">Last 90 days</option>
              <option value="180">Last 180 days</option>
              <option value="all">All time</option>
            </select>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start space-x-3">
            <AlertTriangle className="w-5 h-5 text-red-500 mt-0.5" />
            <div>
              <p className="text-sm text-red-800">{error}</p>
            </div>
          </div>
        )}

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Points</p>
                <p className="text-3xl font-bold text-blue-600">{totalPoints}</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-full">
                <LineChartIcon className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Average Value</p>
                <p className="text-3xl font-bold text-green-600">
                  {totalPoints ? average.toFixed(1) : '—'}
                </p>
              </div>
              <div className="p-3 bg-green-100 rounded-full">
                <Users className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Last Updated</p>
                <p className="text-lg font-semibold text-purple-700">
                  {lastUpdated ? formatLongDateTime(lastUpdated) : '—'}
                </p>
              </div>
              <div className="p-3 bg-purple-100 rounded-full">
                <Calendar className="h-6 w-6 text-purple-600" />
              </div>
            </div>
            {trend && (
              <p className={`mt-2 text-sm ${trend.delta >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {trend.delta >= 0 ? '▲' : '▼'} {Math.abs(trend.delta).toFixed(2)} (
                {Math.abs(trend.pct).toFixed(0)}%)
              </p>
            )}
          </div>
        </div>

        {/* Chart / Empty State */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          {filtered.length === 0 ? (
            <div className="text-center py-16">
              <div className="mx-auto w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                <LineChartIcon className="w-6 h-6 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-1">No data to display</h3>
              <p className="text-gray-600">
                {clientFilter || metricFilter
                  ? 'Try clearing or changing your filters.'
                  : 'Start collecting in-between session check-ins and assessments.'}
              </p>
            </div>
          ) : (
            <div className="w-full h-[420px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={filtered}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="metric_date"
                    tickFormatter={formatShortDate}
                    minTickGap={24}
                  />
                  <YAxis />
                  <Tooltip
                    labelFormatter={label => formatLongDateTime(String(label))}
                    formatter={(val: any, name: any) => [val, name === 'value' ? 'Value' : name]}
                  />
                  <Line type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
