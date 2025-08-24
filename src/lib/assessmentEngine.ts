import { AssessmentTemplate, AssessmentResponse, ScoringConfig, InterpretationRules } from '../types/assessment'

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
        throw new Error(`Unsupported scoring method: ${scoring_config.method}`)
    }

    return Math.round(rawScore * 100) / 100 // Round to 2 decimal places
  }

  /**
   * Calculate sum-based score
   */
  private calculateSumScore(): number {
    let sum = 0
    
    this.template.questions.forEach(question => {
      const response = this.responses[question.id]
      if (response !== undefined && response !== null) {
        let value = typeof response === 'number' ? response : parseInt(response)
        
        // Handle reverse scoring
        if (question.reverse_scored && question.scale_max !== undefined) {
          value = question.scale_max - value + (question.scale_min || 0)
        }
        
        sum += value
      }
    })
    
    return sum
  }

  /**
   * Calculate average-based score
   */
  private calculateAverageScore(): number {
    const sum = this.calculateSumScore()
    const validResponses = this.template.questions.filter(q => 
      this.responses[q.id] !== undefined && this.responses[q.id] !== null
    ).length
    
    return validResponses > 0 ? sum / validResponses : 0
  }

  /**
   * Calculate weighted score
   */
  private calculateWeightedScore(): number {
    let weightedSum = 0
    const weights = this.template.scoring_config.weighted_items || {}
    
    this.template.questions.forEach(question => {
      const response = this.responses[question.id]
      if (response !== undefined && response !== null) {
        let value = typeof response === 'number' ? response : parseInt(response)
        
        if (question.reverse_scored && question.scale_max !== undefined) {
          value = question.scale_max - value + (question.scale_min || 0)
        }
        
        const weight = weights[question.id] || 1
        weightedSum += value * weight
      }
    })
    
    return weightedSum
  }

  /**
   * Calculate custom score (placeholder for complex algorithms)
   */
  private calculateCustomScore(): number {
    // This would implement custom scoring logic specific to certain assessments
    // For now, fallback to sum method
    return this.calculateSumScore()
  }

  /**
   * Calculate subscale scores
   */
  calculateSubscaleScores(): Record<string, number> {
    const subscales = this.template.scoring_config.subscales || []
    const subscaleScores: Record<string, number> = {}
    
    subscales.forEach(subscale => {
      let subscaleSum = 0
      subscale.items.forEach(itemId => {
        const response = this.responses[itemId]
        if (response !== undefined && response !== null) {
          subscaleSum += typeof response === 'number' ? response : parseInt(response)
        }
      })
      subscaleScores[subscale.name] = subscaleSum
    })
    
    return subscaleScores
  }

  /**
   * Get interpretation based on score
   */
  getInterpretation(score: number) {
    const ranges = this.template.interpretation_rules.ranges || []
    
    const matchingRange = ranges.find(range => 
      score >= range.min && score <= range.max
    )
    
    if (!matchingRange) {
      return {
        category: 'Unknown',
        description: 'Score interpretation not available',
        severity: 'unknown',
        clinical_significance: 'unknown',
        recommendations: 'Consult with healthcare provider'
      }
    }
    
    return {
      category: matchingRange.label,
      description: matchingRange.description,
      severity: matchingRange.severity,
      clinical_significance: matchingRange.clinical_significance,
      recommendations: matchingRange.recommendations
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
    
    const cutoffs = this.template.clinical_cutoffs
    
    // Check clinical cutoff
    if (cutoffs.clinical_cutoff && score >= cutoffs.clinical_cutoff) {
      alerts.push({
        type: 'warning',
        message: `Score exceeds clinical cutoff (${cutoffs.clinical_cutoff}). Consider further evaluation.`,
        action_required: true
      })
    }
    
    // Check suicide risk (PHQ-9 item 9)
    if (cutoffs.suicide_risk_item && cutoffs.suicide_risk_threshold) {
      const suicideResponse = this.responses[cutoffs.suicide_risk_item]
      if (suicideResponse >= cutoffs.suicide_risk_threshold) {
        alerts.push({
          type: 'critical',
          message: 'Suicide risk indicated. Immediate safety assessment required.',
          action_required: true
        })
      }
    }
    
    // Check custom alerts from interpretation rules
    const customAlerts = this.template.interpretation_rules.clinical_alerts || []
    customAlerts.forEach(alert => {
      // Simple condition evaluation (can be enhanced)
      if (this.evaluateCondition(alert.condition, score)) {
        alerts.push({
          type: alert.severity,
          message: alert.message,
          action_required: alert.action_required
        })
      }
    })
    
    return alerts
  }

  /**
   * Evaluate condition for alerts (simplified)
   */
  private evaluateCondition(condition: string, score: number): boolean {
    // Simple condition parser - can be enhanced for complex logic
    try {
      return eval(condition.replace('score', score.toString()))
    } catch {
      return false
    }
  }

  /**
   * Generate narrative report
   */
  generateNarrativeReport(score: number, interpretation: any): string {
    const date = new Date().toLocaleDateString()
    const percentile = Math.round((score / this.template.scoring_config.max_score) * 100)
    
    let report = `Assessment: ${this.template.name} (${this.template.abbreviation})\n`
    report += `Date: ${date}\n`
    report += `Score: ${score}/${this.template.scoring_config.max_score} (${percentile}%)\n`
    report += `Interpretation: ${interpretation.category}\n\n`
    
    report += `Clinical Summary:\n`
    report += `The client completed the ${this.template.name}, which ${this.template.description.toLowerCase()}. `
    report += `The obtained score of ${score} falls within the "${interpretation.category}" range, indicating ${interpretation.description.toLowerCase()}.\n\n`
    
    // Add specific clinical considerations based on assessment type
    if (this.template.abbreviation === 'PHQ-9' && score >= 10) {
      report += `Clinical Considerations: The score suggests clinically significant depressive symptoms that may warrant further evaluation and treatment planning.\n`
    } else if (this.template.abbreviation === 'GAD-7' && score >= 10) {
      report += `Clinical Considerations: The score indicates clinically significant anxiety symptoms that may benefit from therapeutic intervention.\n`
    }
    
    report += `\nRecommendations: ${interpretation.recommendations}`
    
    return report
  }

  /**
   * Validate responses completeness
   */
  validateResponses(): {
    isComplete: boolean
    missingQuestions: string[]
    invalidResponses: string[]
  } {
    const missingQuestions: string[] = []
    const invalidResponses: string[] = []
    
    this.template.questions.forEach(question => {
      const response = this.responses[question.id]
      
      // Check if required question is answered
      if (question.required !== false && (response === undefined || response === null)) {
        missingQuestions.push(question.id)
        return
      }
      
      // Validate response value
      if (response !== undefined && response !== null) {
        if (question.type === 'scale') {
          const numValue = typeof response === 'number' ? response : parseInt(response)
          if (isNaN(numValue) || 
              (question.scale_min !== undefined && numValue < question.scale_min) ||
              (question.scale_max !== undefined && numValue > question.scale_max)) {
            invalidResponses.push(question.id)
          }
        }
      }
    })
    
    return {
      isComplete: missingQuestions.length === 0,
      missingQuestions,
      invalidResponses
    }
  }

  /**
   * Get completion percentage
   */
  getCompletionPercentage(): number {
    const totalQuestions = this.template.questions.length
    const answeredQuestions = this.template.questions.filter(q => 
      this.responses[q.id] !== undefined && this.responses[q.id] !== null
    ).length
    
    return totalQuestions > 0 ? Math.round((answeredQuestions / totalQuestions) * 100) : 0
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
      expires_at: options.dueDate ? new Date(new Date(options.dueDate).getTime() + 7 * 24 * 60 * 60 * 1000).toISOString() : undefined
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
    
    return {
      isValid: errors.length === 0,
      errors
    }
  }
}

