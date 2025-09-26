import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { supabase } from '../../lib/supabase'
import { AlertTriangle, Save, LogOut } from 'lucide-react'
import { MobileShell } from '../../components/client/MobileShell'

export default function ClientProfile() {
  const { user, profile, loading, signOut } = useAuth()
  const navigate = useNavigate()

  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [whatsapp, setWhatsapp] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [ok, setOk] = useState<string | null>(null)
  const [signingOut, setSigningOut] = useState(false)

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

  const doSignOut = async () => {
    setSigningOut(true)
    setErr(null)
    try {
      await signOut()
      navigate('/login', { replace: true })
    } catch (e: any) {
      setErr(e?.message || 'Failed to sign out.')
    } finally {
      setSigningOut(false)
    }
  }

  if (loading) {
    return (
      <MobileShell title="Profile">
        <div className="min-h-[60vh] grid place-items-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
        </div>
      </MobileShell>
    )
  }

  if (!user || profile?.role !== 'client') {
    return (
      <MobileShell title="Profile">
        <div className="max-w-lg mx-auto mt-16">
          <div className="bg-white border border-gray-200 rounded-xl p-6 text-center">
            <AlertTriangle className="w-8 h-8 text-amber-600 mx-auto mb-2" />
            <h2 className="text-lg font-semibold text-gray-900 mb-1">Client access only</h2>
          </div>
        </div>
      </MobileShell>
    )
  }

  return (
    <MobileShell title="Profile">
      <div className="min-h-screen p-3 max-w-screen-sm mx-auto">
        <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg font-semibold text-gray-900">Your Profile</h2>
            <button onClick={() => navigate('/client')} className="px-3 py-1.5 rounded border text-sm hover:bg-gray-50">
              Back
            </button>
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

          <div className="mt-5 flex items-center justify-between">
            <button
              onClick={doSignOut}
              disabled={signingOut}
              className="inline-flex items-center gap-2 px-3 py-2 rounded border text-sm hover:bg-gray-50 disabled:opacity-50"
              title="Sign out"
            >
              {signingOut
                ? <span className="inline-flex items-center"><span className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-700 mr-2" />Signing out…</span>
                : <><LogOut className="w-4 h-4" /> Sign out</>}
            </button>

            <button
              onClick={save}
              disabled={!canSave}
              className="inline-flex items-center gap-2 px-4 py-2 rounded bg-blue-600 text-white text-sm hover:bg-blue-700 disabled:opacity-50"
            >
              <Save className="w-4 h-4" /> Save
            </button>
          </div>
        </div>

        {/* Finder CTA */}
        <button
          onClick={() => navigate('/client/find-therapist?mode=list')}
          className="mt-4 w-full inline-flex items-center justify-center gap-2 rounded-xl border bg-white py-3 text-sm active:scale-[0.99]"
        >
          Explore Therapists
        </button>
      </div>
    </MobileShell>
  )
}
