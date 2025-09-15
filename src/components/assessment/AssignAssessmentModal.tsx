// src/components/assessment/AssignAssessmentModal.tsx
import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { X, Search, Users, Calendar, FileText, Loader2 } from 'lucide-react'
import { useAssessments } from '../../hooks/useAssessments'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'

type ReminderFreq = 'none' | 'daily' | 'weekly' | 'before_due'

type Props = {
  open: boolean
  onClose: () => void
  initialClientId?: string
  initialTemplateId?: string
  onAssigned?: (count: number) => void
}

type ClientRow = {
  id: string
  first_name: string | null
  last_name: string | null
  email: string | null
  created_at: string
}

const PAGE_SIZE = 10

const AssignAssessmentModal: React.FC<Props> = ({
  open,
  onClose,
  initialClientId,
  initialTemplateId,
  onAssigned,
}) => {
  const { profile } = useAuth()
  const { templates, assignAssessment } = useAssessments()

  const [templateId, setTemplateId] = useState<string>(initialTemplateId || '')
  const [selectedClientIds, setSelectedClientIds] = useState<Set<string>>(new Set())
  const [instructions, setInstructions] = useState('')
  const [dueDate, setDueDate] = useState<string>('') // ISO yyyy-mm-dd
  const [reminderFrequency, setReminderFrequency] = useState<ReminderFreq>('none')

  const [scope, setScope] = useState<'mine' | 'all'>('mine')
  const [q, setQ] = useState('')
  const [page, setPage] = useState(1)
  const [rows, setRows] = useState<ClientRow[]>([])
  const [total, setTotal] = useState(0)
  const [loadingRows, setLoadingRows] = useState(false)
  const [errorRows, setErrorRows] = useState<string | null>(null)

  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setTemplateId(initialTemplateId || '')
    setSelectedClientIds(new Set(initialClientId ? [initialClientId] : []))
    setInstructions('')
    setDueDate('')
    setReminderFrequency('none')
    setScope('mine')
    setQ('')
    setPage(1)
    setSubmitError(null)
  }, [open, initialClientId, initialTemplateId])

  // Fetch clients (paginated)
  const fetchClients = useCallback(async () => {
    if (!open) return
    setLoadingRows(true)
    setErrorRows(null)
    try {
      let query = supabase
        .from('profiles')
        .select('id, first_name, last_name, email, created_at', { count: 'exact' })
        .eq('role', 'client')

      if (scope === 'mine' && profile?.id) {
        const { data: relations, error: relErr } = await supabase
          .from('therapist_client_relations')
          .select('client_id')
          .eq('therapist_id', profile.id)

        if (relErr) {
          console.warn('[AssignAssessmentModal] relations error', relErr)
          setRows([]); setTotal(0); setLoadingRows(false)
          return
        }
        const ids = (relations || []).map(r => r.client_id)
        if (!ids.length) { setRows([]); setTotal(0); setLoadingRows(false); return }
        query = query.in('id', ids)
      }

      const search = q.trim()
      if (search) {
        query = query.or(
          `first_name.ilike.%${search}%,last_name.ilike.%${search}%,email.ilike.%${search}%`
        )
      }

      const from = (page - 1) * PAGE_SIZE
      const to = from + PAGE_SIZE - 1
      const { data, error, count } = await query
        .order('created_at', { ascending: false })
        .range(from, to)

      if (error) throw error
      setRows((data || []) as ClientRow[])
      setTotal(count || 0)
    } catch (e: any) {
      console.error('[AssignAssessmentModal] fetchClients', e)
      setErrorRows('Could not load clients.')
      setRows([]); setTotal(0)
    } finally {
      setLoadingRows(false)
    }
  }, [open, profile?.id, scope, q, page])

  useEffect(() => { fetchClients() }, [fetchClients])

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const activeTemplates = useMemo(() => (templates || []).filter(t => t.is_active), [templates])

  const singleClient = !!initialClientId
  const toggleSelected = (id: string) => {
    if (singleClient) return
    setSelectedClientIds(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const allOnPageSelected = rows.length > 0 && rows.every(r => selectedClientIds.has(r.id))
  const toggleSelectAllOnPage = () => {
    if (singleClient) return
    setSelectedClientIds(prev => {
      const next = new Set(prev)
      if (allOnPageSelected) rows.forEach(r => next.delete(r.id))
      else rows.forEach(r => next.add(r.id))
      return next
    })
  }

  const canSubmit = templateId && selectedClientIds.size > 0 && !submitting

  const handleAssign = async () => {
    if (!templateId || selectedClientIds.size === 0) return
    setSubmitting(true)
    setSubmitError(null)
    try {
      await assignAssessment(templateId, Array.from(selectedClientIds), {
        dueDate: dueDate || undefined,
        instructions: instructions || undefined,
        reminderFrequency,
      })
      onAssigned?.(selectedClientIds.size)
      onClose()
    } catch (e: any) {
      console.error('[AssignAssessmentModal] assign error', e)
      setSubmitError(e?.message || 'Failed to assign assessment.')
    } finally {
      setSubmitting(false)
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="absolute inset-x-0 top-10 mx-auto w-full max-w-5xl bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden">
        {/* header */}
        <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-600" />
            <h3 className="text-lg font-semibold text-gray-900">Assign Assessment</h3>
          </div>
          <button onClick={onClose} className="p-2 rounded hover:bg-gray-100" aria-label="Close">
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12">
          {/* Left: selection form */}
          <div className="lg:col-span-5 border-r border-gray-200 p-4 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Template</label>
              <select
                value={templateId}
                onChange={(e) => setTemplateId(e.target.value)}
                className="w-full pr-8 pl-3 py-2 border rounded-lg text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="" disabled>Select a template…</option>
                {activeTemplates.map(t => (
                  <option key={t.id} value={t.id}>
                    {t.abbreviation ? `${t.abbreviation} — ${t.name}` : t.name}
                  </option>
                ))}
              </select>
              {!!templateId && (
                <p className="mt-1 text-xs text-gray-500">
                  {activeTemplates.find(t => t.id === templateId)?.description || ''}
                </p>
              )}
            </div>

            {!singleClient && (
              <>
                <div className="flex items-center justify-between">
                  <div className="text-sm font-medium text-gray-700">Clients</div>
                  <select
                    value={scope}
                    onChange={(e) => { setScope(e.target.value as any); setPage(1) }}
                    className="px-2 py-1 text-sm border rounded-lg"
                  >
                    <option value="mine">My Clients</option>
                    <option value="all">All Clients</option>
                  </select>
                </div>

                <div className="relative">
                  <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    value={q}
                    onChange={(e) => { setQ(e.target.value); setPage(1) }}
                    placeholder="Search by name or email…"
                    className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm"
                  />
                </div>
              </>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Due date</label>
              <div className="relative">
                <Calendar className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Reminders</label>
              <select
                value={reminderFrequency}
                onChange={(e) => setReminderFrequency(e.target.value as ReminderFreq)}
                className="w-full px-3 py-2 border rounded-lg text-sm"
              >
                <option value="none">None</option>
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="before_due">One day before due</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Instructions (optional)</label>
              <textarea
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                rows={4}
                placeholder="Add custom instructions or leave blank to use the template defaults."
                className="w-full px-3 py-2 border rounded-lg text-sm"
              />
            </div>
          </div>

          {/* Right: clients list */}
          <div className="lg:col-span-7 p-4">
            {!singleClient && (
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Users className="w-4 h-4" />
                  <span>{total} client{total === 1 ? '' : 's'} found</span>
                </div>
                <button
                  onClick={toggleSelectAllOnPage}
                  className="text-sm px-3 py-1.5 rounded border hover:bg-gray-50"
                >
                  {allOnPageSelected ? 'Unselect page' : 'Select page'}
                </button>
              </div>
            )}

            {singleClient && (
              <div className="mb-3 p-3 border rounded-lg bg-gray-50 text-sm text-gray-700">
                Assigning to a specific client. Selection is locked.
              </div>
            )}

            <div className="border rounded-lg overflow-hidden">
              <div className="hidden md:grid grid-cols-12 bg-gray-50 text-xs uppercase text-gray-600 px-3 py-2">
                {!singleClient && <div className="col-span-1">Select</div>}
                <div className={`${singleClient ? 'col-span-6' : 'col-span-6'}`}>Name</div>
                <div className="col-span-4">Email</div>
                <div className="col-span-2">Created</div>
              </div>

              {loadingRows ? (
                <div className="py-10 grid place-items-center">
                  <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                </div>
              ) : errorRows ? (
                <div className="p-3 text-sm text-red-700 bg-red-50">{errorRows}</div>
              ) : rows.length === 0 ? (
                <div className="py-10 text-center text-sm text-gray-600">No clients found.</div>
              ) : (
                <div className="divide-y">
                  {rows.map(r => {
                    const name = `${r.first_name || ''} ${r.last_name || ''}`.trim() || 'Unnamed'
                    const selected = selectedClientIds.has(r.id)
                    return (
                      <div key={r.id} className="md:grid grid-cols-12 items-center px-3 py-2">
                        {!singleClient && (
                          <div className="col-span-1">
                            <input
                              type="checkbox"
                              className="h-4 w-4 rounded border-gray-300"
                              checked={selected}
                              onChange={() => toggleSelected(r.id)}
                            />
                          </div>
                        )}
                        <div className={`${singleClient ? 'col-span-6' : 'col-span-6'}`}>
                          <div className="font-medium text-gray-900">{name}</div>
                        </div>
                        <div className="col-span-4 text-sm text-gray-700 truncate">{r.email || '—'}</div>
                        <div className="col-span-2 text-xs text-gray-500">
                          {new Date(r.created_at).toLocaleDateString()}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {!singleClient && totalPages > 1 && !loadingRows && (
              <div className="mt-3 flex items-center justify-center gap-2">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-3 py-1.5 rounded border text-sm disabled:opacity-50"
                >
                  Prev
                </button>
                <div className="text-sm text-gray-600">
                  Page {page} of {totalPages}
                </div>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-3 py-1.5 rounded border text-sm disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            )}
          </div>
        </div>

        {/* footer */}
        <div className="px-5 py-4 border-t border-gray-200 flex items-center justify-between">
          <div className="text-xs text-gray-500">Select a template and at least one client to enable assignment.</div>
          <div className="flex items-center gap-2">
            {submitError && <span className="text-sm text-red-600 mr-2">{submitError}</span>}
            <button onClick={onClose} className="px-4 py-2 rounded border text-sm hover:bg-gray-50">Cancel</button>
            <button
              onClick={handleAssign}
              disabled={!canSubmit}
              className="inline-flex items-center gap-2 px-4 py-2 rounded bg-blue-600 text-white text-sm hover:bg-blue-700 disabled:opacity-50"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              Assign
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AssignAssessmentModal
