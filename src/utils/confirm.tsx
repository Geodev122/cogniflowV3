import React from 'react'
import { createRoot } from 'react-dom/client'
import ConfirmModal from '../components/ui/ConfirmModal'

export default function confirmAsync(options: {
  title?: string
  description?: string
  confirmLabel?: string
  cancelLabel?: string
}) {
  return new Promise<boolean>((resolve) => {
    const container = document.createElement('div')
    document.body.appendChild(container)
    const root = createRoot(container)

    const cleanup = () => {
      try { root.unmount() } catch {}
      try { document.body.removeChild(container) } catch {}
    }

    const handleResolve = (v: boolean) => {
      cleanup()
      resolve(v)
    }

    root.render(
      <React.StrictMode>
        <ConfirmModal
          open={true}
          title={options.title}
          description={options.description}
          confirmLabel={options.confirmLabel}
          cancelLabel={options.cancelLabel}
          onConfirm={() => handleResolve(true)}
          onCancel={() => handleResolve(false)}
        />
      </React.StrictMode>
    )
  })
}
