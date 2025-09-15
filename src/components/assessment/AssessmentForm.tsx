iption: interpretation.description ?? null,
          clinical_significance: interpretation.clinical_significance ?? null,
          severity_level: interpretation.severity ?? interpretation.severity_level ?? null,
          recommendations: interpretation.recommendations ?? null,
          therapist_notes: null,
          auto_generated: true,
        }
        const { error: resErr } = await supabase
          .from('assessment_scores')
          .upsert(payload, { onConflict: 'instance_id' }) // ok even if no unique index; supabase will fall back to PK if any
        if (resErr) throw resErr
      }

      // Read back saved score (optional)
      const { data: scores, error: readErr } = await supabase
        .from('assessment_scores')
        .select(
          'id, instance_id, raw_score, interpretation_category, interpretation_description, clinical_significance, severity_level, recommendations, calculated_at'
        )
        .eq('instance_id', instance.id)
        .order('calculated_at', { ascending: false })
        .limit(1)
        .returns<ScoreRow[]>()

      if (readErr) throw readErr
      const s = scores?.[0]

      setCalculatedScore({
        raw,
        percentOfMax,
        interpretation: {
          category: s?.interpretation_category ?? interpretation.category,
          description: s?.interpretation_description ?? interpretation.description,
          clinical_significance: s?.clinical_significance ?? interpretation.clinical_significance,
          severity_level: s?.severity_level ?? interpretation.severity ?? interpretation.severity_level,
          recommendations: s?.recommendations ?? interpretation.recommendations,
        },
        subscales,
        narrative,
      })
      setShowResults(true)

      onComplete?.()
    } catch (e) {
      console.error('[AssessmentForm] complete error:', e)
      alert('Error completing assessment. Please try again.')
    } finally {
      setCompleting(false)
    }
  }

  if (!template) {
    return (
      <div className="text-center py-8">
        <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900">Template not found</h3>
        <p className="text-gray-600">The assessment template could not be loaded.</p>
      </div>
    )
  }

  if (showResults && calculatedScore) {
    return (
      <div className="space-y-6">
        {/* Summary card */}
        <div className="bg-green-50 border border-green-200 rounded-lg p-6">
          <div className="flex items-center space-x-3 mb-4">
            <CheckCircle className="w-8 h-8 text-green-600" />
            <div>
              <h3 className="text-xl font-semibold text-green-900">Assessment Complete</h3>
              <p className="text-green-700">{template?.name}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600">{calculatedScore.raw}</div>
              <div className="text-sm text-green-700">Raw Score</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600">
                {calculatedScore.percentOfMax ?? (template.scoring_config?.max_score
                  ? Math.round((calculatedScore.raw / Number(template.scoring_config.max_score)) * 100)
                  : 0)}%
              </div>
              <div className="text-sm text-blue-700">Percent of Max</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-purple-600">
                {calculatedScore.interpretation?.category}
              </div>
              <div className="text-sm text-purple-700">Interpretation</div>
            </div>
          </div>
        </div>

        {/* Interpretation */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
            <Brain className="w-5 h-5 mr-2 text-purple-600" />
            Clinical Interpretation
          </h4>
          <div className="space-y-3">
            <div>
              <span className="font-medium text-gray-700">Category: </span>
              <span className="text-gray-900">{calculatedScore.interpretation?.category || '—'}</span>
            </div>
            <div>
              <span className="font-medium text-gray-700">Description: </span>
              <span className="text-gray-900">{calculatedScore.interpretation?.description || '—'}</span>
            </div>
            {calculatedScore.interpretation?.clinical_significance && (
              <div>
                <span className="font-medium text-gray-700">Clinical significance: </span>
                <span className="text-gray-900">{calculatedScore.interpretation?.clinical_significance}</span>
              </div>
            )}
            {calculatedScore.interpretation?.severity_level && (
              <div>
                <span className="font-medium text-gray-700">Severity: </span>
                <span className="text-gray-900">{calculatedScore.interpretation?.severity_level}</span>
              </div>
            )}
            {calculatedScore.interpretation?.recommendations && (
              <div>
                <span className="font-medium text-gray-700">Recommendations: </span>
                <span className="text-gray-900">{calculatedScore.interpretation?.recommendations}</span>
              </div>
            )}
          </div>
        </div>

        {/* Printable Report */}
        <AssessmentReport
          template={template}
          instance={instance}
          score={{
            raw: calculatedScore.raw,
            percentOfMax: calculatedScore.percentOfMax,
            interpretation: calculatedScore.interpretation,
            subscales: calculatedScore.subscales,
            narrative: calculatedScore.narrative,
          }}
        />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{template.name}</h2>
            <p className="text-gray-600 mt-1">{template.description}</p>
            <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500">
              <span className="flex items-center">
                <Clock className="w-4 h-4 mr-1" />
                ~{template.estimated_duration_minutes} minutes
              </span>
              <span>{template.questions.length} questions</span>
            </div>
          </div>
          <div
            className={`inline-flex px-3 py-1 text-sm font-medium rounded-full ${
              instance.status === 'completed'
                ? 'text-green-600 bg-green-100'
                : instance.status === 'in_progress'
                ? 'text-blue-600 bg-blue-100'
                : 'text-gray-600 bg-gray-100'
            }`}
          >
            <div className="flex items-center space-x-1">
              {instance.status === 'completed' ? <CheckCircle className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
              <span className="capitalize">{String(instance.status).replace('_', ' ')}</span>
            </div>
          </div>
        </div>

        {instance.instructions && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-blue-800">{instance.instructions}</p>
          </div>
        )}
      </div>

      {/* Validation Errors */}
      {validationErrors.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-start space-x-2">
            <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5" />
            <div>
              <h4 className="font-medium text-red-900">Please complete all required questions</h4>
              <ul className="text-sm text-red-800 mt-1 list-disc list-inside">
                {validationErrors.map((questionId) => {
                  const q = template?.questions.find((qq: any) => qq.id === questionId)
                  return <li key={questionId}>{q?.text || `Question ${questionId}`}</li>
                })}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Renderer */}
      <AssessmentRenderer
        template={template}
        responses={responses}
        onResponse={handleResponse}
        readonly={readonly}
        currentQuestion={showNavigation ? currentQuestion : undefined}
        onQuestionChange={showNavigation ? setCurrentQuestion : undefined}
      />

      {/* Actions */}
      {!readonly && instance.status !== 'completed' && (
        <div className="flex justify-between items-center bg-white border border-gray-200 rounded-lg p-4">
          <div className="text-sm text-gray-600">Progress: {progressPct}% complete</div>
          <div className="flex space-x-3">
            <button
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
            >
              {saving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600 mr-2"></div>
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Save Progress
                </>
              )}
            </button>

            <button
              onClick={handleComplete}
              disabled={!isFormComplete || completing}
              className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {completing ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Completing...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Complete Assessment
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {instance.status === 'completed' && (
        <div className="flex justify-center space-x-3 bg-white border border-gray-200 rounded-lg p-4">
          <button
            onClick={() => setShowResults(!showResults)}
            className="inline-flex items-center px-4 py-2 text-sm font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100"
          >
            <BarChart3 className="w-4 h-4 mr-2" />
            {showResults ? 'Hide Results' : 'View Results'}
          </button>
        </div>
      )}
    </div>
  )
}
