import React, { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { useNavigate } from 'react-router-dom'
import { GraduationCap, ExternalLink, AlertTriangle } from 'lucide-react'

type CEItem = {
  id: string
  title: string
  provider?: string | null
  hours?: number | null
  description?: string | null
  url?: string | null
}

export default function ContinuingEducation() {
  const [rows, setRows] = useState<CEItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { profile } = useAuth()

  const navigate = useNavigate()

  const enroll = async (courseId: string) => {
    if (!profile?.id) return alert('Please sign in')
    try {
      const { error } = await supabase.from('ce_enrollments').insert({ course_id: courseId, user_id: profile.id })
      if (error) throw error
      alert('Enrolled — check your completed courses in profile')
    } catch (e:any) {
      console.error('enroll error', e)
      alert(e?.message || 'Could not enroll')
    }
  }

  useEffect(() => {
    let mounted = true
    ;(async () => {
      setLoading(true); setError(null)
      const { data, error } = await supabase
        .from('resources')
        .select('id, title, provider, hours, description, url, content_type, category')
        .or('content_type.eq.course,category.eq.educational')
        .order('title', { ascending: true })

      if (!mounted) return
      if (error) { setError(error.message); setRows([]); setLoading(false); return }

      const mapped = (data ?? []).map((r: any) => ({
        id: r.id,
        title: r.title,
        provider: r.provider ?? null,
        hours: r.hours ?? null,
        description: r.description ?? null,
        url: r.url ?? null
      }))
      setRows(mapped); setLoading(false)
    })()
    return () => { mounted = false }
  }, [])

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-indigo-50">
            <GraduationCap className="w-5 h-5 text-indigo-600" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900">Continuing Education</h2>
        </div>
        <div className="text-sm text-gray-500">
          <button onClick={() => navigate('/therapist/continuing')} className="text-sm text-indigo-600 hover:underline">Browse courses</button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" /> {error}
        </div>
      )}

      {loading ? (
        <div className="p-6 bg-white rounded-xl border shadow-sm">Loading…</div>
      ) : rows.length === 0 ? (
        <div className="p-8 bg-white rounded-xl border shadow-sm text-center text-gray-600">
          No course-type resources found. Tag items in <span className="font-medium">resources</span> as
          <code className="mx-1 px-1 rounded bg-gray-100">content_type=course</code>
          or <code className="mx-1 px-1 rounded bg-gray-100">category=educational</code>.
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {rows.map(r => (
            <div key={r.id} className="bg-white rounded-xl border shadow-sm p-5">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-base font-semibold text-gray-900">{r.title}</h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {r.provider ? r.provider : 'Provider N/A'}
                    {r.hours ? ` • ${r.hours} hours` : ''}
                  </p>
                </div>
                {r.url && (
                  <a href={r.url} target="_blank" rel="noreferrer"
                     className="inline-flex items-center text-sm text-indigo-600 hover:text-indigo-800">
                    Open <ExternalLink className="w-4 h-4 ml-1" />
                  </a>
                )}
                <div className="mt-3">
                  <button onClick={() => enroll(r.id)} className="px-3 py-1 rounded bg-blue-600 text-white text-sm">Enroll</button>
                </div>
              </div>
              {r.description && <p className="text-sm text-gray-700 mt-3 line-clamp-3">{r.description}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export { ContinuingEducation }
