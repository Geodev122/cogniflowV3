import React, { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import {
  Shield, Upload, FileText, Calendar, CheckCircle, AlertTriangle,
  Clock, Award, GraduationCap, Plus, Eye, Download, Trash2,
  RefreshCw, Filter, Search, BookOpen, TrendingUp
} from 'lucide-react'

type LicenseStatus = 'submitted' | 'under_review' | 'approved' | 'rejected' | 'expired'
type CertificationType = 'therapeutic_approach' | 'intervention' | 'specialization' | 'other'
type CertificationStatus = 'active' | 'expired' | 'revoked' | 'pending'

interface TherapistLicense {
  id: string
  license_name: string
  license_number: string
  issuing_authority: string
  country: string
  state_province: string
  file_path: string
  expires_on: string
  status: LicenseStatus
  verified_at: string | null
  notes: string | null
  created_at: string
}

interface TherapistCertification {
  id: string
  certification_name: string
  certification_type: CertificationType
  issuing_organization: string
  certification_number: string | null
  issue_date: string | null
  expiry_date: string | null
  file_path: string | null
  status: CertificationStatus
  ce_credits: number
  notes: string | null
  created_at: string
}

interface CECredit {
  id: string
  source_type: string
  title: string
  provider: string
  credits_earned: number
  completion_date: string
  certificate_url: string | null
  verification_code: string | null
  reporting_period: string
  notes: string | null
}

interface CECreditsSummary {
  total_credits: number
  credits_by_type: Record<string, number>
  recent_completions: Array<{
    title: string
    provider: string
    credits: number
    completion_date: string
  }>
}

export const LicensingCompliance: React.FC = () => {
  const { profile } = useAuth()
  const [activeTab, setActiveTab] = useState<'licenses' | 'certifications' | 'ce-credits'>('licenses')
  
  // Data state
  const [licenses, setLicenses] = useState<TherapistLicense[]>([])
  const [certifications, setCertifications] = useState<TherapistCertification[]>([])
  const [ceCredits, setCeCredits] = useState<CECredit[]>([])
  const [ceSummary, setCeSummary] = useState<CECreditsSummary | null>(null)
  
  // UI state
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showAddLicense, setShowAddLicense] = useState(false)
  const [showAddCertification, setShowAddCertification] = useState(false)
  const [uploadingFile, setUploadingFile] = useState(false)

  // Form state
  const [licenseForm, setLicenseForm] = useState({
    license_name: '',
    license_number: '',
    issuing_authority: '',
    country: 'USA',
    state_province: '',
    expires_on: '',
    file: null as File | null
  })

  const [certificationForm, setCertificationForm] = useState({
    certification_name: '',
    certification_type: 'therapeutic_approach' as CertificationType,
    issuing_organization: '',
    certification_number: '',
    issue_date: '',
    expiry_date: '',
    ce_credits: 0,
    notes: '',
    file: null as File | null
  })

  // Fetch data
  useEffect(() => {
    if (profile?.id) {
      fetchComplianceData()
    }
  }, [profile?.id])

  const fetchComplianceData = async () => {
    if (!profile?.id) return

    setLoading(true)
    setError(null)

    try {
      const [licensesResult, certificationsResult, ceCreditsResult, ceSummaryResult] = await Promise.allSettled([
        // Fetch licenses
        supabase
          .from('therapist_licenses')
          .select('*')
          .eq('therapist_id', profile.id)
          .order('created_at', { ascending: false }),

        // Fetch certifications
        supabase
          .from('therapist_certifications')
          .select('*')
          .eq('therapist_id', profile.id)
          .order('created_at', { ascending: false }),

        // Fetch CE credits
        supabase
          .from('ce_credits_tracking')
          .select('*')
          .eq('therapist_id', profile.id)
          .order('completion_date', { ascending: false }),

        // Fetch CE summary
        supabase.rpc('get_therapist_ce_credits', {
          p_therapist_id: profile.id,
          p_reporting_period: '2024-2026'
        })
      ])

      // Process results
      if (licensesResult.status === 'fulfilled' && licensesResult.value.data) {
        setLicenses(licensesResult.value.data)
      }

      if (certificationsResult.status === 'fulfilled' && certificationsResult.value.data) {
        setCertifications(certificationsResult.value.data)
      }

      if (ceCreditsResult.status === 'fulfilled' && ceCreditsResult.value.data) {
        setCeCredits(ceCreditsResult.value.data)
      }

      if (ceSummaryResult.status === 'fulfilled' && ceSummaryResult.value.data?.[0]) {
        setCeSummary(ceSummaryResult.value.data[0])
      }

    } catch (err: any) {
      console.error('Error fetching compliance data:', err)
      setError('Failed to load compliance data')
    } finally {
      setLoading(false)
    }
  }

  const handleAddLicense = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!profile?.id) return

    setUploadingFile(true)
    try {
      let filePath = ''
      
      // Upload file if provided
      if (licenseForm.file) {
        const fileExt = licenseForm.file.name.split('.').pop()
        const fileName = `${profile.id}/licenses/${Date.now()}.${fileExt}`
        
        const { error: uploadError } = await supabase.storage
          .from('compliance-documents')
          .upload(fileName, licenseForm.file)

        if (uploadError) throw uploadError
        filePath = fileName
      }

      // Insert license record
      const { error } = await supabase
        .from('therapist_licenses')
        .insert({
          therapist_id: profile.id,
          license_name: licenseForm.license_name,
          license_number: licenseForm.license_number,
          issuing_authority: licenseForm.issuing_authority,
          country: licenseForm.country,
          state_province: licenseForm.state_province,
          expires_on: licenseForm.expires_on,
          file_path: filePath,
          status: 'submitted'
        })

      if (error) throw error

      // Reset form and refresh data
      setLicenseForm({
        license_name: '',
        license_number: '',
        issuing_authority: '',
        country: 'USA',
        state_province: '',
        expires_on: '',
        file: null
      })
      setShowAddLicense(false)
      fetchComplianceData()

    } catch (err: any) {
      console.error('Error adding license:', err)
      setError('Failed to add license')
    } finally {
      setUploadingFile(false)
    }
  }

  const handleAddCertification = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!profile?.id) return

    setUploadingFile(true)
    try {
      let filePath = ''
      
      // Upload file if provided
      if (certificationForm.file) {
        const fileExt = certificationForm.file.name.split('.').pop()
        const fileName = `${profile.id}/certifications/${Date.now()}.${fileExt}`
        
        const { error: uploadError } = await supabase.storage
          .from('compliance-documents')
          .upload(fileName, certificationForm.file)

        if (uploadError) throw uploadError
        filePath = fileName
      }

      // Insert certification record
      const { error } = await supabase
        .from('therapist_certifications')
        .insert({
          therapist_id: profile.id,
          certification_name: certificationForm.certification_name,
          certification_type: certificationForm.certification_type,
          issuing_organization: certificationForm.issuing_organization,
          certification_number: certificationForm.certification_number || null,
          issue_date: certificationForm.issue_date || null,
          expiry_date: certificationForm.expiry_date || null,
          file_path: filePath || null,
          ce_credits: certificationForm.ce_credits,
          notes: certificationForm.notes || null,
          status: 'active'
        })

      if (error) throw error

      // Reset form and refresh data
      setCertificationForm({
        certification_name: '',
        certification_type: 'therapeutic_approach',
        issuing_organization: '',
        certification_number: '',
        issue_date: '',
        expiry_date: '',
        ce_credits: 0,
        notes: '',
        file: null
      })
      setShowAddCertification(false)
      fetchComplianceData()

    } catch (err: any) {
      console.error('Error adding certification:', err)
      setError('Failed to add certification')
    } finally {
      setUploadingFile(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
      case 'active':
        return 'text-green-700 bg-green-100'
      case 'under_review':
      case 'submitted':
      case 'pending':
        return 'text-yellow-700 bg-yellow-100'
      case 'rejected':
      case 'expired':
      case 'revoked':
        return 'text-red-700 bg-red-100'
      default:
        return 'text-gray-700 bg-gray-100'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
      case 'active':
        return <CheckCircle className="h-4 w-4" />
      case 'under_review':
      case 'submitted':
      case 'pending':
        return <Clock className="h-4 w-4" />
      case 'rejected':
      case 'expired':
      case 'revoked':
        return <AlertTriangle className="h-4 w-4" />
      default:
        return <FileText className="h-4 w-4" />
    }
  }

  const formatCertificationType = (type: CertificationType) => {
    switch (type) {
      case 'therapeutic_approach':
        return 'Therapeutic Approach'
      case 'intervention':
        return 'Intervention'
      case 'specialization':
        return 'Specialization'
      case 'other':
        return 'Other'
      default:
        return type
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Licensing & Compliance</h2>
          <p className="text-gray-600">Manage your professional licenses, certifications, and CE credits</p>
        </div>
        <button
          onClick={() => fetchComplianceData()}
          className="flex items-center px-4 py-2 text-gray-600 hover:text-gray-900"
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <AlertTriangle className="h-5 w-5 text-red-600 mr-2" />
            <span className="text-red-800">{error}</span>
          </div>
        </div>
      )}

      {/* CE Credits Summary */}
      {ceSummary && (
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold mb-2">Continuing Education Credits</h3>
              <div className="flex items-center space-x-6">
                <div>
                  <p className="text-3xl font-bold">{ceSummary.total_credits}</p>
                  <p className="text-blue-100">Total Credits (2024-2026)</p>
                </div>
                <div className="text-sm space-y-1">
                  {Object.entries(ceSummary.credits_by_type).map(([type, credits]) => (
                    <div key={type} className="flex justify-between">
                      <span className="capitalize">{type}:</span>
                      <span className="font-medium">{credits} credits</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="h-16 w-16 bg-white/20 rounded-full flex items-center justify-center mb-2">
                <GraduationCap className="h-8 w-8" />
              </div>
              <p className="text-sm text-blue-100">On Track</p>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'licenses', name: 'Licenses', icon: Shield, count: licenses.length },
            { id: 'certifications', name: 'Certifications', icon: Award, count: certifications.length },
            { id: 'ce-credits', name: 'CE Credits', icon: GraduationCap, count: ceCredits.length }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <tab.icon className="h-4 w-4 mr-2" />
              {tab.name}
              {tab.count > 0 && (
                <span className="ml-2 bg-gray-100 text-gray-600 py-0.5 px-2 rounded-full text-xs">
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Licenses Tab */}
      {activeTab === 'licenses' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">Professional Licenses</h3>
            <button
              onClick={() => setShowAddLicense(true)}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add License
            </button>
          </div>

          {licenses.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-lg">
              <Shield className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No licenses uploaded</h3>
              <p className="text-gray-600 mb-4">Upload your professional licenses to maintain compliance</p>
              <button
                onClick={() => setShowAddLicense(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Add Your First License
              </button>
            </div>
          ) : (
            <div className="grid gap-4">
              {licenses.map((license) => (
                <div key={license.id} className="bg-white border rounded-lg p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h4 className="text-lg font-semibold text-gray-900">{license.license_name}</h4>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(license.status)}`}>
                          {getStatusIcon(license.status)}
                          <span className="ml-1 capitalize">{license.status.replace('_', ' ')}</span>
                        </span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
                        <div>
                          <p><span className="font-medium">License Number:</span> {license.license_number}</p>
                          <p><span className="font-medium">Issuing Authority:</span> {license.issuing_authority}</p>
                        </div>
                        <div>
                          <p><span className="font-medium">Location:</span> {license.state_province}, {license.country}</p>
                          <p><span className="font-medium">Expires:</span> {new Date(license.expires_on).toLocaleDateString()}</p>
                        </div>
                      </div>
                      {license.notes && (
                        <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                          <p className="text-sm text-gray-700">{license.notes}</p>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center space-x-2 ml-4">
                      {license.file_path && (
                        <button className="p-2 text-gray-400 hover:text-gray-600">
                          <Eye className="h-4 w-4" />
                        </button>
                      )}
                      <button className="p-2 text-gray-400 hover:text-red-600">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Certifications Tab */}
      {activeTab === 'certifications' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">Professional Certifications</h3>
            <button
              onClick={() => setShowAddCertification(true)}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Certification
            </button>
          </div>

          {certifications.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-lg">
              <Award className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No certifications added</h3>
              <p className="text-gray-600 mb-4">Add your therapeutic approach and intervention certifications</p>
              <button
                onClick={() => setShowAddCertification(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Add Your First Certification
              </button>
            </div>
          ) : (
            <div className="grid gap-4">
              {certifications.map((cert) => (
                <div key={cert.id} className="bg-white border rounded-lg p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h4 className="text-lg font-semibold text-gray-900">{cert.certification_name}</h4>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(cert.status)}`}>
                          {getStatusIcon(cert.status)}
                          <span className="ml-1 capitalize">{cert.status}</span>
                        </span>
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {formatCertificationType(cert.certification_type)}
                        </span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
                        <div>
                          <p><span className="font-medium">Organization:</span> {cert.issuing_organization}</p>
                          {cert.certification_number && (
                            <p><span className="font-medium">Certificate #:</span> {cert.certification_number}</p>
                          )}
                        </div>
                        <div>
                          {cert.issue_date && (
                            <p><span className="font-medium">Issued:</span> {new Date(cert.issue_date).toLocaleDateString()}</p>
                          )}
                          {cert.expiry_date && (
                            <p><span className="font-medium">Expires:</span> {new Date(cert.expiry_date).toLocaleDateString()}</p>
                          )}
                        </div>
                      </div>
                      {cert.ce_credits > 0 && (
                        <div className="mt-2">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            <GraduationCap className="h-3 w-3 mr-1" />
                            {cert.ce_credits} CE Credits
                          </span>
                        </div>
                      )}
                      {cert.notes && (
                        <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                          <p className="text-sm text-gray-700">{cert.notes}</p>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center space-x-2 ml-4">
                      {cert.file_path && (
                        <button className="p-2 text-gray-400 hover:text-gray-600">
                          <Eye className="h-4 w-4" />
                        </button>
                      )}
                      <button className="p-2 text-gray-400 hover:text-red-600">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* CE Credits Tab */}
      {activeTab === 'ce-credits' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">Continuing Education Credits</h3>
            <div className="flex items-center space-x-3">
              <select className="border border-gray-300 rounded-lg px-3 py-2 text-sm">
                <option value="2024-2026">2024-2026 Period</option>
                <option value="2022-2024">2022-2024 Period</option>
              </select>
            </div>
          </div>

          {ceCredits.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-lg">
              <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No CE credits recorded</h3>
              <p className="text-gray-600 mb-4">Complete courses in the Continuing Education section to earn credits</p>
            </div>
          ) : (
            <div className="space-y-4">
              {ceCredits.map((credit) => (
                <div key={credit.id} className="bg-white border rounded-lg p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h4 className="text-lg font-semibold text-gray-900">{credit.title}</h4>
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          <GraduationCap className="h-3 w-3 mr-1" />
                          {credit.credits_earned} Credits
                        </span>
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 capitalize">
                          {credit.source_type}
                        </span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
                        <div>
                          <p><span className="font-medium">Provider:</span> {credit.provider}</p>
                          <p><span className="font-medium">Completed:</span> {new Date(credit.completion_date).toLocaleDateString()}</p>
                        </div>
                        <div>
                          <p><span className="font-medium">Reporting Period:</span> {credit.reporting_period}</p>
                          {credit.verification_code && (
                            <p><span className="font-medium">Verification:</span> {credit.verification_code}</p>
                          )}
                        </div>
                      </div>
                      {credit.notes && (
                        <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                          <p className="text-sm text-gray-700">{credit.notes}</p>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center space-x-2 ml-4">
                      {credit.certificate_url && (
                        <button className="p-2 text-gray-400 hover:text-gray-600">
                          <Download className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Add License Modal */}
      {showAddLicense && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b">
              <h3 className="text-lg font-semibold text-gray-900">Add Professional License</h3>
            </div>
            <form onSubmit={handleAddLicense} className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">License Name</label>
                  <input
                    type="text"
                    required
                    value={licenseForm.license_name}
                    onChange={(e) => setLicenseForm(prev => ({ ...prev, license_name: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    placeholder="e.g., Licensed Clinical Psychologist"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">License Number</label>
                  <input
                    type="text"
                    required
                    value={licenseForm.license_number}
                    onChange={(e) => setLicenseForm(prev => ({ ...prev, license_number: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    placeholder="License number"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Issuing Authority</label>
                <input
                  type="text"
                  required
                  value={licenseForm.issuing_authority}
                  onChange={(e) => setLicenseForm(prev => ({ ...prev, issuing_authority: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  placeholder="e.g., California Board of Psychology"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Country</label>
                  <select
                    value={licenseForm.country}
                    onChange={(e) => setLicenseForm(prev => ({ ...prev, country: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  >
                    <option value="USA">United States</option>
                    <option value="Canada">Canada</option>
                    <option value="UK">United Kingdom</option>
                    <option value="Australia">Australia</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">State/Province</label>
                  <input
                    type="text"
                    required
                    value={licenseForm.state_province}
                    onChange={(e) => setLicenseForm(prev => ({ ...prev, state_province: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    placeholder="State or Province"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Expiration Date</label>
                <input
                  type="date"
                  required
                  value={licenseForm.expires_on}
                  onChange={(e) => setLicenseForm(prev => ({ ...prev, expires_on: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">License Document</label>
                <input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={(e) => setLicenseForm(prev => ({ ...prev, file: e.target.files?.[0] || null }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                />
                <p className="text-xs text-gray-500 mt-1">Upload PDF, JPG, or PNG (max 10MB)</p>
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddLicense(false)}
                  className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploadingFile}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {uploadingFile ? 'Adding...' : 'Add License'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Certification Modal */}
      {showAddCertification && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b">
              <h3 className="text-lg font-semibold text-gray-900">Add Professional Certification</h3>
            </div>
            <form onSubmit={handleAddCertification} className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Certification Name</label>
                  <input
                    type="text"
                    required
                    value={certificationForm.certification_name}
                    onChange={(e) => setCertificationForm(prev => ({ ...prev, certification_name: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    placeholder="e.g., Certified CBT Therapist"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Certification Type</label>
                  <select
                    value={certificationForm.certification_type}
                    onChange={(e) => setCertificationForm(prev => ({ ...prev, certification_type: e.target.value as CertificationType }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  >
                    <option value="therapeutic_approach">Therapeutic Approach</option>
                    <option value="intervention">Intervention</option>
                    <option value="specialization">Specialization</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Issuing Organization</label>
                <input
                  type="text"
                  required
                  value={certificationForm.issuing_organization}
                  onChange={(e) => setCertificationForm(prev => ({ ...prev, issuing_organization: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  placeholder="e.g., Beck Institute for Cognitive Behavior Therapy"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Certification Number</label>
                  <input
                    type="text"
                    value={certificationForm.certification_number}
                    onChange={(e) => setCertificationForm(prev => ({ ...prev, certification_number: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    placeholder="Optional"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">CE Credits</label>
                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    value={certificationForm.ce_credits}
                    onChange={(e) => setCertificationForm(prev => ({ ...prev, ce_credits: parseFloat(e.target.value) || 0 }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Issue Date</label>
                  <input
                    type="date"
                    value={certificationForm.issue_date}
                    onChange={(e) => setCertificationForm(prev => ({ ...prev, issue_date: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Expiry Date</label>
                  <input
                    type="date"
                    value={certificationForm.expiry_date}
                    onChange={(e) => setCertificationForm(prev => ({ ...prev, expiry_date: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Certificate Document</label>
                <input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={(e) => setCertificationForm(prev => ({ ...prev, file: e.target.files?.[0] || null }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                />
                <p className="text-xs text-gray-500 mt-1">Upload PDF, JPG, or PNG (max 10MB)</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea
                  value={certificationForm.notes}
                  onChange={(e) => setCertificationForm(prev => ({ ...prev, notes: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  rows={3}
                  placeholder="Additional notes about this certification"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddCertification(false)}
                  className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploadingFile}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {uploadingFile ? 'Adding...' : 'Add Certification'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}