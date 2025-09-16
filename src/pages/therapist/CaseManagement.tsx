// src/pages/therapist/CaseManagement.tsx
import React, { useMemo } from 'react'
import { NavLink, Outlet, Route, Routes, useParams } from 'react-router-dom'
import { FileText, ClipboardList, Stethoscope, Activity, Pill, BookOpen } from 'lucide-react'
import IntakeForm from './case/IntakeForm'
import CaseFormulation from './case/CaseFormulation'
import Diagnosis from './case/Diagnosis'
import TreatmentPlanning from './case/TreatmentPlanning'
import SessionBoard from './case/SessionBoard'
import CaseSummary from './case/CaseSummary'

const tabs = [
  { to: 'intake', label: 'Intake', icon: FileText },
  { to: 'formulation', label: 'Formulation', icon: ClipboardList },
  { to: 'diagnosis', label: 'Diagnosis', icon: Stethoscope },
  { to: 'intervention', label: 'Intervention', icon: Activity },
  { to: 'treatment', label: 'Treatment', icon: Pill },
  { to: 'summary', label: 'Summary', icon: BookOpen },
]

const CaseManagement: React.FC = () => {
  const { caseId } = useParams()
  const base = useMemo(() => `/therapist/cases/${caseId}`, [caseId])

  return (
    <div className="h-full grid grid-rows-[auto_1fr]">
      {/* Tabs */}
      <div className="border-b bg-white">
        <div className="px-4 py-2 flex gap-2">
          {tabs.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={`${base}/${to}`}
              className={({ isActive }) =>
                `inline-flex items-center gap-2 px-3 py-2 rounded-md text-sm border ${
                  isActive ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-white text-gray-700 border-gray-200'
                }`
              }
            >
              <Icon className="w-4 h-4" />
              {label}
            </NavLink>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div className="min-h-0 overflow-y-auto p-4">
        <Routes>
          <Route path="intake" element={<IntakeForm />} />
          <Route path="formulation" element={<CaseFormulation />} />
          <Route path="diagnosis" element={<Diagnosis />} />
          <Route path="intervention" element={<SessionBoard />} />
          <Route path="treatment" element={<TreatmentPlanning />} />
          <Route path="summary" element={<CaseSummary />} />
          <Route path="*" element={<IntakeForm />} />
        </Routes>
        <Outlet />
      </div>
    </div>
  )
}

export default CaseManagement

