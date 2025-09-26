// src/components/Layout.tsx
import React from 'react'
import { useAuth } from '../hooks/useAuth'
import { LogOut, AlertTriangle, Menu, X } from 'lucide-react'

interface LayoutProps {
  children: React.ReactNode
  title: string
}

export const Layout: React.FC<LayoutProps> = ({ children, title }) => {
  const { profile, signOut } = useAuth()
  const [isSigningOut, setIsSigningOut] = React.useState(false)
  const [signOutError, setSignOutError] = React.useState<string | null>(null)
  const [mobileOpen, setMobileOpen] = React.useState(false)

  const handleSignOut = async () => {
    setIsSigningOut(true)
    setSignOutError(null)
    try {
      await signOut()
    } catch (error) {
      console.error('Error signing out:', error)
      setSignOutError('Failed to sign out. Please try again.')
    } finally {
      setIsSigningOut(false)
    }
  }

  // Simple role-aware nav items (wire real hrefs later if needed)
  const navItems =
    profile?.role === 'therapist'
      ? [
          { label: 'Overview', href: '#' },
          { label: 'Clients', href: '#' },
          { label: 'Cases', href: '#' },
          { label: 'Sessions', href: '#' },
          { label: 'Resources', href: '#' },
          { label: 'Practice', href: '#' },
          { label: 'Clinic Rental', href: '#' },
        ]
      : [
          { label: 'Overview', href: '#' },
          { label: 'Worksheets', href: '#' },
          { label: 'Exercises', href: '#' },
          { label: 'Assessments', href: '#' },
          { label: 'Progress', href: '#' },
        ]

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sticky, translucent header */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur supports-[backdrop-filter]:bg-white/75 border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              {/* Mobile menu button */}
              <button
                onClick={() => setMobileOpen(true)}
                className="inline-flex md:hidden items-center justify-center rounded-md p-2 text-gray-700 hover:bg-gray-100"
                aria-label="Open menu"
              >
                <Menu className="w-5 h-5" />
              </button>

              {/* Brand */}
              <div className="flex items-center space-x-3">
                <img
                  src="/thera-py-icon.png"
                  alt="Thera-PY Logo"
                  className="w-8 h-8"
                  onError={(e) => {
                    console.error('Logo icon failed to load')
                    e.currentTarget.style.display = 'none'
                  }}
                />
                <img
                  src="/thera-py-image.png"
                  alt="Thera-PY"
                  className="h-6"
                  onError={(e) => {
                    console.error('Logo text failed to load')
                    e.currentTarget.outerHTML =
                      '<span class="text-xl font-bold text-gray-900">Thera-PY</span>'
                  }}
                />
              </div>

              {/* Role label */}
              <p className="ml-1 text-xs sm:text-sm text-gray-500 capitalize">
                {profile?.role === 'therapist' ? 'Therapist Portal' : 'Client Portal'}
              </p>
            </div>

            {/* Right actions */}
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2 text-sm text-gray-700">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <span className="text-xs font-medium text-blue-600">
                    {profile?.first_name?.[0]}
                    {profile?.last_name?.[0]}
                  </span>
                </div>
                <div className="hidden sm:block">
                  <span>
                    {profile?.first_name} {profile?.last_name}
                  </span>
                </div>
              </div>
              <button
                onClick={handleSignOut}
                disabled={isSigningOut}
                className="flex items-center space-x-2 px-3 py-2 text-sm text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title="Sign out"
              >
                {isSigningOut ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600"></div>
                ) : (
                  <LogOut className="w-4 h-4" />
                )}
                <span className="hidden sm:inline">
                  {isSigningOut ? 'Signing out...' : 'Sign out'}
                </span>
              </button>
            </div>
          </div>

          {/* Sign out error notification */}
          {signOutError && (
            <div className="bg-red-50 border-l-4 border-red-400 p-3 rounded-md mb-2">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-400" />
                <span className="text-sm text-red-700">{signOutError}</span>
                <button
                  onClick={() => setSignOutError(null)}
                  className="ml-auto text-red-400 hover:text-red-600"
                >
                  <span className="sr-only">Dismiss</span>×
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Mobile drawer */}
        {mobileOpen && (
          <div className="fixed inset-0 z-50 md:hidden">
            {/* Overlay */}
            <button
              className="absolute inset-0 bg-black/40"
              aria-label="Close menu"
              onClick={() => setMobileOpen(false)}
            />
            {/* Panel */}
            <div className="absolute left-0 top-0 h-full w-72 max-w-[85%] bg-white shadow-xl border-r border-gray-200 p-4 flex flex-col">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-xs font-medium text-blue-600">
                      {profile?.first_name?.[0]}
                      {profile?.last_name?.[0]}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-gray-900 truncate">
                      {profile?.first_name} {profile?.last_name}
                    </div>
                    <div className="text-xs text-gray-500 capitalize truncate">
                      {profile?.role === 'therapist' ? 'Therapist Portal' : 'Client Portal'}
                    </div>
                  </div>
                </div>
                <button
                  className="p-2 rounded-md hover:bg-gray-100"
                  onClick={() => setMobileOpen(false)}
                  aria-label="Close menu"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <nav className="mt-2 flex-1 overflow-y-auto">
                <ul className="space-y-1">
                  {navItems.map((item) => (
                    <li key={item.label}>
                      <a
                        href={item.href}
                        onClick={() => setMobileOpen(false)}
                        className="block rounded-md px-3 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      >
                        {item.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </nav>

              <div className="pt-2 mt-auto border-t border-gray-200">
                <button
                  onClick={handleSignOut}
                  disabled={isSigningOut}
                  className="w-full flex items-center justify-center rounded-md px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 disabled:opacity-50"
                >
                  {isSigningOut ? 'Signing out…' : 'Sign out'}
                </button>
              </div>
            </div>
          </div>
        )}
      </header>

      {/* Main content */}
      <main className="max-w-7xl mx-auto py-4 sm:py-6 px-3 sm:px-6 lg:px-8 pb-[env(safe-area-inset-bottom)]">
        <div className="mb-6">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 hidden sm:block">
            {title}
          </h2>
        </div>
        {children}
      </main>
    </div>
  )
}
