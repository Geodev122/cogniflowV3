// src/components/assessment/AssessmentInstancesList.tsx
import React, { useEffect, useMemo, useState } from 'react'
import {
  Search, Filter, RefreshCw, MoreVertical, Eye, Play, CheckCircle, Trash2,
  Clock, AlertTriangle, User, FileText, Calendar, ListChecks, Plus,
} from 'lucide-react'
import { useAssessments } from '../../hooks/useAssessments'
import type { AssessmentInstance } from '../../hooks/useAssessments'
import { supabase } from '../../lib/supabase'
import AssignAssessmentModal from './AssignAssessmentModal'

type Props = {
  onOpenInstance?: (instance: AssessmentInstance) => void
  initialClientId?: string
  onClientFilterChange?: (id: string | null) => void
}

type SortKey = 'assigned_at' | 'due_date' | 'status' | 'client' | 'template'

const statusColor = (status: string) => {
  switch (status) {
    case 'completed': return 'text-green-700 bg-green-100 border-green-200'
    case 'in_progress': return 'text-blue-700 bg-blue-100 border-blue-200'
    case 'assigned': return 'text-gray-700 bg-gray-100 border-gray-200'
    case 'expired': return 'text-orange-700 bg-orange-100 border-orange-200'
    case 'cancelled': return 'text-red-700 bg-red-100 border-red-200'
    default: return 'text-gray-700 bg-gray-100 border-gray-200'
  }
}

