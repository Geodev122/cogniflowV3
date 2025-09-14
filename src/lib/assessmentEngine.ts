import {
  AssessmentTemplate,
  AssessmentInstance,
  ReminderFrequency,
  AssessmentOption,
} from '../types/assessment'

/**
 * Assessment Scoring Engine
 * Handles dynamic scoring and interpretation for all psychometric assessments
 */
export class AssessmentScoringEngine {
  private template: AssessmentTemplate
  private responses: Record<string, any>

  constructor(template: AssessmentTemplate, responses: Record<string, any>) {
    this.template = template
    this.responses = responses
  }

  /**
   * Calculate raw score based on scoring method
   */
  calculateRawScore(): number {
    const { scoring_config } = this.template
    let rawScore = 0

    switch (scoring_config.method) {
      case 'sum':
        rawScore = this.calculateSumScore()
        break
      case 'average':
        rawScore = this.calculateAverageScore()
        break
      case 'weighted_sum':
        rawScore = this.calculateWeightedScore()
        break
      case 'custom':
        rawScore = this.calculateCustomScore()
        break
      default:
        throw new Error(`Unsupported scoring method: ${String(scoring_config.method)}`)
    }

    return Math.round(rawScore * 100) / 100 // 2 dp
  }

  /* -------------------------
     Normalization helpers
  ------------------------- */

  /** Get numeric bounds for a question (scale/slider/number). */
  private getBounds(q: any): { min?: number; max?: number } {
    // prefer explicit min/max; fallback to scale_min/max
    const min = q.min ?? q.scale_min
    const max = q.max ?? q.scale_max
    return { min, max }
  }

  /** If options are objects, return their `value[]`; if strings, return indices. */
  private getOptionIndexFromValue(qOptions: AssessmentOption[] | undefined, value: any): number | undefined {
    if (!qOptions) return undefined
    // object options: {label, value}
    if (qOptions.length > 0 && typeof qOptions[0] === 'object') {
      const idx = (qOptions as { label: string; value: any }[]).findIndex(o => o.value === value)
      return idx >= 0 ? idx : undefined
    }
    // string options: match by string value
    if (typeof value === 'string') {
      const idx = (qOptions as string[]).findIndex(o => o === value)
      return idx >= 0 ? idx : undefined
    }
    // if already number, assume it's an index
    if (typeof value === 'number') return value
    return undefined
  }

  /** Normalize any response to a numeric value suitable for scoring, or `undefined` if not numeric. */
  private normalizeNumeric(question: any, response: any): number | undefined {
    if (response === undefined || response === null) return undefined

    switch (question.type) {
      case 'scale':
      case 'likert':
      case 'slider':
      case 'number': {
        const num =
          typeof response === 'number' ? response : Number.parseFloat(response as any)
        if (Number.isNaN(num)) return undefined
        let val = num
        // reverse scoring
        const { min, max } = this.getBounds(question)
        if (question.reverse_scored && max !== undefined) {
          const lo = (min ?? 0)
          val = (max - num) + lo
        }
        return val
      }

      case 'boolean': {
        return response === true ? 1 : response === false ? 0 : undefined
      }

      case 'single_choice': {
        // allow value or index
        const idx = this.getOptionIndexFromValue(question.options, response)
        if (idx === undefined) return undefined
        // store as 0-based; scoring usually expects 0..n or 1..n — we keep 0..n and let ranges be authored accordingly
        let val = idx
        // reverse scoring using bounds inferred from options length
        if (question.reverse_scored && question.options && question.options.length > 0) {
          const max = question.options.length - 1
          val = max - idx
        }
        return val
      }

      case 'multiple_choice':
      case 'multi_choice': {
        // if array of values/indices: sum their normalized numeric equivalents (common practice)
        if (!Array.isArray(response)) return undefined
        let total = 0
        for (const sel of response) {
          const idx = this.getOptionIndexFromValue(question.options, sel)
          if (idx !== undefined) total += idx
        }
        // reverse scoring (rare for MCQ); treat as if reversing each selection relative to max index
        if (question.reverse_scored && question.options && question.options.length > 0) {
          const max = question.options.length - 1
          total = response.reduce((acc, sel) => {
            const idx = this.getOptionIndexFromValue(question.options, sel)
            return acc + (idx !== undefined ? (max - idx) : 0)
          }, 0)
        }
        return total
      }

      case 'text':
      case 'textarea':
      case 'date':
      case 'time': {
        // Not inherently numeric; score only if weighted_items explicitly includes this id, in which case coerce number if possible.
        const num = typeof response === 'number' ? response : Number.parseFloat(response as any)
        return Number.isNaN(num) ? undefined : num
      }

      default:
        return undefined
    }
  }

