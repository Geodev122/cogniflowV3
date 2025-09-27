import React, { createContext, useContext, useState, useCallback, useEffect } from 'react'

type Toast = { id: string; message: string; type?: 'info' | 'success' | 'error' }

const ToastContext = createContext<{ push: (t: Omit<Toast, 'id'>) => void } | null>(null)

export const useToast = () => {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([])
  const push = useCallback((t: Omit<Toast, 'id'>) => {
    const id = String(Date.now())
    setToasts(s => [...s, { id, ...t }])
    // auto-dismiss
    setTimeout(() => setToasts(s => s.filter(x => x.id !== id)), 4000)
  }, [])

  return (
    <ToastContext.Provider value={{ push }}>
      {children}
      <div className="fixed right-4 bottom-6 z-50 flex flex-col gap-2">
        {toasts.map(t => (
          <div key={t.id} className={`px-4 py-2 rounded shadow ${t.type === 'error' ? 'bg-red-600 text-white' : t.type === 'success' ? 'bg-green-600 text-white' : 'bg-gray-800 text-white'}`}>
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}
