// src/pages/therapist/case/CaseSummary.tsx
import React from 'react'
import { useParams } from 'react-router-dom'

const CaseSummary: React.FC = () => {
  const { caseId } = useParams()
  return (
    <div className="prose">
      <h3>Case Summary</h3>
      <p>Export aggregated data, outcomes, and discharge summary for case: <code>{caseId}</code>.</p>
    </div>
  )
}
export default CaseSummary