  /* -------------------------
     Scoring methods
  ------------------------- */

  private calculateSumScore(): number {
    let sum = 0
    for (const q of this.template.questions) {
      const val = this.normalizeNumeric(q, this.responses[q.id])
      if (typeof val === 'number') sum += val
    }
    return sum
  }

  private calculateAverageScore(): number {
    let sum = 0
    let count = 0
    for (const q of this.template.questions) {
      const val = this.normalizeNumeric(q, this.responses[q.id])
      if (typeof val === 'number') {
        sum += val
        count++
      }
    }
    return count > 0 ? sum / count : 0
  }

  private calculateWeightedScore(): number {
    let weighted = 0
    const weights = this.template.scoring_config.weighted_items || {}
    for (const q of this.template.questions) {
      const val = this.normalizeNumeric(q, this.responses[q.id])
      if (typeof val === 'number') {
        const w = typeof weights[q.id] === 'number' ? weights[q.id] : 1
        weighted += val * w
      }
    }
    return weighted
  }

  /** Custom scoring hook — author a simple keyword in `scoring_config.custom_logic`; falls back to sum. */
  private calculateCustomScore(): number {
    const logic = (this.template.scoring_config.custom_logic || '').trim().toLowerCase()
    if (logic === 'average') return this.calculateAverageScore()
    if (logic === 'weighted_sum') return this.calculateWeightedScore()
    // Fallback
    return this.calculateSumScore()
  }

  /**
   * Calculate subscale scores
   */
  calculateSubscaleScores(): Record<string, number> {
    const subscales = this.template.scoring_config.subscales || []
    const subscaleScores: Record<string, number> = {}

    for (const sub of subscales) {
      let subtotal = 0
      for (const itemId of sub.items) {
        const q = this.template.questions.find(qq => qq.id === itemId)
        if (!q) continue
        const val = this.normalizeNumeric(q, this.responses[itemId])
        if (typeof val === 'number') subtotal += val
      }
      subscaleScores[sub.name] = subtotal
    }

    return subscaleScores
  }

  /**
   * Get interpretation based on score
   */
  getInterpretation(score: number) {
    const ranges = this.template.interpretation_rules?.ranges || []
    const match = ranges.find(r => score >= r.min && score <= r.max)

    if (!match) {
      return {
        category: 'Unknown',
        description: 'Score interpretation not available',
        severity: 'unknown',
        clinical_significance: 'unknown',
        recommendations: 'Consult with the treating clinician.',
      }
    }

    return {
      category: match.label,
      description: match.description,
      severity: match.severity,
      clinical_significance: match.clinical_significance,
      recommendations: match.recommendations,
    }
  }

  /**
   * Check for clinical alerts
   */
  checkClinicalAlerts(score: number): Array<{
    type: 'info' | 'warning' | 'critical'
    message: string
    action_required: boolean
  }> {
    const alerts: Array<{
      type: 'info' | 'warning' | 'critical'
      message: string
      action_required: boolean
    }> = []

    const cutoffs = this.template.clinical_cutoffs || {}

    // Clinical cutoff
    if (typeof cutoffs.clinical_cutoff === 'number' && score >= cutoffs.clinical_cutoff) {
      alerts.push({
        type: 'warning',
        message: `Score exceeds clinical cutoff (${cutoffs.clinical_cutoff}). Consider further evaluation.`,
        action_required: true,
      })
    }

    // Suicide risk item threshold
    if (cutoffs.suicide_risk_item && typeof cutoffs.suicide_risk_threshold === 'number') {
      const val = this.normalizeNumeric(
        this.template.questions.find(q => q.id === cutoffs.suicide_risk_item),
        this.responses[cutoffs.suicide_risk_item]
      )
      if (typeof val === 'number' && val >= cutoffs.suicide_risk_threshold) {
        alerts.push({
          type: 'critical',
          message: 'Suicide risk indicated. Immediate safety assessment required.',
          action_required: true,
        })
      }
    }

    // Custom alert conditions (safe parser)
    const custom = this.template.interpretation_rules?.clinical_alerts || []
    for (const a of custom) {
      if (this.safeEvalScoreCondition(a.condition, score)) {
        alerts.push({
          type: a.severity,
          message: a.message,
          action_required: a.action_required,
        })
      }
    }

    return alerts
  }

