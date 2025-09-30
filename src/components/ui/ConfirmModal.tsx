import React from 'react'

export default function ConfirmModal(props: {
  open: boolean
  title?: string
  description?: string
  confirmLabel?: string
  cancelLabel?: string
  onConfirm: () => void
  onCancel: () => void
}) {
  const { open, title, description, confirmLabel = 'Confirm', cancelLabel = 'Cancel', onConfirm, onCancel } = props
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/40" onClick={onCancel} />
      <div className="flex items-center justify-center min-h-screen p-4">
        <div className="bg-white rounded-lg shadow-xl max-w-md w-full border">
          <div className="p-4 border-b">
            <h3 className="text-sm font-semibold text-gray-900">{title || 'Please confirm'}</h3>
            {description ? <div className="text-xs text-gray-500 mt-1">{description}</div> : null}
          </div>
          <div className="p-4 flex justify-end gap-2">
            <button onClick={onCancel} className="px-3 py-2 rounded border text-sm">{cancelLabel}</button>
            <button onClick={onConfirm} className="px-3 py-2 rounded bg-blue-600 text-white text-sm">{confirmLabel}</button>
          </div>
        </div>
      </div>
    </div>
  )
}
import React from 'react'

type Props = {
  open: boolean
  title?: string
  description?: string
  confirmLabel?: string
  cancelLabel?: string
  loading?: boolean
  onConfirm: () => Promise<void> | void
  onCancel: () => void
}

export const ConfirmModal: React.FC<Props> = ({ open, title = 'Confirm', description, confirmLabel = 'Confirm', cancelLabel = 'Cancel', loading, onConfirm, onCancel }) => {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50">
      <div className="fixed inset-0 bg-black/40" onClick={() => { if (!loading) onCancel() }} />
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="w-full max-w-md bg-white rounded shadow-lg overflow-hidden">
          <div className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-medium">{title}</h3>
                {description && <div className="text-sm text-gray-600 mt-2">{description}</div>}
              </div>
              <button onClick={() => { if (!loading) onCancel() }} className="p-2 rounded hover:bg-gray-100">✕</button>
            </div>
            <div className="mt-4 flex gap-2 justify-end">
              <button onClick={() => { if (!loading) onCancel() }} className="px-3 py-2 rounded border bg-white">{cancelLabel}</button>
              <button onClick={() => { if (!loading) onConfirm() }} className="px-3 py-2 rounded bg-blue-600 text-white">{loading ? 'Working…' : confirmLabel}</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ConfirmModal
