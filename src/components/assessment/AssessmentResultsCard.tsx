// src/components/assessment/AssessmentResultsCard.tsx
import React from 'react'
import { BarChart3, FileText } from 'lucide-react'

type Props = {
  title: string
  templateName: string
  raw?: number | null
  max?: number | null
  category?: string | null
  description?: string | null
  recommendations?: string | null
  calculatedAt?: string | null
  onExport?: () => void
}

const AssessmentResultsCard: React.FC<Props> = ({
  title, templateName, raw, max, category, description, recommendations, calculatedAt, onExport
}) => {
  const pct = raw != null && max ? Math.round((Number(raw) / Number(max)) * 100) : null

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 text-gray-500 text-xs">
            <FileText className="w-4 h-4" />
            <span>{templateName}</span>
          </div>
          <h4 className="text-base font-semibold text-gray-900">{title}</h4>
          {calculatedAt && <div className="text-xs text-gray-500">Scored: {new Date(calculatedAt).toLocaleString()}</div>}
        </div>
        <button
          onClick={onExport}
          className="inline-flex items-center gap-1 px-3 py-1.5 rounded border text-sm hover:bg-gray-50"
          title="Export"
        >
          <BarChart3 className="w-4 h-4" />
          Export
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3">
        <div className="text-center border rounded-lg p-3">
          <div className="text-2xl font-bold">{raw ?? '—'}</div>
          <div className="text-xs text-gray-500">Raw Score</div>
        </div>
        <div className="text-center border rounded-lg p-3">
          <div className="text-2xl font-bold">{pct != null ? `${pct}%` : '—'}</div>
          <div className="text-xs text-gray-500">Percent of Max</div>
        </div>
        <div className="text-center border rounded-lg p-3">
          <div className="text-lg font-semibold">{category || '—'}</div>
          <div className="text-xs text-gray-500">Interpretation</div>
        </div>
      </div>

      {description && (
        <div className="mt-3 text-sm text-gray-700">
          <span className="font-medium text-gray-800">Summary: </span>{description}
        </div>
      )}
      {recommendations && (
        <div className="mt-2 text-sm text-gray-700">
          <span className="font-medium text-gray-800">Recommendations: </span>{recommendations}
        </div>
      )}
    </div>
  )
}

export default AssessmentResultsCard
