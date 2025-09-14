import React from 'react'
import { User, Phone, CheckCircle } from 'lucide-react'

export const SimpleTherapistProfile: React.FC<{ profile: any; onEdit: () => void }> = ({ profile, onEdit }) => {
  const professionalDetails = profile?.professional_details || {}
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="text-center">
        <div className="w-24 h-24 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <User className="w-12 h-12 text-blue-600" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900">
          {profile?.first_name} {profile?.last_name}
        </h2>
        <p className="text-gray-600">{profile?.email}</p>
        <div className="mt-4">
          <span className={`inline-flex px-3 py-1 text-sm font-medium rounded-full ${
            profile?.verification_status === 'verified' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
          }`}>
            {profile?.verification_status === 'verified' ? 'Verified Professional' : 'Verification Pending'}
          </span>
        </div>
      </div>

      <div className="bg-gray-50 rounded-lg p-4">
        <h3 className="font-medium text-gray-900 mb-3">Contact Information</h3>
        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <Phone className="w-4 h-4 text-gray-500" />
            <span className="text-sm text-gray-700">{profile?.whatsapp_number || 'Not provided'}</span>
          </div>
        </div>
      </div>

      {professionalDetails.specializations && (
        <div className="bg-gray-50 rounded-lg p-4">
          <h3 className="font-medium text-gray-900 mb-3">Specializations</h3>
          <div className="flex flex-wrap gap-2">
            {professionalDetails.specializations.map((spec: string, i: number) => (
              <span key={i} className="inline-flex px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                {spec}
              </span>
            ))}
          </div>
        </div>
      )}

      {professionalDetails.languages && (
        <div className="bg-gray-50 rounded-lg p-4">
          <h3 className="font-medium text-gray-900 mb-3">Languages</h3>
          <div className="flex flex-wrap gap-2">
            {professionalDetails.languages.map((lang: string, i: number) => (
              <span key={i} className="inline-flex px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                {lang}
              </span>
            ))}
          </div>
        </div>
      )}

      {professionalDetails.bio && (
        <div className="bg-gray-50 rounded-lg p-4">
          <h3 className="font-medium text-gray-900 mb-3">About</h3>
          <p className="text-sm text-gray-700 leading-relaxed">{professionalDetails.bio}</p>
        </div>
      )}

      {professionalDetails.qualifications && (
        <div className="bg-gray-50 rounded-lg p-4">
          <h3 className="font-medium text-gray-900 mb-3">Qualifications</h3>
          <div className="space-y-1">
            {String(professionalDetails.qualifications)
              .split('\n')
              .filter((q: string) => q.trim())
              .map((q: string, i: number) => (
                <div key={i} className="flex items-start space-x-2">
                  <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                  <span className="text-sm text-gray-700">{q.trim()}</span>
                </div>
              ))}
          </div>
        </div>
      )}

      <div className="text-center">
        <button onClick={onEdit} className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
          <User className="w-4 h-4 mr-2" />
          Edit Profile
        </button>
      </div>
    </div>
  )
}
export default SimpleTherapistProfile
