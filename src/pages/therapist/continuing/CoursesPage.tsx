import React, { useEffect, useState } from 'react'
import { supabase } from '../../../lib/supabase'
import { useNavigate } from 'react-router-dom'

export default function CoursesPage(){
  const [rows, setRows] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(()=>{
    let mounted = true
    ;(async ()=>{
      try{
        setLoading(true)
        const { data, error } = await supabase.from('ce_courses').select('*').order('title', { ascending: true })
        if (!mounted) return
        if (error) throw error
        setRows(data ?? [])
      }catch(e){ console.error('load courses', e); setRows([]) }finally{ if(mounted) setLoading(false) }
    })()
    return ()=> { mounted = false }
  },[])

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-semibold">Continuing Education — Courses</h1>
        <div className="text-sm text-gray-500">{rows.length} course{rows.length !== 1 ? 's' : ''}</div>
      </div>

      {loading ? (
        <div className="p-6 bg-white rounded-xl border shadow-sm">Loading…</div>
      ) : rows.length === 0 ? (
        <div className="p-8 bg-white rounded-xl border shadow-sm text-center text-gray-600">No courses found.</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {rows.map(r=> (
            <div key={r.id} className="bg-white rounded-xl border shadow-sm p-5">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-base font-semibold text-gray-900">{r.title}</h3>
                  <p className="text-xs text-gray-500 mt-0.5">{r.provider ?? 'Provider N/A'} • {r.hours ?? 0} hours</p>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={()=> navigate(`/therapist/continuing/${r.id}`)} className="px-3 py-1 rounded bg-blue-600 text-white text-sm">Open</button>
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
