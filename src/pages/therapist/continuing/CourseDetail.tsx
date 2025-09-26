import React, { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../../../lib/supabase'
import { useAuth } from '../../../hooks/useAuth'

export default function CourseDetail(){
  const { id } = useParams<{ id: string }>()
  const [course, setCourse] = useState<any | null>(null)
  const [lessons, setLessons] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const { profile } = useAuth()

  useEffect(()=>{
    let mounted = true
    ;(async ()=>{
      try{
        setLoading(true)
        const [{ data: courseData }, { data: lessonsData }] = await Promise.all([
          supabase.from('ce_courses').select('*').eq('id', id).maybeSingle(),
          supabase.from('ce_lessons').select('*').eq('course_id', id).order('position', { ascending: true })
        ])
        if (!mounted) return
        setCourse(courseData ?? null)
        setLessons(lessonsData ?? [])
      }catch(e){ console.error('course detail', e); setCourse(null); setLessons([]) }finally{ if(mounted) setLoading(false) }
    })()
    return ()=> { mounted = false }
  },[id])

  const enroll = async () => {
    if (!profile?.id) return alert('Please sign in to enroll')
    try{
      const { error } = await supabase.from('ce_enrollments').insert({ course_id: id, user_id: profile.id })
      if (error) throw error
      alert('Enrolled')
    }catch(e:any){ console.error('enroll', e); alert(e?.message || 'Could not enroll') }
  }

  if (loading) return <div className="p-6">Loading…</div>
  if (!course) return <div className="p-6">Course not found.</div>

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-semibold">{course.title}</h1>
          <div className="text-sm text-gray-500">{course.provider ?? 'Provider N/A'} • {course.hours ?? 0} hours</div>
        </div>
        <div>
          <button onClick={enroll} className="px-3 py-2 bg-blue-600 text-white rounded">Enroll</button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white border rounded-xl p-5">
          <div className="prose max-w-none">
            {/* If course.content is stored as rich JSON or markdown, render basic fallback */}
            {course.description && <p>{course.description}</p>}
            {course.content && <pre className="text-sm bg-gray-50 rounded p-3 mt-3">{JSON.stringify(course.content, null, 2)}</pre>}
          </div>
        </div>

        <aside className="bg-white border rounded-xl p-4">
          <h3 className="font-medium text-gray-900">Lessons</h3>
          <div className="mt-3 space-y-2">
            {lessons.length === 0 ? (
              <div className="text-sm text-gray-500">No lessons yet.</div>
            ) : (
              lessons.map(l => (
                <div key={l.id} className="p-2 border rounded">
                  <div className="text-sm font-medium">{l.title}</div>
                  <div className="text-xs text-gray-500">{l.duration_minutes ?? 0} min</div>
                </div>
              ))
            )}
          </div>
        </aside>
      </div>
    </div>
  )
}
