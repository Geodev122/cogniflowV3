import React, { useState, useEffect } from 'react';
import { 
  Upload, 
  FileText, 
  Calendar, 
  Award, 
  CheckCircle, 
  AlertTriangle, 
  Plus,
  Download,
  Eye,
  Trash2,
  GraduationCap,
  Shield,
  Clock
} from 'lucide-react';

interface ComplianceRecord {
  id: string;
  record_type: 'license' | 'certification' | 'ce_credit';
  title: string;
  issuing_organization: string;
  issue_date: string;
  expiration_date?: string;
  credential_number?: string;
  file_path?: string;
  status: 'active' | 'expired' | 'pending';
  created_at: string;
}

interface CECredit {
  id: string;
  course_title: string;
  credit_hours: number;
  completion_date: string;
  certificate_path?: string;
  source: 'course_completion' | 'manual_upload';
  provider: string;
}

const CompliancePage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'licenses' | 'certifications' | 'ce_credits'>('licenses');
  const [complianceRecords, setComplianceRecords] = useState<ComplianceRecord[]>([]);
  const [ceCredits, setCeCredits] = useState<CECredit[]>([]);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadType, setUploadType] = useState<'license' | 'certification' | 'ce_credit'>('license');
  const [totalCECredits, setTotalCECredits] = useState(0);
  const [loading, setLoading] = useState(true);

  // Mock data for demonstration
  useEffect(() => {
    // Simulate loading compliance data
    setTimeout(() => {
      setComplianceRecords([
        {
          id: '1',
          record_type: 'license',
          title: 'Licensed Clinical Social Worker (LCSW)',
          issuing_organization: 'California Board of Behavioral Sciences',
          issue_date: '2020-03-15',
          expiration_date: '2024-03-15',
          credential_number: 'LCSW-12345',
          file_path: '/documents/lcsw_license.pdf',
          status: 'active',
          created_at: '2020-03-15T00:00:00Z'
        },
        {
          id: '2',
          record_type: 'certification',
          title: 'Trauma-Informed Care Certification',
          issuing_organization: 'National Trauma Institute',
          issue_date: '2023-06-10',
          expiration_date: '2026-06-10',
          credential_number: 'TIC-2023-789',
          file_path: '/documents/trauma_cert.pdf',
          status: 'active',
          created_at: '2023-06-10T00:00:00Z'
        },
        {
          id: '3',
          record_type: 'certification',
          title: 'Cognitive Behavioral Therapy Specialist',
          issuing_organization: 'CBT Institute',
          issue_date: '2022-09-20',
          expiration_date: '2025-09-20',
          credential_number: 'CBT-SPEC-456',
          file_path: '/documents/cbt_cert.pdf',
          status: 'active',
          created_at: '2022-09-20T00:00:00Z'
        }
      ]);

      setCeCredits([
        {
          id: '1',
          course_title: 'Advanced Trauma Therapy Techniques',
          credit_hours: 12.0,
          completion_date: '2023-08-15',
          certificate_path: '/certificates/trauma_advanced.pdf',
          source: 'course_completion',
          provider: 'National Trauma Institute'
        },
        {
          id: '2',
          course_title: 'Ethics in Digital Therapy',
          credit_hours: 6.0,
          completion_date: '2023-09-22',
          certificate_path: '/certificates/digital_ethics.pdf',
          source: 'course_completion',
          provider: 'Digital Health Ethics Board'
        },
        {
          id: '3',
          course_title: 'Family Systems Workshop',
          credit_hours: 16.0,
          completion_date: '2023-07-10',
          certificate_path: '/certificates/family_systems.pdf',
          source: 'manual_upload',
          provider: 'Family Therapy Institute'
        },
        {
          id: '4',
          course_title: 'Mindfulness-Based Interventions',
          credit_hours: 8.0,
          completion_date: '2023-10-05',
          certificate_path: '/certificates/mindfulness.pdf',
          source: 'course_completion',
          provider: 'Mindful Therapy Academy'
        }
      ]);

      setLoading(false);
    }, 1000);
  }, []);

  // Calculate total CE credits
  useEffect(() => {
    const total = ceCredits.reduce((sum, credit) => sum + credit.credit_hours, 0);
    setTotalCECredits(total);
  }, [ceCredits]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'text-green-600 bg-green-100';
      case 'expired':
        return 'text-red-600 bg-red-100';
      case 'pending':
        return 'text-yellow-600 bg-yellow-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getExpirationStatus = (expirationDate?: string) => {
    if (!expirationDate) return null;
    
    const expDate = new Date(expirationDate);
    const today = new Date();
    const daysUntilExpiration = Math.ceil((expDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysUntilExpiration < 0) {
      return { status: 'expired', message: 'Expired', color: 'text-red-600' };
    } else if (daysUntilExpiration <= 30) {
      return { status: 'expiring', message: `Expires in ${daysUntilExpiration} days`, color: 'text-yellow-600' };
    } else {
      return { status: 'valid', message: `Expires ${expDate.toLocaleDateString()}`, color: 'text-gray-600' };
    }
  };

  const UploadModal = () => {
    const [formData, setFormData] = useState({
      title: '',
      issuing_organization: '',
      issue_date: '',
      expiration_date: '',
      credential_number: '',
      credit_hours: '',
      file: null as File | null
    });

    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      // Handle form submission
      console.log('Uploading:', formData);
      setShowUploadModal(false);
      // Reset form
      setFormData({
        title: '',
        issuing_organization: '',
        issue_date: '',
        expiration_date: '',
        credential_number: '',
        credit_hours: '',
        file: null
      });
    };

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-xl font-semibold text-gray-900">
              Upload {uploadType === 'license' ? 'License' : uploadType === 'certification' ? 'Certification' : 'CE Credit'}
            </h3>
          </div>
          
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Title *
              </label>
              <input
                type="text"
                required
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                placeholder={`Enter ${uploadType} title`}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Issuing Organization *
              </label>
              <input
                type="text"
                required
                value={formData.issuing_organization}
                onChange={(e) => setFormData(prev => ({ ...prev, issuing_organization: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                placeholder="Enter issuing organization"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Issue Date *
                </label>
                <input
                  type="date"
                  required
                  value={formData.issue_date}
                  onChange={(e) => setFormData(prev => ({ ...prev, issue_date: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Expiration Date
                </label>
                <input
                  type="date"
                  value={formData.expiration_date}
                  onChange={(e) => setFormData(prev => ({ ...prev, expiration_date: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
            </div>

            {uploadType !== 'ce_credit' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Credential Number
                </label>
                <input
                  type="text"
                  value={formData.credential_number}
                  onChange={(e) => setFormData(prev => ({ ...prev, credential_number: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="Enter credential number"
                />
              </div>
            )}

            {uploadType === 'ce_credit' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Credit Hours *
                </label>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  required
                  value={formData.credit_hours}
                  onChange={(e) => setFormData(prev => ({ ...prev, credit_hours: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="Enter credit hours"
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Upload Document *
              </label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                <Upload className="mx-auto h-12 w-12 text-gray-400" />
                <div className="mt-4">
                  <label className="cursor-pointer">
                    <span className="mt-2 block text-sm font-medium text-gray-900">
                      Choose file to upload
                    </span>
                    <input
                      type="file"
                      required
                      className="sr-only"
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={(e) => {
                        const file = e.target.files?.[0] || null;
                        setFormData(prev => ({ ...prev, file }));
                      }}
                    />
                  </label>
                  <p className="mt-1 text-xs text-gray-500">PDF, JPG, PNG up to 10MB</p>
                </div>
                {formData.file && (
                  <p className="mt-2 text-sm text-green-600">
                    ✓ {formData.file.name}
                  </p>
                )}
              </div>
            </div>

            <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
              <button
                type="button"
                onClick={() => setShowUploadModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700"
              >
                Upload
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Compliance Management</h1>
        <p className="mt-2 text-gray-600">
          Manage your professional licenses, certifications, and continuing education credits
        </p>
      </div>

      {/* CE Credits Summary */}
      <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl p-6 mb-8 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">Continuing Education Credits</h2>
            <p className="text-indigo-100 mt-1">Track your professional development progress</p>
          </div>
          <div className="text-right">
            <div className="text-4xl font-bold">{totalCECredits}</div>
            <div className="text-indigo-100">Total Credits Earned</div>
          </div>
        </div>
        <div className="mt-4 bg-white bg-opacity-20 rounded-lg p-4">
          <div className="flex items-center justify-between text-sm">
            <span>Credits from completed courses: {ceCredits.filter(c => c.source === 'course_completion').reduce((sum, c) => sum + c.credit_hours, 0)}</span>
            <span>Credits from manual uploads: {ceCredits.filter(c => c.source === 'manual_upload').reduce((sum, c) => sum + c.credit_hours, 0)}</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('licenses')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'licenses'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center space-x-2">
              <Shield className="h-4 w-4" />
              <span>Professional Licenses</span>
            </div>
          </button>
          <button
            onClick={() => setActiveTab('certifications')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'certifications'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center space-x-2">
              <Award className="h-4 w-4" />
              <span>Certifications</span>
            </div>
          </button>
          <button
            onClick={() => setActiveTab('ce_credits')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'ce_credits'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center space-x-2">
              <GraduationCap className="h-4 w-4" />
              <span>CE Credits</span>
            </div>
          </button>
        </nav>
      </div>

      {/* Content */}
      <div className="space-y-6">
        {/* Add Button */}
        <div className="flex justify-end">
          <button
            onClick={() => {
              setUploadType(activeTab === 'licenses' ? 'license' : activeTab === 'certifications' ? 'certification' : 'ce_credit');
              setShowUploadModal(true);
            }}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-indigo-600 hover:bg-indigo-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add {activeTab === 'licenses' ? 'License' : activeTab === 'certifications' ? 'Certification' : 'CE Credit'}
          </button>
        </div>

        {/* Licenses Tab */}
        {activeTab === 'licenses' && (
          <div className="grid gap-6">
            {complianceRecords.filter(record => record.record_type === 'license').map((record) => {
              const expirationStatus = getExpirationStatus(record.expiration_date);
              return (
                <div key={record.id} className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <Shield className="h-6 w-6 text-indigo-600" />
                        <h3 className="text-lg font-semibold text-gray-900">{record.title}</h3>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(record.status)}`}>
                          {record.status}
                        </span>
                      </div>
                      <p className="text-gray-600 mb-2">{record.issuing_organization}</p>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-500">
                        <div>
                          <span className="font-medium">License Number:</span> {record.credential_number}
                        </div>
                        <div>
                          <span className="font-medium">Issue Date:</span> {new Date(record.issue_date).toLocaleDateString()}
                        </div>
                        <div className="flex items-center space-x-1">
                          <Calendar className="h-4 w-4" />
                          <span className={expirationStatus?.color}>
                            {expirationStatus?.message}
                          </span>
                          {expirationStatus?.status === 'expiring' && (
                            <AlertTriangle className="h-4 w-4 text-yellow-500" />
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2 ml-4">
                      <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg">
                        <Eye className="h-4 w-4" />
                      </button>
                      <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg">
                        <Download className="h-4 w-4" />
                      </button>
                      <button className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Certifications Tab */}
        {activeTab === 'certifications' && (
          <div className="space-y-4">
            <div className="grid gap-6">
              {complianceRecords.filter(record => record.record_type === 'certification').map((record) => {
                const expirationStatus = getExpirationStatus(record.expiration_date);
                return (
                  <div key={record.id} className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <Award className="h-6 w-6 text-green-600" />
                          <h3 className="text-lg font-semibold text-gray-900">{record.title}</h3>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(record.status)}`}>
                            {record.status}
                          </span>
                        </div>
                        <p className="text-gray-600 mb-2">{record.issuing_organization}</p>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-500">
                          <div>
                            <span className="font-medium">Credential Number:</span> {record.credential_number}
                          </div>
                          <div>
                            <span className="font-medium">Issue Date:</span> {new Date(record.issue_date).toLocaleDateString()}
                          </div>
                          <div className="flex items-center space-x-1">
                            <Calendar className="h-4 w-4" />
                            <span className={expirationStatus?.color}>
                              {expirationStatus?.message}
                            </span>
                            {expirationStatus?.status === 'expiring' && (
                              <AlertTriangle className="h-4 w-4 text-yellow-500" />
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2 ml-4">
                        <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg">
                          <Eye className="h-4 w-4" />
                        </button>
                        <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg">
                          <Download className="h-4 w-4" />
                        </button>
                        <button className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Certification Categories */}
            <div className="mt-8">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Certification Categories</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="font-medium text-blue-900 mb-2">Therapeutic Approaches</h4>
                  <p className="text-sm text-blue-700">
                    Certifications in specific therapeutic modalities (CBT, DBT, EMDR, etc.)
                  </p>
                  <div className="mt-2 text-xs text-blue-600">
                    {complianceRecords.filter(r => r.record_type === 'certification' && 
                      ['CBT', 'DBT', 'EMDR', 'Trauma'].some(approach => r.title.includes(approach))).length} certifications
                  </div>
                </div>
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <h4 className="font-medium text-green-900 mb-2">Intervention Certifications</h4>
                  <p className="text-sm text-green-700">
                    Specialized intervention and treatment certifications
                  </p>
                  <div className="mt-2 text-xs text-green-600">
                    {complianceRecords.filter(r => r.record_type === 'certification' && 
                      !['CBT', 'DBT', 'EMDR', 'Trauma'].some(approach => r.title.includes(approach))).length} certifications
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* CE Credits Tab */}
        {activeTab === 'ce_credits' && (
          <div className="space-y-6">
            {/* CE Credits Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
                <div className="flex items-center">
                  <div className="p-3 bg-blue-100 rounded-lg">
                    <GraduationCap className="h-6 w-6 text-blue-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Total Credits</p>
                    <p className="text-2xl font-bold text-gray-900">{totalCECredits}</p>
                  </div>
                </div>
              </div>
              <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
                <div className="flex items-center">
                  <div className="p-3 bg-green-100 rounded-lg">
                    <CheckCircle className="h-6 w-6 text-green-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Course Completions</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {ceCredits.filter(c => c.source === 'course_completion').length}
                    </p>
                  </div>
                </div>
              </div>
              <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
                <div className="flex items-center">
                  <div className="p-3 bg-purple-100 rounded-lg">
                    <Upload className="h-6 w-6 text-purple-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Manual Uploads</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {ceCredits.filter(c => c.source === 'manual_upload').length}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* CE Credits List */}
            <div className="grid gap-4">
              {ceCredits.map((credit) => (
                <div key={credit.id} className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <div className={`p-2 rounded-lg ${
                          credit.source === 'course_completion' ? 'bg-blue-100' : 'bg-purple-100'
                        }`}>
                          {credit.source === 'course_completion' ? (
                            <GraduationCap className={`h-5 w-5 ${
                              credit.source === 'course_completion' ? 'text-blue-600' : 'text-purple-600'
                            }`} />
                          ) : (
                            <Upload className="h-5 w-5 text-purple-600" />
                          )}
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900">{credit.course_title}</h3>
                        <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                          {credit.credit_hours} Credits
                        </span>
                      </div>
                      <p className="text-gray-600 mb-2">{credit.provider}</p>
                      <div className="flex items-center space-x-4 text-sm text-gray-500">
                        <div className="flex items-center space-x-1">
                          <Calendar className="h-4 w-4" />
                          <span>Completed: {new Date(credit.completion_date).toLocaleDateString()}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Clock className="h-4 w-4" />
                          <span>Source: {credit.source === 'course_completion' ? 'Course Completion' : 'Manual Upload'}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2 ml-4">
                      {credit.certificate_path && (
                        <>
                          <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg">
                            <Eye className="h-4 w-4" />
                          </button>
                          <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg">
                            <Download className="h-4 w-4" />
                          </button>
                        </>
                      )}
                      <button className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Upload Modal */}
      {showUploadModal && <UploadModal />}
    </div>
  );
};

export default CompliancePage;