/**
 * Assessment Utilities
 */
export class AssessmentUtils {
  /**
   * Format score for display
   */
  static formatScore(score: number, maxScore: number, showPercentage = true): string {
    const percentage = Math.round((score / maxScore) * 100)
    return showPercentage ? `${score}/${maxScore} (${percentage}%)` : `${score}/${maxScore}`
  }

  /**
   * Get severity color
   */
  static getSeverityColor(severity: string): string {
    const colors = {
      minimal: 'text-green-600 bg-green-100',
      mild: 'text-yellow-600 bg-yellow-100',
      moderate: 'text-orange-600 bg-orange-100',
      moderately_severe: 'text-red-600 bg-red-100',
      severe: 'text-red-700 bg-red-200',
      very_severe: 'text-red-800 bg-red-300'
    }
    return colors[severity as keyof typeof colors] || 'text-gray-600 bg-gray-100'
  }

  /**
   * Get category icon
   */
  static getCategoryIcon(category: string): string {
    const icons = {
      anxiety: '😰',
      depression: '😔',
      trauma: '🛡️',
      stress: '😤',
      wellbeing: '😊',
      personality: '🧠',
      substance: '🚫',
      eating: '🍽️',
      sleep: '😴',
      general: '📋'
    }
    return icons[category as keyof typeof icons] || '📋'
  }

  /**
   * Estimate completion time
   */
  static estimateCompletionTime(questionCount: number): string {
    const minutesPerQuestion = 0.5
    const totalMinutes = Math.ceil(questionCount * minutesPerQuestion)
    
    if (totalMinutes < 1) return '< 1 minute'
    if (totalMinutes === 1) return '1 minute'
    return `${totalMinutes} minutes`
  }

  /**
   * Generate assessment summary
   */
  static generateSummary(template: AssessmentTemplate, score: number, interpretation: any): string {
    return `${template.abbreviation}: ${score}/${template.scoring_config.max_score} - ${interpretation.category}`
  }
}