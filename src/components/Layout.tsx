import React from 'react'
import { useAuth } from '../hooks/useAuth'
import { LogOut, User, Brain, ChevronDown, AlertTriangle } from 'lucide-react'
import { TherapistProfile } from './therapist/TherapistProfile'
import { TherapistOnboarding } from './therapist/TherapistOnboarding'
import { supabase } from '../lib/supabase'

interface TherapistProfileData {
  id: string
  fullName: string
  profilePicture?: string
  whatsappNumber: string
  email: string
  specializations: string[]
  languages: string[]
  qualifications: string
  bio: string
  introVideo?: string
  practiceLocations: Array<{
    address: string
    isPrimary: boolean
  }>
  verificationStatus: 'pending' | 'verified' | 'rejected'
  membershipStatus: 'active' | 'inactive' | 'pending'
  joinDate: string
  stats: {
    totalClients: number
    yearsExperience: number
    rating: number
    reviewCount: number
    responseTime: string
  }
}

interface LayoutProps {
  children: React.ReactNode
  title: string
}

export const Layout: React.FC<LayoutProps> = ({ children, title }) => {
  const { profile, signOut } = useAuth()
  const [isSigningOut, setIsSigningOut] = React.useState(false)
  const [signOutError, setSignOutError] = React.useState<string | null>(null)

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

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <div className="logo-container">
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
                      e.currentTarget.outerHTML = '<span class="text-xl font-bold text-gray-900">Thera-PY</span>'
                    }}
                  />
                </div>
              </div>
              <div>
                <p className="text-xs sm:text-sm text-gray-500 capitalize">
                  {profile?.role === 'therapist' ? 'Therapist Portal' : 'Client Portal'}
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2 text-sm text-gray-700">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <span className="text-xs font-medium text-blue-600">
                    {profile?.first_name?.[0]}{profile?.last_name?.[0]}
                  </span>
                </div>
                <div className="hidden sm:block">
                  <span>{profile?.first_name} {profile?.last_name}</span>
                </div>
              </div>
              <button
                onClick={handleSignOut}
                disabled={isSigningOut}
                className="flex items-center space-x-1 sm:space-x-2 px-2 sm:px-3 py-2 text-xs sm:text-sm text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
            <div className="bg-red-50 border-l-4 border-red-400 p-3">
              <div className="flex items-center">
                <AlertTriangle className="w-4 h-4 text-red-400 mr-2" />
                <span className="text-sm text-red-700">{signOutError}</span>
                <button
                  onClick={() => setSignOutError(null)}
                  className="ml-auto text-red-400 hover:text-red-600"
                >
                  <span className="sr-only">Dismiss</span>
                  ×
                </button>
              </div>
            </div>
          )}
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-4 sm:py-6 px-3 sm:px-6 lg:px-8">
        <div className="mb-6">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 hidden sm:block">{title}</h2>
        </div>
        {children}
      </main>
    </div>
  )
}