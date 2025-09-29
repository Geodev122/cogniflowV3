import React, { createContext, useContext, useCallback, useState } from 'react'

type Toast = { id: string; type: 'success' | 'error' | 'info'; message: string }

const ToastContext = createContext<{
  toasts: Toast[]
  push: (t: Omit<Toast, 'id'>) => void
  dismiss: (id: string) => void
} | null>(null)

export const useToasts = () => {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToasts must be used within ToastProvider')
  return ctx
}

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([])

  const push = useCallback((t: Omit<Toast, 'id'>) => {
    const id = Math.random().toString(36).slice(2, 9)
    setToasts(s => [...s, { id, ...t }])
    setTimeout(() => setToasts(s => s.filter(x => x.id !== id)), 4000)
  }, [])

  const dismiss = useCallback((id: string) => setToasts(s => s.filter(t => t.id !== id)), [])

  return (
    <ToastContext.Provider value={{ toasts, push, dismiss }}>
      {children}
      <div className="fixed right-4 bottom-6 z-50 space-y-2">
        {toasts.map(t => (
          <div key={t.id} className={`px-4 py-3 rounded shadow-lg text-sm ${t.type === 'success' ? 'bg-green-600 text-white' : t.type === 'error' ? 'bg-red-600 text-white' : 'bg-gray-800 text-white'}`}>
            <div className="flex items-center justify-between gap-4">
              <div className="truncate">{t.message}</div>
              <button onClick={() => dismiss(t.id)} className="ml-2 opacity-80 hover:opacity-100">Dismiss</button>
            </div>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}
