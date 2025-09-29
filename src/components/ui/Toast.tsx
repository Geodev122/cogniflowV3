import { ToastProvider as ToastProviderNew, useToasts } from './ToastContext'

// Compatibility wrapper: the older code expects `useToast()` which returns an object with `push({ message, type })`.
export const useToast = () => {
  const { push } = useToasts()
  return { push: (t: { message: string; type?: 'info' | 'success' | 'error' }) => push({ message: t.message, type: t.type || 'info' }) }
}

export const ToastProvider = ToastProviderNew
