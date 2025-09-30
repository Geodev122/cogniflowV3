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

const ConfirmModal: React.FC<Props> = ({
  open,
  title = 'Confirm',
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  loading = false,
  onConfirm,
  onCancel,
}) => {
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
