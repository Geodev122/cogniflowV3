// src/components/client/MobileTopBar.tsx
import React from 'react'
import { useNavigate } from 'react-router-dom'
import { LogOut } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'

type Props = {
  title: string
  rightSlot?: React.ReactNode
}

export const MobileTopBar: React.FC<Props> = ({ title, rightSlot }) => {
  const { signOut } = useAuth()
  const navigate = useNavigate()
  const [busy, setBusy] = React.useState(false)
  const [err, setErr] = React.useState<string | null>(null)

  const handleSignOut = async () => {
    setErr(null)
    setBusy(true)
    try {
      await signOut()
      navigate('/login', { replace: true })
    } catch (e: any) {
      console.error('Sign out failed:', e)
      setErr(e?.message || 'Failed to sign out.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur border-b border-gray-200">
        <div className="max-w-screen-sm mx-auto px-4 h-14 flex items-center justify-between">
          <h1 className="text-base font-semibold text-gray-900 truncate">{title}</h1>
          <div className="flex items-center gap-2">
            {rightSlot}
            <button
              onClick={handleSignOut}
              disabled={busy}
              className="inline-flex items-center gap-1 text-sm px-3 py-1.5 rounded-lg border bg-white hover:bg-gray-50 disabled:opacity-50"
              title="Sign out"
            >
              {busy ? (
                <span className="inline-flex items-center">
                  <span className="animate-spin h-4 w-4 border-b-2 border-gray-600 rounded-full mr-2" />
                  Signing out…
                </span>
              ) : (
                <>
                  <LogOut className="w-4 h-4" />
                  <span className="hidden sm:inline">Sign out</span>
                </>
              )}
            </button>
          </div>
        </div>
        {err && (
          <div className="bg-red-50 border-t border-red-200 text-red-700 text-sm px-4 py-2">
            <div className="max-w-screen-sm mx-auto">{err}</div>
          </div>
        )}
      </header>
      {/* add top padding so content isn't hidden under the header */}
      <div className="pt-14" />
    </>
  )
}
