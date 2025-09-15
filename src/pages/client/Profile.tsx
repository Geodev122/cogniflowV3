import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { supabase } from '../../lib/supabase'
import { AlertTriangle, Save } from 'lucide-react'

export default function ClientProfile() {
  const { user, profile, loading } = useAuth()
  const navigate = useNavigate()

  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [whatsapp, setWhatsapp] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [ok, setOk] = useState<string | null>(null)

  import { MobileTopBar } from '../../components/client/MobileTopBar'

return (
  <>
    <MobileTopBar title="Profile" />
    {/* existing Profile content */}
  </>
)

  useEffect(() => {
    if (profile?.role === 'client') {
      setFirstName(profile.first_name || '')
      setLastName(profile.last_name || '')
      setWhatsapp((profile.whatsapp_number as any) || '')
    }
  }, [profile])

  const canSave = firstName.trim().length > 0 && lastName.trim().length > 0 && !busy

  const save = async () => {
    if (!user) return
    setBusy(true); setErr(null); setOk(null)
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          whatsapp_number: whatsapp.trim() || null,
        })
        .eq('id', user.id)

      if (error) throw error
      setOk('Saved!')
    } catch (e: any) {
      console.error('[ClientProfile] save error', e)
      setErr('Could not save profile.')
    } finally {
      setBusy(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-[60vh] grid place-items-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
      </div>
    )
  }

  if (!user || profile?.role !== 'client') {
    return (
      <div className="max-w-lg mx-auto mt-16">
        <div className="bg-white border border-gray-200 rounded-xl p-6 text-center">
          <AlertTriangle className="w-8 h-8 text-amber-600 mx-auto mb-2" />
          <h2 className="text-lg font-semibold text-gray-900 mb-1">Client access only</h2>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-2xl mx-auto bg-white border border-gray-200 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Your Profile</h2>
          <button onClick={() => navigate('/client')} className="px-3 py-1.5 rounded border text-sm hover:bg-gray-50">Back</button>
        </div>

        {err && <div className="mb-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded p-2">{err}</div>}
        {ok && <div className="mb-3 text-sm text-green-700 bg-green-50 border border-green-200 rounded p-2">{ok}</div>}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700">First name</label>
            <input
              value={firstName}
              onChange={e => setFirstName(e.target.value)}
              className="mt-1 w-full px-3 py-2 border rounded-lg text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              placeholder="First name"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Last name</label>
            <input
              value={lastName}
              onChange={e => setLastName(e.target.value)}
              className="mt-1 w-full px-3 py-2 border rounded-lg text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Last name"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-gray-700">WhatsApp (optional)</label>
            <input
              value={whatsapp}
              onChange={e => setWhatsapp(e.target.value)}
              className="mt-1 w-full px-3 py-2 border rounded-lg text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              placeholder="+1 555 000 0000"
            />
          </div>
        </div>

        <div className="mt-5 flex items-center justify-end">
          <button
            onClick={save}
            disabled={!canSave}
            className="inline-flex items-center gap-2 px-4 py-2 rounded bg-blue-600 text-white text-sm hover:bg-blue-700 disabled:opacity-50"
          >
            <Save className="w-4 h-4" /> Save
          </button>
        </div>
      </div>
    </div>
  )
}