const StatusBadge: React.FC<{ status: string }> = ({ status }) => (
  <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full border ${statusColor(status)}`}>
    {status.replace('_', ' ')}
  </span>
)

const ProgressBar: React.FC<{ value?: number | null }> = ({ value }) => {
  const n = typeof value === 'number' ? value : 0
  const pct = Math.max(0, Math.min(100, n))
  return (
    <div className="w-28">
      <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
        <div className="h-2 bg-blue-600 rounded-full transition-all" style={{ width: `${pct}%` }} />
      </div>
      <div className="text-[10px] text-gray-500 mt-1">{pct}%</div>
    </div>
  )
}

const Dot = ({ className = '' }: { className?: string }) => (
  <span className={`inline-block w-1.5 h-1.5 rounded-full ${className}`} />
)

const formatDate = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleDateString() : '—'

const isOverdue = (due?: string | null, status?: string) => {
  if (!due) return false
  if (status === 'completed' || status === 'cancelled') return false
  return new Date(due).getTime() < Date.now()
}

const rowShadow = (instance: AssessmentInstance) =>
  isOverdue(instance.due_date, instance.status) ? 'ring-1 ring-red-100' : ''

const EmptyState = ({ title, subtitle }: { title: string; subtitle: string }) => (
  <div className="py-20 text-center">
    <ListChecks className="w-12 h-12 text-gray-300 mx-auto mb-3" />
    <h3 className="text-gray-900 font-medium">{title}</h3>
    <p className="text-gray-500 text-sm">{subtitle}</p>
  </div>
)

const Loading = () => (
  <div className="py-16 grid place-items-center">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
  </div>
)

const ErrorBanner = ({ message }: { message: string }) => (
  <div className="mb-3 bg-red-50 border border-red-200 text-red-800 text-sm rounded px-3 py-2 flex items-center gap-2">
    <AlertTriangle className="w-4 h-4" />
    {message}
  </div>
)

const sortFns: Record<SortKey, (a: AssessmentInstance, b: AssessmentInstance) => number> = {
  assigned_at: (a, b) => new Date(b.assigned_at || 0).getTime() - new Date(a.assigned_at || 0).getTime(),
  due_date: (a, b) => (new Date(a.due_date || '2100-01-01').getTime() - new Date(b.due_date || '2100-01-01').getTime()),
  status: (a, b) => (a.status || '').localeCompare(b.status || ''),
  client: (a, b) =>
    `${a.client?.last_name || ''}${a.client?.first_name || ''}`.localeCompare(
      `${b.client?.last_name || ''}${b.client?.first_name || ''}`
    ),
  template: (a, b) => (a.template?.name || '').localeCompare(b.template?.name || ''),
}

const statusOptions: Array<{ id: string; label: string }> = [
  { id: 'all', label: 'All statuses' },
  { id: 'assigned', label: 'Assigned' },
  { id: 'in_progress', label: 'In progress' },
  { id: 'completed', label: 'Completed' },
  { id: 'expired', label: 'Expired' },
  { id: 'cancelled', label: 'Cancelled' },
]

const PAGE_SIZE = 12

const AssessmentInstancesList: React.FC<Props> = ({
  onOpenInstance,
  initialClientId,
  onClientFilterChange,
}) => {
  const { instances, loading, error, refetch, updateInstanceStatus, deleteInstance } = useAssessments()

  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('all')
  const [clientFilter, setClientFilter] = useState('all')
  const [templateFilter, setTemplateFilter] = useState('all')
  const [sortKey, setSortKey] = useState<SortKey>('assigned_at')
  const [sortAsc, setSortAsc] = useState(false)
  const [page, setPage] = useState(1)
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null)

  const [showAssign, setShowAssign] = useState(false)

  useEffect(() => {
    if (initialClientId) {
      setClientFilter(initialClientId)
      onClientFilterChange?.(initialClientId)
    } else {
      setClientFilter(prev => (prev !== 'all' && prev === initialClientId ? 'all' : prev))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialClientId])

  const clientMap = useMemo(() => {
    const m = new Map<string, string>()
    instances.forEach(i => {
      if (i.client) m.set(i.client_id, `${i.client.first_name ?? ''} ${i.client.last_name ?? ''}`.trim())
    })
    return m
  }, [instances])

  const [extraClientOption, setExtraClientOption] = useState<{ id: string; name: string } | null>(null)

  useEffect(() => {
    let cancel = false
    const hydrate = async () => {
      if (!initialClientId) { setExtraClientOption(null); return }
      if (clientMap.has(initialClientId)) { setExtraClientOption(null); return }
      const { data, error: e } = await supabase
        .from('profiles')
        .select('first_name,last_name')
        .eq('id', initialClientId)
        .single()
      if (cancel) return
      if (e || !data) setExtraClientOption({ id: initialClientId, name: 'Selected Client' })
      else setExtraClientOption({ id: initialClientId, name: `${data.first_name || ''} ${data.last_name || ''}`.trim() || 'Selected Client' })
    }
    hydrate()
    return () => { cancel = true }
  }, [initialClientId, clientMap])

  const clientOptions = useMemo(() => {
    const base = [{ id: 'all', name: 'All clients' }, ...Array.from(clientMap).map(([id, name]) => ({ id, name }))]
    if (extraClientOption && !base.find(o => o.id === extraClientOption.id)) return [base[0], extraClientOption, ...base.slice(1)]
    return base
  }, [clientMap, extraClientOption])

  const templateOptions = useMemo(() => {
    const uniq = new Map<string, string>()
    instances.forEach(i => {
      if (i.template) uniq.set(i.template_id, i.template.name)
    })
    return [{ id: 'all', name: 'All templates' }, ...Array.from(uniq).map(([id, name]) => ({ id, name }))]
  }, [instances])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return instances.filter(i => {
      const statusOk = status === 'all' || i.status === status
      const clientOk = clientFilter === 'all' || i.client_id === clientFilter
      const templateOk = templateFilter === 'all' || i.template_id === templateFilter
      const hay =
        `${i.title ?? ''} ${i.template?.name ?? ''} ${i.client?.first_name ?? ''} ${i.client?.last_name ?? ''} ${i.client?.email ?? ''}`.toLowerCase()
      const searchOk = !q || hay.includes(q)
      return statusOk && clientOk && templateOk && searchOk
    })
  }, [instances, status, clientFilter, templateFilter, search])

  const sorted = useMemo(() => {
    const next = [...filtered].sort(sortFns[sortKey])
    return sortAsc ? next.reverse() : next
  }, [filtered, sortKey, sortAsc])

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE))
  const paged = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE
    return sorted.slice(start, start + PAGE_SIZE)
  }, [sorted, page])

  useEffect(() => {
    setPage(1)
  }, [search, status, clientFilter, templateFilter])

  useEffect(() => {
    onClientFilterChange?.(clientFilter === 'all' ? null : clientFilter)
  }, [clientFilter, onClientFilterChange])

  const toggleSort = (key: SortKey) => {
    if (key === sortKey) setSortAsc(!sortAsc)
    else { setSortKey(key); setSortAsc(false) }
  }

  const handleOpen = (i: AssessmentInstance) => onOpenInstance?.(i)
  const handleMarkComplete = async (i: AssessmentInstance) => { await updateInstanceStatus(i.id, 'completed') }
  const handleDelete = async (i: AssessmentInstance) => {
    if (!confirm('Delete this assessment instance? This cannot be undone.')) return
    await deleteInstance(i.id)
  }

  return (
    <div className="h-full flex flex-col">
      <div className="sticky top-0 z-10 bg-white/80 backdrop-blur border-b border-gray-200">
        <div className="p-3 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-600" />
              <h2 className="text-lg font-semibold text-gray-900">Assigned Assessments</h2>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowAssign(true)}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md bg-blue-600 text-white text-sm hover:bg-blue-700"
                title="Assign assessment"
              >
                <Plus className="w-4 h-4" />
                Assign
              </button>
              <button
                onClick={() => refetch()}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md border text-sm hover:bg-gray-50"
                title="Refresh"
              >
                <RefreshCw className="w-4 h-4" />
                Refresh
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-5 gap-2">
            <div className="xl:col-span-2 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by client, template, title…"
                className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div className="relative">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full pl-9 pr-8 py-2 text-sm border border-gray-300 rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-blue-500 appearance-none bg-[url('data:image/svg+xml;utf8,<svg xmlns=\\'http://www.w3.org/2000/svg\\' width=\\'16\\' height=\\'16\\'><path d=\\'M4 6l4 4 4-4\\' fill=\\'none\\' stroke=\\'%23666\\' stroke-width=\\'1.5\\'/></svg>')] bg-no-repeat bg-[right_0.6rem_center]"
              >
                {statusOptions.map(s => (
                  <option key={s.id} value={s.id}>{s.label}</option>
                ))}
              </select>
            </div>

            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
              <select
                value={clientFilter}
                onChange={(e) => setClientFilter(e.target.value)}
                className="w-full pl-9 pr-8 py-2 text-sm border border-gray-300 rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-blue-500 appearance-none bg-[url('data:image/svg+xml;utf8,<svg xmlns=\\'http://www.w3.org/2000/svg\\' width=\\'16\\' height=\\'16\\'><path d=\\'M4 6l4 4 4-4\\' fill=\\'none\\' stroke=\\'%23666\\' stroke-width=\\'1.5\\'/></svg>')] bg-no-repeat bg-[right_0.6rem_center]"
              >
                {clientOptions.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            <div className="relative">
              <BookIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
              <select
                value={templateFilter}
                onChange={(e) => setTemplateFilter(e.target.value)}
                className="w-full pl-9 pr-8 py-2 text-sm border border-gray-300 rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-blue-500 appearance-none bg-[url('data:image/svg+xml;utf8,<svg xmlns=\\'http://www.w3.org/2000/svg\\' width=\\'16\\' height=\\'16\\'><path d=\\'M4 6l4 4 4-4\\' fill=\\'none\\' stroke=\\'%23666\\' stroke-width=\\'1.5\\'/></svg>')] bg-no-repeat bg-[right_0.6rem_center]"
              >
                {templateOptions.map(t => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs text-gray-600">
            <span>Sort by:</span>
            <button onClick={() => toggleSort('assigned_at')} className={`px-2 py-1 rounded ${sortKey === 'assigned_at' ? 'bg-blue-50 text-blue-700' : 'hover:bg-gray-100'}`}>
              Assigned {sortKey === 'assigned_at' && (sortAsc ? '↑' : '↓')}
            </button>
            <button onClick={() => toggleSort('due_date')} className={`px-2 py-1 rounded ${sortKey === 'due_date' ? 'bg-blue-50 text-blue-700' : 'hover:bg-gray-100'}`}>
              Due date {sortKey === 'due_date' && (sortAsc ? '↑' : '↓')}
            </button>
            <button onClick={() => toggleSort('status')} className={`px-2 py-1 rounded ${sortKey === 'status' ? 'bg-blue-50 text-blue-700' : 'hover:bg-gray-100'}`}>
              Status {sortKey === 'status' && (sortAsc ? '↑' : '↓')}
            </button>
            <button onClick={() => toggleSort('client')} className={`px-2 py-1 rounded ${sortKey === 'client' ? 'bg-blue-50 text-blue-700' : 'hover:bg-gray-100'}`}>
              Client {sortKey === 'client' && (sortAsc ? '↑' : '↓')}
            </button>
            <button onClick={() => toggleSort('template')} className={`px-2 py-1 rounded ${sortKey === 'template' ? 'bg-blue-50 text-blue-700' : 'hover:bg-gray-100'}`}>
              Template {sortKey === 'template' && (sortAsc ? '↑' : '↓')}
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        {loading && <Loading />}
        {!loading && error && <ErrorBanner message={error} />}

        {!loading && !paged.length && (
          <EmptyState title="No assessments to show" subtitle="Try adjusting search or filters." />
        )}

        {!loading && !!paged.length && (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
            {paged.map(i => (
              <div key={i.id} className={`bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition ${rowShadow(i)}`}>
                <div className="flex items-start justify-between">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <StatusBadge status={i.status} />
                      {isOverdue(i.due_date, i.status) && (
                        <span className="inline-flex items-center gap-1 text-xs text-red-700 bg-red-50 border border-red-200 rounded-full px-2 py-0.5">
                          <AlertTriangle className="w-3 h-3" />
                          Overdue
                        </span>
                      )}
                    </div>
                    <h3 className="mt-2 font-semibold text-gray-900 truncate">{i.title}</h3>
                    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-600">
                      <span className="inline-flex items-center gap-1">
                        <FileText className="w-3.5 h-3.5" />
                        {i.template?.abbreviation || i.template?.name || '—'}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <User className="w-3.5 h-3.5" />
                        {i.client ? `${i.client.first_name ?? ''} ${i.client.last_name ?? ''}`.trim() : '—'}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />
                        Assigned: {formatDate(i.assigned_at)}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        Due: {formatDate(i.due_date)}
                      </span>
                    </div>
                  </div>

                  <div className="relative">
                    <button
                      onClick={() => setMenuOpenId(v => (v === i.id ? null : i.id))}
                      className="p-1.5 rounded text-gray-500 hover:text-gray-700 hover:bg-gray-100"
                      aria-label="Row menu"
                    >
                      <MoreVertical className="w-4 h-4" />
                    </button>
                    {menuOpenId === i.id && (
                      <div className="absolute right-0 mt-2 w-40 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
                        <button className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50" onClick={() => { setMenuOpenId(null); handleOpen(i) }}>
                          <Eye className="w-4 h-4 inline mr-2" />
                          Open
                        </button>
                        {i.status !== 'completed' && (
                          <button className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50" onClick={() => { setMenuOpenId(null); handleMarkComplete(i) }}>
                            <CheckCircle className="w-4 h-4 inline mr-2" />
                            Mark complete
                          </button>
                        )}
                        <button className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50" onClick={() => { setMenuOpenId(null); handleDelete(i) }}>
                          <Trash2 className="w-4 h-4 inline mr-2" />
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <Dot className={i.status === 'completed' ? 'bg-green-500' : i.status === 'in_progress' ? 'bg-blue-500' : 'bg-gray-400'} />
                    <span>{i.status === 'completed' ? 'Completed' : i.status === 'in_progress' ? 'In progress' : 'Assigned'}</span>
                  </div>

                  <div className="flex items-center gap-3">
                    {'progress' in i ? <ProgressBar value={i.progress} /> : <div className="text-xs text-gray-400 w-28 text-right" />}

                    {i.status === 'assigned' && (
                      <button onClick={() => handleOpen(i)} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md bg-blue-600 text-white text-sm hover:bg-blue-700">
                        <Play className="w-4 h-4" />
                        Start
                      </button>
                    )}
                    {i.status === 'in_progress' && (
                      <button onClick={() => handleOpen(i)} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md bg-blue-600 text-white text-sm hover:bg-blue-700">
                        <Play className="w-4 h-4" />
                        Resume
                      </button>
                    )}
                    {i.status === 'completed' && (
                      <button onClick={() => handleOpen(i)} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md border text-sm hover:bg-gray-50">
                        <Eye className="w-4 h-4" />
                        View
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && totalPages > 1 && (
          <div className="mt-4 flex items-center justify-center gap-2">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="px-3 py-1.5 rounded border text-sm disabled:opacity-50">
              Prev
            </button>
            <div className="text-sm text-gray-600">Page {page} of {totalPages}</div>
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="px-3 py-1.5 rounded border text-sm disabled:opacity-50">
              Next
            </button>
          </div>
        )}
      </div>

      {showAssign && (
        <AssignAssessmentModal
          open={showAssign}
          onClose={() => setShowAssign(false)}
          initialClientId={clientFilter !== 'all' ? clientFilter : initialClientId}
          onAssigned={() => { setShowAssign(false); refetch() }}
        />
      )}
    </div>
  )
}

export default AssessmentInstancesList

function BookIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}>
      <path d="M5.5 3.5h7A3.5 3.5 0 0 1 16 7v13.5c-.7-.6-1.7-1-3-1h-7v-16z" stroke="currentColor" strokeWidth="1.5"/>
      <path d="M5.5 19.5h7c1.3 0 2.3.4 3 1V7a3.5 3.5 0 0 0-3.5-3.5H5.5" stroke="currentColor" strokeWidth="1.5"/>
    </svg>
  )
}
