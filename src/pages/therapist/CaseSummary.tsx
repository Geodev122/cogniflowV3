import React from 'react'
import { useParams } from 'react-router-dom'

export default function CaseSummary() {
  const { caseId } = useParams()
  return (
    <div className="p-6">
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <h1 className="text-xl font-semibold text-gray-900 mb-2">Case Summary</h1>
        <p className="text-sm text-gray-600">Stub page for case: <span className="font-mono">{caseId}</span></p>
        <p className="text-sm text-gray-500 mt-2">Next steps: load summary from <code>case_summaries</code>, show highlights & feedback.</p>
      </div>
    </div>
  )
}
