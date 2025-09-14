import React, { useEffect, useMemo, useRef, useState } from 'react'
import { AssessmentRendererProps, AssessmentQuestion } from '../../types/assessment'
import { ChevronLeft, ChevronRight, CheckCircle, AlertTriangle } from 'lucide-react'

type Opt = string | { label: string; value: any }

// Normalize an option for display/value extraction
const optLabel = (o: Opt) => (typeof o === 'string' ? o : o.label)
const optValue = (o: Opt, index: number) => (typeof o === 'string' ? index : (o as any).value ?? index)

export const AssessmentRenderer: React.FC<AssessmentRendererProps> = ({
  template,
  responses,
  onResponse,
  readonly = false,
  currentQuestion = 0,
  onQuestionChange,
}) => {
  const [localIdx, setLocalIdx] = useState(currentQuestion)
  const containerRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => setLocalIdx(currentQuestion), [currentQuestion])

  const total = template.questions.length
  const answeredCount = useMemo(
    () => template.questions.filter(q => responses[q.id] !== undefined && responses[q.id] !== null && `${responses[q.id]}` !== '').length,
    [responses, template.questions]
  )
  const progressPct = total > 0 ? Math.round((answeredCount / total) * 100) : 0

  const go = (i: number) => {
    const clamped = Math.max(0, Math.min(total - 1, i))
    setLocalIdx(clamped)
    onQuestionChange?.(clamped)
    // focus container after navigation
    setTimeout(() => containerRef.current?.focus(), 0)
  }

  const prev = () => go(localIdx - 1)
  const next = () => go(localIdx + 1)

  // Keyboard navigation
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (readonly) return
      if (e.key === 'ArrowLeft') prev()
      if (e.key === 'ArrowRight' || e.key === 'Enter') {
        if (e.shiftKey) prev()
        else next()
      }
      // Quick numeric entry for scale/likert/slider (1..9/0)
      const q = template.questions[localIdx]
      if (!q) return
      if (['scale', 'likert', 'slider'].includes(q.type)) {
        const n = Number(e.key)
        if (!Number.isNaN(n)) {
          const min = q.scale_min ?? q.min ?? 0
          const max = q.scale_max ?? q.max ?? 10
          // allow 0 to map to max if max=10
          let val = n
          if (n === 0 && max === 10) val = 10
          if (val >= min && val <= max) {
            onResponse(q.id, val)
          }
        }
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [localIdx, readonly, template.questions, onResponse])

  const q = template.questions[localIdx]
  const completedIds = new Set(
    template.questions.filter(qq => responses[qq.id] !== undefined && responses[qq.id] !== null && `${responses[qq.id]}` !== '').map(qq => qq.id)
  )

  if (!q) {
    return (
      <div className="text-center py-8">
        <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900">Question not found</h3>
        <p className="text-gray-600">The requested question could not be loaded.</p>
      </div>
    )
  }

  /* -------------------------------------------------------------------------- */
  /*                               Render helpers                               */
  /* -------------------------------------------------------------------------- */

  const renderScale = (question: AssessmentQuestion, response: any) => {
    const min = question.scale_min ?? question.min ?? 0
    const max = question.scale_max ?? question.max ?? 10
    const labels = question.labels ?? []
    return (
      <div className="space-y-4">
        {labels.length > 0 && (
          <div className="flex justify-between items-center text-sm text-gray-600">
            <span>{labels[0]}</span>
            {labels.length > 2 && <span>{labels[Math.floor(labels.length / 2)]}</span>}
            <span>{labels[labels.length - 1]}</span>
          </div>
        )}
        <div className="flex justify-between items-center gap-2">
          {Array.from({ length: max - min + 1 }, (_, i) => {
            const value = min + i
            const isSelected = response === value
            return (
              <button
                key={value}
                type="button"
                onClick={() => !readonly && onResponse(question.id, value)}
                disabled={readonly}
                className={`w-11 h-11 rounded-full border-2 text-sm font-medium transition-all ${
                  isSelected
                    ? 'bg-blue-600 text-white border-blue-600 shadow-md scale-110'
                    : 'bg-white text-gray-700 border-gray-300 hover:border-blue-400 hover:shadow-sm'
                } ${readonly ? 'opacity-60 cursor-not-allowed' : 'hover:scale-105'}`}
                aria-pressed={isSelected}
                aria-label={`Choose ${value}`}
              >
                {value}
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  const renderLikert = (question: AssessmentQuestion, response: any) => {
    const options: Opt[] = question.options ?? ['Strongly disagree', 'Disagree', 'Neutral', 'Agree', 'Strongly agree']
    return (
      <div className="grid grid-cols-1 sm:grid-cols-5 gap-2">
        {options.map((o, idx) => {
          const val = optValue(o, idx)
          const selected = response === val || response === idx
          return (
            <button
              key={idx}
              type="button"
              onClick={() => !readonly && onResponse(question.id, val)}
              disabled={readonly}
              className={`p-3 rounded-lg border-2 text-sm transition-all ${
                selected ? 'bg-blue-50 border-blue-500 text-blue-900' : 'bg-white border-gray-200 hover:border-blue-300'
              } ${readonly ? 'opacity-60 cursor-not-allowed' : 'hover:shadow-sm'}`}
              aria-pressed={selected}
            >
              {optLabel(o)}
            </button>
          )
        })}
      </div>
    )
  }

  const renderSingle = (question: AssessmentQuestion, response: any) => {
    const options: Opt[] = question.options ?? []
    return (
      <div className="space-y-3">
        {options.map((o, idx) => {
          const val = optValue(o, idx)
          const selected = response === val || response === idx
          return (
            <button
              key={idx}
              type="button"
              onClick={() => !readonly && onResponse(question.id, val)}
              disabled={readonly}
              className={`w-full p-4 text-left rounded-lg border-2 transition-all ${
                selected ? 'bg-blue-50 border-blue-500 text-blue-900' : 'bg-white border-gray-200 hover:border-blue-300'
              } ${readonly ? 'opacity-60 cursor-not-allowed' : 'hover:shadow-sm'}`}
              aria-pressed={selected}
            >
              <div className="flex items-center gap-3">
                <span
                  className={`inline-block w-4 h-4 rounded-full border-2 ${
                    selected ? 'bg-blue-500 border-blue-500' : 'border-gray-300'
                  }`}
                />
                <span className="flex-1">{optLabel(o)}</span>
              </div>
            </button>
          )
        })}
      </div>
    )
  }

  const renderMulti = (question: AssessmentQuestion, response: any) => {
    const options: Opt[] = question.options ?? []
    const selectedSet = new Set(
      Array.isArray(response) ? response : (response == null ? [] : [response])
    )

    const toggle = (idx: number) => {
      if (readonly) return
      const val = optValue(options[idx], idx)
      const asValues = Array.isArray(response) ? [...response] : []
      const present = asValues.some(v => v === val || v === idx)
      const next = present ? asValues.filter(v => !(v === val || v === idx)) : [...asValues, val]
      onResponse(question.id, next)
    }

    return (
      <div className="space-y-3">
        {options.map((o, idx) => {
          const val = optValue(o, idx)
          const selected = Array.isArray(response)
            ? response.some(v => v === val || v === idx)
            : selectedSet.has(idx) || selectedSet.has(val)

          return (
            <button
              key={idx}
              type="button"
              onClick={() => toggle(idx)}
              disabled={readonly}
              className={`w-full p-4 text-left rounded-lg border-2 transition-all ${
                selected ? 'bg-blue-50 border-blue-500 text-blue-900' : 'bg-white border-gray-200 hover:border-blue-300'
              } ${readonly ? 'opacity-60 cursor-not-allowed' : 'hover:shadow-sm'}`}
              aria-pressed={selected}
            >
              <div className="flex items-center gap-3">
                <span
                  className={`inline-flex items-center justify-center w-4 h-4 rounded border-2 ${
                    selected ? 'bg-blue-500 border-blue-500' : 'border-gray-300'
                  }`}
                >
                  {selected && <CheckCircle className="w-3 h-3 text-white" />}
                </span>
                <span className="flex-1">{optLabel(o)}</span>
              </div>
            </button>
          )
        })}
      </div>
    )
  }

  const renderText = (question: AssessmentQuestion, response: any) => (
    <input
      type="text"
      value={response ?? ''}
      onChange={e => !readonly && onResponse(question.id, e.target.value)}
      disabled={readonly}
      placeholder={question.placeholder ?? 'Type your response…'}
      className="w-full p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-60 disabled:cursor-not-allowed"
    />
  )

  const renderTextarea = (question: AssessmentQuestion, response: any) => (
    <textarea
      value={response ?? ''}
      onChange={e => !readonly && onResponse(question.id, e.target.value)}
      disabled={readonly}
      placeholder={question.placeholder ?? 'Type your response…'}
      className="w-full p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-60 disabled:cursor-not-allowed"
      rows={question.rows ?? 4}
    />
  )

  const renderBoolean = (question: AssessmentQuestion, response: any) => (
    <div className="flex gap-3">
      <button
        type="button"
        onClick={() => !readonly && onResponse(question.id, true)}
        disabled={readonly}
        className={`flex-1 p-4 rounded-lg border-2 transition-all ${
          response === true ? 'bg-green-50 border-green-500 text-green-900' : 'bg-white border-gray-200 hover:border-green-300'
        } ${readonly ? 'opacity-60 cursor-not-allowed' : ''}`}
        aria-pressed={response === true}
      >
        Yes
      </button>
      <button
        type="button"
        onClick={() => !readonly && onResponse(question.id, false)}
        disabled={readonly}
        className={`flex-1 p-4 rounded-lg border-2 transition-all ${
          response === false ? 'bg-red-50 border-red-500 text-red-900' : 'bg-white border-gray-200 hover:border-red-300'
        } ${readonly ? 'opacity-60 cursor-not-allowed' : ''}`}
        aria-pressed={response === false}
      >
        No
      </button>
    </div>
  )

  const renderNumber = (question: AssessmentQuestion, response: any) => (
    <input
      type="number"
      value={response ?? ''}
      onChange={e => !readonly && onResponse(question.id, e.target.value === '' ? null : Number(e.target.value))}
      min={question.min ?? undefined}
      max={question.max ?? undefined}
      step={question.step ?? 1}
      disabled={readonly}
      placeholder={question.placeholder ?? 'Enter a number…'}
      className="w-full p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-60 disabled:cursor-not-allowed"
    />
  )

  const renderDate = (question: AssessmentQuestion, response: any) => (
    <input
      type="date"
      value={response ?? ''}
      onChange={e => !readonly && onResponse(question.id, e.target.value || null)}
      min={question.min ?? undefined}
      max={question.max ?? undefined}
      disabled={readonly}
      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-60 disabled:cursor-not-allowed"
    />
  )

  const renderTime = (question: AssessmentQuestion, response: any) => (
    <input
      type="time"
      value={response ?? ''}
      onChange={e => !readonly && onResponse(question.id, e.target.value || null)}
      disabled={readonly}
      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-60 disabled:cursor-not-allowed"
    />
  )

  const renderSlider = (question: AssessmentQuestion, response: any) => {
    const min = question.min ?? question.scale_min ?? 0
    const max = question.max ?? question.scale_max ?? 10
    const step = question.step ?? 1
    const val = typeof response === 'number' ? response : min
    return (
      <div className="space-y-3">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={val}
          onChange={e => !readonly && onResponse(question.id, Number(e.target.value))}
          disabled={readonly}
          className="w-full accent-blue-600"
        />
        <div className="text-sm text-gray-700">Selected: <span className="font-medium">{val}</span></div>
      </div>
    )
  }

  const renderQuestion = (question: AssessmentQuestion) => {
    const r = responses[question.id]
    switch (question.type) {
      case 'scale':
        return renderScale(question, r)
      case 'likert':
        return renderLikert(question, r)
      case 'slider':
        return renderSlider(question, r)
      case 'multi_choice':
      case 'multiple_choice': // backward compat
        return renderMulti(question, r)
      case 'single_choice':
        return renderSingle(question, r)
      case 'number':
        return renderNumber(question, r)
      case 'date':
        return renderDate(question, r)
      case 'time':
        return renderTime(question, r)
      case 'text':
        return renderText(question, r)
      case 'textarea':
        return renderTextarea(question, r)
      case 'boolean':
        return renderBoolean(question, r)
      default:
        return <div className="text-red-500">Unsupported question type: {question.type}</div>
    }
  }

  /* -------------------------------------------------------------------------- */
  /*                                     UI                                     */
  /* -------------------------------------------------------------------------- */

  return (
    <div className="space-y-6" ref={containerRef} tabIndex={-1}>
      {/* Progress */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm text-gray-600">
          <span>Question {localIdx + 1} of {total}</span>
          <span>{answeredCount}/{total} answered · {progressPct}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      {/* Question Card */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-gray-900">{q.text}</h3>
          <div className="mt-1 flex items-center gap-2">
            {q.required !== false && <span className="text-sm text-red-500">* Required</span>}
            {q.help_text && <span className="text-xs text-gray-500">{q.help_text}</span>}
          </div>
        </div>

        {renderQuestion(q)}
      </div>

      {/* Navigation */}
      <div className="flex justify-between items-center">
        <button
          type="button"
          onClick={prev}
          disabled={localIdx === 0}
          className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <ChevronLeft className="w-4 h-4 mr-1" />
          Previous
        </button>

        {/* Dots */}
        <div className="flex flex-wrap gap-1 justify-center">
          {template.questions.map((qq, idx) => {
            const isCurrent = idx === localIdx
            const answered = completedIds.has(qq.id)
            return (
              <button
                key={qq.id}
                type="button"
                onClick={() => go(idx)}
                className={`w-3 h-3 rounded-full transition-all ${
                  isCurrent ? 'bg-blue-600 scale-125' : answered ? 'bg-green-500' : 'bg-gray-300'
                }`}
                title={`Question ${idx + 1}${answered ? ' (answered)' : ''}`}
                aria-label={`Go to question ${idx + 1}`}
              />
            )
          })}
        </div>

        <button
          type="button"
          onClick={next}
          disabled={localIdx === total - 1}
          className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Next
          <ChevronRight className="w-4 h-4 ml-1" />
        </button>
      </div>
    </div>
  )
}
