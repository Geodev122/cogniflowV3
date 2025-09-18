export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          role: 'admin' | 'supervisor' | 'therapist' | 'client'
          first_name: string
          last_name: string
          email: string
          phone: string | null
          whatsapp_number: string | null
          city: string | null
          country: string | null
          timezone: string | null
          patient_code: string | null
          date_of_birth: string | null
          gender: string | null
          professional_details: any | null
          verification_status: 'pending' | 'verified' | 'rejected' | 'expired' | null
          license_number: string | null
          password_set: boolean
          created_by_therapist: string | null
          profile_completion_percentage: number | null
          last_login_at: string | null
          is_active: boolean
          metadata: any | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          role?: 'admin' | 'supervisor' | 'therapist' | 'client'
          first_name: string
          last_name: string
          email: string
          phone?: string | null
          whatsapp_number?: string | null
          city?: string | null
          country?: string | null
          timezone?: string | null
          patient_code?: string | null
          date_of_birth?: string | null
          gender?: string | null
          professional_details?: any | null
          verification_status?: 'pending' | 'verified' | 'rejected' | 'expired' | null
          license_number?: string | null
          password_set?: boolean
          created_by_therapist?: string | null
          profile_completion_percentage?: number | null
          last_login_at?: string | null
          is_active?: boolean
          metadata?: any | null
        }
        Update: {
          role?: 'admin' | 'supervisor' | 'therapist' | 'client'
          first_name?: string
          last_name?: string
          email?: string
          phone?: string | null
          whatsapp_number?: string | null
          city?: string | null
          country?: string | null
          timezone?: string | null
          patient_code?: string | null
          date_of_birth?: string | null
          gender?: string | null
          professional_details?: any | null
          verification_status?: 'pending' | 'verified' | 'rejected' | 'expired' | null
          license_number?: string | null
          password_set?: boolean
          created_by_therapist?: string | null
          profile_completion_percentage?: number | null
          last_login_at?: string | null
          is_active?: boolean
          metadata?: any | null
        }
      }
      therapist_client_relations: {
        Row: {
          id: string
          therapist_id: string
          client_id: string
          status: string | null
          relationship_type: string | null
          assigned_at: string
          created_at: string
        }
        Insert: {
          therapist_id: string
          client_id: string
          status?: string | null
          relationship_type?: string | null
          assigned_at?: string
        }
        Update: {
          therapist_id?: string
          client_id?: string
          status?: string | null
          relationship_type?: string | null
          assigned_at?: string
        }
      }
      therapist_case_relations: {
        Row: {
          id: string
          case_id: string
          therapist_id: string
          role: string | null
          access_level: string | null
          assigned_at: string
          created_at: string
        }
        Insert: {
          case_id: string
          therapist_id: string
          role?: string | null
          access_level?: string | null
          assigned_at?: string
        }
        Update: {
          case_id?: string
          therapist_id?: string
          role?: string | null
          access_level?: string | null
          assigned_at?: string
        }
      }
      cases: {
        Row: {
          id: string
          client_id: string
          therapist_id: string
          case_number: string
          case_code: string | null
          status: 'active' | 'paused' | 'closed' | 'archived' | 'transferred' | null
          current_phase: string | null
          priority: number | null
          diagnosis_codes: string[] | null
          formulation: string | null
          intake_data: any | null
          treatment_plan: any | null
          data: any | null
          metadata: any | null
          opened_at: string | null
          closed_at: string | null
          last_activity_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          client_id: string
          therapist_id: string
          case_number?: string
          case_code?: string | null
          status?: 'active' | 'paused' | 'closed' | 'archived' | 'transferred' | null
          current_phase?: string | null
          priority?: number | null
          diagnosis_codes?: string[] | null
          formulation?: string | null
          intake_data?: any | null
          treatment_plan?: any | null
          data?: any | null
          metadata?: any | null
          opened_at?: string | null
          closed_at?: string | null
          last_activity_at?: string | null
        }
        Update: {
          case_number?: string
          case_code?: string | null
          status?: 'active' | 'paused' | 'closed' | 'archived' | 'transferred' | null
          current_phase?: string | null
          priority?: number | null
          diagnosis_codes?: string[] | null
          formulation?: string | null
          intake_data?: any | null
          treatment_plan?: any | null
          data?: any | null
          metadata?: any | null
          opened_at?: string | null
          closed_at?: string | null
          last_activity_at?: string | null
        }
      }
      client_profiles: {
        Row: {
          id: string
          client_id: string
          therapist_id: string
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          emergency_contact_relationship: string | null
          address: string | null
          occupation: string | null
          marital_status: string | null
          medical_history: string | null
          current_medications: string | null
          presenting_concerns: string | null
          therapy_history: string | null
          risk_level: 'low' | 'moderate' | 'high' | 'crisis' | null
          suicide_risk_assessment: any | null
          notes: string | null
          intake_completed_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          client_id: string
          therapist_id: string
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          emergency_contact_relationship?: string | null
          address?: string | null
          occupation?: string | null
          marital_status?: string | null
          medical_history?: string | null
          current_medications?: string | null
          presenting_concerns?: string | null
          therapy_history?: string | null
          risk_level?: 'low' | 'moderate' | 'high' | 'crisis' | null
          suicide_risk_assessment?: any | null
          notes?: string | null
          intake_completed_at?: string | null
        }
        Update: {
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          emergency_contact_relationship?: string | null
          address?: string | null
          occupation?: string | null
          marital_status?: string | null
          medical_history?: string | null
          current_medications?: string | null
          presenting_concerns?: string | null
          therapy_history?: string | null
          risk_level?: 'low' | 'moderate' | 'high' | 'crisis' | null
          suicide_risk_assessment?: any | null
          notes?: string | null
          intake_completed_at?: string | null
        }
      }
      case_summaries: {
        Row: {
          case_id: string
          title: string
          content: any | null
          last_highlight: string | null
          ai_summary: string | null
          version: number | null
          updated_by: string | null
          reviewed_by: string | null
          reviewed_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          case_id: string
          title: string
          content?: any | null
          last_highlight?: string | null
          ai_summary?: string | null
          version?: number | null
          updated_by?: string | null
          reviewed_by?: string | null
          reviewed_at?: string | null
        }
        Update: {
          title?: string
          content?: any | null
          last_highlight?: string | null
          ai_summary?: string | null
          version?: number | null
          updated_by?: string | null
          reviewed_by?: string | null
          reviewed_at?: string | null
        }
      }
      assessment_templates: {
        Row: {
          id: string
          name: string
          abbreviation: string | null
          category: 'depression' | 'anxiety' | 'trauma' | 'stress' | 'wellbeing' | 'personality' | 'substance' | 'eating' | 'sleep' | 'general'
          description: string | null
          version: string | null
          questions: any
          scoring_config: any
          interpretation_rules: any
          clinical_cutoffs: any | null
          instructions: string | null
          estimated_duration_minutes: number | null
          evidence_level: 'research_based' | 'clinical_consensus' | 'expert_opinion' | null
          domains: string[] | null
          tags: string[] | null
          is_active: boolean
          is_public: boolean
          created_by: string | null
          schema: any | null
          scoring: any | null
          items_count: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          name: string
          abbreviation?: string | null
          category: 'depression' | 'anxiety' | 'trauma' | 'stress' | 'wellbeing' | 'personality' | 'substance' | 'eating' | 'sleep' | 'general'
          description?: string | null
          version?: string | null
          questions: any
          scoring_config: any
          interpretation_rules: any
          clinical_cutoffs?: any | null
          instructions?: string | null
          estimated_duration_minutes?: number | null
          evidence_level?: 'research_based' | 'clinical_consensus' | 'expert_opinion' | null
          domains?: string[] | null
          tags?: string[] | null
          is_active?: boolean
          is_public?: boolean
          created_by?: string | null
          schema?: any | null
          scoring?: any | null
          items_count?: number | null
        }
        Update: {
          name?: string
          abbreviation?: string | null
          category?: 'depression' | 'anxiety' | 'trauma' | 'stress' | 'wellbeing' | 'personality' | 'substance' | 'eating' | 'sleep' | 'general'
          description?: string | null
          version?: string | null
          questions?: any
          scoring_config?: any
          interpretation_rules?: any
          clinical_cutoffs?: any | null
          instructions?: string | null
          estimated_duration_minutes?: number | null
          evidence_level?: 'research_based' | 'clinical_consensus' | 'expert_opinion' | null
          domains?: string[] | null
          tags?: string[] | null
          is_active?: boolean
          is_public?: boolean
          created_by?: string | null
          schema?: any | null
          scoring?: any | null
          items_count?: number | null
        }
      }
      assessment_instances: {
        Row: {
          id: string
          template_id: string
          therapist_id: string
          client_id: string
          case_id: string | null
          title: string
          instructions: string | null
          status: 'assigned' | 'in_progress' | 'completed' | 'expired' | 'cancelled'
          assigned_at: string
          due_date: string | null
          started_at: string | null
          completed_at: string | null
          expires_at: string | null
          reminder_frequency: string
          progress: number | null
          metadata: any
          created_at: string
          updated_at: string
        }
        Insert: {
          template_id: string
          therapist_id: string
          client_id: string
          case_id?: string | null
          title: string
          instructions?: string | null
          status?: 'assigned' | 'in_progress' | 'completed' | 'expired' | 'cancelled'
          assigned_at?: string
          due_date?: string | null
          started_at?: string | null
          completed_at?: string | null
          expires_at?: string | null
          reminder_frequency?: string
          progress?: number | null
          metadata?: any
        }
        Update: {
          title?: string
          instructions?: string | null
          status?: 'assigned' | 'in_progress' | 'completed' | 'expired' | 'cancelled'
          due_date?: string | null
          started_at?: string | null
          completed_at?: string | null
          expires_at?: string | null
          reminder_frequency?: string
          progress?: number | null
          metadata?: any
        }
      }
      assessment_responses: {
        Row: {
          id: string
          instance_id: string
          question_id: string
          item_id: string
          response_value: any | null
          response_text: string | null
          response_timestamp: string
          is_final: boolean
          payload: any | null
          answered_at: string
          created_at: string
          updated_at: string
        }
        Insert: {
          instance_id: string
          question_id: string
          item_id: string
          response_value?: any | null
          response_text?: string | null
          response_timestamp?: string
          is_final?: boolean
          payload?: any | null
          answered_at?: string
        }
        Update: {
          response_value?: any | null
          response_text?: string | null
          response_timestamp?: string
          is_final?: boolean
          payload?: any | null
          answered_at?: string
        }
      }
      assessment_scores: {
        Row: {
          id: string
          instance_id: string
          raw_score: number
          scaled_score: number | null
          percentile: number | null
          t_score: number | null
          z_score: number | null
          interpretation_category: string | null
          interpretation_description: string | null
          clinical_significance: 'subclinical' | 'mild' | 'moderate' | 'significant' | 'severe' | 'critical' | null
          severity_level: 'minimal' | 'mild' | 'moderate' | 'moderately_severe' | 'severe' | 'very_severe' | null
          recommendations: string | null
          therapist_notes: string | null
          ai_insights: string | null
          auto_generated: boolean
          calculated_at: string
          reviewed_by: string | null
          reviewed_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          instance_id: string
          raw_score: number
          scaled_score?: number | null
          percentile?: number | null
          t_score?: number | null
          z_score?: number | null
          interpretation_category?: string | null
          interpretation_description?: string | null
          clinical_significance?: 'subclinical' | 'mild' | 'moderate' | 'significant' | 'severe' | 'critical' | null
          severity_level?: 'minimal' | 'mild' | 'moderate' | 'moderately_severe' | 'severe' | 'very_severe' | null
          recommendations?: string | null
          therapist_notes?: string | null
          ai_insights?: string | null
          auto_generated?: boolean
          calculated_at?: string
          reviewed_by?: string | null
          reviewed_at?: string | null
        }
        Update: {
          raw_score?: number
          scaled_score?: number | null
          percentile?: number | null
          t_score?: number | null
          z_score?: number | null
          interpretation_category?: string | null
          interpretation_description?: string | null
          clinical_significance?: 'subclinical' | 'mild' | 'moderate' | 'significant' | 'severe' | 'critical' | null
          severity_level?: 'minimal' | 'mild' | 'moderate' | 'moderately_severe' | 'severe' | 'very_severe' | null
          recommendations?: string | null
          therapist_notes?: string | null
          ai_insights?: string | null
          auto_generated?: boolean
          calculated_at?: string
          reviewed_by?: string | null
          reviewed_at?: string | null
        }
      }
      assessment_reports: {
        Row: {
          id: string
          client_id: string
          therapist_id: string
          case_id: string | null
          report_type: string
          title: string
          content: any
          generated_by: string | null
          template_used: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          client_id: string
          therapist_id: string
          case_id?: string | null
          report_type: string
          title: string
          content: any
          generated_by?: string | null
          template_used?: string | null
        }
        Update: {
          report_type?: string
          title?: string
          content?: any
          generated_by?: string | null
          template_used?: string | null
        }
      }
      appointments: {
        Row: {
          id: string
          therapist_id: string | null
          client_id: string | null
          case_id: string | null
          appointment_date: string
          start_time: string
          end_time: string
          duration_minutes: number | null
          appointment_type: 'individual' | 'group' | 'family' | 'assessment' | 'consultation' | 'intake' | null
          status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled' | 'no_show' | 'rescheduled'
          title: string | null
          location: string | null
          notes: string | null
          session_summary: string | null
          metadata: any | null
          created_at: string
          updated_at: string
        }
        Insert: {
          therapist_id?: string | null
          client_id?: string | null
          case_id?: string | null
          appointment_date: string
          start_time: string
          end_time: string
          duration_minutes?: number | null
          appointment_type?: 'individual' | 'group' | 'family' | 'assessment' | 'consultation' | 'intake' | null
          status?: 'scheduled' | 'in_progress' | 'completed' | 'cancelled' | 'no_show' | 'rescheduled'
          title?: string | null
          location?: string | null
          notes?: string | null
          session_summary?: string | null
          metadata?: any | null
        }
        Update: {
          appointment_date?: string
          start_time?: string
          end_time?: string
          duration_minutes?: number | null
          appointment_type?: 'individual' | 'group' | 'family' | 'assessment' | 'consultation' | 'intake' | null
          status?: 'scheduled' | 'in_progress' | 'completed' | 'cancelled' | 'no_show' | 'rescheduled'
          title?: string | null
          location?: string | null
          notes?: string | null
          session_summary?: string | null
          metadata?: any | null
        }
      }
      session_notes: {
        Row: {
          id: string
          appointment_id: string | null
          therapist_id: string
          client_id: string | null
          case_id: string | null
          session_index: number | null
          session_date: string | null
          content: any
          note_type: string | null
          finalized: boolean | null
          finalized_at: string | null
          version: number | null
          previous_version_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          appointment_id?: string | null
          therapist_id: string
          client_id?: string | null
          case_id?: string | null
          session_index?: number | null
          session_date?: string | null
          content: any
          note_type?: string | null
          finalized?: boolean | null
          finalized_at?: string | null
          version?: number | null
          previous_version_id?: string | null
        }
        Update: {
          content?: any
          note_type?: string | null
          finalized?: boolean | null
          finalized_at?: string | null
          version?: number | null
          previous_version_id?: string | null
        }
      }
      session_agenda: {
        Row: {
          id: string
          case_id: string
          therapist_id: string
          source: string | null
          source_id: string | null
          title: string
          description: string | null
          priority: number | null
          completed_at: string | null
          payload: any | null
          created_at: string
        }
        Insert: {
          case_id: string
          therapist_id: string
          source?: string | null
          source_id?: string | null
          title: string
          description?: string | null
          priority?: number | null
          completed_at?: string | null
          payload?: any | null
        }
        Update: {
          title?: string
          description?: string | null
          priority?: number | null
          completed_at?: string | null
          payload?: any | null
        }
      }
      treatment_plans: {
        Row: {
          id: string
          client_id: string
          therapist_id: string
          case_id: string | null
          title: string
          case_formulation: string | null
          treatment_approach: string | null
          estimated_duration: string | null
          goals: any | null
          interventions: any | null
          milestones: any | null
          status: string | null
          version: number | null
          previous_version_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          client_id: string
          therapist_id: string
          case_id?: string | null
          title: string
          case_formulation?: string | null
          treatment_approach?: string | null
          estimated_duration?: string | null
          goals?: any | null
          interventions?: any | null
          milestones?: any | null
          status?: string | null
          version?: number | null
          previous_version_id?: string | null
        }
        Update: {
          title?: string
          case_formulation?: string | null
          treatment_approach?: string | null
          estimated_duration?: string | null
          goals?: any | null
          interventions?: any | null
          milestones?: any | null
          status?: string | null
          version?: number | null
          previous_version_id?: string | null
        }
      }
      therapy_goals: {
        Row: {
          id: string
          treatment_plan_id: string
          goal_text: string
          description: string | null
          category: string | null
          specific_criteria: string | null
          measurable_criteria: string | null
          achievable_criteria: string | null
          relevant_criteria: string | null
          time_bound_criteria: string | null
          target_date: string | null
          progress_percentage: number | null
          status: string | null
          notes: string | null
          interventions_used: string[] | null
          created_at: string
          updated_at: string
        }
        Insert: {
          treatment_plan_id: string
          goal_text: string
          description?: string | null
          category?: string | null
          specific_criteria?: string | null
          measurable_criteria?: string | null
          achievable_criteria?: string | null
          relevant_criteria?: string | null
          time_bound_criteria?: string | null
          target_date?: string | null
          progress_percentage?: number | null
          status?: string | null
          notes?: string | null
          interventions_used?: string[] | null
        }
        Update: {
          goal_text?: string
          description?: string | null
          category?: string | null
          specific_criteria?: string | null
          measurable_criteria?: string | null
          achievable_criteria?: string | null
          relevant_criteria?: string | null
          time_bound_criteria?: string | null
          target_date?: string | null
          progress_percentage?: number | null
          status?: string | null
          notes?: string | null
          interventions_used?: string[] | null
        }
      }
      treatment_plan_phases: {
        Row: {
          id: string
          case_id: string
          treatment_plan_id: string | null
          phase: string
          description: string | null
          session_index: number | null
          planned_date: string | null
          started_at: string | null
          completed_at: string | null
          goals: any | null
          interventions: any | null
          created_at: string
        }
        Insert: {
          case_id: string
          treatment_plan_id?: string | null
          phase: string
          description?: string | null
          session_index?: number | null
          planned_date?: string | null
          started_at?: string | null
          completed_at?: string | null
          goals?: any | null
          interventions?: any | null
        }
        Update: {
          phase?: string
          description?: string | null
          session_index?: number | null
          planned_date?: string | null
          started_at?: string | null
          completed_at?: string | null
          goals?: any | null
          interventions?: any | null
        }
      }
      cbt_worksheets: {
        Row: {
          id: string
          therapist_id: string
          client_id: string
          case_id: string | null
          type: string
          title: string
          instructions: string | null
          content: any | null
          responses: any | null
          status: string | null
          assigned_at: string
          completed_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          therapist_id: string
          client_id: string
          case_id?: string | null
          type: string
          title: string
          instructions?: string | null
          content?: any | null
          responses?: any | null
          status?: string | null
          assigned_at?: string
          completed_at?: string | null
        }
        Update: {
          type?: string
          title?: string
          instructions?: string | null
          content?: any | null
          responses?: any | null
          status?: string | null
          completed_at?: string | null
        }
      }
      therapeutic_exercises: {
        Row: {
          id: string
          therapist_id: string
          client_id: string
          case_id: string | null
          exercise_type: string
          title: string
          description: string | null
          game_config: any | null
          difficulty_level: string | null
          progress: any | null
          status: string | null
          last_played_at: string | null
          total_sessions: number | null
          total_time_minutes: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          therapist_id: string
          client_id: string
          case_id?: string | null
          exercise_type: string
          title: string
          description?: string | null
          game_config?: any | null
          difficulty_level?: string | null
          progress?: any | null
          status?: string | null
          last_played_at?: string | null
          total_sessions?: number | null
          total_time_minutes?: number | null
        }
        Update: {
          exercise_type?: string
          title?: string
          description?: string | null
          game_config?: any | null
          difficulty_level?: string | null
          progress?: any | null
          status?: string | null
          last_played_at?: string | null
          total_sessions?: number | null
          total_time_minutes?: number | null
        }
      }
      worksheets: {
        Row: {
          id: string
          therapist_id: string
          title: string
          description: string | null
          category: string | null
          content: any | null
          template_data: any | null
          is_template: boolean | null
          is_public: boolean | null
          created_at: string
          updated_at: string
        }
        Insert: {
          therapist_id: string
          title: string
          description?: string | null
          category?: string | null
          content?: any | null
          template_data?: any | null
          is_template?: boolean | null
          is_public?: boolean | null
        }
        Update: {
          title?: string
          description?: string | null
          category?: string | null
          content?: any | null
          template_data?: any | null
          is_template?: boolean | null
          is_public?: boolean | null
        }
      }
      worksheet_assignments: {
        Row: {
          id: string
          worksheet_id: string
          client_id: string
          therapist_id: string
          case_id: string | null
          instructions: string | null
          due_date: string | null
          responses: any | null
          status: string | null
          assigned_at: string
          completed_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          worksheet_id: string
          client_id: string
          therapist_id: string
          case_id?: string | null
          instructions?: string | null
          due_date?: string | null
          responses?: any | null
          status?: string | null
          assigned_at?: string
          completed_at?: string | null
        }
        Update: {
          instructions?: string | null
          due_date?: string | null
          responses?: any | null
          status?: string | null
          completed_at?: string | null
        }
      }
      progress_tracking: {
        Row: {
          id: string
          client_id: string
          case_id: string | null
          metric_type: string
          value: number
          unit: string | null
          source_type: string
          source_id: string | null
          session_phase: string | null
          notes: string | null
          recorded_at: string
          created_at: string
        }
        Insert: {
          client_id: string
          case_id?: string | null
          metric_type: string
          value: number
          unit?: string | null
          source_type: string
          source_id?: string | null
          session_phase?: string | null
          notes?: string | null
          recorded_at?: string
        }
        Update: {
          metric_type?: string
          value?: number
          unit?: string | null
          source_type?: string
          source_id?: string | null
          session_phase?: string | null
          notes?: string | null
          recorded_at?: string
        }
      }
      in_between_sessions: {
        Row: {
          id: string
          case_id: string
          client_id: string
          task_type: string
          task_title: string
          task_data: any | null
          client_response: any | null
          mood_rating: number | null
          client_notes: string | null
          submitted_at: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          created_at: string
        }
        Insert: {
          case_id: string
          client_id: string
          task_type: string
          task_title: string
          task_data?: any | null
          client_response?: any | null
          mood_rating?: number | null
          client_notes?: string | null
          submitted_at?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
        }
        Update: {
          task_type?: string
          task_title?: string
          task_data?: any | null
          client_response?: any | null
          mood_rating?: number | null
          client_notes?: string | null
          submitted_at?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
        }
      }
      client_activities: {
        Row: {
          id: string
          client_id: string
          case_id: string | null
          session_phase: string | null
          kind: string
          type: string
          title: string | null
          details: string | null
          payload: any | null
          occurred_at: string
          reviewed_at: string | null
          reviewed_by: string | null
          created_by: string | null
          created_at: string
        }
        Insert: {
          client_id: string
          case_id?: string | null
          session_phase?: string | null
          kind: string
          type: string
          title?: string | null
          details?: string | null
          payload?: any | null
          occurred_at?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          created_by?: string | null
        }
        Update: {
          session_phase?: string | null
          kind?: string
          type?: string
          title?: string | null
          details?: string | null
          payload?: any | null
          occurred_at?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
        }
      }
      resource_library: {
        Row: {
          id: string
          title: string
          description: string | null
          category: 'assessment' | 'worksheet' | 'educational' | 'intervention' | 'protocol' | 'legal' | 'template' | null
          subcategory: string | null
          content_type: 'pdf' | 'video' | 'audio' | 'interactive' | 'link' | 'text' | 'worksheet' | 'protocol' | 'course' | null
          content_url: string | null
          media_url: string | null
          storage_path: string | null
          external_url: string | null
          tags: string[] | null
          difficulty_level: string | null
          evidence_level: 'research_based' | 'clinical_consensus' | 'expert_opinion' | null
          target_audience: string[] | null
          is_public: boolean
          therapist_owner_id: string | null
          created_by: string | null
          metadata: any | null
          file_size_bytes: number | null
          mime_type: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          title: string
          description?: string | null
          category?: 'assessment' | 'worksheet' | 'educational' | 'intervention' | 'protocol' | 'legal' | 'template' | null
          subcategory?: string | null
          content_type?: 'pdf' | 'video' | 'audio' | 'interactive' | 'link' | 'text' | 'worksheet' | 'protocol' | 'course' | null
          content_url?: string | null
          media_url?: string | null
          storage_path?: string | null
          external_url?: string | null
          tags?: string[] | null
          difficulty_level?: string | null
          evidence_level?: 'research_based' | 'clinical_consensus' | 'expert_opinion' | null
          target_audience?: string[] | null
          is_public?: boolean
          therapist_owner_id?: string | null
          created_by?: string | null
          metadata?: any | null
          file_size_bytes?: number | null
          mime_type?: string | null
        }
        Update: {
          title?: string
          description?: string | null
          category?: 'assessment' | 'worksheet' | 'educational' | 'intervention' | 'protocol' | 'legal' | 'template' | null
          subcategory?: string | null
          content_type?: 'pdf' | 'video' | 'audio' | 'interactive' | 'link' | 'text' | 'worksheet' | 'protocol' | 'course' | null
          content_url?: string | null
          media_url?: string | null
          storage_path?: string | null
          external_url?: string | null
          tags?: string[] | null
          difficulty_level?: string | null
          evidence_level?: 'research_based' | 'clinical_consensus' | 'expert_opinion' | null
          target_audience?: string[] | null
          is_public?: boolean
          therapist_owner_id?: string | null
          created_by?: string | null
          metadata?: any | null
          file_size_bytes?: number | null
          mime_type?: string | null
        }
      }
      form_assignments: {
        Row: {
          id: string
          therapist_id: string
          client_id: string
          case_id: string | null
          form_type: string
          form_id: string | null
          title: string
          instructions: string | null
          due_date: string | null
          reminder_frequency: string | null
          status: string | null
          assigned_at: string
          completed_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          therapist_id: string
          client_id: string
          case_id?: string | null
          form_type: string
          form_id?: string | null
          title: string
          instructions?: string | null
          due_date?: string | null
          reminder_frequency?: string | null
          status?: string | null
          assigned_at?: string
          completed_at?: string | null
        }
        Update: {
          form_type?: string
          form_id?: string | null
          title?: string
          instructions?: string | null
          due_date?: string | null
          reminder_frequency?: string | null
          status?: string | null
          completed_at?: string | null
        }
      }
      psychometric_forms: {
        Row: {
          id: string
          therapist_id: string
          client_id: string
          case_id: string | null
          form_type: string
          title: string
          questions: any | null
          responses: any | null
          score: number | null
          interpretation: string | null
          status: string | null
          completed_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          therapist_id: string
          client_id: string
          case_id?: string | null
          form_type: string
          title: string
          questions?: any | null
          responses?: any | null
          score?: number | null
          interpretation?: string | null
          status?: string | null
          completed_at?: string | null
        }
        Update: {
          form_type?: string
          title?: string
          questions?: any | null
          responses?: any | null
          score?: number | null
          interpretation?: string | null
          status?: string | null
          completed_at?: string | null
        }
      }
      communication_logs: {
        Row: {
          id: string
          therapist_id: string
          client_id: string
          case_id: string | null
          communication_type: 'email' | 'phone' | 'text' | 'whatsapp' | 'in_person' | 'crisis' | 'reminder'
          subject: string | null
          content: string | null
          direction: 'outgoing' | 'incoming'
          status: 'draft' | 'sent' | 'delivered' | 'read' | 'failed'
          sent_at: string | null
          delivered_at: string | null
          read_at: string | null
          metadata: any | null
          created_at: string
          updated_at: string
        }
        Insert: {
          therapist_id: string
          client_id: string
          case_id?: string | null
          communication_type: 'email' | 'phone' | 'text' | 'whatsapp' | 'in_person' | 'crisis' | 'reminder'
          subject?: string | null
          content?: string | null
          direction: 'outgoing' | 'incoming'
          status?: 'draft' | 'sent' | 'delivered' | 'read' | 'failed'
          sent_at?: string | null
          delivered_at?: string | null
          read_at?: string | null
          metadata?: any | null
        }
        Update: {
          subject?: string | null
          content?: string | null
          status?: 'draft' | 'sent' | 'delivered' | 'read' | 'failed'
          sent_at?: string | null
          delivered_at?: string | null
          read_at?: string | null
          metadata?: any | null
        }
      }
      client_requests: {
        Row: {
          id: string
          client_id: string
          therapist_id: string | null
          case_id: string | null
          type: string
          message: string | null
          priority: number | null
          status: 'open' | 'in_progress' | 'resolved' | 'closed' | 'cancelled'
          resolved_at: string | null
          resolved_by: string | null
          resolution_notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          client_id: string
          therapist_id?: string | null
          case_id?: string | null
          type: string
          message?: string | null
          priority?: number | null
          status?: 'open' | 'in_progress' | 'resolved' | 'closed' | 'cancelled'
          resolved_at?: string | null
          resolved_by?: string | null
          resolution_notes?: string | null
        }
        Update: {
          type?: string
          message?: string | null
          priority?: number | null
          status?: 'open' | 'in_progress' | 'resolved' | 'closed' | 'cancelled'
          resolved_at?: string | null
          resolved_by?: string | null
          resolution_notes?: string | null
        }
      }
      consents: {
        Row: {
          id: string
          client_id: string
          therapist_id: string | null
          case_id: string | null
          title: string
          body: string | null
          consent_type: string | null
          signed_at: string | null
          expires_at: string | null
          witness_id: string | null
          document_url: string | null
          version: string | null
          created_at: string
        }
        Insert: {
          client_id: string
          therapist_id?: string | null
          case_id?: string | null
          title: string
          body?: string | null
          consent_type?: string | null
          signed_at?: string | null
          expires_at?: string | null
          witness_id?: string | null
          document_url?: string | null
          version?: string | null
        }
        Update: {
          title?: string
          body?: string | null
          consent_type?: string | null
          signed_at?: string | null
          expires_at?: string | null
          witness_id?: string | null
          document_url?: string | null
          version?: string | null
        }
      }
      supervision_flags: {
        Row: {
          id: string
          case_id: string
          therapist_id: string
          session_note_id: string | null
          flagged_by: string
          reason: string
          priority: number | null
          status: 'open' | 'in_progress' | 'resolved' | 'closed' | 'cancelled'
          resolved_at: string | null
          resolved_by: string | null
          resolution_notes: string | null
          created_at: string
        }
        Insert: {
          case_id: string
          therapist_id: string
          session_note_id?: string | null
          flagged_by: string
          reason: string
          priority?: number | null
          status?: 'open' | 'in_progress' | 'resolved' | 'closed' | 'cancelled'
          resolved_at?: string | null
          resolved_by?: string | null
          resolution_notes?: string | null
        }
        Update: {
          reason?: string
          priority?: number | null
          status?: 'open' | 'in_progress' | 'resolved' | 'closed' | 'cancelled'
          resolved_at?: string | null
          resolved_by?: string | null
          resolution_notes?: string | null
        }
      }
      supervision_threads: {
        Row: {
          id: string
          therapist_id: string
          supervisor_id: string | null
          case_id: string | null
          title: string
          description: string | null
          category: string | null
          status: 'open' | 'in_progress' | 'resolved' | 'closed' | 'cancelled'
          priority: string | null
          resolved_at: string | null
          resolution_summary: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          therapist_id: string
          supervisor_id?: string | null
          case_id?: string | null
          title: string
          description?: string | null
          category?: string | null
          status?: 'open' | 'in_progress' | 'resolved' | 'closed' | 'cancelled'
          priority?: string | null
          resolved_at?: string | null
          resolution_summary?: string | null
        }
        Update: {
          title?: string
          description?: string | null
          category?: string | null
          status?: 'open' | 'in_progress' | 'resolved' | 'closed' | 'cancelled'
          priority?: string | null
          resolved_at?: string | null
          resolution_summary?: string | null
        }
      }
      supervision_messages: {
        Row: {
          id: string
          thread_id: string
          sender_id: string
          content: string
          message_type: string | null
          attachments: any | null
          read_at: string | null
          created_at: string
        }
        Insert: {
          thread_id: string
          sender_id: string
          content: string
          message_type?: string | null
          attachments?: any | null
          read_at?: string | null
        }
        Update: {
          content?: string
          message_type?: string | null
          attachments?: any | null
          read_at?: string | null
        }
      }
      therapist_licenses: {
        Row: {
          id: string
          therapist_id: string
          license_name: string
          license_number: string | null
          issuing_authority: string | null
          country: string
          state_province: string | null
          file_path: string
          original_filename: string | null
          issued_date: string | null
          expires_on: string | null
          status: 'submitted' | 'under_review' | 'approved' | 'rejected' | 'expired'
          verified_at: string | null
          verified_by: string | null
          notes: string | null
          verification_notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          therapist_id: string
          license_name: string
          license_number?: string | null
          issuing_authority?: string | null
          country: string
          state_province?: string | null
          file_path: string
          original_filename?: string | null
          issued_date?: string | null
          expires_on?: string | null
          status?: 'submitted' | 'under_review' | 'approved' | 'rejected' | 'expired'
          verified_at?: string | null
          verified_by?: string | null
          notes?: string | null
          verification_notes?: string | null
        }
        Update: {
          license_name?: string
          license_number?: string | null
          issuing_authority?: string | null
          country?: string
          state_province?: string | null
          file_path?: string
          original_filename?: string | null
          issued_date?: string | null
          expires_on?: string | null
          status?: 'submitted' | 'under_review' | 'approved' | 'rejected' | 'expired'
          verified_at?: string | null
          verified_by?: string | null
          notes?: string | null
          verification_notes?: string | null
        }
      }
      subscriptions: {
        Row: {
          id: string
          user_id: string
          stripe_subscription_id: string | null
          stripe_customer_id: string | null
          plan_name: string
          plan_price: number | null
          billing_interval: string | null
          status: 'active' | 'past_due' | 'canceled' | 'trialing' | 'inactive'
          current_period_start: string | null
          current_period_end: string | null
          cancel_at_period_end: boolean
          canceled_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          user_id: string
          stripe_subscription_id?: string | null
          stripe_customer_id?: string | null
          plan_name: string
          plan_price?: number | null
          billing_interval?: string | null
          status?: 'active' | 'past_due' | 'canceled' | 'trialing' | 'inactive'
          current_period_start?: string | null
          current_period_end?: string | null
          cancel_at_period_end?: boolean
          canceled_at?: string | null
        }
        Update: {
          stripe_subscription_id?: string | null
          stripe_customer_id?: string | null
          plan_name?: string
          plan_price?: number | null
          billing_interval?: string | null
          status?: 'active' | 'past_due' | 'canceled' | 'trialing' | 'inactive'
          current_period_start?: string | null
          current_period_end?: string | null
          cancel_at_period_end?: boolean
          canceled_at?: string | null
        }
      }
      invoices: {
        Row: {
          id: string
          user_id: string
          subscription_id: string | null
          stripe_invoice_id: string | null
          number: string | null
          amount_due: number | null
          amount_paid: number | null
          currency: string | null
          status: string | null
          hosted_invoice_url: string | null
          invoice_pdf: string | null
          due_date: string | null
          paid_at: string | null
          created_at: string
        }
        Insert: {
          user_id: string
          subscription_id?: string | null
          stripe_invoice_id?: string | null
          number?: string | null
          amount_due?: number | null
          amount_paid?: number | null
          currency?: string | null
          status?: string | null
          hosted_invoice_url?: string | null
          invoice_pdf?: string | null
          due_date?: string | null
          paid_at?: string | null
        }
        Update: {
          subscription_id?: string | null
          stripe_invoice_id?: string | null
          number?: string | null
          amount_due?: number | null
          amount_paid?: number | null
          currency?: string | null
          status?: string | null
          hosted_invoice_url?: string | null
          invoice_pdf?: string | null
          due_date?: string | null
          paid_at?: string | null
        }
      }
      clinic_spaces: {
        Row: {
          id: string
          admin_id: string | null
          name: string
          description: string | null
          location: string
          amenities: string[] | null
          pricing_hourly: number | null
          pricing_daily: number | null
          pricing_monthly: number | null
          tailored_available: boolean
          contact_email: string | null
          contact_phone: string | null
          whatsapp: string | null
          external_managed: boolean
          active: boolean
          images: string[] | null
          virtual_tour_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          admin_id?: string | null
          name: string
          description?: string | null
          location: string
          amenities?: string[] | null
          pricing_hourly?: number | null
          pricing_daily?: number | null
          pricing_monthly?: number | null
          tailored_available?: boolean
          contact_email?: string | null
          contact_phone?: string | null
          whatsapp?: string | null
          external_managed?: boolean
          active?: boolean
          images?: string[] | null
          virtual_tour_url?: string | null
        }
        Update: {
          name?: string
          description?: string | null
          location?: string
          amenities?: string[] | null
          pricing_hourly?: number | null
          pricing_daily?: number | null
          pricing_monthly?: number | null
          tailored_available?: boolean
          contact_email?: string | null
          contact_phone?: string | null
          whatsapp?: string | null
          external_managed?: boolean
          active?: boolean
          images?: string[] | null
          virtual_tour_url?: string | null
        }
      }
      clinic_rental_requests: {
        Row: {
          id: string
          therapist_id: string
          space_id: string
          request_type: string
          preferred_date: string | null
          duration_hours: number | null
          recurring_schedule: any | null
          notes: string | null
          special_requirements: string[] | null
          status: 'open' | 'in_progress' | 'resolved' | 'closed' | 'cancelled'
          admin_response: string | null
          approved_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          therapist_id: string
          space_id: string
          request_type: string
          preferred_date?: string | null
          duration_hours?: number | null
          recurring_schedule?: any | null
          notes?: string | null
          special_requirements?: string[] | null
          status?: 'open' | 'in_progress' | 'resolved' | 'closed' | 'cancelled'
          admin_response?: string | null
          approved_at?: string | null
        }
        Update: {
          request_type?: string
          preferred_date?: string | null
          duration_hours?: number | null
          recurring_schedule?: any | null
          notes?: string | null
          special_requirements?: string[] | null
          status?: 'open' | 'in_progress' | 'resolved' | 'closed' | 'cancelled'
          admin_response?: string | null
          approved_at?: string | null
        }
      }
      vip_offers: {
        Row: {
          id: string
          title: string
          body: string | null
          offer_type: string | null
          cta_label: string | null
          cta_url: string | null
          target_audience: string[] | null
          eligibility_criteria: any | null
          expires_on: string | null
          is_active: boolean
          created_by: string | null
          created_at: string
        }
        Insert: {
          title: string
          body?: string | null
          offer_type?: string | null
          cta_label?: string | null
          cta_url?: string | null
          target_audience?: string[] | null
          eligibility_criteria?: any | null
          expires_on?: string | null
          is_active?: boolean
          created_by?: string | null
        }
        Update: {
          title?: string
          body?: string | null
          offer_type?: string | null
          cta_label?: string | null
          cta_url?: string | null
          target_audience?: string[] | null
          eligibility_criteria?: any | null
          expires_on?: string | null
          is_active?: boolean
          created_by?: string | null
        }
      }
      audit_logs: {
        Row: {
          id: string
          user_id: string
          action: string
          resource_type: string
          resource_id: string | null
          client_id: string | null
          case_id: string | null
          session_id: string | null
          details: any | null
          old_values: any | null
          new_values: any | null
          ip_address: string | null
          user_agent: string | null
          created_at: string
        }
        Insert: {
          user_id: string
          action: string
          resource_type: string
          resource_id?: string | null
          client_id?: string | null
          case_id?: string | null
          session_id?: string | null
          details?: any | null
          old_values?: any | null
          new_values?: any | null
          ip_address?: string | null
          user_agent?: string | null
        }
        Update: {
          action?: string
          resource_type?: string
          resource_id?: string | null
          client_id?: string | null
          case_id?: string | null
          session_id?: string | null
          details?: any | null
          old_values?: any | null
          new_values?: any | null
          ip_address?: string | null
          user_agent?: string | null
        }
      }
      user_last_seen: {
        Row: {
          user_id: string
          page: string
          context: any | null
          seen_at: string
          updated_at: string
        }
        Insert: {
          user_id: string
          page: string
          context?: any | null
          seen_at?: string
        }
        Update: {
          page?: string
          context?: any | null
          seen_at?: string
        }
      }
      practice_analytics: {
        Row: {
          id: string
          therapist_id: string
          period_start: string
          period_end: string
          period_type: string
          total_clients: number | null
          active_clients: number | null
          new_clients: number | null
          sessions_completed: number | null
          assessments_completed: number | null
          average_session_rating: number | null
          client_retention_rate: number | null
          no_show_rate: number | null
          total_revenue: number | null
          average_session_fee: number | null
          calculated_at: string
          created_at: string
        }
        Insert: {
          therapist_id: string
          period_start: string
          period_end: string
          period_type: string
          total_clients?: number | null
          active_clients?: number | null
          new_clients?: number | null
          sessions_completed?: number | null
          assessments_completed?: number | null
          average_session_rating?: number | null
          client_retention_rate?: number | null
          no_show_rate?: number | null
          total_revenue?: number | null
          average_session_fee?: number | null
          calculated_at?: string
        }
        Update: {
          period_start?: string
          period_end?: string
          period_type?: string
          total_clients?: number | null
          active_clients?: number | null
          new_clients?: number | null
          sessions_completed?: number | null
          assessments_completed?: number | null
          average_session_rating?: number | null
          client_retention_rate?: number | null
          no_show_rate?: number | null
          total_revenue?: number | null
          average_session_fee?: number | null
          calculated_at?: string
        }
      }
    }
    Views: {
      assessment_instance_latest_score: {
        Row: {
          instance_id: string
          template_id: string
          therapist_id: string
          client_id: string
          case_id: string | null
          title: string | null
          status: string
          assigned_at: string | null
          due_date: string | null
          completed_at: string | null
          template_name: string
          template_abbrev: string | null
          score_id: string | null
          raw_score: number | null
          scaled_score: number | null
          percentile: number | null
          t_score: number | null
          z_score: number | null
          interpretation_category: string | null
          interpretation_description: string | null
          clinical_significance: string | null
          severity_level: string | null
          recommendations: string | null
          calculated_at: string | null
        }
      }
      therapist_dashboard_summary: {
        Row: {
          therapist_id: string
          first_name: string | null
          last_name: string | null
          total_clients: number | null
          active_cases: number | null
          sessions_last_30_days: number | null
          sessions_today: number | null
          assessments_in_progress: number | null
          assessments_completed_week: number | null
          last_activity_at: string | null
        }
      }
    }
    Functions: {
      calculate_profile_completion: {
        Args: { profile_id: string }
        Returns: number
      }
      get_therapist_clients: {
        Args: { therapist_id: string }
        Returns: {
          client_id: string
          first_name: string
          last_name: string
          email: string
          phone: string
          case_count: number
          last_session: string
          created_at: string
        }[]
      }
      get_case_statistics: {
        Args: { therapist_id: string }
        Returns: {
          total_cases: number
          active_cases: number
          completed_assessments: number
          pending_assessments: number
          sessions_this_month: number
          clients_seen_this_week: number
        }[]
      }
      refresh_analytics_views: {
        Args: {}
        Returns: void
      }
    }
  }
}