  /** Safe evaluator for expressions like: "score >= 10", "score < 5" */
  private safeEvalScoreCondition(cond: string, score: number): boolean {
    if (!cond) return false
    const normalized = cond.replace(/\s+/g, '')

    // support operators in this order to avoid partial matches
    const ops = ['>=', '<=', '>', '<', '==', '!='] as const
    for (const op of ops) {
      const parts = normalized.split(op)
      if (parts.length === 2) {
        const [lhs, rhs] = parts
        if (lhs !== 'score') return false
        const rhsNum = Number(rhs)
        if (Number.isNaN(rhsNum)) return false
        switch (op) {
          case '>=': return score >= rhsNum
          case '<=': return score <= rhsNum
          case '>':  return score > rhsNum
          case '<':  return score < rhsNum
          case '==': return score === rhsNum
          case '!=': return score !== rhsNum
        }
      }
    }
    return false
  }

  /**
   * Generate narrative report (generic; no instrument-specific hardcoding)
   */
  generateNarrativeReport(score: number, interpretation: any): string {
    const date = new Date().toLocaleDateString()
    const max = this.template.scoring_config?.max_score ?? 0
    const percentile = max > 0 ? Math.round((score / max) * 100) : 0

    let report = `Assessment: ${this.template.name} (${this.template.abbreviation})\n`
    report += `Date: ${date}\n`
    report += `Score: ${score}/${max} (${percentile}%)\n`
    report += `Interpretation: ${interpretation.category}\n\n`

    report += `Clinical Summary:\n`
    report += `The client completed the ${this.template.name}. `
    report += `The score of ${score} falls within the "${interpretation.category}" range, `
    report += `which is described as: ${interpretation.description}.\n\n`

    report += `Recommendations:\n${interpretation.recommendations}`

    return report
  }

  /**
   * Validate responses completeness & basic constraints
   */
  validateResponses(): {
    isComplete: boolean
    missingQuestions: string[]
    invalidResponses: string[]
  } {
    const missing: string[] = []
    const invalid: string[] = []

    for (const q of this.template.questions) {
      const r = this.responses[q.id]

      // required
      if (q.required !== false && (r === undefined || r === null || r === '')) {
        missing.push(q.id)
        continue
      }

      if (r === undefined || r === null || r === '') continue

      // type-specific validation
      switch (q.type) {
        case 'scale':
        case 'likert':
        case 'slider':
        case 'number': {
          const num = typeof r === 'number' ? r : Number.parseFloat(r as any)
          const { min, max } = this.getBounds(q)
          if (Number.isNaN(num) ||
              (min !== undefined && num < min) ||
              (max !== undefined && num > max)) {
            invalid.push(q.id)
          }
          if (q.step && typeof q.step === 'number') {
            const withinStep = ((num - (min ?? 0)) % q.step) === 0
            if (!withinStep) {
              // step mismatch is considered invalid but tolerates floating point imprecision
              const epsilon = 1e-6
              if (Math.abs(((num - (min ?? 0)) % q.step)) > epsilon) invalid.push(q.id)
            }
          }
          break
        }

        case 'single_choice': {
          const idx = this.getOptionIndexFromValue(q.options, r)
          if (idx === undefined) invalid.push(q.id)
          break
        }

        case 'multiple_choice':
        case 'multi_choice': {
          if (!Array.isArray(r)) {
            invalid.push(q.id)
            break
          }
          for (const sel of r) {
            const idx = this.getOptionIndexFromValue(q.options, sel)
            if (idx === undefined) {
              invalid.push(q.id)
              break
            }
          }
          break
        }

        case 'text':
        case 'textarea': {
          if (q.validation?.pattern) {
            try {
              const re = new RegExp(q.validation.pattern)
              if (!re.test(String(r))) invalid.push(q.id)
            } catch {
              // bad pattern in DB: ignore the regex check rather than failing user entry
            }
          }
          if (q.validation?.min_value !== undefined || q.validation?.max_value !== undefined) {
            const num = Number(r)
            if (Number.isNaN(num)) {
              invalid.push(q.id)
            } else {
              if (q.validation.min_value !== undefined && num < q.validation.min_value) invalid.push(q.id)
              if (q.validation.max_value !== undefined && num > q.validation.max_value) invalid.push(q.id)
            }
          }
          break
        }

        case 'boolean':
        case 'date':
        case 'time':
        default:
          // no extra validation here (could add date/time format checks later)
          break
      }
    }

    return {
      isComplete: missing.length === 0,
      missingQuestions: missing,
      invalidResponses: invalid,
    }
  }

