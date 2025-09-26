// src/components/assessment/AssessmentPreviewModal.tsx
import React from 'react'
import type { AssessmentTemplate } from '../../hooks/useAssessments'
import { X, BookOpen, Clock, ListChecks, Info, Layers, CheckCircle2 } from 'lucide-react'

type Props = {
  template: AssessmentTemplate
  open: boolean
  onClose: () => void
  onAssignClick?: (templateId: string) => void
}

export const AssessmentPreviewModal: React.FC<Props> = ({
  template,
  open,
  onClose,
  onAssignClick,
}) => {
  if (!open) return null

  // New schema-safe access
  const questions = Array.isArray((template as any)?.schema?.questions)
    ? (template as any).schema.questions
    : []

  const estimatedDuration: number | null =
    (template as any)?.schema?.meta?.estimated_duration_minutes ??
    (template as any)?.schema?.estimated_duration_minutes ??
    null

  const scoringMethod: string | null =
    (template as any)?.scoring?.method ??
    (template as any)?.schema?.scoring_config?.method ??
    null

  const category: string | null =
    (template as any)?.schema?.meta?.category ??
    (template as any)?.schema?.category ??
    null

  const previewQuestions = questions.slice(0, 5)
  const remaining = Math.max(0, questions.length - previewQuestions.length)

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-gray-900/50" onClick={onClose} />
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className="relative w-full max-w-3xl bg-white rounded-2xl shadow-xl border border-gray-200">
          {/* Header */}
          <div className="p-5 border-b border-gray-200 flex items-start justify-between">
            <div className="pr-6">
              {(category || template.abbreviation) && (
                <div className="flex items-center gap-2 text-gray-700 mb-1">
                  <BookOpen className="w-5 h-5 text-blue-600" />
                  {category && (
                    <span className="text-xs uppercase tracking-wide font-semibold">{category}</span>
                  )}
                </div>
              )}
              <h3 className="text-xl font-bold text-gray-900 leading-tight">
                {template.name}{' '}
                {template.abbreviation && (
                  <span className="text-gray-400 font-medium text-base">
                    ({template.abbreviation})
                  </span>
                )}
              </h3>
              {template.version && (
                <p className="text-xs text-gray-500 mt-0.5">Version {template.version}</p>
              )}
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          <div className="p-5 space-y-5 max-h-[70vh] overflow-y-auto">
            {/* Meta */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="flex items-center gap-2 p-3 rounded-lg border bg-white">
                <Clock className="w-4 h-4 text-blue-600" />
                <div className="text-sm">
                  <div className="text-gray-700 font-medium">Duration</div>
                  <div className="text-gray-500">
                    {estimatedDuration ? `~${estimatedDuration} min` : '—'}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 p-3 rounded-lg border bg-white">
                <ListChecks className="w-4 h-4 text-emerald-600" />
                <div className="text-sm">
                  <div className="text-gray-700 font-medium">Questions</div>
                  <div className="text-gray-500">{questions.length} items</div>
                </div>
              </div>
              <div className="flex items-center gap-2 p-3 rounded-lg border bg-white">
                <Layers className="w-4 h-4 text-purple-600" />
                <div className="text-sm">
                  <div className="text-gray-700 font-medium">Scoring</div>
                  <div className="text-gray-500 capitalize">
                    {scoringMethod ? scoringMethod.replace('_', ' ') : '—'}
                  </div>
                </div>
              </div>
            </div>

            {/* Description */}
            {(template as any)?.schema?.description && (
              <div className="p-4 rounded-lg border bg-gray-50">
                <div className="flex items-start gap-2">
                  <Info className="w-4 h-4 text-gray-600 mt-0.5" />
                  <p className="text-sm text-gray-700">
                    {(template as any).schema.description}
                  </p>
                </div>
              </div>
            )}

            {/* Sample Questions */}
            <div className="space-y-3">
              <h4 className="font-semibold text-gray-900">Sample Questions</h4>
              <div className="space-y-2">
                {previewQuestions.map((q: any, idx: number) => (
                  <div key={q.id ?? idx} className="p-3 border rounded-lg bg-white">
                    <div className="text-xs text-gray-500 mb-1">
                      {idx + 1}. <span className="uppercase">{q.type}</span>
                    </div>
                    <div className="text-sm text-gray-900">{q.text}</div>

                    {q.type === 'scale' && (
                      <div className="mt-2">
                        <div className="text-xs text-gray-500">
                          Scale: {(q.scale_min ?? q.min ?? 0)}–{(q.scale_max ?? q.max ?? 10)}
                        </div>
                        {Array.isArray(q.labels) && q.labels.length > 0 && (
                          <div className="text-xs text-gray-400">
                            Labels: {q.labels.slice(0, 5).join(' · ')}
                            {q.labels.length > 5 ? ' …' : ''}
                          </div>
                        )}
                      </div>
                    )}

                    {(q.type === 'single_choice' || q.type === 'multiple_choice' || q.type === 'multi_choice') &&
                     Array.isArray(q.options) && q.options.length > 0 && (
                      <div className="mt-2 text-xs text-gray-500">
                        Options: {q.options.slice(0, 5).map((o: any) => (typeof o === 'string' ? o : o?.label)).join(' · ')}
                        {q.options.length > 5 ? ' …' : ''}
                      </div>
                    )}
                  </div>
                ))}
                {remaining > 0 && (
                  <div className="text-xs text-gray-500 pl-1">+ {remaining} more…</div>
                )}
              </div>
            </div>

            {/* Interpretation Overview (if provided in schema/scoring) */}
            {Array.isArray((template as any)?.schema?.interpretation_rules?.ranges) &&
              (template as any).schema.interpretation_rules.ranges.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-semibold text-gray-900">Interpretation Ranges</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {(template as any).schema.interpretation_rules.ranges.slice(0, 6).map((r: any, i: number) => (
                    <div key={i} className="p-3 border rounded-lg bg-white">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        <div className="text-sm font-medium text-gray-900">
                          {r.label} ({r.min}–{r.max})
                        </div>
                      </div>
                      <div className="text-xs text-gray-600 mt-1">{r.description}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-gray-200 flex items-center justify-end gap-2">
            <button onClick={onClose} className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50">
              Close
            </button>
            {onAssignClick && (
              <button
                onClick={() => onAssignClick(template.id)}
                className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700"
              >
                Assign This Assessment
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
