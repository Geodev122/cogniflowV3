import React, { useState, useEffect } from 'react'
import { AssessmentTemplate, AssessmentQuestion, AssessmentRendererProps } from '../../types/assessment'
import { ChevronLeft, ChevronRight, CheckCircle, AlertTriangle, Clock } from 'lucide-react'

export const AssessmentRenderer: React.FC<AssessmentRendererProps> = ({
  template,
  responses,
  onResponse,
  readonly = false,
  currentQuestion = 0,
  onQuestionChange
}) => {
  const [localCurrentQuestion, setLocalCurrentQuestion] = useState(currentQuestion)

  useEffect(() => {
    setLocalCurrentQuestion(currentQuestion)
  }, [currentQuestion])

  const handleQuestionChange = (newIndex: number) => {
    setLocalCurrentQuestion(newIndex)
    onQuestionChange?.(newIndex)
  }

  const renderQuestion = (question: AssessmentQuestion) => {
    const response = responses[question.id]

    switch (question.type) {
      case 'scale':
        return renderScaleQuestion(question, response)
      case 'multiple_choice':
        return renderMultipleChoiceQuestion(question, response)
      case 'single_choice':
        return renderSingleChoiceQuestion(question, response)
      case 'text':
        return renderTextQuestion(question, response)
      case 'textarea':
        return renderTextareaQuestion(question, response)
      case 'boolean':
        return renderBooleanQuestion(question, response)
      default:
        return <div className="text-red-500">Unsupported question type: {question.type}</div>
    }
  }

  const renderScaleQuestion = (question: AssessmentQuestion, response: any) => {
    const min = question.scale_min || 0
    const max = question.scale_max || 10
    const labels = question.labels || []

    return (
      <div className="space-y-4">
        {/* Scale Labels */}
        {labels.length > 0 && (
          <div className="flex justify-between items-center text-sm text-gray-600">
            <span>{labels[0]}</span>
            {labels.length > 2 && <span>{labels[Math.floor(labels.length / 2)]}</span>}
            <span>{labels[labels.length - 1]}</span>
          </div>
        )}

        {/* Scale Options */}
        <div className="flex justify-between items-center space-x-2">
          {Array.from({ length: max - min + 1 }, (_, i) => {
            const value = min + i
            const isSelected = response === value
            const label = labels[i] || value.toString()

            return (
              <div key={value} className="flex flex-col items-center space-y-2">
                <button
                  onClick={() => !readonly && onResponse(question.id, value)}
                  disabled={readonly}
                  className={`w-12 h-12 rounded-full border-2 font-medium transition-all ${
                    isSelected
                      ? 'bg-blue-600 text-white border-blue-600 shadow-lg scale-110'
                      : 'bg-white text-gray-700 border-gray-300 hover:border-blue-400 hover:shadow-md'
                  } ${readonly ? 'opacity-60 cursor-not-allowed' : 'hover:scale-105'}`}
                >
                  {value}
                </button>
                {labels.length > 0 && (
                  <span className="text-xs text-gray-500 text-center max-w-16 leading-tight">
                    {label}
                  </span>
                )}
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  const renderMultipleChoiceQuestion = (question: AssessmentQuestion, response: any) => {
    const options = question.options || []

    return (
      <div className="space-y-3">
        {options.map((option, index) => {
          const isSelected = Array.isArray(response) ? response.includes(index) : response === index

          return (
            <button
              key={index}
              onClick={() => {
                if (readonly) return
                
                if (Array.isArray(response)) {
                  // Multiple selection
                  const newResponse = isSelected 
                    ? response.filter(r => r !== index)
                    : [...response, index]
                  onResponse(question.id, newResponse)
                } else {
                  // Single selection
                  onResponse(question.id, index)
                }
              }}
              disabled={readonly}
              className={`w-full p-4 text-left rounded-lg border-2 transition-all ${
                isSelected
                  ? 'bg-blue-50 border-blue-500 text-blue-900'
                  : 'bg-white border-gray-200 hover:border-blue-300'
              } ${readonly ? 'opacity-60 cursor-not-allowed' : 'hover:shadow-sm'}`}
            >
              <div className="flex items-center space-x-3">
                <div className={`w-4 h-4 rounded border-2 flex items-center justify-center ${
                  isSelected ? 'bg-blue-500 border-blue-500' : 'border-gray-300'
                }`}>
                  {isSelected && (
                    <CheckCircle className="w-3 h-3 text-white" />
                  )}
                </div>
                <span className="flex-1">{option}</span>
              </div>
            </button>
          )
        })}
      </div>
    )
  }

  const renderSingleChoiceQuestion = (question: AssessmentQuestion, response: any) => {
    const options = question.options || []

    return (
      <div className="space-y-3">
        {options.map((option, index) => {
          const isSelected = response === index

          return (
            <button
              key={index}
              onClick={() => !readonly && onResponse(question.id, index)}
              disabled={readonly}
              className={`w-full p-4 text-left rounded-lg border-2 transition-all ${
                isSelected
                  ? 'bg-blue-50 border-blue-500 text-blue-900'
                  : 'bg-white border-gray-200 hover:border-blue-300'
              } ${readonly ? 'opacity-60 cursor-not-allowed' : 'hover:shadow-sm'}`}
            >
              <div className="flex items-center space-x-3">
                <div className={`w-4 h-4 rounded-full border-2 ${
                  isSelected ? 'bg-blue-500 border-blue-500' : 'border-gray-300'
                }`}>
                  {isSelected && (
                    <div className="w-full h-full rounded-full bg-white scale-50"></div>
                  )}
                </div>
                <span className="flex-1">{option}</span>
              </div>
            </button>
          )
        })}
      </div>
    )
  }

  const renderTextQuestion = (question: AssessmentQuestion, response: any) => (
    <input
      type="text"
      value={response || ''}
      onChange={(e) => !readonly && onResponse(question.id, e.target.value)}
      disabled={readonly}
      placeholder="Type your response here..."
      className="w-full p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-60 disabled:cursor-not-allowed"
    />
  )

  const renderTextareaQuestion = (question: AssessmentQuestion, response: any) => (
    <textarea
      value={response || ''}
      onChange={(e) => !readonly && onResponse(question.id, e.target.value)}
      disabled={readonly}
      placeholder="Type your response here..."
      className="w-full p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-60 disabled:cursor-not-allowed"
      rows={4}
    />
  )

  const renderBooleanQuestion = (question: AssessmentQuestion, response: any) => (
    <div className="flex space-x-4">
      <button
        onClick={() => !readonly && onResponse(question.id, true)}
        disabled={readonly}
        className={`flex-1 p-4 rounded-lg border-2 transition-all ${
          response === true
            ? 'bg-green-50 border-green-500 text-green-900'
            : 'bg-white border-gray-200 hover:border-green-300'
        } ${readonly ? 'opacity-60 cursor-not-allowed' : ''}`}
      >
        Yes
      </button>
      <button
        onClick={() => !readonly && onResponse(question.id, false)}
        disabled={readonly}
        className={`flex-1 p-4 rounded-lg border-2 transition-all ${
          response === false
            ? 'bg-red-50 border-red-500 text-red-900'
            : 'bg-white border-gray-200 hover:border-red-300'
        } ${readonly ? 'opacity-60 cursor-not-allowed' : ''}`}
      >
        No
      </button>
    </div>
  )

  const currentQuestionData = template.questions[localCurrentQuestion]
  const totalQuestions = template.questions.length
  const completedQuestions = template.questions.filter(q => 
    responses[q.id] !== undefined && responses[q.id] !== null
  ).length

  if (!currentQuestionData) {
    return (
      <div className="text-center py-8">
        <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900">Question not found</h3>
        <p className="text-gray-600">The requested question could not be loaded.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Progress Bar */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm text-gray-600">
          <span>Question {localCurrentQuestion + 1} of {totalQuestions}</span>
          <span>{completedQuestions}/{totalQuestions} completed</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${((localCurrentQuestion + 1) / totalQuestions) * 100}%` }}
          />
        </div>
      </div>

      {/* Question */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="mb-6">
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {currentQuestionData.text}
          </h3>
          {currentQuestionData.required !== false && (
            <span className="text-sm text-red-500">* Required</span>
          )}
        </div>

        {renderQuestion(currentQuestionData)}
      </div>

      {/* Navigation */}
      <div className="flex justify-between items-center">
        <button
          onClick={() => handleQuestionChange(Math.max(0, localCurrentQuestion - 1))}
          disabled={localCurrentQuestion === 0}
          className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <ChevronLeft className="w-4 h-4 mr-1" />
          Previous
        </button>

        {/* Question Indicators */}
        <div className="flex space-x-1">
          {template.questions.map((_, index) => (
            <button
              key={index}
              onClick={() => handleQuestionChange(index)}
              className={`w-3 h-3 rounded-full transition-all ${
                index === localCurrentQuestion
                  ? 'bg-blue-600 scale-125'
                  : responses[template.questions[index].id] !== undefined
                  ? 'bg-green-400'
                  : 'bg-gray-300'
              }`}
              title={`Question ${index + 1}${responses[template.questions[index].id] !== undefined ? ' (answered)' : ''}`}
            />
          ))}
        </div>

        <button
          onClick={() => handleQuestionChange(Math.min(totalQuestions - 1, localCurrentQuestion + 1))}
          disabled={localCurrentQuestion === totalQuestions - 1}
          className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Next
          <ChevronRight className="w-4 h-4 ml-1" />
        </button>
      </div>
    </div>
  )
}