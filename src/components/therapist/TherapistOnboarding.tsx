import React, { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import {
  User, MapPin, Phone, Mail, Briefcase, GraduationCap,
  Award, FileText, Camera, CheckCircle, ArrowRight, ArrowLeft,
  Upload, X, Plus, Trash2, AlertTriangle, Clock, Shield
} from 'lucide-react'

interface OnboardingProps {
  onComplete: () => void
}

type OnboardingStep = 'personal' | 'professional' | 'specializations' | 'verification' | 'complete'

interface ProfessionalDetails {
  bio: string
  specializations: string[]
  therapeutic_approaches: string[]
  years_experience: number
  education: Array<{
    degree: string
    institution: string
    year: number
  }>
  licenses: Array<{
    name: string
    number: string
    state: string
    expiry: string
  }>
  certifications: string[]
  languages: string[]
  session_types: string[]
  availability: {
    days: string[]
    hours: { start: string; end: string }
  }
}

export const TherapistOnboarding: React.FC<OnboardingProps> = ({ onComplete }) => {
  const { profile, refreshProfile } = useAuth()
  const [currentStep, setCurrentStep] = useState<OnboardingStep>('personal')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Form data
  const [personalData, setPersonalData] = useState({
    first_name: profile?.first_name || '',
    last_name: profile?.last_name || '',
    email: profile?.email || '',
    whatsapp_number: profile?.whatsapp_number || '',
    city: profile?.city || '',
    country: profile?.country || 'USA',
    avatar_url: profile?.avatar_url || ''
  })

  const [professionalData, setProfessionalData] = useState<ProfessionalDetails>({
    bio: '',
    specializations: [],
    therapeutic_approaches: [],
    years_experience: 0,
    education: [{ degree: '', institution: '', year: new Date().getFullYear() }],
    licenses: [{ name: '', number: '', state: '', expiry: '' }],
    certifications: [],
    languages: ['English'],
    session_types: ['individual'],
    availability: {
      days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
      hours: { start: '09:00', end: '17:00' }
    }
  })

  const [uploadingAvatar, setUploadingAvatar] = useState(false)

  // Predefined options
  const specializationOptions = [
    'Anxiety Disorders', 'Depression', 'Trauma & PTSD', 'Relationship Issues',
    'Addiction & Substance Abuse', 'Eating Disorders', 'ADHD', 'Autism Spectrum',
    'Bipolar Disorder', 'OCD', 'Grief & Loss', 'Life Transitions',
    'Stress Management', 'Self-Esteem', 'Anger Management', 'Sleep Disorders'
  ]

  const therapeuticApproaches = [
    'Cognitive Behavioral Therapy (CBT)', 'Dialectical Behavior Therapy (DBT)',
    'Acceptance and Commitment Therapy (ACT)', 'Psychodynamic Therapy',
    'Humanistic Therapy', 'Solution-Focused Brief Therapy', 'EMDR',
    'Mindfulness-Based Therapy', 'Family Systems Therapy', 'Gestalt Therapy'
  ]

  const sessionTypeOptions = [
    'individual', 'couples', 'family', 'group'
  ]

  const languageOptions = [
    'English', 'Spanish', 'French', 'German', 'Italian', 'Portuguese',
    'Mandarin', 'Arabic', 'Hindi', 'Japanese', 'Korean', 'Russian'
  ]

  const dayOptions = [
    { value: 'monday', label: 'Monday' },
    { value: 'tuesday', label: 'Tuesday' },
    { value: 'wednesday', label: 'Wednesday' },
    { value: 'thursday', label: 'Thursday' },
    { value: 'friday', label: 'Friday' },
    { value: 'saturday', label: 'Saturday' },
    { value: 'sunday', label: 'Sunday' }
  ]

  // Load existing data if available
  useEffect(() => {
    if (profile?.professional_details) {
      const details = profile.professional_details as any
      setProfessionalData(prev => ({ ...prev, ...details }))
    }
  }, [profile])

  const handleAvatarUpload = async (file: File) => {
    if (!profile?.id) return

    setUploadingAvatar(true)
    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `${profile.id}/avatar.${fileExt}`

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, { upsert: true })

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName)

      setPersonalData(prev => ({ ...prev, avatar_url: publicUrl }))

    } catch (err: any) {
      console.error('Avatar upload error:', err)
      setError('Failed to upload avatar')
    } finally {
      setUploadingAvatar(false)
    }
  }

  const handlePersonalSubmit = async () => {
    if (!profile?.id) return

    setLoading(true)
    setError(null)

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          first_name: personalData.first_name,
          last_name: personalData.last_name,
          whatsapp_number: personalData.whatsapp_number,
          city: personalData.city,
          country: personalData.country,
          avatar_url: personalData.avatar_url
        })
        .eq('id', profile.id)

      if (error) throw error

      setCurrentStep('professional')
    } catch (err: any) {
      console.error('Personal data update error:', err)
      setError('Failed to update personal information')
    } finally {
      setLoading(false)
    }
  }

  const handleProfessionalSubmit = async () => {
    if (!profile?.id) return

    setLoading(true)
    setError(null)

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          professional_details: professionalData
        })
        .eq('id', profile.id)

      if (error) throw error

      setCurrentStep('specializations')
    } catch (err: any) {
      console.error('Professional data update error:', err)
      setError('Failed to update professional information')
    } finally {
      setLoading(false)
    }
  }

  const handleSpecializationsSubmit = async () => {
    setCurrentStep('verification')
  }

  const handleComplete = async () => {
    if (!profile?.id) return

    setLoading(true)
    setError(null)

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          verification_status: 'pending',
          onboarding_completed: true,
          professional_details: professionalData
        })
        .eq('id', profile.id)

      if (error) throw error

      await refreshProfile()
      onComplete()
    } catch (err: any) {
      console.error('Onboarding completion error:', err)
      setError('Failed to complete onboarding')
    } finally {
      setLoading(false)
    }
  }

  const addEducation = () => {
    setProfessionalData(prev => ({
      ...prev,
      education: [...prev.education, { degree: '', institution: '', year: new Date().getFullYear() }]
    }))
  }

  const removeEducation = (index: number) => {
    setProfessionalData(prev => ({
      ...prev,
      education: prev.education.filter((_, i) => i !== index)
    }))
  }

  const addLicense = () => {
    setProfessionalData(prev => ({
      ...prev,
      licenses: [...prev.licenses, { name: '', number: '', state: '', expiry: '' }]
    }))
  }

  const removeLicense = (index: number) => {
    setProfessionalData(prev => ({
      ...prev,
      licenses: prev.licenses.filter((_, i) => i !== index)
    }))
  }

  const toggleArrayItem = (array: string[], item: string, setter: (fn: (prev: ProfessionalDetails) => ProfessionalDetails) => void, key: keyof ProfessionalDetails) => {
    setter(prev => ({
      ...prev,
      [key]: array.includes(item)
        ? array.filter(i => i !== item)
        : [...array, item]
    }))
  }

  const renderStepIndicator = () => (
    <div className="flex items-center justify-center mb-8">
      <div className="flex items-center space-x-4">
        {[
          { key: 'personal', label: 'Personal', icon: User },
          { key: 'professional', label: 'Professional', icon: Briefcase },
          { key: 'specializations', label: 'Specializations', icon: Award },
          { key: 'verification', label: 'Verification', icon: Shield }
        ].map((step, index) => {
          const isActive = currentStep === step.key
          const isCompleted = ['personal', 'professional', 'specializations', 'verification'].indexOf(currentStep) > index
          
          return (
            <React.Fragment key={step.key}>
              <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${
                isCompleted ? 'bg-green-500 border-green-500 text-white' :
                isActive ? 'bg-blue-500 border-blue-500 text-white' :
                'bg-gray-100 border-gray-300 text-gray-400'
              }`}>
                {isCompleted ? <CheckCircle className="h-5 w-5" /> : <step.icon className="h-5 w-5" />}
              </div>
              {index < 3 && (
                <div className={`w-12 h-0.5 ${
                  isCompleted ? 'bg-green-500' : 'bg-gray-300'
                }`} />
              )}
            </React.Fragment>
          )
        })}
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Complete Your Profile</h1>
          <p className="text-gray-600">Let's set up your therapist profile to get you started</p>
        </div>

        {renderStepIndicator()}

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center">
              <AlertTriangle className="h-5 w-5 text-red-600 mr-2" />
              <span className="text-red-800">{error}</span>
            </div>
          </div>
        )}

        <div className="bg-white rounded-xl shadow-sm border p-8">
          {/* Personal Information Step */}
          {currentStep === 'personal' && (
            <div className="space-y-6">
              <div className="text-center mb-6">
                <h2 className="text-2xl font-semibold text-gray-900 mb-2">Personal Information</h2>
                <p className="text-gray-600">Tell us about yourself</p>
              </div>

              {/* Avatar Upload */}
              <div className="flex justify-center mb-6">
                <div className="relative">
                  <div className="w-24 h-24 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
                    {personalData.avatar_url ? (
                      <img
                        src={personalData.avatar_url}
                        alt="Avatar"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Camera className="h-8 w-8 text-gray-400" />
                    )}
                  </div>
                  <label className="absolute bottom-0 right-0 bg-blue-600 text-white p-2 rounded-full cursor-pointer hover:bg-blue-700">
                    <Camera className="h-4 w-4" />
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (file) handleAvatarUpload(file)
                      }}
                      disabled={uploadingAvatar}
                    />
                  </label>
                  {uploadingAvatar && (
                    <div className="absolute inset-0 bg-black bg-opacity-50 rounded-full flex items-center justify-center">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">First Name</label>
                  <input
                    type="text"
                    required
                    value={personalData.first_name}
                    onChange={(e) => setPersonalData(prev => ({ ...prev, first_name: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Last Name</label>
                  <input
                    type="text"
                    required
                    value={personalData.last_name}
                    onChange={(e) => setPersonalData(prev => ({ ...prev, last_name: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                <input
                  type="email"
                  value={personalData.email}
                  disabled
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 bg-gray-50 text-gray-500"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">WhatsApp Number</label>
                  <input
                    type="tel"
                    value={personalData.whatsapp_number}
                    onChange={(e) => setPersonalData(prev => ({ ...prev, whatsapp_number: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="+1 (555) 123-4567"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">City</label>
                  <input
                    type="text"
                    value={personalData.city}
                    onChange={(e) => setPersonalData(prev => ({ ...prev, city: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Country</label>
                <select
                  value={personalData.country}
                  onChange={(e) => setPersonalData(prev => ({ ...prev, country: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="USA">United States</option>
                  <option value="Canada">Canada</option>
                  <option value="UK">United Kingdom</option>
                  <option value="Australia">Australia</option>
                </select>
              </div>

              <div className="flex justify-end">
                <button
                  onClick={handlePersonalSubmit}
                  disabled={loading || !personalData.first_name || !personalData.last_name}
                  className="flex items-center px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  Next
                  <ArrowRight className="h-4 w-4 ml-2" />
                </button>
              </div>
            </div>
          )}

          {/* Professional Information Step */}
          {currentStep === 'professional' && (
            <div className="space-y-6">
              <div className="text-center mb-6">
                <h2 className="text-2xl font-semibold text-gray-900 mb-2">Professional Background</h2>
                <p className="text-gray-600">Share your professional experience and qualifications</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Professional Bio</label>
                <textarea
                  value={professionalData.bio}
                  onChange={(e) => setProfessionalData(prev => ({ ...prev, bio: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={4}
                  placeholder="Tell potential clients about your background, approach, and what makes you unique..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Years of Experience</label>
                <input
                  type="number"
                  min="0"
                  value={professionalData.years_experience}
                  onChange={(e) => setProfessionalData(prev => ({ ...prev, years_experience: parseInt(e.target.value) || 0 }))}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Education */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="block text-sm font-medium text-gray-700">Education</label>
                  <button
                    type="button"
                    onClick={addEducation}
                    className="flex items-center text-sm text-blue-600 hover:text-blue-700"
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add Education
                  </button>
                </div>
                <div className="space-y-3">
                  {professionalData.education.map((edu, index) => (
                    <div key={index} className="grid grid-cols-1 md:grid-cols-3 gap-3 p-3 border border-gray-200 rounded-lg">
                      <input
                        type="text"
                        placeholder="Degree"
                        value={edu.degree}
                        onChange={(e) => {
                          const newEducation = [...professionalData.education]
                          newEducation[index].degree = e.target.value
                          setProfessionalData(prev => ({ ...prev, education: newEducation }))
                        }}
                        className="border border-gray-300 rounded px-3 py-2"
                      />
                      <input
                        type="text"
                        placeholder="Institution"
                        value={edu.institution}
                        onChange={(e) => {
                          const newEducation = [...professionalData.education]
                          newEducation[index].institution = e.target.value
                          setProfessionalData(prev => ({ ...prev, education: newEducation }))
                        }}
                        className="border border-gray-300 rounded px-3 py-2"
                      />
                      <div className="flex items-center space-x-2">
                        <input
                          type="number"
                          placeholder="Year"
                          value={edu.year}
                          onChange={(e) => {
                            const newEducation = [...professionalData.education]
                            newEducation[index].year = parseInt(e.target.value) || new Date().getFullYear()
                            setProfessionalData(prev => ({ ...prev, education: newEducation }))
                          }}
                          className="flex-1 border border-gray-300 rounded px-3 py-2"
                        />
                        {professionalData.education.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeEducation(index)}
                            className="p-2 text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Languages */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">Languages</label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {languageOptions.map((language) => (
                    <label key={language} className="flex items-center">
                      <input
                        type="checkbox"
                        checked={professionalData.languages.includes(language)}
                        onChange={() => toggleArrayItem(professionalData.languages, language, setProfessionalData, 'languages')}
                        className="mr-2"
                      />
                      <span className="text-sm">{language}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Session Types */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">Session Types Offered</label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {sessionTypeOptions.map((type) => (
                    <label key={type} className="flex items-center">
                      <input
                        type="checkbox"
                        checked={professionalData.session_types.includes(type)}
                        onChange={() => toggleArrayItem(professionalData.session_types, type, setProfessionalData, 'session_types')}
                        className="mr-2"
                      />
                      <span className="text-sm capitalize">{type}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex justify-between">
                <button
                  onClick={() => setCurrentStep('personal')}
                  className="flex items-center px-6 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back
                </button>
                <button
                  onClick={handleProfessionalSubmit}
                  disabled={loading || !professionalData.bio}
                  className="flex items-center px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  Next
                  <ArrowRight className="h-4 w-4 ml-2" />
                </button>
              </div>
            </div>
          )}

          {/* Specializations Step */}
          {currentStep === 'specializations' && (
            <div className="space-y-6">
              <div className="text-center mb-6">
                <h2 className="text-2xl font-semibold text-gray-900 mb-2">Specializations & Approaches</h2>
                <p className="text-gray-600">Select your areas of expertise and therapeutic approaches</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">Clinical Specializations</label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {specializationOptions.map((spec) => (
                    <label key={spec} className="flex items-center p-2 border border-gray-200 rounded-lg hover:bg-gray-50">
                      <input
                        type="checkbox"
                        checked={professionalData.specializations.includes(spec)}
                        onChange={() => toggleArrayItem(professionalData.specializations, spec, setProfessionalData, 'specializations')}
                        className="mr-3"
                      />
                      <span className="text-sm">{spec}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">Therapeutic Approaches</label>
                <div className="grid grid-cols-1 gap-2">
                  {therapeuticApproaches.map((approach) => (
                    <label key={approach} className="flex items-center p-2 border border-gray-200 rounded-lg hover:bg-gray-50">
                      <input
                        type="checkbox"
                        checked={professionalData.therapeutic_approaches.includes(approach)}
                        onChange={() => toggleArrayItem(professionalData.therapeutic_approaches, approach, setProfessionalData, 'therapeutic_approaches')}
                        className="mr-3"
                      />
                      <span className="text-sm">{approach}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex justify-between">
                <button
                  onClick={() => setCurrentStep('professional')}
                  className="flex items-center px-6 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back
                </button>
                <button
                  onClick={handleSpecializationsSubmit}
                  disabled={professionalData.specializations.length === 0}
                  className="flex items-center px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  Next
                  <ArrowRight className="h-4 w-4 ml-2" />
                </button>
              </div>
            </div>
          )}

          {/* Verification Step */}
          {currentStep === 'verification' && (
            <div className="space-y-6">
              <div className="text-center mb-6">
                <h2 className="text-2xl font-semibold text-gray-900 mb-2">Profile Verification</h2>
                <p className="text-gray-600">Your profile will be reviewed by our team</p>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                <div className="flex items-start">
                  <Clock className="h-6 w-6 text-blue-600 mr-3 mt-1" />
                  <div>
                    <h3 className="text-lg font-semibold text-blue-900 mb-2">What happens next?</h3>
                    <ul className="text-blue-800 space-y-2">
                      <li>• Our team will review your professional credentials</li>
                      <li>• We may request additional documentation</li>
                      <li>• Verification typically takes 2-3 business days</li>
                      <li>• You'll receive an email once your profile is approved</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-lg p-6">
                <div className="flex items-start">
                  <AlertTriangle className="h-6 w-6 text-amber-600 mr-3 mt-1" />
                  <div>
                    <h3 className="text-lg font-semibold text-amber-900 mb-2">Important Notes</h3>
                    <ul className="text-amber-800 space-y-2">
                      <li>• Ensure all information provided is accurate</li>
                      <li>• Have your license and certification documents ready</li>
                      <li>• You can access limited features while verification is pending</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="flex justify-between">
                <button
                  onClick={() => setCurrentStep('specializations')}
                  className="flex items-center px-6 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back
                </button>
                <button
                  onClick={handleComplete}
                  disabled={loading}
                  className="flex items-center px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                >
                  {loading ? 'Completing...' : 'Complete Setup'}
                  <CheckCircle className="h-4 w-4 ml-2" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}