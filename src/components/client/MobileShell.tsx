import React from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import {
  Home, ClipboardList, Calendar, BookOpen, User2, LogOut
} from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'

type Tab = {
  id: string
  name: string
  path: string
  icon: React.FC<React.SVGProps<SVGSVGElement>>
}

const TABS: Tab[] = [
  { id: 'overview',    name: 'Overview',    path: '/client',               icon: Home },
  { id: 'assessments', name: 'Assess',      path: '/client/assessments',   icon: ClipboardList },
  { id: 'appointments',name: 'Schedule',    path: '/client/appointments',  icon: Calendar },
  { id: 'resources',   name: 'Learn',       path: '/client/resources',     icon: BookOpen },
  { id: 'profile',     name: 'Profile',     path: '/client/profile',       icon: User2 },
]

export const MobileShell: React.FC<{ title?: string; children: React.ReactNode }> = ({ title, children }) => {
  const navigate = useNavigate()
  const location = useLocation()
  const { signOut } = useAuth()

  const active = React.useMemo(() => {
    const found = TABS.find(t => location.pathname === t.path || location.pathname.startsWith(t.path + '/'))
    return found?.id ?? 'overview'
  }, [location.pathname])

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Top app bar */}
      <header className="sticky top-0 z-20 bg-white/90 backdrop-blur border-b border-gray-200">
        <div className="px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src="/thera-py-icon.png" alt="Thera-PY" className="w-7 h-7" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display='none' }} />
            <h1 className="text-base font-semibold text-gray-900">
              {title || 'Thera-PY'}
            </h1>
          </div>
          <button
            className="text-xs px-2 py-1.5 rounded-md border hover:bg-gray-50"
            onClick={() => signOut().catch(()=>{})}
          >
            <LogOut className="w-4 h-4 inline mr-1" />
            Sign out
          </button>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 min-h-0">{children}</main>

      {/* Bottom nav */}
      <nav className="sticky bottom-0 z-20 bg-white border-t border-gray-200">
        <div className="grid grid-cols-5">
          {TABS.map(t => {
            const Icon = t.icon
            const isActive = active === t.id
            return (
              <button
                key={t.id}
                onClick={() => navigate(t.path)}
                className={`py-2.5 flex flex-col items-center ${isActive ? 'text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                aria-current={isActive ? 'page' : undefined}
              >
                <Icon className={`w-5 h-5 ${isActive ? 'fill-blue-50' : ''}`} />
                <span className="text-[11px] mt-0.5">{t.name}</span>
              </button>
            )
          })}
        </div>
      </nav>
    </div>
  )
}