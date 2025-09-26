import React from 'react'
import { BarChart3 } from 'lucide-react'

export const ProgressMetrics: React.FC = () => {
  const cards = [
    { title: 'Active Cases', value: 18, sub: 'now' },
    { title: 'Upcoming Sessions', value: 7, sub: 'next 48h' },
    { title: 'Pending Assessments', value: 5, sub: 'awaiting client' },
    { title: 'Alerts', value: 2, sub: 'action needed' },
  ]
  const rows = [
    { name: 'John Smith', metric: 'PHQ-9 Δ', value: '-3', note: 'Improving' },
    { name: 'Emily Davis', metric: 'GAD-7 Δ', value: '-1', note: 'Stable' },
    { name: 'Michael Lee', metric: 'PHQ-9 Δ', value: '-4', note: 'Improving' },
  ]
  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center gap-2 mb-6">
        <BarChart3 className="w-6 h-6 text-blue-600" />
        <h2 className="text-2xl font-bold text-gray-900">Progress Metrics</h2>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {cards.map((c) => (
          <div key={c.title} className="bg-white rounded-lg border border-gray-200 shadow-sm p-5">
            <div className="text-sm text-gray-600">{c.title}</div>
            <div className="text-3xl font-bold text-gray-900 mt-1">{c.value}</div>
            <div className="text-xs text-gray-500 mt-1">{c.sub}</div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
        <div className="px-4 py-3 border-b border-gray-200">
          <h3 className="text-sm font-semibold text-gray-900">Recent Changes</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full table-fixed">
            <colgroup>
              <col className="w-1/2" /><col className="w-1/4" /><col className="w-1/6" /><col className="w-1/6" />
            </colgroup>
            <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
              <tr><th className="text-left px-4 py-3">Client</th><th className="text-left px-4 py-3">Metric</th><th className="text-left px-4 py-3">Value</th><th className="text-left px-4 py-3">Note</th></tr>
            </thead>
            <tbody className="divide-y divide-gray-200 text-sm">
              {rows.map((r, i) => (
                <tr key={i} className="hover:bg-gray-50">
                  <td className="px-4 py-3">{r.name}</td>
                  <td className="px-4 py-3">{r.metric}</td>
                  <td className="px-4 py-3">{r.value}</td>
                  <td className="px-4 py-3">{r.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
export default ProgressMetrics
