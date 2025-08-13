// Application constants
export const APP_NAME = 'Thera-PY'
export const APP_DESCRIPTION = 'CBT Practice Management Application'

// Risk level configurations
export const RISK_LEVELS = {
  low: { color: 'text-green-600 bg-green-100', label: 'Low Risk' },
  moderate: { color: 'text-yellow-600 bg-yellow-100', label: 'Moderate Risk' },
  high: { color: 'text-orange-600 bg-orange-100', label: 'High Risk' },
  crisis: { color: 'text-red-600 bg-red-100', label: 'Crisis' }
} as const

// Status configurations
export const STATUS_CONFIGS = {
  assigned: { color: 'text-blue-600 bg-blue-100', label: 'Assigned' },
  in_progress: { color: 'text-amber-600 bg-amber-100', label: 'In Progress' },
  completed: { color: 'text-green-600 bg-green-100', label: 'Completed' },
  overdue: { color: 'text-red-600 bg-red-100', label: 'Overdue' }
} as const