  /**
   * Get completion percentage
   */
  getCompletionPercentage(): number {
    const total = this.template.questions.length
    const answered = this.template.questions.filter(q => this.responses[q.id] !== undefined && this.responses[q.id] !== null && this.responses[q.id] !== '').length
    return total > 0 ? Math.round((answered / total) * 100) : 0
  }
}

/**
 * Assessment Factory
 * Creates assessment instances and manages templates
 */
export class AssessmentFactory {
  /**
   * Create assessment instance from template
   */
  static createInstance(
    template: AssessmentTemplate,
    therapistId: string,
    clientId: string,
    options: {
      caseId?: string
      dueDate?: string
      instructions?: string
      reminderFrequency?: ReminderFrequency
    } = {}
  ): Partial<AssessmentInstance> {
    return {
      template_id: template.id,
      therapist_id: therapistId,
      client_id: clientId,
      case_id: options.caseId,
      title: template.name,
      instructions: options.instructions || template.instructions,
      status: 'assigned',
      due_date: options.dueDate,
      reminder_frequency: options.reminderFrequency || 'none',
      // simple default: 7 days after due_date if present
      expires_at: options.dueDate
        ? new Date(new Date(options.dueDate).getTime() + 7 * 24 * 60 * 60 * 1000).toISOString()
        : undefined,
    }
  }

  /**
   * Validate template structure
   */
  static validateTemplate(template: Partial<AssessmentTemplate>): {
    isValid: boolean
    errors: string[]
  } {
    const errors: string[] = []

    if (!template.name) errors.push('Template name is required')
    if (!template.abbreviation) errors.push('Template abbreviation is required')
    if (!template.category) errors.push('Template category is required')
    if (!template.questions || !Array.isArray(template.questions) || template.questions.length === 0) {
      errors.push('Template must have at least one question')
    }
    if (!template.scoring_config) errors.push('Scoring configuration is required')
    if (!template.interpretation_rules) errors.push('Interpretation rules are required')

    return { isValid: errors.length === 0, errors }
  }
}

/**
 * Assessment Utilities
 */
export class AssessmentUtils {
  static formatScore(score: number, maxScore: number, showPercentage = true): string {
    const percentage = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0
    return showPercentage ? `${score}/${maxScore} (${percentage}%)` : `${score}/${maxScore}`
  }

  static getSeverityColor(severity: string): string {
    const colors: Record<string, string> = {
      minimal: 'text-green-600 bg-green-100',
      mild: 'text-yellow-600 bg-yellow-100',
      moderate: 'text-orange-600 bg-orange-100',
      moderately_severe: 'text-red-600 bg-red-100',
      severe: 'text-red-700 bg-red-200',
      very_severe: 'text-red-800 bg-red-300',
    }
    return colors[severity] || 'text-gray-600 bg-gray-100'
  }

  static getCategoryIcon(category: string): string {
    const icons: Record<string, string> = {
      anxiety: '😰',
      depression: '😔',
      trauma: '🛡️',
      stress: '😤',
      wellbeing: '😊',
      personality: '🧠',
      substance: '🚫',
      eating: '🍽️',
      sleep: '😴',
      general: '📋',
    }
    return icons[category] || '📋'
  }

  static estimateCompletionTime(questionCount: number): string {
    const minutesPerQuestion = 0.5
    const totalMinutes = Math.ceil(questionCount * minutesPerQuestion)
    if (totalMinutes < 1) return '< 1 minute'
    if (totalMinutes === 1) return '1 minute'
    return `${totalMinutes} minutes`
  }

  static generateSummary(template: AssessmentTemplate, score: number, interpretation: any): string {
    return `${template.abbreviation}: ${score}/${template.scoring_config.max_score} - ${interpretation.category}`
  }
}
