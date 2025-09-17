export interface Database {
  public: {
    Tables: {
      assessment_templates: {
        Row: {
          id: string
          name: string
          abbreviation: string
          category: string
          description: string
          version: string
          questions: any
          scoring_config: any
          interpretation_rules: any
          clinical_cutoffs: any
          instructions: string
          estimated_duration_minutes: number
          evidence_level: string
          is_active: boolean
          created_by: string | null
          created_at: string
          updated_at: string
          schema: any | null
          scoring: any | null
          items_count: number | null
          domains: string[] | null
        }
        Insert: {
          name: string
          abbreviation: string
          category: string
          description?: string
          version?: string
          questions: any
          scoring_config: any
          interpretation_rules: any
          clinical_cutoffs?: any
          instructions?: string
          estimated_duration_minutes?: number
          evidence_level?: string
          is_active?: boolean
          created_by?: string | null
          schema?: any | null
          scoring?: any | null
          items_count?: number | null
          domains?: string[] | null
        }
        Update: {
          name?: string
          abbreviation?: string
          category?: string
          description?: string
          version?: string
          questions?: any
          scoring_config?: any
          interpretation_rules?: any
          clinical_cutoffs?: any
          instructions?: string
          estimated_duration_minutes?: number
          evidence_level?: string
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
          status: string
          assigned_at: string
          due_date: string | null
          started_at: string | null
          completed_at: string | null
          expires_at: string | null
          reminder_frequency: string
          metadata: any
          created_at: string
          updated_at: string
          progress: number | null
        }
        Insert: {
          template_id: string
          therapist_id: string
          client_id: string
          case_id?: string | null
          title: string
          instructions?: string | null
          status?: string
          due_date?: string | null
          reminder_frequency?: string
          metadata?: any
          progress?: number | null
        }
        Update: {
          template_id?: string
          therapist_id?: string
          client_id?: string
          case_id?: string | null
          title?: string
          instructions?: string | null
          status?: string
          assigned_at?: string
          due_date?: string | null
          started_at?: string | null
          completed_at?: string | null
          expires_at?: string | null
          reminder_frequency?: string
          metadata?: any
          progress?: number | null
        }
      }
      assessment_responses: {
        Row: {
          id: string
          instance_id: string
          question_id: string
          response_value: any
          response_text: string | null
          response_timestamp: string
          is_final: boolean
          created_at: string
          updated_at: string
          payload: any | null
          answered_at: string
          item_id: string
        }
        Insert: {
          instance_id: string
          question_id: string
          response_value: any
          response_text?: string | null
          response_timestamp?: string
          is_final?: boolean
          payload?: any | null
          answered_at?: string
          item_id: string
        }
        Update: {
          instance_id?: string
          question_id?: string
          response_value?: any
          response_text?: string | null
          response_timestamp?: string
          is_final?: boolean
          payload?: any | null
          answered_at?: string
          item_id?: string
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
          interpretation_category: string
          interpretation_description: string
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
          interpretation_category: string
          interpretation_description: string
          clinical_significance?: string | null
          severity_level?: string | null
          recommendations?: string | null
          therapist_notes?: string | null
          auto_generated?: boolean
          reviewed_by?: string | null
          reviewed_at?: string | null
        }
        Update: {
          instance_id?: string
          raw_score?: number
          scaled_score?: number | null
          percentile?: number | null
          t_score?: number | null
          z_score?: number | null
          interpretation_category?: string
          interpretation_description?: string
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
      profiles: {
        Row: {
          id: string
          role: 'therapist' | 'client'
          first_name: string
          last_name: string
          email: string
          patient_code: string | null
          whatsapp_number: string | null
          password_set: boolean
          created_by_therapist: string | null
          professional_details: any | null
          verification_status: string | null
          created_at: string
          phone: string | null
          city: string | null
          country: string | null
          updated_at: string
        }
        Insert: {
          id: string
          role: 'therapist' | 'client'
          first_name: string
          last_name: string
          email: string
          patient_code?: string | null
          whatsapp_number?: string | null
          password_set?: boolean
          created_by_therapist?: string | null
          professional_details?: any | null
          verification_status?: string | null
          created_at?: string
          phone?: string | null
          city?: string | null
          country?: string | null
          updated_at?: string
        }
        Update: {
          id?: string
          role?: 'therapist' | 'client'
          first_name?: string
          last_name?: string
          email?: string
          patient_code?: string | null
          whatsapp_number?: string | null
          password_set?: boolean
          created_by_therapist?: string | null
          professional_details?: any | null
          verification_status?: string | null
          created_at?: string
          phone?: string | null
          city?: string | null
          country?: string | null
          updated_at?: string
        }
      }
      cases: {
        Row: {
          id: string
          client_id: string
          therapist_id: string
          case_number: string
          status: string | null
          opened_at: string | null
          closed_at: string | null
          created_at: string
          updated_at: string
          current_phase: string | null
          diagnosis_codes: string[] | null
          treatment_plan: any | null
          formulation: string | null
          intake_data: any | null
          data: any | null
        }
        Insert: {
          client_id: string
          therapist_id: string
          case_number: string
          status?: string | null
          opened_at?: string | null
          closed_at?: string | null
          current_phase?: string | null
          diagnosis_codes?: string[] | null
          treatment_plan?: any | null
          formulation?: string | null
          intake_data?: any | null
          data?: any | null
        }
        Update: {
          client_id?: string
          therapist_id?: string
          case_number?: string
          status?: string | null
          opened_at?: string | null
          closed_at?: string | null
          current_phase?: string | null
          diagnosis_codes?: string[] | null
          treatment_plan?: any | null
          formulation?: string | null
          intake_data?: any | null
          data?: any | null
        }
      }
      appointments: {
        Row: {
          id: string
          therapist_id: string | null
          client_id: string | null
          case_id: string | null
          appointment_date: string
          start_time: string | null
          end_time: string | null
          duration_minutes: number | null
          appointment_type: string | null
          status: string
          title: string | null
          notes: string | null
          location: string | null
          created_at: string
        }
        Insert: {
          therapist_id?: string | null
          client_id?: string | null
          case_id?: string | null
          appointment_date: string
          start_time?: string | null
          end_time?: string | null
          duration_minutes?: number | null
          appointment_type?: string | null
          status?: string
          title?: string | null
          notes?: string | null
          location?: string | null
        }
        Update: {
          therapist_id?: string | null
          client_id?: string | null
          case_id?: string | null
          appointment_date?: string
          start_time?: string | null
          end_time?: string | null
          duration_minutes?: number | null
          appointment_type?: string | null
          status?: string
          title?: string | null
          notes?: string | null
          location?: string | null
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
          status: string
          created_at: string
          updated_at: string
          resolved_at: string | null
          resolved_by: string | null
        }
        Insert: {
          client_id: string
          therapist_id?: string | null
          case_id?: string | null
          type: string
          message?: string | null
          status?: string
        }
        Update: {
          client_id?: string
          therapist_id?: string | null
          case_id?: string | null
          type?: string
          message?: string | null
          status?: string
          resolved_at?: string | null
          resolved_by?: string | null
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
      supervision_flags: {
        Row: {
          id: string
          case_id: string
          therapist_id: string
          session_note_id: string | null
          flagged_by: string
          reason: string
          status: string
          created_at: string
          resolved_at: string | null
          resolved_by: string | null
        }
        Insert: {
          case_id: string
          therapist_id: string
          session_note_id?: string | null
          flagged_by: string
          reason: string
          status?: string
        }
        Update: {
          case_id?: string
          therapist_id?: string
          session_note_id?: string | null
          flagged_by?: string
          reason?: string
          status?: string
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
          status: string
          priority: string
          created_at: string
          updated_at: string
          resolved_at: string | null
        }
        Insert: {
          therapist_id: string
          supervisor_id?: string | null
          case_id?: string | null
          title: string
          description?: string | null
          status?: string
          priority?: string
        }
        Update: {
          therapist_id?: string
          supervisor_id?: string | null
          case_id?: string | null
          title?: string
          description?: string | null
          status?: string
          priority?: string
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
          status: string
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
          status?: string
          verified_at?: string | null
          verified_by?: string | null
          notes?: string | null
        }
        Update: {
          therapist_id?: string
          license_name?: string
          license_number?: string | null
          issuing_authority?: string | null
          country?: string
          state_province?: string | null
          file_path?: string
          expires_on?: string | null
          status?: string
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
          status: string
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
          status: string
          current_period_start?: string | null
          current_period_end?: string | null
          cancel_at_period_end?: boolean
        }
        Update: {
          user_id?: string
          stripe_subscription_id?: string | null
          plan_name?: string
          status?: string
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
          user_id?: string
          stripe_invoice_id?: string | null
          number?: string | null
          amount_due?: number | null
          currency?: string | null
          status?: string | null
          hosted_invoice_url?: string | null
          invoice_pdf?: string | null
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
          admin_id?: string | null
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
          status: string
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
          status?: string
          admin_response?: string | null
        }
        Update: {
          therapist_id?: string
          space_id?: string
          request_type?: string
          preferred_date?: string | null
          duration_hours?: number | null
          notes?: string | null
          status?: string
          admin_response?: string | null
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
          status: string
          created_at: string
          updated_at: string
          resolved_at: string | null
          resolved_by: string | null
        }
        Insert: {
          client_id: string
          therapist_id?: string | null
          case_id?: string | null
          type: string
          message?: string | null
          status?: string
        }
        Update: {
          client_id?: string
          therapist_id?: string | null
          case_id?: string | null
          type?: string
          message?: string | null
          status?: string
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
          consent_type: string
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
          consent_type?: string
          signed_at?: string | null
          expires_at?: string | null
        }
        Update: {
          client_id?: string
          therapist_id?: string | null
          case_id?: string | null
          title?: string
          body?: string | null
          consent_type?: string
          signed_at?: string | null
          expires_at?: string | null
        }
      }
      therapist_client_relations: {
        Row: {
          id: string
          therapist_id: string
          client_id: string
          created_at: string
          status: string | null
        }
        Insert: {
          therapist_id: string
          client_id: string
          created_at?: string
          status?: string | null
        }
        Update: {
          therapist_id?: string
          client_id?: string
          created_at?: string
          status?: string | null
        }
      }
      cbt_worksheets: {
        Row: {
          id: string
          therapist_id: string
          client_id: string
          type: string
          title: string
          content: any
          status: 'assigned' | 'in_progress' | 'completed'
          created_at: string
          updated_at: string
        }
        Insert: {
          therapist_id: string
          client_id: string
          type: string
          title: string
          content?: any
          status?: 'assigned' | 'in_progress' | 'completed'
          created_at?: string
          updated_at?: string
        }
        Update: {
          therapist_id?: string
          client_id?: string
          type?: string
          title?: string
          content?: any
          status?: 'assigned' | 'in_progress' | 'completed'
          created_at?: string
          updated_at?: string
        }
      }
      psychometric_forms: {
        Row: {
          id: string
          therapist_id: string
          client_id: string
          form_type: string
          title: string
          questions: any
          responses: any
          score: number
          status: 'assigned' | 'completed'
          created_at: string
          completed_at: string | null
        }
        Insert: {
          therapist_id: string
          client_id: string
          form_type: string
          title: string
          questions?: any
          responses?: any
          score?: number
          status?: 'assigned' | 'completed'
          created_at?: string
          completed_at?: string | null
        }
        Update: {
          therapist_id?: string
          client_id?: string
          form_type?: string
          title?: string
          questions?: any
          responses?: any
          score?: number
          status?: 'assigned' | 'completed'
          created_at?: string
          completed_at?: string | null
        }
      }
      therapeutic_exercises: {
        Row: {
          id: string
          therapist_id: string
          client_id: string
          exercise_type: string
          title: string
          description: string | null
          game_config: any
          progress: any
          status: 'assigned' | 'in_progress' | 'completed'
          created_at: string
          last_played_at: string | null
        }
        Insert: {
          therapist_id: string
          client_id: string
          exercise_type: string
          title: string
          description?: string | null
          game_config?: any
          progress?: any
          status?: 'assigned' | 'in_progress' | 'completed'
          created_at?: string
          last_played_at?: string | null
        }
        Update: {
          therapist_id?: string
          client_id?: string
          exercise_type?: string
          title?: string
          description?: string | null
          game_config?: any
          progress?: any
          status?: 'assigned' | 'in_progress' | 'completed'
          created_at?: string
          last_played_at?: string | null
        }
      }
      worksheets: {
        Row: {
          id: string
          therapist_id: string
          title: string
          content: any
          created_at: string
        }
        Insert: {
          therapist_id: string
          title: string
          content?: any
          created_at?: string
        }
        Update: {
          therapist_id?: string
          title?: string
          content?: any
          created_at?: string
        }
      }
      worksheet_assignments: {
        Row: {
          id: string
          worksheet_id: string
          client_id: string
          status: 'assigned' | 'in_progress' | 'completed'
          responses: any
          assigned_at: string
          completed_at: string | null
        }
        Insert: {
          worksheet_id: string
          client_id: string
          status?: 'assigned' | 'in_progress' | 'completed'
          responses?: any
          assigned_at?: string
          completed_at?: string | null
        }
        Update: {
          worksheet_id?: string
          client_id?: string
          status?: 'assigned' | 'in_progress' | 'completed'
          responses?: any
          assigned_at?: string
          completed_at?: string | null
        }
      }
      progress_tracking: {
        Row: {
          id: string
          client_id: string
          metric_type: string
          value: number
          source_type: 'psychometric' | 'exercise' | 'manual'
          source_id: string | null
          recorded_at: string
        }
        Insert: {
          client_id: string
          metric_type: string
          value: number
          source_type: 'psychometric' | 'exercise' | 'manual'
          source_id?: string | null
          recorded_at?: string
        }
        Update: {
          client_id?: string
          metric_type?: string
          value?: number
          source_type?: 'psychometric' | 'exercise' | 'manual'
          source_id?: string | null
          recorded_at?: string
        }
      }
      clinic_listings: {
        Row: {
          id: string
          admin_id: string
          name: string
          description: string | null
          location: string
          ownership_type: 'admin_owned' | 'externally_owned'
          contact_info: any
          amenities: string[]
          images: string[]
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          admin_id: string
          name: string
          description?: string | null
          location: string
          ownership_type: 'admin_owned' | 'externally_owned'
          contact_info?: any
          amenities?: string[]
          images?: string[]
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          admin_id?: string
          name?: string
          description?: string | null
          location?: string
          ownership_type?: 'admin_owned' | 'externally_owned'
          contact_info?: any
          amenities?: string[]
          images?: string[]
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      rental_options: {
        Row: {
          id: string
          clinic_id: string
          duration_type: 'hourly' | 'daily' | 'weekly' | 'monthly' | 'package'
          price: number
          currency: string
          description: string | null
          min_duration: number
          max_duration: number | null
          is_available: boolean
          created_at: string
        }
        Insert: {
          clinic_id: string
          duration_type: 'hourly' | 'daily' | 'weekly' | 'monthly' | 'package'
          price: number
          currency?: string
          description?: string | null
          min_duration?: number
          max_duration?: number | null
          is_available?: boolean
          created_at?: string
        }
        Update: {
          clinic_id?: string
          duration_type?: 'hourly' | 'daily' | 'weekly' | 'monthly' | 'package'
          price?: number
          currency?: string
          description?: string | null
          min_duration?: number
          max_duration?: number | null
          is_available?: boolean
          created_at?: string
        }
      }
      clinic_bookings: {
        Row: {
          id: string
          clinic_id: string
          therapist_id: string
          rental_option_id: string
          start_date: string
          end_date: string
          duration_value: number
          total_price: number
          status: 'pending' | 'confirmed' | 'rejected' | 'cancelled'
          payment_receipt_url: string | null
          booking_notes: string | null
          admin_notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          clinic_id: string
          therapist_id: string
          rental_option_id: string
          start_date: string
          end_date: string
          duration_value: number
          total_price: number
          status?: 'pending' | 'confirmed' | 'rejected' | 'cancelled'
          payment_receipt_url?: string | null
          booking_notes?: string | null
          admin_notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          clinic_id?: string
          therapist_id?: string
          rental_option_id?: string
          start_date?: string
          end_date?: string
          duration_value?: number
          total_price?: number
          status?: 'pending' | 'confirmed' | 'rejected' | 'cancelled'
          payment_receipt_url?: string | null
          booking_notes?: string | null
          admin_notes?: string | null
          created_at?: string
          updated_at?: string
        }
      }
    }
  }
}