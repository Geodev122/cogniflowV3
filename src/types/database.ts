export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          role: 'therapist' | 'client' | 'supervisor' | 'admin'
          first_name: string
          last_name: string
          email: string
          phone: string | null
          whatsapp_number: string | null
          city: string | null
          country: string | null
          patient_code: string | null
          password_set: boolean
          created_by_therapist: string | null
          professional_details: any | null
          verification_status: 'pending' | 'verified' | 'rejected' | 'expired' | null
          profile_completion_percentage: number | null
          last_login_at: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          role?: 'therapist' | 'client' | 'supervisor' | 'admin'
          first_name: string
          last_name: string
          email: string
          phone?: string | null
          whatsapp_number?: string | null
          city?: string | null
          country?: string | null
          patient_code?: string | null
          password_set?: boolean
          created_by_therapist?: string | null
          professional_details?: any | null
          verification_status?: 'pending' | 'verified' | 'rejected' | 'expired' | null
          profile_completion_percentage?: number | null
          last_login_at?: string | null
          is_active?: boolean
        }
        Update: {
          role?: 'therapist' | 'client' | 'supervisor' | 'admin'
          first_name?: string
          last_name?: string
          email?: string
          phone?: string | null
          whatsapp_number?: string | null
          city?: string | null
          country?: string | null
          patient_code?: string | null
          password_set?: boolean
          created_by_therapist?: string | null
          professional_details?: any | null
          verification_status?: 'pending' | 'verified' | 'rejected' | 'expired' | null
          profile_completion_percentage?: number | null
          last_login_at?: string | null
          is_active?: boolean
        }
      }
      therapist_client_relations: {
        Row: {
          id: string
          therapist_id: string
          client_id: string
          status: string | null
          relationship_type: string | null
          created_at: string
        }
        Insert: {
          therapist_id: string
          client_id: string
          status?: string | null
          relationship_type?: string | null
        }
        Update: {
          therapist_id?: string
          client_id?: string
          status?: string | null
          relationship_type?: string | null
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
          date_of_birth: string | null
          gender: string | null
          address: string | null
          medical_history: string | null
          current_medications: string | null
          presenting_concerns: string | null
          therapy_history: string | null
          risk_level: 'low' | 'moderate' | 'high' | 'crisis' | null
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
          date_of_birth?: string | null
          gender?: string | null
          address?: string | null
          medical_history?: string | null
          current_medications?: string | null
          presenting_concerns?: string | null
          therapy_history?: string | null
          risk_level?: 'low' | 'moderate' | 'high' | 'crisis' | null
          notes?: string | null
          intake_completed_at?: string | null
        }
        Update: {
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          emergency_contact_relationship?: string | null
          date_of_birth?: string | null
          gender?: string | null
          address?: string | null
          medical_history?: string | null
          current_medications?: string | null
          presenting_concerns?: string | null
          therapy_history?: string | null
          risk_level?: 'low' | 'moderate' | 'high' | 'crisis' | null
          notes?: string | null
          intake_completed_at?: string | null
        }
      }
      cases: {
        Row: {
          id: string
          client_id: string
          therapist_id: string
          case_number: string
          status: 'active' | 'paused' | 'closed' | 'archived' | null
          current_phase: string | null
          diagnosis_codes: string[] | null
          formulation: string | null
          intake_data: any | null
          treatment_plan: any | null
          data: any | null
          opened_at: string | null
          closed_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          client_id: string
          therapist_id: string
          case_number?: string
          status?: 'active' | 'paused' | 'closed' | 'archived' | null
          current_phase?: string | null
          diagnosis_codes?: string[] | null
          formulation?: string | null
          intake_data?: any | null
          treatment_plan?: any | null
          data?: any | null
          opened_at?: string | null
          closed_at?: string | null
        }
        Update: {
          case_number?: string
          status?: 'active' | 'paused' | 'closed' | 'archived' | null
          current_phase?: string | null
          diagnosis_codes?: string[] | null
          formulation?: string | null
          intake_data?: any | null
          treatment_plan?: any | null
          data?: any | null
          opened_at?: string | null
          closed_at?: string | null
        }
      }
      therapist_case_relations: {
        Row: {
          id: string
          case_id: string
          therapist_id: string
          role: string | null
          created_at: string
        }
        Insert: {
          case_id: string
          therapist_id: string
          role?: string | null
        }
        Update: {
          case_id?: string
          therapist_id?: string
          role?: string | null
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
          status: string | null
          version: number | null
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
          status?: string | null
          version?: number | null
        }
        Update: {
          title?: string
          case_formulation?: string | null
          treatment_approach?: string | null
          estimated_duration?: string | null
          goals?: any | null
          interventions?: any | null
          status?: string | null
          version?: number | null
        }
      }
      therapy_goals: {
        Row: {
          id: string
          treatment_plan_id: string
          goal_text: string
          target_date: string | null
          progress_percentage: number | null
          status: string | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          treatment_plan_id: string
          goal_text: string
          target_date?: string | null
          progress_percentage?: number | null
          status?: string | null
          notes?: string | null
        }
        Update: {
          goal_text?: string
          target_date?: string | null
          progress_percentage?: number | null
          status?: string | null
          notes?: string | null
        }
      }
      case_summaries: {
        Row: {
          case_id: string
          title: string
          content: any | null
          last_highlight: string | null
          updated_by: string | null
          updated_at: string
          created_at: string
        }
        Insert: {
          case_id: string
          title: string
          content?: any | null
          last_highlight?: string | null
          updated_by?: string | null
        }
        Update: {
          title?: string
          content?: any | null
          last_highlight?: string | null
          updated_by?: string | null
        }
      }
      assessment_templates: {
        Row: {
          id: string
          name: string
          abbreviation: string | null
          category: string
          description: string | null
          version: string | null
          questions: any
          scoring_config: any
          interpretation_rules: any
          clinical_cutoffs: any | null
          instructions: string | null
          estimated_duration_minutes: number | null
          evidence_level: string | null
          is_active: boolean
          created_by: string | null
          schema: any | null
          scoring: any | null
          items_count: number | null
          domains: string[] | null
          created_at: string
          updated_at: string
        }
        Insert: {
          name: string
          abbreviation?: string | null
          category: string
          description?: string | null
          version?: string | null
          questions: any
          scoring_config: any
          interpretation_rules: any
          clinical_cutoffs?: any | null
          instructions?: string | null
          estimated_duration_minutes?: number | null
          evidence_level?: string | null
          is_active?: boolean
          created_by?: string | null
          schema?: any | null
          scoring?: any | null
          items_count?: number | null
          domains?: string[] | null
        }
        Update: {
          name?: string
          abbreviation?: string | null
          category?: string
          description?: string | null
          version?: string | null
          questions?: any
          scoring_config?: any
          interpretation_rules?: any
          clinical_cutoffs?: any | null
          instructions?: string | null
          estimated_duration_minutes?: number | null
          evidence_level?: string | null
          is_active?: boolean
          created_by?: string | null
          schema?: any | null
          scoring?: any | null
          items_count?: number | null
          domains?: string[] | null
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
          due_date?: string | null
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
          clinical_significance: string | null
          severity_level: string | null
          recommendations: string | null
          therapist_notes: string | null
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
          clinical_significance?: string | null
          severity_level?: string | null
          recommendations?: string | null
          therapist_notes?: string | null
          auto_generated?: boolean
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
          clinical_significance?: string | null
          severity_level?: string | null
          recommendations?: string | null
          therapist_notes?: string | null
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
        }
        Update: {
          report_type?: string
          title?: string
          content?: any
          generated_by?: string | null
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
          appointment_type: 'individual' | 'group' | 'family' | 'assessment' | 'consultation' | null
          status: 'scheduled' | 'completed' | 'cancelled' | 'no_show' | 'rescheduled'
          title: string | null
          notes: string | null
          location: string | null
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
          appointment_type?: 'individual' | 'group' | 'family' | 'assessment' | 'consultation' | null
          status?: 'scheduled' | 'completed' | 'cancelled' | 'no_show' | 'rescheduled'
          title?: string | null
          notes?: string | null
          location?: string | null
        }
        Update: {
          appointment_date?: string
          start_time?: string
          end_time?: string
          duration_minutes?: number | null
          appointment_type?: 'individual' | 'group' | 'family' | 'assessment' | 'consultation' | null
          status?: 'scheduled' | 'completed' | 'cancelled' | 'no_show' | 'rescheduled'
          title?: string | null
          notes?: string | null
          location?: string | null
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
          content: any
          finalized: boolean | null
          finalized_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          appointment_id?: string | null
          therapist_id: string
          client_id?: string | null
          case_id?: string | null
          session_index?: number | null
          content: any
          finalized?: boolean | null
          finalized_at?: string | null
        }
        Update: {
          content?: any
          finalized?: boolean | null
          finalized_at?: string | null
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
          payload: any | null
          completed_at: string | null
          created_at: string
        }
        Insert: {
          case_id: string
          therapist_id: string
          source?: string | null
          source_id?: string | null
          title: string
          payload?: any | null
          completed_at?: string | null
        }
        Update: {
          title?: string
          payload?: any | null
          completed_at?: string | null
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
          content: any | null
          responses: any | null
          status: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          therapist_id: string
          client_id: string
          case_id?: string | null
          type: string
          title: string
          content?: any | null
          responses?: any | null
          status?: string | null
        }
        Update: {
          type?: string
          title?: string
          content?: any | null
          responses?: any | null
          status?: string | null
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
          progress: any | null
          status: string | null
          last_played_at: string | null
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
          progress?: any | null
          status?: string | null
          last_played_at?: string | null
        }
        Update: {
          exercise_type?: string
          title?: string
          description?: string | null
          game_config?: any | null
          progress?: any | null
          status?: string | null
          last_played_at?: string | null
        }
      }
      worksheets: {
        Row: {
          id: string
          therapist_id: string
          title: string
          content: any | null
          category: string | null
          is_template: boolean | null
          created_at: string
          updated_at: string
        }
        Insert: {
          therapist_id: string
          title: string
          content?: any | null
          category?: string | null
          is_template?: boolean | null
        }
        Update: {
          title?: string
          content?: any | null
          category?: string | null
          is_template?: boolean | null
        }
      }
      worksheet_assignments: {
        Row: {
          id: string
          worksheet_id: string
          client_id: string
          therapist_id: string
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
          responses?: any | null
          status?: string | null
          completed_at?: string | null
        }
        Update: {
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
          source_type: string
          source_id: string | null
          recorded_at: string
          created_at: string
        }
        Insert: {
          client_id: string
          case_id?: string | null
          metric_type: string
          value: number
          source_type: string
          source_id?: string | null
          recorded_at?: string
        }
        Update: {
          metric_type?: string
          value?: number
          source_type?: string
          source_id?: string | null
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
        }
        Update: {
          task_type?: string
          task_title?: string
          task_data?: any | null
          client_response?: any | null
          mood_rating?: number | null
          client_notes?: string | null
          submitted_at?: string | null
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
        }
        Update: {
          subject?: string | null
          content?: string | null
          status?: 'draft' | 'sent' | 'delivered' | 'read' | 'failed'
          sent_at?: string | null
          delivered_at?: string | null
          read_at?: string | null
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
          status: 'open' | 'in_progress' | 'resolved' | 'closed' | 'cancelled'
          resolved_at: string | null
          resolved_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          client_id: string
          therapist_id?: string | null
          case_id?: string | null
          type: string
          message?: string | null
          status?: 'open' | 'in_progress' | 'resolved' | 'closed' | 'cancelled'
          resolved_at?: string | null
          resolved_by?: string | null
        }
        Update: {
          type?: string
          message?: string | null
          status?: 'open' | 'in_progress' | 'resolved' | 'closed' | 'cancelled'
          resolved_at?: string | null
          resolved_by?: string | null
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
        }
        Update: {
          title?: string
          body?: string | null
          consent_type?: string | null
          signed_at?: string | null
          expires_at?: string | null
        }
      }
      resource_library: {
        Row: {
          id: string
          title: string
          description: string | null
          category: string | null
          subcategory: string | null
          content_type: string | null
          content_url: string | null
          media_url: string | null
          storage_path: string | null
          external_url: string | null
          tags: string[] | null
          difficulty_level: string | null
          evidence_level: string | null
          is_public: boolean
          therapist_owner_id: string | null
          created_by: string | null
          metadata: any | null
          created_at: string
          updated_at: string
        }
        Insert: {
          title: string
          description?: string | null
          category?: string | null
          subcategory?: string | null
          content_type?: string | null
          content_url?: string | null
          media_url?: string | null
          storage_path?: string | null
          external_url?: string | null
          tags?: string[] | null
          difficulty_level?: string | null
          evidence_level?: string | null
          is_public?: boolean
          therapist_owner_id?: string | null
          created_by?: string | null
          metadata?: any | null
        }
        Update: {
          title?: string
          description?: string | null
          category?: string | null
          subcategory?: string | null
          content_type?: string | null
          content_url?: string | null
          media_url?: string | null
          storage_path?: string | null
          external_url?: string | null
          tags?: string[] | null
          difficulty_level?: string | null
          evidence_level?: string | null
          is_public?: boolean
          therapist_owner_id?: string | null
          created_by?: string | null
          metadata?: any | null
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
          status?: string | null
          completed_at?: string | null
        }
        Update: {
          form_type?: string
          title?: string
          questions?: any | null
          responses?: any | null
          score?: number | null
          status?: string | null
          completed_at?: string | null
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
          status: 'open' | 'in_progress' | 'resolved' | 'closed' | 'cancelled'
          resolved_at: string | null
          resolved_by: string | null
          created_at: string
        }
        Insert: {
          case_id: string
          therapist_id: string
          session_note_id?: string | null
          flagged_by: string
          reason: string
          status?: 'open' | 'in_progress' | 'resolved' | 'closed' | 'cancelled'
          resolved_at?: string | null
          resolved_by?: string | null
        }
        Update: {
          reason?: string
          status?: 'open' | 'in_progress' | 'resolved' | 'closed' | 'cancelled'
          resolved_at?: string | null
          resolved_by?: string | null
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
          status: 'open' | 'in_progress' | 'resolved' | 'closed' | 'cancelled'
          priority: string | null
          resolved_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          therapist_id: string
          supervisor_id?: string | null
          case_id?: string | null
          title: string
          description?: string | null
          status?: 'open' | 'in_progress' | 'resolved' | 'closed' | 'cancelled'
          priority?: string | null
          resolved_at?: string | null
        }
        Update: {
          title?: string
          description?: string | null
          status?: 'open' | 'in_progress' | 'resolved' | 'closed' | 'cancelled'
          priority?: string | null
          resolved_at?: string | null
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
          expires_on: string | null
          status: 'submitted' | 'under_review' | 'approved' | 'rejected' | 'expired'
          verified_at: string | null
          verified_by: string | null
          notes: string | null
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
          expires_on?: string | null
          status?: 'submitted' | 'under_review' | 'approved' | 'rejected' | 'expired'
          verified_at?: string | null
          verified_by?: string | null
          notes?: string | null
        }
        Update: {
          license_name?: string
          license_number?: string | null
          issuing_authority?: string | null
          country?: string
          state_province?: string | null
          file_path?: string
          expires_on?: string | null
          status?: 'submitted' | 'under_review' | 'approved' | 'rejected' | 'expired'
          verified_at?: string | null
          verified_by?: string | null
          notes?: string | null
        }
      }
      subscriptions: {
        Row: {
          id: string
          user_id: string
          stripe_subscription_id: string | null
          plan_name: string
          status: 'active' | 'past_due' | 'canceled' | 'trialing' | 'inactive'
          current_period_start: string | null
          current_period_end: string | null
          cancel_at_period_end: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          user_id: string
          stripe_subscription_id?: string | null
          plan_name: string
          status: 'active' | 'past_due' | 'canceled' | 'trialing' | 'inactive'
          current_period_start?: string | null
          current_period_end?: string | null
          cancel_at_period_end?: boolean
        }
        Update: {
          stripe_subscription_id?: string | null
          plan_name?: string
          status?: 'active' | 'past_due' | 'canceled' | 'trialing' | 'inactive'
          current_period_start?: string | null
          current_period_end?: string | null
          cancel_at_period_end?: boolean
        }
      }
      invoices: {
        Row: {
          id: string
          user_id: string
          stripe_invoice_id: string | null
          number: string | null
          amount_due: number | null
          currency: string | null
          status: string | null
          hosted_invoice_url: string | null
          invoice_pdf: string | null
          created_at: string
        }
        Insert: {
          user_id: string
          stripe_invoice_id?: string | null
          number?: string | null
          amount_due?: number | null
          currency?: string | null
          status?: string | null
          hosted_invoice_url?: string | null
          invoice_pdf?: string | null
        }
        Update: {
          stripe_invoice_id?: string | null
          number?: string | null
          amount_due?: number | null
          currency?: string | null
          status?: string | null
          hosted_invoice_url?: string | null
          invoice_pdf?: string | null
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
          tailored_available: boolean
          whatsapp: string | null
          external_managed: boolean
          active: boolean
          images: string[] | null
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
          tailored_available?: boolean
          whatsapp?: string | null
          external_managed?: boolean
          active?: boolean
          images?: string[] | null
        }
        Update: {
          name?: string
          description?: string | null
          location?: string
          amenities?: string[] | null
          pricing_hourly?: number | null
          pricing_daily?: number | null
          tailored_available?: boolean
          whatsapp?: string | null
          external_managed?: boolean
          active?: boolean
          images?: string[] | null
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
          notes: string | null
          status: 'open' | 'in_progress' | 'resolved' | 'closed' | 'cancelled'
          admin_response: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          therapist_id: string
          space_id: string
          request_type: string
          preferred_date?: string | null
          duration_hours?: number | null
          notes?: string | null
          status?: 'open' | 'in_progress' | 'resolved' | 'closed' | 'cancelled'
          admin_response?: string | null
        }
        Update: {
          request_type?: string
          preferred_date?: string | null
          duration_hours?: number | null
          notes?: string | null
          status?: 'open' | 'in_progress' | 'resolved' | 'closed' | 'cancelled'
          admin_response?: string | null
        }
      }
      vip_offers: {
        Row: {
          id: string
          title: string
          body: string | null
          cta_label: string | null
          cta_url: string | null
          target_audience: string[] | null
          expires_on: string | null
          is_active: boolean
          created_by: string | null
          created_at: string
        }
        Insert: {
          title: string
          body?: string | null
          cta_label?: string | null
          cta_url?: string | null
          target_audience?: string[] | null
          expires_on?: string | null
          is_active?: boolean
          created_by?: string | null
        }
        Update: {
          title?: string
          body?: string | null
          cta_label?: string | null
          cta_url?: string | null
          target_audience?: string[] | null
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
          details: any | null
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
          details?: any | null
          ip_address?: string | null
          user_agent?: string | null
        }
        Update: {
          action?: string
          resource_type?: string
          resource_id?: string | null
          client_id?: string | null
          case_id?: string | null
          details?: any | null
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
      treatment_plan_phases: {
        Row: {
          id: string
          case_id: string
          phase: string
          planned_date: string | null
          session_index: number | null
          completed_at: string | null
          created_at: string
        }
        Insert: {
          case_id: string
          phase: string
          planned_date?: string | null
          session_index?: number | null
          completed_at?: string | null
        }
        Update: {
          phase?: string
          planned_date?: string | null
          session_index?: number | null
          completed_at?: string | null
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
        }[]
      }
      create_sample_therapist: {
        Args: {
          user_id: string
          first_name: string
          last_name: string
          email: string
        }
        Returns: string
      }
      create_sample_client_with_case: {
        Args: {
          therapist_id: string
          first_name: string
          last_name: string
          email: string
        }
        Returns: string
      }
    }
  }
}