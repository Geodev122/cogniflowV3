// src/components/assessment/AssessmentReport.tsx
import React, { useMemo, useRef } from 'react'
import { FileText, Printer, Download, User, Calendar, Activity } from 'lucide-react'

type Props = {
  /** Template meta used for headings/limits */
  template: {
    name: string
    abbreviation?: string | null
    description?: string | null
    estimated_duration_minutes?: number | null
    scoring_config?: { max_score?: number | null }
    category?: string | null
  }
  /** Instance meta for context */
  instance: {
    id: string
    title?: string | null
    assigned_at?: string | null
    completed_at?: string | null
    therapist_id?: string
    client?: { first_name?: string | null; last_name?: string | null; email?: string | null } | null
  }
  /** Score payload to display */
  score: {
    raw: number
    percentOfMax?: number
    interpretation?: {
      category?: string
      description?: string
      recommendations?: string
      clinical_significance?: string
      severity_level?: string
    }
    /** Optional subscales: name -> value */
    subscales?: Record<string, number>
    /** Optional narrative / longform summary */
    narrative?: string
  }
}

/**
 * AssessmentReport
 * - Renders a clean summary suitable for printing to PDF
 * - No external deps; uses window.open + window.print
 */
const AssessmentReport: React.FC<Props> = ({ template, instance, score }) => {
  const ref = useRef<HTMLDivElement | null>(null)

  const maxScore = template.scoring_config?.max_score ?? null
  const clientName = useMemo(
    () => `${instance.client?.first_name || ''} ${instance.client?.last_name || ''}`.trim() || '—',
    [instance.client?.first_name, instance.client?.last_name]
  )
  const assigned = instance.assigned_at ? new Date(instance.assigned_at).toLocaleString() : '—'
  const completed = instance.completed_at ? new Date(instance.completed_at).toLocaleString() : '—'

  const handlePrint = () => {
    if (!ref.current) return
    const w = window.open('', '_blank', 'noopener,noreferrer,width=1024,height=768')
    if (!w) return

    const html = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>${template.abbreviation || template.name} — Report</title>
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <style>
      @media print {
        @page { margin: 16mm; }
      }
      :root {
        --ink: #0f172a;      /* slate-900 */
        --muted: #475569;    /* slate-600 */
        --line: #e2e8f0;     /* slate-200 */
        --brand: #2563eb;    /* blue-600 */
        --chip: #eef2ff;     /* indigo-50 */
        --chip-text: #3730a3;/* indigo-700 */
        --good: #16a34a;     /* green-600 */
        --warn: #ea580c;     /* orange-600 */
        --bad: #dc2626;      /* red-600 */
      }
      * { box-sizing: border-box; }
      body {
        font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Inter, 'Helvetica Neue', Arial, 'Noto Sans', 'Apple Color Emoji', 'Segoe UI Emoji';
        color: var(--ink);
        margin: 0;
        padding: 0;
      }
      .page {
        padding: 24px;
        max-width: 880px;
        margin: 0 auto;
      }
      .hdr {
        display: grid;
        grid-template-columns: 1fr auto;
        gap: 16px;
        align-items: start;
        border-bottom: 1px solid var(--line);
        padding-bottom: 12px;
      }
      .title {
        font-weight: 800;
        font-size: 20px;
        margin: 2px 0 4px;
      }
      .sub { color: var(--muted); font-size: 13px; }
      .chip { display:inline-block; padding: 2px 8px; border-radius: 999px; background: var(--chip); color: var(--chip-text); font-size: 12px; font-weight: 600; }
      .blk { margin-top: 18px; border: 1px solid var(--line); border-radius: 12px; padding: 14px; }
      .blk h3 { margin: 0 0 8px; font-size: 14px; text-transform: uppercase; letter-spacing: .04em; color: var(--muted); }
      .grid-2 { display: grid; grid-template-columns: repeat(2, minmax(0,1fr)); gap: 12px; }
      .row { display: flex; align-items: center; gap: 8px; font-size: 14px; }
      .label { color: var(--muted); min-width: 140px; }
      .metric { text-align:center; padding: 10px 8px; border-radius: 10px; border:1px solid var(--line);}
      .metric .big { font-size: 28px; font-weight: 800; }
      .metric .subt { color: var(--muted); font-size: 12px; }
      .pill { display:inline-block; padding: 4px 10px; border-radius: 999px; border:1px solid var(--line); font-weight:600; }
      .pill.good { color: var(--good); border-color: #bbf7d0; background:#f0fdf4; }
      .pill.warn { color: var(--warn); border-color: #fed7aa; background:#fff7ed; }
      .pill.bad  { color: var(--bad);  border-color: #fecaca; background:#fef2f2; }
      .mono { white-space: pre-wrap; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace; font-size: 12px; padding: 10px; background: #fff; border-radius: 8px; border:1px solid var(--line); }
      .footer { margin-top: 16px; font-size: 12px; color: var(--muted); text-align:center; }
      .muted { color: var(--muted); }
      .table { width:100%; border-collapse: collapse; }
      .table th, .table td { border:1px solid var(--line); padding: 8px 10px; font-size: 13px; }
      .table th { text-align:left; background:#f8fafc; color: var(--muted); }
    </style>
  </head>
  <body>
    <div class="page">
      ${ref.current.innerHTML}
      <div class="footer">Generated ${new Date().toLocaleString()}</div>
    </div>
    <script>window.onload = () => { window.print(); setTimeout(() => window.close(), 300); }</script>
  </body>
</html>`
    w.document.open()
    w.document.write(html)
    w.document.close()
  }

  const severityClass =
    score.interpretation?.severity_level === 'severe' || score.interpretation?.severity_level === 'very_severe'
      ? 'pill bad'
      : score.interpretation?.severity_level?.includes('moderate')
      ? 'pill warn'
      : 'pill good'

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-3 border-b bg-white">
        <div className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-blue-600" />
          <div className="font-semibold text-gray-900">Printable Report</div>
          <span className="text-xs chip">{template.abbreviation || 'Assessment'}</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md border hover:bg-gray-50 text-sm"
            title="Print / Save as PDF"
          >
            <Printer className="w-4 h-4" />
            Print / PDF
          </button>
        </div>
      </div>

      {/* Report Body (this exact HTML gets cloned into the print window) */}
      <div ref={ref} className="bg-white">
        {/* Header */}
        <div className="p-5 border-b">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-xs text-gray-500">Assessment Report</div>
              <div className="text-xl font-extrabold text-gray-900">
                {template.name}{' '}
                {template.abbreviation ? <span className="text-gray-400 font-medium">({template.abbreviation})</span> : null}
              </div>
              {template.description ? <div className="text-sm text-gray-600 mt-1">{template.description}</div> : null}
            </div>
            <div className="text-right">
              <div className="text-xs text-gray-500">Instance ID</div>
              <div className="font-mono text-sm text-gray-800">{instance.id}</div>
            </div>
          </div>
        </div>

        {/* Meta */}
        <div className="p-5 grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="border rounded-lg p-3">
            <div className="text-xs text-gray-500 flex items-center gap-2"><User className="w-4 h-4" /> Client</div>
            <div className="mt-1 text-sm font-medium text-gray-900">{clientName}</div>
            {instance.client?.email && <div className="text-xs text-gray-500">{instance.client.email}</div>}
          </div>
          <div className="border rounded-lg p-3">
            <div className="text-xs text-gray-500 flex items-center gap-2"><Calendar className="w-4 h-4" /> Assigned</div>
            <div className="mt-1 text-sm text-gray-900">{assigned}</div>
          </div>
          <div className="border rounded-lg p-3">
            <div className="text-xs text-gray-500 flex items-center gap-2"><Calendar className="w-4 h-4" /> Completed</div>
            <div className="mt-1 text-sm text-gray-900">{completed}</div>
          </div>
        </div>

        {/* Scores */}
        <div className="p-5 grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="metric">
            <div className="big text-green-600">{score.raw}</div>
            <div className="subt">Raw Score{maxScore ? ` / ${maxScore}` : ''}</div>
          </div>
          <div className="metric">
            <div className="big text-blue-600">{score.percentOfMax ?? (maxScore ? Math.round((score.raw / Number(maxScore)) * 100) : 0)}%</div>
            <div className="subt">Percent of Max</div>
          </div>
          <div className="metric">
            <div className="big text-purple-600">{score.interpretation?.category || '—'}</div>
            <div className="subt">Interpretation</div>
          </div>
        </div>

        {/* Details */}
        <div className="p-5">
          <div className="border rounded-lg p-4">
            <div className="text-xs text-gray-500 uppercase tracking-wide mb-2">Clinical Interpretation</div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div><span className="text-gray-500">Category:</span> <span className="font-medium text-gray-900">{score.interpretation?.category || '—'}</span></div>
              <div>
                <span className="text-gray-500">Severity:</span>{' '}
                {score.interpretation?.severity_level
                  ? <span className={severityClass}>{score.interpretation.severity_level.replace('_',' ')}</span>
                  : <span className="text-gray-900">—</span>}
              </div>
              <div className="md:col-span-2">
                <div className="text-gray-500 mb-1">Description</div>
                <div className="text-sm text-gray-900">{score.interpretation?.description || '—'}</div>
              </div>
              {score.interpretation?.recommendations && (
                <div className="md:col-span-2">
                  <div className="text-gray-500 mb-1">Recommendations</div>
                  <div className="text-sm text-gray-900">{score.interpretation.recommendations}</div>
                </div>
              )}
              {score.interpretation?.clinical_significance && (
                <div className="md:col-span-2">
                  <div className="text-gray-500 mb-1">Clinical Significance</div>
                  <div className="text-sm text-gray-900">{score.interpretation.clinical_significance}</div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Subscales */}
        {score.subscales && Object.keys(score.subscales).length > 0 && (
          <div className="p-5">
            <div className="border rounded-lg p-4">
              <div className="text-xs text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-2">
                <Activity className="w-4 h-4" /> Subscale Scores
              </div>
              <table className="table">
                <thead>
                  <tr>
                    <th style={{width:'60%'}}>Subscale</th>
                    <th>Score</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(score.subscales).map(([name, value]) => (
                    <tr key={name}>
                      <td>{name}</td>
                      <td>{value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Narrative */}
        {score.narrative && (
          <div className="p-5">
            <div className="border rounded-lg p-4">
              <div className="text-xs text-gray-500 uppercase tracking-wide mb-2">Narrative Report</div>
              <div className="mono">{score.narrative}</div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default AssessmentReport
