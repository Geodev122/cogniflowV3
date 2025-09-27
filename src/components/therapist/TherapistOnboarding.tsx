import React, { useState } from 'react'
import {
  User,
  Award,
  BookOpen, 
  MapPin, 
  Shield, 
  CreditCard,
  Upload,
  Plus,
  Trash2,
  Check,
  ChevronLeft,
  ChevronRight,
  Camera,
  Video,
  FileText,
  Globe,
  Phone,
  X
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'

interface OnboardingData {
  // Step 1: Basic Info
  fullName: string
  profilePicture: File | null
  whatsappNumber: string
  
  // Step 2: Expertise
  specializations: string[]
  otherSpecializations: string
  languages: string[]
  otherLanguages: string
  qualifications: string
  
  // Step 3: Story
  bio: string
  introVideo: File | null
  
  // Step 4: Practice Details
  practiceLocations: Array<{
    address: string
    isPrimary: boolean
  }>
  
  // Step 5: Verification
  licenses: Array<{
    name: string
    country: string
    document: File | null
  }>
  
  // Step 6: Membership
  paymentReceipt: File | null
  termsAccepted: boolean
}

const SPECIALIZATIONS = [
  'Anxiety Disorders',
  'Depression',
  'Trauma & PTSD',
  'Relationship Counseling',
  'Family Therapy',
  'Addiction & Substance Abuse',
  'Eating Disorders',
  'Grief & Loss',
  'Stress Management',
  'Career Counseling',
  'Child & Adolescent Therapy',
  'Couples Therapy',
  'Group Therapy',
  'Cognitive Behavioral Therapy (CBT)',
  'Dialectical Behavior Therapy (DBT)',
  'EMDR',
  'Mindfulness-Based Therapy',
  'Other'
]

const LANGUAGES = [
  'English',
  'Arabic',
  'Spanish',
  'French',
  'German',
  'Italian',
  'Portuguese',
  'Russian',
  'Chinese (Mandarin)',
  'Japanese',
  'Korean',
  'Hindi',
  'Turkish',
  'Other'
]

interface TherapistOnboardingProps {
  onComplete: (data: OnboardingData) => void
  onClose: () => void
}

export const TherapistOnboarding: React.FC<TherapistOnboardingProps> = ({ onComplete, onClose }) => {
  const [currentStep, setCurrentStep] = useState(1)
  const [showConfirmation, setShowConfirmation] = useState(false)
  const [profileCompletion, setProfileCompletion] = useState(0)
  const { profile } = useAuth()
  const [formData, setFormData] = useState<OnboardingData>({
    fullName: '',
    profilePicture: null,
    whatsappNumber: '',
    specializations: [],
    otherSpecializations: '',
    languages: [],
    otherLanguages: '',
    qualifications: '',
    bio: '',
    introVideo: null,
    practiceLocations: [{ address: '', isPrimary: true }],
    licenses: [{ name: '', country: '', document: null }],
    paymentReceipt: null,
    termsAccepted: false
  })

  const steps = [
    { number: 1, title: 'Welcome', icon: User },
    { number: 2, title: 'Expertise', icon: Award },
    { number: 3, title: 'Your Story', icon: BookOpen },
    { number: 4, title: 'Practice Details', icon: MapPin },
    { number: 5, title: 'Verification', icon: Shield },
    { number: 6, title: 'Membership', icon: CreditCard }
  ]

  const saveProgress = async (stepData: any, stepNumber: number) => {
    if (!profile) return

    console.log('Saving progress for step:', stepNumber, stepData)
    
    try {
      // First, try to update existing record
      const { data: existingData, error: fetchError } = await supabase
        .from('therapist_profiles')
        .select('*')
        .eq('user_id', profile.id)
        .single()

      if (fetchError && fetchError.code !== 'PGRST116') {
        throw fetchError
      }

      let result
      if (existingData) {
        // Update existing record
        result = await supabase
          .from('therapist_profiles')
          .update({
            ...stepData,
            onboarding_step: stepNumber,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', profile.id)
      } else {
        // Insert new record
        result = await supabase
          .from('therapist_profiles')
          .insert({
            user_id: profile.id,
            ...stepData,
            onboarding_step: stepNumber,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
      }

      if (result.error) {
        throw result.error
      }

      console.log('Progress saved successfully')
    } catch (err: any) {
      console.error('Error saving progress:', err)
      alert('Failed to save progress. Please try again.')
    }
  }

  const fetchExistingData = async () => {
    if (!profile) return

    console.log('Fetching existing therapist profile data...')
    
    try {
      const { data, error } = await supabase
        .from('therapist_profiles')
        .select('*')
        .eq('user_id', profile.id)
        .single()

      if (error && error.code !== 'PGRST116') throw error

      console.log('Fetched therapist profile:', data)
      
      if (data) {
        setTherapistData(data)
        setCurrentStep(data.onboarding_step || 1)
        console.log('Set current step to:', data.onboarding_step || 1)
      }
    } catch (err: any) {
      console.error('Error fetching existing data:', err)
    }
  }

  const handleNext = async () => {
    console.log('Moving to next step from:', currentStep)
    if (currentStep < 5) {
      await saveProgress(getStepData(currentStep), currentStep)
      setCurrentStep(currentStep + 1)
    } else {
      await handleComplete()
    }
  }

  const handlePrevious = () => {
    console.log('Moving to previous step from:', currentStep)
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleComplete = async () => {
    setIsSubmitting(true)
    console.log('Completing onboarding...')
    
    try {
      // Save final step data
      await saveProgress(getStepData(currentStep), currentStep)
      
      // Mark onboarding as complete
      await saveProgress({ onboarding_completed: true }, 5)
      
      console.log('Onboarding completed successfully')
      
      if (onComplete) {
        onComplete()
      }
    } catch (err: any) {
      console.error('Error completing onboarding:', err)
    } finally {
      setIsSubmitting(false)
    }
  }

  const getStepData = (step: number) => {
    switch (step) {
      case 1:
        return {
          license_number: therapistData.license_number,
          license_state: therapistData.license_state,
          license_expiry: therapistData.license_expiry,
          years_experience: therapistData.years_experience,
          education_background: therapistData.education_background
        }
      case 2:
        return {
          specializations: therapistData.specializations,
          therapeutic_approaches: therapistData.therapeutic_approaches,
          treatment_philosophy: therapistData.treatment_philosophy
        }
      case 3:
        return {
          practice_type: therapistData.practice_type,
          practice_name: therapistData.practice_name,
          practice_address: therapistData.practice_address,
          service_modes: therapistData.service_modes,
          age_groups: therapistData.age_groups
        }
      case 4:
        return {
          session_rate: therapistData.session_rate,
          sliding_scale_min: therapistData.sliding_scale_min,
          insurance_accepted: therapistData.insurance_accepted,
          payment_methods: therapistData.payment_methods
        }
      case 5:
        return {
          availability_days: therapistData.availability_days,
          availability_times: therapistData.availability_times,
          phone: therapistData.phone,
          availability_notes: therapistData.availability_notes
        }
      default:
        console.log('Unknown step:', step)
        return {}
    }
  }

  const updateFormData = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    // Calculate completion percentage
    calculateCompletion()
  }

  const calculateCompletion = () => {
    let completed = 0
    const totalSteps = 6
    
    // Step 1: Basic Info
    if (formData.fullName && formData.profilePicture && formData.whatsappNumber) completed++
    
    // Step 2: Expertise
    if (formData.specializations.length > 0 && formData.languages.length > 0 && formData.qualifications) completed++
    
    // Step 3: Story
    if (formData.bio && formData.bio.length >= 150) completed++
    
    // Step 4: Practice Details
    if (formData.practiceLocations.length > 0 && formData.practiceLocations.every(loc => loc.address)) completed++
    
    // Step 5: Verification
    if (formData.licenses.length > 0 && formData.licenses.every(license => license.name && license.country && license.document)) completed++
    
    // Step 6: Membership
    if (formData.paymentReceipt && formData.termsAccepted) completed++
    
    setProfileCompletion(Math.round((completed / totalSteps) * 100))
  }

  const addPracticeLocation = () => {
    setFormData(prev => ({
      ...prev,
      practiceLocations: [...prev.practiceLocations, { address: '', isPrimary: false }]
    }))
  }

  const removePracticeLocation = (index: number) => {
    setFormData(prev => ({
      ...prev,
      practiceLocations: prev.practiceLocations.filter((_, i) => i !== index)
    }))
  }

  const updatePracticeLocation = (index: number, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      practiceLocations: prev.practiceLocations.map((location, i) => 
        i === index ? { ...location, [field]: value } : location
      )
    }))
  }

  const setPrimaryLocation = (index: number) => {
    setFormData(prev => ({
      ...prev,
      practiceLocations: prev.practiceLocations.map((location, i) => ({
        ...location,
        isPrimary: i === index
      }))
    }))
  }

  const addLicense = () => {
    setFormData(prev => ({
      ...prev,
      licenses: [...prev.licenses, { name: '', country: '', document: null }]
    }))
  }

  const removeLicense = (index: number) => {
    setFormData(prev => ({
      ...prev,
      licenses: prev.licenses.filter((_, i) => i !== index)
    }))
  }

  const updateLicense = (index: number, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      licenses: prev.licenses.map((license, i) => 
        i === index ? { ...license, [field]: value } : license
      )
    }))
  }

  const handleFileUpload = (field: string, file: File | null, index?: number) => {
    if (index !== undefined) {
      if (field === 'licenses') {
        updateLicense(index, 'document', file)
      }
    } else {
      updateFormData(field, file)
    }
  }

  const validateStep = (step: number): boolean => {
    switch (step) {
      case 1:
        return !!(formData.fullName && formData.profilePicture && formData.whatsappNumber)
      case 2:
        const hasSpecializations = formData.specializations.length > 0
        const hasOtherSpecialization = !formData.specializations.includes('Other') || formData.otherSpecializations.trim()
        const hasLanguages = formData.languages.length > 0
        const hasOtherLanguage = !formData.languages.includes('Other') || formData.otherLanguages.trim()
        return !!(hasSpecializations && hasOtherSpecialization && hasLanguages && hasOtherLanguage && formData.qualifications)
      case 3:
        return !!(formData.bio && formData.bio.length >= 150)
      case 4:
        return !!(formData.practiceLocations.length > 0 && formData.practiceLocations.every(loc => loc.address))
      case 5:
        return !!(formData.licenses.length > 0 && formData.licenses.every(license => license.name && license.country && license.document))
      case 6:
        return !!(formData.paymentReceipt && formData.termsAccepted)
      default:
        return false
    }
  }

  const nextStep = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, 6))
    }
  }

  const prevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1))
  }

  const handleSubmit = async () => {
    if (!profile) return
    if (validateStep(6)) {
      try {
        // Upload profile picture if present
        let profile_picture_url: string | null = null
        if (formData.profilePicture) {
          const key = `therapists/${profile.id}/profile_${Date.now()}_${formData.profilePicture.name}`
          const { error: upErr } = await supabase.storage.from('profile_images').upload(key, formData.profilePicture, { upsert: true })
          if (upErr) throw upErr
          const { data: urlData } = supabase.storage.from('profile_images').getPublicUrl(key)
          profile_picture_url = urlData?.publicUrl || null
        }

        // Upload license docs and replace document File with url in professional details
        const licensesProcessed = [] as any[]
        for (const lic of formData.licenses) {
          let docUrl: string | null = null
          if (lic.document) {
            const key = `therapists/${profile.id}/licenses/${Date.now()}_${lic.name.replace(/\s+/g,'_')}_${lic.document.name}`
            const { error: lErr } = await supabase.storage.from('profile_files').upload(key, lic.document, { upsert: true })
            if (lErr) throw lErr
            const { data: urlData } = supabase.storage.from('profile_files').getPublicUrl(key)
            docUrl = urlData?.publicUrl || null
          }
          licensesProcessed.push({ name: lic.name, country: lic.country, document_url: docUrl })
        }

        const professionalDetails = {
          specializations: formData.specializations,
          languages: formData.languages,
          qualifications: formData.qualifications,
          bio: formData.bio,
          practice_locations: formData.practiceLocations,
          licenses: licensesProcessed,
          profile_picture_url
        }

        const { error: upErr } = await supabase.from('profiles').upsert({
          id: profile.id,
          whatsapp_number: formData.whatsappNumber,
          professional_details: professionalDetails,
          verification_status: 'pending',
          updated_at: new Date().toISOString()
        })
        if (upErr) throw upErr

        const { data: completion } = await supabase.rpc('profile_completion', { id: profile.id }).catch(()=> ({ data: 0 }))
        setProfileCompletion((completion as any) || 0)
        setShowConfirmation(true)
      } catch (e) {
        console.error('[TherapistOnboarding] submit error', e)
        alert('Could not save onboarding data. Check file upload limits and storage buckets.')
      }
    }
  }

  const handleConfirmationClose = () => {
    setShowConfirmation(false)
    onComplete(formData)
  }

  const toggleSpecialization = (spec: string) => {
    setFormData(prev => ({
      ...prev,
      specializations: prev.specializations.includes(spec)
        ? prev.specializations.filter(s => s !== spec)
        : [...prev.specializations, spec]
    }))
  }

  const toggleLanguage = (lang: string) => {
    setFormData(prev => ({
      ...prev,
      languages: prev.languages.includes(lang)
        ? prev.languages.filter(l => l !== lang)
        : [...prev.languages, lang]
    }))
  }

  const renderProgressBar = () => (
    <div className="mb-8">
      <div className="flex items-center justify-between">
        {steps.map((step, index) => {
          const Icon = step.icon
          const isActive = currentStep === step.number
          const isCompleted = currentStep > step.number
          const isAccessible = currentStep >= step.number

          return (
            <React.Fragment key={step.number}>
              <div className="flex flex-col items-center">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center border-2 transition-all ${
                  isCompleted 
                    ? 'bg-green-500 border-green-500 text-white' 
                    : isActive 
                    ? 'bg-blue-500 border-blue-500 text-white' 
                    : isAccessible
                    ? 'border-gray-300 text-gray-400'
                    : 'border-gray-200 text-gray-300'
                }`}>
                  {isCompleted ? <Check className="w-6 h-6" /> : <Icon className="w-6 h-6" />}
                </div>
                <span className={`text-xs mt-2 font-medium ${
                  isActive ? 'text-blue-600' : isCompleted ? 'text-green-600' : 'text-gray-500'
                }`}>
                  {step.title}
                </span>
              </div>
              {index < steps.length - 1 && (
                <div className={`flex-1 h-0.5 mx-4 ${
                  currentStep > step.number ? 'bg-green-500' : 'bg-gray-200'
                }`} />
              )}
            </React.Fragment>
          )
        })}
      </div>
    </div>
  )

  const renderStep1 = () => (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Welcome! Let's Start with the Basics</h2>
        <p className="text-gray-600">This information will be the first thing potential clients see. Let's make a great first impression.</p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Full Professional Name *
        </label>
        <input
          type="text"
          value={formData.fullName}
          onChange={(e) => updateFormData('fullName', e.target.value)}
          placeholder="Enter your full professional name as you'd like it to appear to clients"
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Professional Profile Picture *
        </label>
        <div className="flex items-center space-x-4">
          <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center border-2 border-dashed border-gray-300 overflow-hidden">
            {formData.profilePicture ? (
              <img 
                src={URL.createObjectURL(formData.profilePicture)} 
                alt="Profile" 
                className="w-full h-full object-cover"
              />
            ) : (
              <Camera className="w-8 h-8 text-gray-400" />
            )}
          </div>
          <div className="flex-1">
            <input
              type="file"
              accept="image/*"
              onChange={(e) => handleFileUpload('profilePicture', e.target.files?.[0] || null)}
              className="hidden"
              id="profile-picture"
            />
            <label
              htmlFor="profile-picture"
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 cursor-pointer"
            >
              <Upload className="w-4 h-4 mr-2" />
              Upload Photo
            </label>
            <p className="text-xs text-gray-500 mt-1">
              Upload a professional, high-quality headshot. A warm, friendly photo works best. (Square, max 2MB)
            </p>
          </div>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          WhatsApp Number *
        </label>
        <div className="relative">
          <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="tel"
            value={formData.whatsappNumber}
            onChange={(e) => updateFormData('whatsappNumber', e.target.value)}
            placeholder="+1 (555) 123-4567"
            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <p className="text-xs text-gray-500 mt-1">
          Clients will use this to contact you. It will be public. Please include your country code.
        </p>
      </div>
    </div>
  )

  const renderStep2 = () => (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Showcase Your Expertise</h2>
        <p className="text-gray-600">Help clients find you by detailing your skills, approach, and the languages you offer sessions in.</p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Specializations *
        </label>
        <p className="text-xs text-gray-500 mb-3">Select all areas you specialize in. Hold Ctrl/Cmd to select multiple.</p>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-48 overflow-y-auto border border-gray-300 rounded-lg p-3">
          {SPECIALIZATIONS.map((spec) => (
            <label key={spec} className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.specializations.includes(spec)}
                onChange={() => toggleSpecialization(spec)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">{spec}</span>
            </label>
          ))}
        </div>
        {formData.specializations.includes('Other') && (
          <input
            type="text"
            value={formData.otherSpecializations}
            onChange={(e) => updateFormData('otherSpecializations', e.target.value)}
            placeholder="If you selected 'Other' above, please list them here, separated by commas."
            className="mt-2 w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Languages *
        </label>
        <p className="text-xs text-gray-500 mb-3">Select all languages in which you can conduct therapy sessions fluently.</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 max-h-32 overflow-y-auto border border-gray-300 rounded-lg p-3">
          {LANGUAGES.map((lang) => (
            <label key={lang} className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.languages.includes(lang)}
                onChange={() => toggleLanguage(lang)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">{lang}</span>
            </label>
          ))}
        </div>
        {formData.languages.includes('Other') && (
          <input
            type="text"
            value={formData.otherLanguages}
            onChange={(e) => updateFormData('otherLanguages', e.target.value)}
            placeholder="If you selected 'Other', please list other languages here, separated by commas."
            className="mt-2 w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Qualifications & Credentials *
        </label>
        <textarea
          value={formData.qualifications}
          onChange={(e) => updateFormData('qualifications', e.target.value)}
          placeholder="List your degrees, licenses, and relevant credentials. Please place each one on a new line."
          rows={4}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
      </div>
    </div>
  )

  const renderStep3 = () => (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Tell Your Story</h2>
        <p className="text-gray-600">This is your chance to connect with potential clients on a personal level.</p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Professional Bio *
        </label>
        <textarea
          value={formData.bio}
          onChange={(e) => updateFormData('bio', e.target.value)}
          placeholder="Write a warm bio (min 150 characters). Describe your philosophy, what a session is like, and who you enjoy working with."
          rows={6}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
        <div className="flex justify-between text-xs text-gray-500 mt-1">
          <span>{formData.bio.length}/150 minimum characters</span>
          <span className={formData.bio.length >= 150 ? 'text-green-600' : 'text-red-500'}>
            {formData.bio.length >= 150 ? '✓ Minimum reached' : 'Minimum not reached'}
          </span>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Introduction Video (Optional)
        </label>
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
          {formData.introVideo ? (
            <div className="space-y-2">
              <Video className="w-12 h-12 text-green-500 mx-auto" />
              <p className="text-sm font-medium text-gray-900">{formData.introVideo.name}</p>
              <button
                onClick={() => updateFormData('introVideo', null)}
                className="text-sm text-red-600 hover:text-red-800"
              >
                Remove video
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <Video className="w-12 h-12 text-gray-400 mx-auto" />
              <div>
                <input
                  type="file"
                  accept="video/*"
                  onChange={(e) => handleFileUpload('introVideo', e.target.files?.[0] || null)}
                  className="hidden"
                  id="intro-video"
                />
                <label
                  htmlFor="intro-video"
                  className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 cursor-pointer"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Upload Video
                </label>
              </div>
              <p className="text-xs text-gray-500">
                Optional, but highly recommended! A short video (max 30s) helps build trust. (MP4/WebM, max 10MB)
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )

  const renderStep4 = () => (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Your Practice Details</h2>
        <p className="text-gray-600">Let clients know where to find you. You can add multiple office locations or an online-only practice.</p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-4">
          Practice Locations *
        </label>
        <p className="text-xs text-gray-500 mb-4">If you only practice online, you can enter 'Online Only' as your primary address.</p>
        <div className="space-y-4">
          {formData.practiceLocations.map((location, index) => (
            <div key={index} className="border border-gray-300 rounded-lg p-4">
              <div className="flex items-start space-x-4">
                <div className="flex-1">
                  <input
                    type="text"
                    value={location.address}
                    onChange={(e) => updatePracticeLocation(index, 'address', e.target.value)}
                    placeholder="Enter the full street address. For online, type 'Online Only'."
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <label className="flex items-center mt-2">
                    <input
                      type="radio"
                      name="primaryLocation"
                      checked={location.isPrimary}
                      onChange={() => setPrimaryLocation(index)}
                      className="mr-2"
                    />
                    <span className="text-sm text-gray-600">Primary location (Your main practice location will be shown first)</span>
                  </label>
                </div>
                {formData.practiceLocations.length > 1 && (
                  <button
                    onClick={() => removePracticeLocation(index)}
                    className="text-red-600 hover:text-red-800"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
        <button
          onClick={addPracticeLocation}
          className="mt-4 inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Another Location
        </button>
      </div>
    </div>
  )

  const renderStep5 = () => (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">License & Verification</h2>
        <p className="text-gray-600">To ensure the quality and safety of our platform, please upload your professional licenses. This is for internal verification only and will be kept confidential.</p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-4">
          Professional Licenses *
        </label>
        <p className="text-xs text-gray-500 mb-4">You must upload at least one valid professional license or certification.</p>
        <div className="space-y-4">
          {formData.licenses.map((license, index) => (
            <div key={index} className="border border-gray-300 rounded-lg p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    License Name
                  </label>
                  <input
                    type="text"
                    value={license.name}
                    onChange={(e) => updateLicense(index, 'name', e.target.value)}
                    placeholder="e.g., Licensed Professional Counselor"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Country of Practice
                  </label>
                  <input
                    type="text"
                    value={license.country}
                    onChange={(e) => updateLicense(index, 'country', e.target.value)}
                    placeholder="The country where this license is valid (e.g., USA, Egypt)"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  License Document
                </label>
                <div className="flex items-center space-x-4">
                  <input
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={(e) => handleFileUpload('licenses', e.target.files?.[0] || null, index)}
                    className="hidden"
                    id={`license-${index}`}
                  />
                  <label
                    htmlFor={`license-${index}`}
                    className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 cursor-pointer"
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    {license.document ? 'Change Document' : 'Upload Document'}
                  </label>
                  {license.document && (
                    <span className="text-sm text-green-600">✓ {license.document.name}</span>
                  )}
                  {formData.licenses.length > 1 && (
                    <button
                      onClick={() => removeLicense(index)}
                      className="text-red-600 hover:text-red-800"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Upload a clear scan or photo (PDF, JPG, PNG). Max 5MB.
                </p>
              </div>
            </div>
          ))}
        </div>
        <button
          onClick={addLicense}
          className="mt-4 inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Another License
        </button>
      </div>
    </div>
  )

  const renderStep6 = () => (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Final Step: Membership & Review</h2>
        <p className="text-gray-600">To be listed on CogniFlow and ensure platform quality, we require a small membership fee. Please upload your proof of payment to submit your profile for review.</p>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <div className="flex items-start space-x-3">
          <CreditCard className="w-6 h-6 text-blue-600 mt-1" />
          <div>
            <h3 className="font-medium text-blue-900 mb-2">Membership Information</h3>
            <p className="text-blue-800 text-sm">
              Our standard therapist membership helps us maintain the platform and provide quality services. 
              Please make the payment to our secure payment portal and upload the receipt below.
            </p>
          </div>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Payment Receipt *
        </label>
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
          {formData.paymentReceipt ? (
            <div className="space-y-2">
              <FileText className="w-12 h-12 text-green-500 mx-auto" />
              <p className="text-sm font-medium text-gray-900">{formData.paymentReceipt.name}</p>
              <button
                onClick={() => updateFormData('paymentReceipt', null)}
                className="text-sm text-red-600 hover:text-red-800"
              >
                Remove receipt
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <FileText className="w-12 h-12 text-gray-400 mx-auto" />
              <div>
                <input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={(e) => handleFileUpload('paymentReceipt', e.target.files?.[0] || null)}
                  className="hidden"
                  id="payment-receipt"
                />
                <label
                  htmlFor="payment-receipt"
                  className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 cursor-pointer"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Upload Receipt
                </label>
              </div>
              <p className="text-xs text-gray-500">
                Upload a screenshot or document of your payment confirmation. Max 2MB.
              </p>
            </div>
          )}
        </div>
      </div>

      <div>
        <label className="flex items-start space-x-3 cursor-pointer">
          <input
            type="checkbox"
            checked={formData.termsAccepted}
            onChange={(e) => updateFormData('termsAccepted', e.target.checked)}
            className="mt-1 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <span className="text-sm text-gray-700">
            I have read and agree to the Thera-PY{' '}
            <a href="/terms" target="_blank" className="text-blue-600 hover:text-blue-800 underline">
              Terms of Service
            </a>{' '}
            and{' '}
            <a href="/privacy" target="_blank" className="text-blue-600 hover:text-blue-800 underline">
              Privacy Policy
            </a>
            .
          </span>
        </label>
      </div>
    </div>
  )

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 1: return renderStep1()
      case 2: return renderStep2()
      case 3: return renderStep3()
      case 4: return renderStep4()
      case 5: return renderStep5()
      case 6: return renderStep6()
      default: return renderStep1()
    }
  }

  const renderConfirmation = () => (
    <div className="text-center space-y-6">
      <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto">
        <Check className="w-10 h-10 text-green-600" />
      </div>
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Profile Submitted!</h2>
        <p className="text-gray-600 max-w-md mx-auto">
          Thank you for completing your Thera-PY profile. Once approved, your profile data will be automatically transferred to our therapist directory, where potential clients can find and book with you.
        </p>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
          <h3 className="font-medium text-blue-900 mb-2">What happens next?</h3>
          <ul className="text-sm text-blue-800 space-y-1 text-left">
            <li>• Profile review within 2-3 business days</li>
            <li>• Automatic listing on Thera-PY directory</li>
            <li>• Email notification when live</li>
            <li>• Start receiving client inquiries</li>
          </ul>
        </div>
      </div>
      <button
        onClick={handleConfirmationClose}
        className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
      >
        Continue to Dashboard
      </button>
    </div>
  )

  if (showConfirmation) {
    return (
      <div className="fixed inset-0 z-50 overflow-y-auto bg-gray-500 bg-opacity-75">
        <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
          <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
            <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
              {renderConfirmation()}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-gray-500 bg-opacity-75">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full">
          <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div className="flex items-center justify-between mb-6">
              <h1 className="text-2xl font-bold text-gray-900">Therapist Onboarding</h1>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {renderProgressBar()}
            
            <div className="min-h-96">
              {renderCurrentStep()}
            </div>

            <div className="flex justify-between mt-8 pt-6 border-t border-gray-200">
              <button
                onClick={prevStep}
                disabled={currentStep === 1}
                className="inline-flex items-center px-6 py-3 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-4 h-4 mr-2" />
                Previous
              </button>

              {currentStep < 6 ? (
                <button
                  onClick={nextStep}
                  disabled={!validateStep(currentStep)}
                  className="inline-flex items-center px-6 py-3 border border-transparent rounded-lg text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next: {steps[currentStep]?.title}
                  <ChevronRight className="w-4 h-4 ml-2" />
                </button>
              ) : (
                <button
                  onClick={handleSubmit}
                  disabled={!validateStep(6)}
                  className="inline-flex items-center px-6 py-3 border border-transparent rounded-lg text-sm font-medium text-white bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Submit Profile for Review
                  <Check className="w-4 h-4 ml-2" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}