import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { 
  Play, Archive, RotateCcw, Send, ArrowRightLeft, 
  AlertTriangle, CheckCircle, Loader2 
} from 'lucide-react'
import { CaseData, CasePermissions } from '../../hooks/useCaseContext'

interface CaseActionsBarProps {
  caseData: CaseData
  permissions: CasePermissions
  onArchive?: (reason: string) => Promise<boolean>
  onReopen?: () => Promise<boolean>
  onSupervisionSubmit?: () => void
  onReferralSubmit?: () => void
}

export const CaseActionsBar: React.FC<CaseActionsBarProps> = ({
  caseData,
  permissions,
  onArchive,
  onReopen,
  onSupervisionSubmit,
  onReferralSubmit
}) => {
  const navigate = useNavigate()
  const [archiveModalOpen, setArchiveModalOpen] = useState(false)
  const [archiveReason, setArchiveReason] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const isArchived = ['archived', 'closed'].includes(caseData.status)
  const isActive = ['open', 'active', 'paused'].includes(caseData.status)

  const handleArchive = async () => {
    if (!onArchive) return
    
    setSubmitting(true)
    try {
      const success = await onArchive(archiveReason)
      if (success) {
        setArchiveModalOpen(false)
        setArchiveReason('')
      }
    } finally {
      setSubmitting(false)
    }
  }

  const handleReopen = async () => {
    if (!onReopen) return
    
    setSubmitting(true)
    try {
      await onReopen()
    } finally {
      setSubmitting(false)
    }
  }

  const openWorkspace = () => {
    navigate(`/therapist/workspace/${caseData.id}`)
  }

  return (
    <div className="flex items-center gap-2">
      {/* Workspace Access */}
      {isActive && (
        <button
          onClick={openWorkspace}
          className="inline-flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          title="Open live session workspace"
        >
          <Play className="w-4 h-4" />
          <span className="hidden sm:inline">Open Workspace</span>
        </button>
      )}

      {/* Reopen Case */}
      {isArchived && permissions.canReopen && (
        <button
          onClick={handleReopen}
          disabled={submitting}
          className="inline-flex items-center gap-2 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
          title="Reopen this case"
        >
          {submitting ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <RotateCcw className="w-4 h-4" />
          )}
          <span className="hidden sm:inline">Reopen</span>
        </button>
      )}

      {/* Archive Case */}
      {isActive && permissions.canArchive && (
        <button
          onClick={() => setArchiveModalOpen(true)}
          className="inline-flex items-center gap-2 px-3 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          title="Archive this case"
        >
          <Archive className="w-4 h-4" />
          <span className="hidden sm:inline">Archive</span>
        </button>
      )}

      {/* Submit for Supervision */}
      {permissions.canSubmitSupervision && (
        <button
          onClick={onSupervisionSubmit}
          className="inline-flex items-center gap-2 px-3 py-2 border border-blue-300 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors"
          title="Submit case for supervision"
        >
          <Send className="w-4 h-4" />
          <span className="hidden sm:inline">Supervision</span>
        </button>
      )}

      {/* Refer Case */}
      {permissions.canRefer && (
        <button
          onClick={onReferralSubmit}
          className="inline-flex items-center gap-2 px-3 py-2 border border-purple-300 bg-purple-50 text-purple-700 rounded-lg hover:bg-purple-100 transition-colors"
          title="Refer case to another therapist"
        >
          <ArrowRightLeft className="w-4 h-4" />
          <span className="hidden sm:inline">Refer</span>
        </button>
      )}

      {/* Archive Modal */}
      {archiveModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen p-4">
            <div className="fixed inset-0 bg-gray-900/50" onClick={() => setArchiveModalOpen(false)} />
            <div className="relative bg-white rounded-xl shadow-xl max-w-md w-full">
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Archive Case</h3>
                  <button 
                    onClick={() => setArchiveModalOpen(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-4">
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5" />
                      <div>
                        <h4 className="font-medium text-amber-900">Archive Case</h4>
                        <p className="text-sm text-amber-800 mt-1">
                          Case {caseData.case_number || caseData.id.slice(0, 8)} will be moved to archives. 
                          You can reopen it later if needed.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Reason for Archiving (Optional)
                    </label>
                    <textarea
                      value={archiveReason}
                      onChange={(e) => setArchiveReason(e.target.value)}
                      rows={3}
                      placeholder="e.g., Treatment goals achieved, Client discharged, Transferred to another provider..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>

                <div className="mt-6 flex justify-end gap-3">
                  <button
                    onClick={() => setArchiveModalOpen(false)}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleArchive}
                    disabled={submitting}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Archiving...
                      </>
                    ) : (
                      <>
                        <Archive className="w-4 h-4" />
                        Archive Case
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default CaseActionsBar