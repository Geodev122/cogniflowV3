import React, { useCallback, useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { IdCard, Loader2, AlertTriangle, Upload, Download, Bell, Trash2, Eye } from 'lucide-react'
import { useToast } from '../ui/Toast'

export const LicensingCompliance: React.FC = () => {
  const { profile } = useAuth()
  const [rows, setRows] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [expires, setExpires] = useState<string>('')
  const [ceTotal, setCeTotal] = useState<number | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<any | null>(null)
  const [ceHours, setCeHours] = useState<number | ''>('')
  const [ceCourse, setCeCourse] = useState<string>('')
  const [ceSubmitting, setCeSubmitting] = useState(false)
  const { push } = useToast()

  const load = useCallback(async () => {
    if (!profile?.id) return
    try {
      setLoading(true)
      const { data, error: e } = await supabase
        .from('therapist_licenses')
        .select('*')
        .eq('therapist_id', profile.id)
        .order('created_at', { ascending: false })
      if (e) throw e
      setRows(data || [])
    } catch (e: any) {
      setError('Could not load licenses')
    } finally { setLoading(false) }
  }, [profile?.id])

  useEffect(() => { load() }, [load])

  // load CE credit totals
  useEffect(() => {
    let mounted = true
    ;(async () => {
      if (!profile?.id) return
      try {
        const { data, error } = await supabase
          .from('ce_completions')
          .select('hours')
          .eq('therapist_id', profile.id)
        if (error) throw error
        const total = (data || []).reduce((s: number, r: any) => s + (r.hours || 0), 0)
        if (mounted) setCeTotal(total)
      } catch (e) {
        // ignore CE load errors - non-critical
      }
    })()
    return () => { mounted = false }
  }, [profile?.id])

  const upload = async () => {
    if (!profile?.id || !file) return
    try {
      const ext = file.name.split('.').pop()
      const path = `${profile.id}/${Date.now()}.${ext}`
      const { error: st } = await supabase.storage.from('licensing').upload(path, file, { upsert: true })
      if (st) throw st
      const { error: ins } = await supabase.from('therapist_licenses').insert({
        therapist_id: profile.id, file_path: path, expires_on: expires || null, status: 'submitted'
      })
      if (ins) throw ins
      setFile(null); setExpires('')
      await load()
      push({ message: 'License uploaded', type: 'success' })
    } catch (e: any) {
      push({ message: e?.message || 'Upload failed', type: 'error' })
    }
  }

  const handlePreview = (path: string) => {
    const url = supabase.storage.from('licensing').getPublicUrl(path).data.publicUrl
    setPreviewUrl(url)
  }

  const handleDelete = (row: any) => {
    if (!profile?.id) return
    setConfirmDelete(row)
  }

  const performDelete = async (row: any) => {
    if (!profile?.id || !row) return
    try {
      setDeleting(row.id)
      // remove from storage
      await supabase.storage.from('licensing').remove([row.file_path])
      // remove DB record
      const { error } = await supabase.from('therapist_licenses').delete().eq('id', row.id)
      if (error) throw error
      await load()
      push({ message: 'License deleted', type: 'success' })
    } catch (e: any) {
      push({ message: e?.message || 'Delete failed', type: 'error' })
    } finally { setDeleting(null); setConfirmDelete(null) }
  }

  const daysLeft = (d?: string | null) => {
    if (!d) return null
    const ms = new Date(d).getTime() - Date.now()
    return Math.ceil(ms / (1000 * 60 * 60 * 24))
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-4">
      <div className="flex items-center gap-2">
        <IdCard className="w-6 h-6 text-blue-600" />
        <h2 className="text-2xl font-bold text-gray-900">Licensing & Compliance</h2>
      </div>

      <div className="bg-white border rounded-lg shadow-sm p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="text-sm text-gray-600">Uploaded licenses</div>
          <div className="text-sm text-gray-700">CE credits: {ceTotal === null ? '—' : ceTotal} {ceTotal !== null && <span className="ml-3 text-xs text-gray-500">({Math.min(100, Math.round((ceTotal/30)*100))}% of 30h)</span>}</div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <input type="file" onChange={(e) => setFile(e.target.files?.[0] || null)} className="text-sm" />
          <input type="date" value={expires} onChange={(e) => setExpires(e.target.value)} className="px-3 py-2 border rounded text-sm" placeholder="Expiry date" />
          <button onClick={upload} disabled={!file} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50">
            <Upload className="w-4 h-4 inline mr-1" /> Upload License
          </button>
        </div>
      </div>

      <div className="bg-white border rounded-lg shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-10 grid place-items-center"><Loader2 className="w-6 h-6 animate-spin text-blue-600" /></div>
        ) : error ? (
          <div className="p-4 text-red-700 bg-red-50 border-b border-red-200 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" /><span>{error}</span>
          </div>
        ) : rows.length === 0 ? (
          <div className="py-10 text-center">
            <IdCard className="w-10 h-10 text-gray-300 mx-auto mb-2" />
            <div className="text-gray-900 font-medium">No licenses uploaded</div>
            <div className="text-sm text-gray-600">Upload your license to enable verification & renewal reminders.</div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-gray-50 text-xs uppercase text-gray-600">
                <tr>
                  <th className="text-left px-4 py-3">File</th>
                  <th className="text-left px-4 py-3">Expiry</th>
                  <th className="text-left px-4 py-3">Status</th>
                  <th className="text-right px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y text-sm">
                {rows.map(r => {
                  const left = daysLeft(r.expires_on)
                  const url = supabase.storage.from('licensing').getPublicUrl(r.file_path).data.publicUrl
                  return (
                    <tr key={r.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-900 truncate">{r.file_path}</div>
                        <div className="text-xs text-gray-500">{new Date(r.created_at).toLocaleString()}</div>
                      </td>
                      <td className="px-4 py-3">
                        {r.expires_on ? (
                          <span className={`${left !== null && left <= 30 ? 'text-red-600 font-medium' : 'text-gray-700'}`}>
                            {r.expires_on} {left !== null && `• ${left}d`}
                          </span>
                        ) : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          r.status === 'approved' ? 'bg-green-100 text-green-700'
                          : r.status === 'rejected' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'
                        }`}>{r.status || 'pending'}</span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="inline-flex items-center gap-2">
                          <button onClick={() => handlePreview(r.file_path)} className="inline-flex items-center gap-1 px-3 py-1.5 bg-gray-100 rounded hover:bg-gray-200 text-xs">
                            <Eye className="w-3.5 h-3.5" /> Preview
                          </button>
                          <a href={url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 px-3 py-1.5 bg-gray-100 rounded hover:bg-gray-200 text-xs">
                            <Download className="w-3.5 h-3.5" /> Download
                          </a>
                          <button onClick={() => handleDelete(r)} disabled={deleting === r.id} className="inline-flex items-center gap-1 px-3 py-1.5 bg-red-50 text-red-600 rounded hover:bg-red-100 text-xs">
                            <Trash2 className="w-3.5 h-3.5" /> {deleting === r.id ? 'Deleting...' : 'Delete'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <div className="bg-white border rounded-lg shadow-sm p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="text-sm text-gray-600">Add CE completion (manual entry)</div>
          <div className="text-sm text-gray-700">Total: {ceTotal === null ? '—' : ceTotal} hrs</div>
        </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <input type="number" min={0.25} step={0.25} value={ceHours as any} onChange={(e) => setCeHours(e.target.value === '' ? '' : Number(e.target.value))} className="px-3 py-2 border rounded text-sm" placeholder="Hours (e.g. 1.5)" />
            <input type="text" value={ceCourse} onChange={(e) => setCeCourse(e.target.value)} className="px-3 py-2 border rounded text-sm" placeholder="Course ID / Title (optional)" />
            <div />
            <div className="text-right">
              <button onClick={async () => {
                if (!profile?.id || !ceHours) {
                  push({ message: 'Enter hours', type: 'error' })
                  return
                }
                try {
                  setCeSubmitting(true)
                  const payload: any = { therapist_id: profile.id, hours: ceHours }
                  if (ceCourse) payload.course_id = ceCourse
                  const { error } = await supabase.from('ce_completions').insert(payload)
                  if (error) throw error
                  // refresh total
                  const { data } = await supabase.from('ce_completions').select('hours').eq('therapist_id', profile.id)
                  const total = (data || []).reduce((s: number, r: any) => s + (r.hours || 0), 0)
                  setCeTotal(total)
                  setCeHours(''); setCeCourse('')
                  push({ message: 'CE completion recorded', type: 'success' })
                } catch (e: any) { push({ message: e?.message || 'Failed to record CE', type: 'error' }) }
                finally { setCeSubmitting(false) }
              }} disabled={ceSubmitting || !ceHours} className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50">{ceSubmitting ? 'Saving...' : 'Add CE'}</button>
            </div>
          </div>
      </div>
      {previewUrl && (
        <div className="fixed inset-0 bg-black/50 grid place-items-center z-50" onClick={() => setPreviewUrl(null)}>
          <div className="bg-white max-w-3xl w-full p-4 rounded shadow" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-end"><button onClick={() => setPreviewUrl(null)} className="text-sm text-gray-600">Close</button></div>
            <div className="mt-2">
              <iframe src={previewUrl} className="w-full h-[70vh] border" title="Preview" />
            </div>
          </div>
        </div>
      )}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black/40 grid place-items-center z-50">
          <div className="bg-white w-full max-w-md p-4 rounded shadow" role="dialog" aria-modal="true">
            <div className="text-lg font-medium mb-2">Delete license?</div>
            <div className="text-sm text-gray-600 mb-4">This action cannot be undone. Are you sure you want to remove <span className="font-mono">{confirmDelete.file_path}</span>?</div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setConfirmDelete(null)} className="px-3 py-1 rounded border">Cancel</button>
              <button onClick={() => performDelete(confirmDelete)} disabled={deleting === confirmDelete.id} className="px-3 py-1 rounded bg-red-600 text-white">{deleting === confirmDelete.id ? 'Deleting...' : 'Delete'}</button>
            </div>
          </div>
        </div>
      )}
      <div className="text-xs text-gray-500 flex items-center gap-1">
        <Bell className="w-3.5 h-3.5" /> We’ll alert you 30/14/7 days before expiry.
      </div>
    </div>
  )
}
export default LicensingCompliance
