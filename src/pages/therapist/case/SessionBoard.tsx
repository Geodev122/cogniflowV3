// src/pages/therapist/case/SessionBoard.tsx
import React from 'react'
import { useParams, Link } from 'react-router-dom'

const SessionBoard: React.FC = () => {
  const { caseId } = useParams()
  return (
    <div className="space-y-3">
      <p className="text-gray-700">Link to Sessions tab for scheduling & notes.</p>
      <Link className="text-blue-600 underline" to="/therapist/sessions">Open Session Management</Link>
    </div>
  )
}
export default SessionBoard
