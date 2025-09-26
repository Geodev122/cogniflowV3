// src/utils/helpers.ts
import { RISK_LEVELS, STATUS_CONFIGS } from '../lib/constants'

export const getRiskColor = (riskLevel?: string) => {
  if (!riskLevel || !(riskLevel in RISK_LEVELS)) {
    return 'text-gray-600 bg-gray-100'
  }
  return RISK_LEVELS[riskLevel as keyof typeof RISK_LEVELS].color
}

export const getStatusColor = (status: string) => {
  if (!(status in STATUS_CONFIGS)) {
    return 'text-gray-600 bg-gray-100'
  }
  return STATUS_CONFIGS[status as keyof typeof STATUS_CONFIGS].color
}

export const formatDate = (dateString?: string) => {
  if (!dateString) return 'N/A'
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}

export const formatDateTime = (dateString?: string) => {
  if (!dateString) return 'N/A'
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

export const generatePatientCode = () => {
  const prefix = 'PT'
  const randomNum = Math.floor(Math.random() * 900000) + 100000
  return `${prefix}${randomNum}`
}

export const isRecursionError = (error: any): boolean => {
  if (!error) return false
  
  const errorString = String(error)
  const errorMessage = error.message || ''
  
  return errorString.includes('infinite recursion') || 
         errorMessage.includes('infinite recursion') ||
         (error.body && error.body.includes('infinite recursion'))
}