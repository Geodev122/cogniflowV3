import React from 'react'
import { useParams, useNavigate } from 'react-router-dom'

export default function Workspace() {
  const { caseId } = useParams()
  const navigate = useNavigate()

  return (
    <div className="min-h-[calc(100vh-4rem)] p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <header className="bg-white border border-gray-200 rounded-xl p-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">Practice Management Workspace</h1>
            <p className="text-sm text-gray-600">
              {caseId ? `Case: ${caseId}` : 'Select a case to load context.'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate('/therapist/assessments')}
              className="px-3 py-2 text-sm rounded-lg bg-amber-50 text-amber-800 hover:bg-amber-100"
            >
              Open Assessments
            </button>
          </div>
        </header>

        {!caseId ? (
          <div className="bg-white border border-dashed rounded-xl p-8 text-center text-gray-600">
            <p>Workspace shell ready. Next step will add Case Selector and data wiring.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6">
            <div className="bg-white border border-gray-200 rounded-xl p-4">
              <h2 className="font-medium text-gray-900 mb-1">Session Context Bar</h2>
              <p className="text-sm text-gray-500">Stub (will show client, case, goals)</p>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="bg-white border border-gray-200 rounded-xl p-4 lg:col-span-2">
                <h3 className="font-medium text-gray-900 mb-1">Session Progress</h3>
                <p className="text-sm text-gray-500">Stub (timeline)</p>
              </div>
              <div className="bg-white border border-gray-200 rounded-xl p-4">
                <h3 className="font-medium text-gray-900 mb-1">Between Sessions</h3>
                <p className="text-sm text-gray-500">Stub (activities/homework)</p>
              </div>
            </div>
            <div className="bg-white border border-gray-200 rounded-xl p-4">
              <h3 className="font-medium text-gray-900 mb-1">Session Board</h3>
              <p className="text-sm text-gray-500">Stub (resource drawer + note editor)</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
