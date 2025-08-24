// Assessment System Type Definitions

export interface AssessmentTemplate {
  id: string
  name: string
  abbreviation: string
  category: AssessmentCategory
  description: string
  version: string
  questions: AssessmentQuestion[]
  scoring_config: ScoringConfig
  interpretation_rules: InterpretationRules
  clinical_cutoffs: ClinicalCutoffs
  instructions: string
  estimated_duration_minutes: number
  evidence_level: EvidenceLevel
  is_active: boolean
  created_by?: string
  created_at: string
  updated_at: string
}

export interface AssessmentInstance {
  id: string
  template_id: string
  therapist_id: string
  client_id: string
  case_id?: string
  title: string
  instructions?: string
  status: AssessmentStatus
  assigned_at: string
  due_date?: string
  started_at?: string
  completed_at?: string
  expires_at?: string
  reminder_frequency: ReminderFrequency
  metadata: Record<string, any>
  created_at: string
  updated_at: string
  
  // Populated relations
  template?: AssessmentTemplate
  responses?: AssessmentResponse[]
  score?: AssessmentScore
  client?: {
    first_name: string
    last_name: string
    email: string
  }
}

export interface AssessmentQuestion {
  id: string
  text: string
  type: QuestionType
  scale_min?: number
  scale_max?: number
  labels?: string[]
  options?: string[]
  reverse_scored?: boolean
  required?: boolean
  validation?: QuestionValidation
  conditional_logic?: ConditionalLogic
}

export interface AssessmentResponse {
  id: string
  instance_id: string
  question_id: string
  response_value: any
  response_text?: string
  response_timestamp: string
  is_final: boolean
  created_at: string
  updated_at: string
}

export interface AssessmentScore {
  id: string
  instance_id: string
  raw_score: number
  scaled_score?: number
  percentile?: number
  t_score?: number
  z_score?: number
  interpretation_category: string
  interpretation_description: string
  clinical_significance?: string
  severity_level?: string
  recommendations?: string
  therapist_notes?: string
  auto_generated: boolean
  calculated_at: string
  reviewed_by?: string
  reviewed_at?: string
  created_at: string
  updated_at: string
}

export interface ScoringConfig {
  method: ScoringMethod
  max_score: number
  min_score?: number
  reverse_scored_items?: string[]
  weighted_items?: Record<string, number>
  subscales?: Subscale[]
  custom_logic?: string
}

export interface InterpretationRules {
  ranges: InterpretationRange[]
  custom_rules?: CustomRule[]
  clinical_alerts?: ClinicalAlert[]
}

export interface InterpretationRange {
  min: number
  max: number
  label: string
  description: string
  severity: SeverityLevel
  clinical_significance: ClinicalSignificance
  recommendations: string
  color?: string
  priority?: number
}

export interface ClinicalCutoffs {
  clinical_cutoff?: number
  optimal_range?: [number, number]
  risk_thresholds?: Record<string, number>
  suicide_risk_item?: string
  suicide_risk_threshold?: number
}

export interface Subscale {
  name: string
  items: string[]
  max_score: number
  interpretation_ranges: InterpretationRange[]
}

export interface QuestionValidation {
  required: boolean
  min_value?: number
  max_value?: number
  pattern?: string
  custom_validation?: string
}

export interface ConditionalLogic {
  show_if: {
    question_id: string
    operator: 'equals' | 'greater_than' | 'less_than' | 'contains'
    value: any
  }[]
  logic_operator: 'AND' | 'OR'
}

export interface CustomRule {
  condition: string
  interpretation: string
  priority: number
}

export interface ClinicalAlert {
  condition: string
  message: string
  severity: 'info' | 'warning' | 'critical'
  action_required: boolean
}

// Enums and Types
export type AssessmentCategory = 
  | 'anxiety' 
  | 'depression' 
  | 'trauma' 
  | 'stress' 
  | 'wellbeing' 
  | 'personality' 
  | 'substance' 
  | 'eating' 
  | 'sleep' 
  | 'general'

export type AssessmentStatus = 
  | 'assigned' 
  | 'in_progress' 
  | 'completed' 
  | 'expired' 
  | 'cancelled'

export type QuestionType = 
  | 'scale' 
  | 'multiple_choice' 
  | 'single_choice' 
  | 'text' 
  | 'textarea' 
  | 'boolean' 
  | 'date' 
  | 'number'

export type ScoringMethod = 
  | 'sum' 
  | 'average' 
  | 'weighted_sum' 
  | 'custom'

export type SeverityLevel = 
  | 'minimal' 
  | 'mild' 
  | 'moderate' 
  | 'moderately_severe' 
  | 'severe' 
  | 'very_severe'

export type ClinicalSignificance = 
  | 'subclinical' 
  | 'mild' 
  | 'moderate' 
  | 'significant' 
  | 'severe' 
  | 'critical'

export type EvidenceLevel = 
  | 'research_based' 
  | 'clinical_consensus' 
  | 'expert_opinion'

export type ReminderFrequency = 
  | 'none' 
  | 'daily' 
  | 'weekly' 
  | 'before_due'

// Assessment Form Props
export interface AssessmentFormProps {
  instance: AssessmentInstance
  onResponse: (questionId: string, value: any) => void
  onComplete: () => void
  onSave: () => void
  readonly?: boolean
  showProgress?: boolean
  showNavigation?: boolean
}

// Assessment Renderer Props
export interface AssessmentRendererProps {
  template: AssessmentTemplate
  responses: Record<string, any>
  onResponse: (questionId: string, value: any) => void
  readonly?: boolean
  currentQuestion?: number
  onQuestionChange?: (questionIndex: number) => void
}

// Scoring Engine Props
export interface ScoringEngineProps {
  template: AssessmentTemplate
  responses: Record<string, any>
  onScoreCalculated: (score: AssessmentScore) => void
}

// Assessment Library Props
export interface AssessmentLibraryProps {
  category?: AssessmentCategory
  searchTerm?: string
  onAssign: (templateId: string, clientIds: string[]) => void
  onPreview: (template: AssessmentTemplate) => void
}