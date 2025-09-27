import React from 'react'
import { ChevronLeft, ChevronRight, Calendar, ShieldCheck, CalendarDays } from 'lucide-react'

type Props = {
  sidebarCollapsed: boolean
  setSidebarCollapsed: (b: boolean) => void
  active: any
  goto: (id: any) => void
  openGroups: Record<string, boolean>
  // Accept the concrete NavGroupKey used by the dashboard to avoid
  // cross-file type mismatches. Using `any` here keeps the component
  // flexible while we're stabilizing other typing issues.
  toggleGroup: (k: any) => void
  navGroups: any[]
  isAdmin: boolean
}

export default function TherapistSidebar({ sidebarCollapsed, setSidebarCollapsed, active, goto, openGroups, toggleGroup, navGroups, isAdmin }: Props) {
  return (
    <>
      {/* Desktop / tablet sidebar */}
      <aside className={`hidden md:flex flex-col ${sidebarCollapsed ? 'w-16' : 'w-64'} bg-white border-r border-gray-200 fixed left-0 top-16 bottom-0 transition-all duration-300 shadow-lg z-30`}>
      <div className="flex-shrink-0 border-b border-gray-100">
        <div className="p-4 flex items-center justify-between">
          {!sidebarCollapsed && (
            <button
              onClick={() => goto('overview')}
              className="text-sm font-semibold text-gray-800 flex items-center hover:text-blue-700"
              title="Overview"
            >
              <ChevronLeft className="w-4 h-4 mr-2 text-blue-600" /> Overview
            </button>
          )}
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className={`w-8 h-8 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center ${sidebarCollapsed ? 'mx-auto' : ''}`}
            title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            <ChevronLeft className={`w-4 h-4 transition-all duration-300 ${sidebarCollapsed ? 'rotate-180' : ''}`} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        <nav className="space-y-6">
          <div className="mb-2">
            {[{ id: 'clienteles', name: 'Clienteles', icon: null }].map(item => {
              const Icon = item.icon as any
              const isActive = active === item.id
              return (
                <button
                  key={item.id}
                  onClick={() => goto(item.id)}
                  className={`w-full flex items-center ${sidebarCollapsed ? 'justify-center' : 'space-x-3'} px-3 py-3 rounded-xl transition-all duration-200 text-sm font-medium ${
                    isActive ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow' : 'text-gray-700 hover:bg-gray-50'
                  }`}
                  aria-current={isActive ? 'page' : undefined}
                  title={sidebarCollapsed ? item.name : undefined}
                >
                  <div className={`w-5 h-5 flex-shrink-0 ${isActive ? 'text-white' : 'text-gray-400'}`} />
                  {!sidebarCollapsed && <span className="font-medium">{item.name}</span>}
                </button>
              )
            })}
          </div>

          {navGroups.map(group => (
            <div key={group.key} className="space-y-1">
              <div className={`flex items-center ${sidebarCollapsed ? 'justify-center' : 'justify-between'} px-2`}>
                {!sidebarCollapsed && (
                  <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">{group.title}</h4>
                )}
                {group.expandable && (
                  <button
                    onClick={() => toggleGroup(group.key)}
                    className="ml-auto px-2 py-1 rounded hover:bg-gray-100"
                    aria-expanded={openGroups[group.key]}
                    aria-controls={`group-${group.key}`}
                    title={openGroups[group.key] ? 'Collapse' : 'Expand'}
                  >
                    <ChevronRight className={`w-4 h-4 text-gray-400 transition-transform ${openGroups[group.key] ? 'rotate-90' : ''}`} />
                  </button>
                )}
              </div>

              <div id={`group-${group.key}`} className={`${group.expandable && !openGroups[group.key] ? 'hidden' : ''}`}>
                {group.items.map((tab: any) => {
                  const Icon = tab.icon as any
                  const isActive = active === tab.id
                  return (
                    <button
                      key={tab.id}
                      onClick={() => goto(tab.id)}
                      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); goto(tab.id) } }}
                      className={`w-full flex items-center ${sidebarCollapsed ? 'justify-center' : 'space-x-3'} px-3 py-3 rounded-xl transition-all duration-200 text-sm font-medium ${
                        isActive ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow' : 'text-gray-700 hover:bg-gray-50'
                      }`}
                      aria-current={isActive ? 'page' : undefined}
                      title={sidebarCollapsed ? tab.name : undefined}
                    >
                      <div className={`w-5 h-5 flex-shrink-0 ${isActive ? 'text-white' : 'text-gray-400'}`}>
                        {Icon ? <Icon className={`w-5 h-5 ${isActive ? 'text-white' : 'text-gray-400'}`} /> : null}
                      </div>
                      {!sidebarCollapsed && <span className="font-medium">{tab.name}</span>}
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </nav>
      </div>

      {!sidebarCollapsed && (
        <div className="flex-shrink-0 border-t border-gray-100 p-4 text-center text-xs text-gray-400">
          Thera-PY v1.0.0
        </div>
      )}
    </aside>
      {/* Mobile bottom nav (visible on small screens) */}
      <nav className="md:hidden fixed left-0 right-0 bottom-0 bg-white border-t border-gray-200 shadow-inner z-40">
        <div className="max-w-4xl mx-auto px-4">
          <div className="flex items-center justify-between py-2">
            <button onClick={() => goto('overview')} className={`flex-1 flex flex-col items-center py-2 ${active === 'overview' ? 'text-blue-600' : 'text-gray-600'}`}>
              <div className="w-6 h-6"><ChevronLeft className="w-6 h-6" /></div>
              <div className="text-xs mt-1">Overview</div>
            </button>
            <button onClick={() => goto('sessions')} className={`flex-1 flex flex-col items-center py-2 ${active === 'sessions' ? 'text-blue-600' : 'text-gray-600'}`}>
              <div className="w-6 h-6"><Calendar className="w-6 h-6" /></div>
              <div className="text-xs mt-1">Sessions</div>
            </button>
            <button onClick={() => goto('licensing')} className={`flex-1 flex flex-col items-center py-2 ${active === 'licensing' ? 'text-blue-600' : 'text-gray-600'}`}>
              <div className="w-6 h-6"><ShieldCheck className="w-6 h-6" /></div>
              <div className="text-xs mt-1">Compliance</div>
            </button>
            <button onClick={() => goto('membership')} className={`flex-1 flex flex-col items-center py-2 ${active === 'membership' ? 'text-blue-600' : 'text-gray-600'}`}>
              <div className="w-6 h-6"><CalendarDays className="w-6 h-6" /></div>
              <div className="text-xs mt-1">Membership</div>
            </button>
          </div>
        </div>
      </nav>
    </>
  )
}
